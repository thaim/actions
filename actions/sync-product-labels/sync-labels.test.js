'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const sync = require('./sync-labels.js');

const PRODUCT_LABELS = JSON.stringify({
  'packages/foo': 'product:foo',
  'packages/bar/': 'product:bar',
});

const COMMON_LABEL = 'product:common';

function setup({ files, labels = [], removeLabelError } = {}) {
  const calls = { added: [], removed: [], failures: [], infos: [] };
  const listFiles = async () => {};
  const github = {
    paginate: async (method) => {
      assert.equal(method, listFiles);
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
    payload: files === undefined
      ? {}
      : { pull_request: { number: 1, labels: labels.map(name => ({ name })) } },
  };
  const core = {
    info: message => calls.infos.push(message),
    setFailed: message => calls.failures.push(message),
  };
  return { github, context, core, calls };
}

async function run(options) {
  const env = { ...process.env };
  process.env.PRODUCT_LABELS = PRODUCT_LABELS;
  process.env.COMMON_LABEL = options.commonLabel ?? COMMON_LABEL;
  const fixture = setup(options);
  try {
    await sync(fixture);
  } finally {
    process.env = env;
  }
  return fixture.calls;
}

test('adds the label of the changed product', async () => {
  const calls = await run({ files: ['packages/foo/main.go'] });
  assert.deepEqual(calls.added, ['product:foo']);
  assert.deepEqual(calls.removed, []);
});

test('adds the label of every changed product', async () => {
  const calls = await run({ files: ['packages/foo/main.go', 'packages/bar/main.go'] });
  assert.deepEqual(calls.added, ['product:foo', 'product:bar']);
});

test('adds the common label for a file outside every product', async () => {
  const calls = await run({ files: ['.github/workflows/test.yml'] });
  assert.deepEqual(calls.added, ['product:common']);
});

test('adds both the product and the common label for a mixed change', async () => {
  const calls = await run({ files: ['packages/foo/main.go', 'go.mod'] });
  assert.deepEqual(calls.added, ['product:foo', 'product:common']);
});

test('does not match a directory that only shares the prefix', async () => {
  const calls = await run({ files: ['packages/foobar/main.go'] });
  assert.deepEqual(calls.added, ['product:common']);
});

test('counts the source path of a renamed file', async () => {
  const calls = await run({
    files: [{ filename: 'packages/bar/util.go', previous_filename: 'packages/foo/util.go' }],
  });
  assert.deepEqual(calls.added, ['product:bar', 'product:foo']);
});

test('makes no API call when the labels already match', async () => {
  const calls = await run({ files: ['packages/foo/main.go'], labels: ['product:foo'] });
  assert.deepEqual(calls.added, []);
  assert.deepEqual(calls.removed, []);
  assert.deepEqual(calls.infos, ['Labels already up-to-date']);
});

test('removes a product label the PR no longer earns', async () => {
  const calls = await run({ files: ['packages/foo/main.go'], labels: ['product:foo', 'product:bar'] });
  assert.deepEqual(calls.removed, ['product:bar']);
  assert.deepEqual(calls.added, []);
});

test('leaves labels it does not manage untouched', async () => {
  const calls = await run({ files: ['packages/foo/main.go'], labels: ['enhancement', 'tagpr'] });
  assert.deepEqual(calls.removed, []);
  assert.deepEqual(calls.added, ['product:foo']);
});

test('applies no common label when the input is empty', async () => {
  const calls = await run({ files: ['packages/foo/main.go', 'go.mod'], commonLabel: '' });
  assert.deepEqual(calls.added, ['product:foo']);
});

test('ignores a 404 from removeLabel', async () => {
  const calls = await run({
    files: ['packages/foo/main.go'],
    labels: ['product:bar'],
    removeLabelError: Object.assign(new Error('Not Found'), { status: 404 }),
  });
  assert.deepEqual(calls.removed, []);
  assert.deepEqual(calls.added, ['product:foo']);
});

test('propagates a non-404 error from removeLabel', async () => {
  await assert.rejects(
    run({
      files: ['packages/foo/main.go'],
      labels: ['product:bar'],
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
