'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sync = require('./sync-labels.js');

const TYPE_LABELS = JSON.stringify({
  feat: 'enhancement',
  fix: 'bug',
  ci: 'ci',
  docs: 'documentation',
  refactor: 'refactor',
  chore: 'chore',
});

const BREAKING_LABELS = 'breaking-change';

function setup({ title, labels = [], removeLabelError } = {}) {
  const calls = { added: [], removed: [], failures: [], infos: [] };
  const github = {
    rest: {
      issues: {
        addLabels: async ({ labels }) => {
          calls.added.push(...labels);
        },
        removeLabel: async ({ name }) => {
          if (removeLabelError) {
            throw removeLabelError;
          }
          calls.removed.push(name);
        },
      },
    },
  };
  const context = {
    repo: { owner: 'thaim', repo: 'actions' },
    payload: title === undefined
      ? {}
      : { pull_request: { number: 1, title, labels: labels.map(name => ({ name })) } },
  };
  const core = {
    info: message => calls.infos.push(message),
    setFailed: message => calls.failures.push(message),
  };
  return { github, context, core, calls };
}

async function run(options) {
  const env = { ...process.env };
  process.env.TYPE_LABELS = TYPE_LABELS;
  process.env.BREAKING_LABELS = options.breakingLabels ?? BREAKING_LABELS;
  const fixture = setup(options);
  try {
    await sync(fixture);
  } finally {
    process.env = env;
  }
  return fixture.calls;
}

test('adds the type label when it is missing', async () => {
  const calls = await run({ title: 'fix: correct the permission' });
  assert.deepEqual(calls.added, ['bug']);
  assert.deepEqual(calls.removed, []);
});

test('makes no API call when the labels already match', async () => {
  const calls = await run({ title: 'fix: correct the permission', labels: ['bug'] });
  assert.deepEqual(calls.added, []);
  assert.deepEqual(calls.removed, []);
  assert.deepEqual(calls.infos, ['Labels already up-to-date']);
});

test('replaces a stale type label', async () => {
  const calls = await run({ title: 'feat: add a workflow', labels: ['bug'] });
  assert.deepEqual(calls.removed, ['bug']);
  assert.deepEqual(calls.added, ['enhancement']);
});

test('adds the breaking label for a title marked with !', async () => {
  const calls = await run({ title: 'fix!: require issues permission' });
  assert.deepEqual(calls.added, ['bug', 'breaking-change']);
  assert.deepEqual(calls.removed, []);
});

test('adds the breaking label for a scoped title marked with !', async () => {
  const calls = await run({ title: 'feat(release)!: drop the v1 interface' });
  assert.deepEqual(calls.added, ['enhancement', 'breaking-change']);
});

test('applies every label of a multi-line input', async () => {
  const calls = await run({
    title: 'fix!: require issues permission',
    breakingLabels: 'breaking-change\nmajor',
  });
  assert.deepEqual(calls.added, ['bug', 'breaking-change', 'major']);
});

test('keeps the breaking label that is already present', async () => {
  const calls = await run({
    title: 'fix!: require issues permission',
    labels: ['bug', 'breaking-change'],
  });
  assert.deepEqual(calls.added, []);
  assert.deepEqual(calls.removed, []);
});

test('removes the breaking label once ! is dropped from the title', async () => {
  const calls = await run({
    title: 'fix: require issues permission',
    labels: ['bug', 'breaking-change'],
  });
  assert.deepEqual(calls.removed, ['breaking-change']);
  assert.deepEqual(calls.added, []);
});

test('leaves labels it does not manage untouched', async () => {
  const calls = await run({
    title: 'chore: Release for v2.0.0',
    labels: ['tagpr', 'tagpr:major'],
  });
  assert.deepEqual(calls.removed, []);
  assert.deepEqual(calls.added, ['chore']);
});

test('falls back to the other label for an unknown type', async () => {
  const calls = await run({ title: 'perf: speed up the lookup' });
  assert.deepEqual(calls.added, ['other']);
});

test('applies no breaking label when the input is empty', async () => {
  const calls = await run({ title: 'fix!: require issues permission', breakingLabels: '' });
  assert.deepEqual(calls.added, ['bug']);
});

test('ignores a 404 from removeLabel', async () => {
  const calls = await run({
    title: 'feat: add a workflow',
    labels: ['bug'],
    removeLabelError: Object.assign(new Error('Not Found'), { status: 404 }),
  });
  assert.deepEqual(calls.removed, []);
  assert.deepEqual(calls.added, ['enhancement']);
});

test('propagates a non-404 error from removeLabel', async () => {
  await assert.rejects(
    run({
      title: 'feat: add a workflow',
      labels: ['bug'],
      removeLabelError: Object.assign(new Error('Forbidden'), { status: 403 }),
    }),
    /Forbidden/
  );
});

test('fails when the event carries no pull request', async () => {
  const calls = await run({});
  assert.deepEqual(calls.failures, ['This action must run on a pull_request event']);
  assert.deepEqual(calls.added, []);
});
