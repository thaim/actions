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

const PRODUCT_LABELS = JSON.stringify({
  'packages/foo': 'product:foo',
  'packages/bar/': 'product:bar',
});

function setup({ title, labels = [], files = [], removeLabelError } = {}) {
  const calls = { added: [], removed: [], failures: [], infos: [], listedFiles: 0 };
  const listFiles = async () => {};
  const github = {
    paginate: async (method) => {
      assert.equal(method, listFiles);
      calls.listedFiles++;
      return files.map(f => (typeof f === 'string' ? { filename: f } : f));
    },
    rest: {
      pulls: { listFiles },
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
  process.env.PRODUCT_LABELS = options.productLabels ?? '';
  process.env.COMMON_LABEL = options.commonLabel ?? 'product:common';
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

test('does not list the changed files when product labels are unset', async () => {
  const calls = await run({ title: 'fix: correct the permission', files: ['packages/foo/main.go'] });
  assert.equal(calls.listedFiles, 0);
  assert.deepEqual(calls.added, ['bug']);
});

test('adds the label of the changed product', async () => {
  const calls = await run({
    title: 'fix: correct the permission',
    productLabels: PRODUCT_LABELS,
    files: ['packages/foo/main.go'],
  });
  assert.deepEqual(calls.added, ['bug', 'product:foo']);
});

test('adds the label of every changed product', async () => {
  const calls = await run({
    title: 'fix: correct the permission',
    productLabels: PRODUCT_LABELS,
    files: ['packages/foo/main.go', 'packages/bar/main.go'],
  });
  assert.deepEqual(calls.added, ['bug', 'product:foo', 'product:bar']);
});

test('adds the common label for a file outside every product', async () => {
  const calls = await run({
    title: 'ci: pin the checkout action',
    productLabels: PRODUCT_LABELS,
    files: ['.github/workflows/test.yml'],
  });
  assert.deepEqual(calls.added, ['ci', 'product:common']);
});

test('adds both the product and the common label for a mixed change', async () => {
  const calls = await run({
    title: 'chore: bump the go version',
    productLabels: PRODUCT_LABELS,
    files: ['packages/foo/main.go', 'go.mod'],
  });
  assert.deepEqual(calls.added, ['chore', 'product:foo', 'product:common']);
});

test('does not match a directory that only shares the prefix', async () => {
  const calls = await run({
    title: 'fix: correct the permission',
    productLabels: PRODUCT_LABELS,
    files: ['packages/foobar/main.go'],
  });
  assert.deepEqual(calls.added, ['bug', 'product:common']);
});

test('counts the source path of a renamed file', async () => {
  const calls = await run({
    title: 'refactor: move the util',
    productLabels: PRODUCT_LABELS,
    files: [{ filename: 'packages/bar/util.go', previous_filename: 'packages/foo/util.go' }],
  });
  assert.deepEqual(calls.added, ['refactor', 'product:bar', 'product:foo']);
});

test('removes a product label the PR no longer earns', async () => {
  const calls = await run({
    title: 'fix: correct the permission',
    labels: ['bug', 'product:foo', 'product:bar'],
    productLabels: PRODUCT_LABELS,
    files: ['packages/foo/main.go'],
  });
  assert.deepEqual(calls.removed, ['product:bar']);
  assert.deepEqual(calls.added, []);
});

test('applies no common label when the input is empty', async () => {
  const calls = await run({
    title: 'chore: bump the go version',
    productLabels: PRODUCT_LABELS,
    commonLabel: '',
    files: ['packages/foo/main.go', 'go.mod'],
  });
  assert.deepEqual(calls.added, ['chore', 'product:foo']);
});

test('fails when the event carries no pull request', async () => {
  const calls = await run({});
  assert.deepEqual(calls.failures, ['This action must run on a pull_request event']);
  assert.deepEqual(calls.added, []);
});
