'use strict';

/**
 * Sync the PR's managed labels with the type derived from its title.
 * Only calls the GitHub API when current labels diverge from the desired state.
 */
module.exports = async function sync({ github, context, core }) {
  const typeLabels = JSON.parse(process.env.TYPE_LABELS);
  const pr = context.payload.pull_request;
  if (!pr) {
    core.setFailed('This action must run on a pull_request event');
    return;
  }

  const match = pr.title.match(/^(?<type>[a-zA-Z]+)(?:\([^)]+\))?!?:/);
  const type = match && match.groups && match.groups.type;
  const desiredLabel = (type && typeLabels[type]) ? typeLabels[type] : 'other';

  const currentLabels = pr.labels.map(l => l.name);
  const managedLabels = new Set([...Object.values(typeLabels), 'other']);

  const removeTargets = currentLabels.filter(
    name => managedLabels.has(name) && name !== desiredLabel
  );
  const shouldAdd = !currentLabels.includes(desiredLabel);

  if (removeTargets.length === 0 && !shouldAdd) {
    core.info('Labels already up-to-date');
    return;
  }

  const { owner, repo } = context.repo;
  const issue_number = pr.number;

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

  if (shouldAdd) {
    await github.rest.issues.addLabels({
      owner,
      repo,
      issue_number,
      labels: [desiredLabel],
    });
    core.info(`Added label: ${desiredLabel}`);
  }
};
