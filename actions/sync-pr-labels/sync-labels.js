'use strict';

/**
 * Sync the PR's managed labels with the type and breaking-change marker derived
 * from its title and, when product labels are configured, with the product
 * directories its files belong to. Only calls the GitHub API when current labels
 * diverge from the desired state.
 */
module.exports = async function sync({ github, context, core }) {
  const typeLabels = JSON.parse(process.env.TYPE_LABELS);
  const breakingLabels = (process.env.BREAKING_LABELS || '')
    .split('\n')
    .map(name => name.trim())
    .filter(Boolean);
  const productLabels = process.env.PRODUCT_LABELS ? JSON.parse(process.env.PRODUCT_LABELS) : {};
  const commonLabel = (process.env.COMMON_LABEL || '').trim();
  const pr = context.payload.pull_request;
  if (!pr) {
    core.setFailed('This action must run on a pull_request event');
    return;
  }

  const { owner, repo } = context.repo;
  const issue_number = pr.number;

  const match = pr.title.match(/^(?<type>[a-zA-Z]+)(?:\([^)]+\))?(?<breaking>!)?:/);
  const type = match && match.groups && match.groups.type;
  const desiredLabel = (type && typeLabels[type]) ? typeLabels[type] : 'other';
  const isBreaking = Boolean(match && match.groups && match.groups.breaking);

  const desiredLabels = new Set([desiredLabel]);
  if (isBreaking) {
    for (const name of breakingLabels) {
      desiredLabels.add(name);
    }
  }

  // Manage the breaking labels alongside the type labels so that dropping `!` from
  // the title drops the labels too. The title stays the single source of truth,
  // which means a hand-applied breaking label is removed on the next PR edit.
  const managedLabels = new Set([...Object.values(typeLabels), 'other', ...breakingLabels]);

  const products = Object.entries(productLabels);
  if (products.length > 0) {
    for (const name of await productLabelsOf({ github, owner, repo, issue_number, products, commonLabel })) {
      desiredLabels.add(name);
    }
    // Remove product labels the PR no longer earns, e.g. after a push drops the
    // changes to a product, so that its CHANGELOG stops listing the PR.
    for (const [, label] of products) {
      managedLabels.add(label);
    }
    if (commonLabel) {
      managedLabels.add(commonLabel);
    }
  }

  const currentLabels = pr.labels.map(l => l.name);
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

async function productLabelsOf({ github, owner, repo, issue_number, products, commonLabel }) {
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
  const prefixes = products.map(([dir, label]) => ({ prefix: dir.replace(/\/+$/, '') + '/', label }));

  const labels = new Set();
  for (const p of paths) {
    const owners = prefixes.filter(({ prefix }) => p.startsWith(prefix));
    if (owners.length === 0) {
      if (commonLabel) {
        labels.add(commonLabel);
      }
      continue;
    }
    for (const { label } of owners) {
      labels.add(label);
    }
  }
  return labels;
}
