'use strict';

/**
 * Sync the PR's product labels with the product directories its files belong to.
 * Only calls the label API when current labels diverge from the desired state.
 */
module.exports = async function sync({ github, context, core }) {
  const productLabels = JSON.parse(process.env.PRODUCT_LABELS);
  const commonLabel = (process.env.COMMON_LABEL || '').trim();
  const pr = context.payload.pull_request;
  if (!pr) {
    core.setFailed('This action must run on a pull_request event');
    return;
  }

  const { owner, repo } = context.repo;
  const issue_number = pr.number;

  const files = await github.paginate(github.rest.pulls.listFiles, {
    owner,
    repo,
    pull_number: issue_number,
    per_page: 100,
  });
  // Count the source path of a rename too, so that moving a file out of a product
  // still marks the product as changed.
  const paths = files.flatMap(f => (f.previous_filename ? [f.filename, f.previous_filename] : [f.filename]));

  // Match on directory boundaries so that `packages/foo` does not claim `packages/foobar`.
  const products = Object.entries(productLabels).map(([dir, label]) => ({
    prefix: dir.replace(/\/+$/, '') + '/',
    label,
  }));

  const desiredLabels = new Set();
  for (const p of paths) {
    const owners = products.filter(({ prefix }) => p.startsWith(prefix));
    if (owners.length === 0) {
      if (commonLabel) {
        desiredLabels.add(commonLabel);
      }
      continue;
    }
    for (const { label } of owners) {
      desiredLabels.add(label);
    }
  }

  const currentLabels = pr.labels.map(l => l.name);
  // Remove product labels the PR no longer earns, e.g. after a push drops the
  // changes to a product, so that its CHANGELOG stops listing the PR.
  const managedLabels = new Set([...Object.values(productLabels), ...(commonLabel ? [commonLabel] : [])]);

  const removeTargets = currentLabels.filter(
    name => managedLabels.has(name) && !desiredLabels.has(name)
  );
  const addTargets = [...desiredLabels].filter(name => !currentLabels.includes(name));

  if (removeTargets.length === 0 && addTargets.length === 0) {
    core.info('Labels already up-to-date');
    return;
  }

  for (const name of removeTargets) {
    try {
      await github.rest.issues.removeLabel({ owner, repo, issue_number, name });
      core.info(`Removed label: ${name}`);
    } catch (e) {
      if (e.status !== 404) {
        throw e;
      }
    }
  }

  if (addTargets.length > 0) {
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number,
      labels: addTargets,
    });
    core.info(`Added labels: ${addTargets.join(', ')}`);
  }
};
