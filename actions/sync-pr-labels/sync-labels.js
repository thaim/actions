'use strict';

/**
 * Sync the PR's managed labels with the type and breaking-change marker derived
 * from its title. Only calls the GitHub API when current labels diverge from the
 * desired state.
 */
module.exports = async function sync({ github, context, core }) {
  const typeLabels = JSON.parse(process.env.TYPE_LABELS);
  const breakingLabels = (process.env.BREAKING_LABELS || '')
    .split('\n')
    .map(name => name.trim())
    .filter(Boolean);
  const pr = context.payload.pull_request;
  if (!pr) {
    core.setFailed('This action must run on a pull_request event');
    return;
  }

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

  const currentLabels = pr.labels.map(l => l.name);
  // Manage the breaking labels alongside the type labels so that dropping `!` from
  // the title drops the labels too. The title stays the single source of truth,
  // which means a hand-applied breaking label is removed on the next PR edit.
  const managedLabels = new Set([...Object.values(typeLabels), 'other', ...breakingLabels]);

  const removeTargets = currentLabels.filter(
    name => managedLabels.has(name) && !desiredLabels.has(name)
  );
  const addTargets = [...desiredLabels].filter(name => !currentLabels.includes(name));

  if (removeTargets.length === 0 && addTargets.length === 0) {
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
