# thaim/actions

複数リポジトリで共用する Composite Actions と Reusable Workflows を管理するリポジトリ。

## Reusable Workflows

いずれの workflow も、呼び出し側に各節の例と同じ `permissions` が必要です。reusable workflow は呼び出し側より広い権限を要求できないため、不足するとジョブが 1 つも生成されないまま run が `startup_failure` で終了します。

### Release Flow

`reusable-conventional-pr` と `reusable-release` はペアで利用することを前提とした reusable workflow です。前者が PR title の conventional commit 形式を検証して対応ラベル（`enhancement` / `bug` 等）を付与し、後者の tagpr がそのラベルと PR title を用いて version bump 判定と CHANGELOG 生成を行います。`reusable-release` を採用する場合は `reusable-conventional-pr` も併せて導入してください（ラベルが付かないと tagpr の version bump 判定が機能しません）。

### reusable-conventional-pr

PR に対して conventional commit 規約の準拠を保証する reusable workflow です。PR title を [amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request) で検証し、title の type に対応するラベルを [thaim/actions/actions/sync-pr-labels](actions/sync-pr-labels) で付与します。`reusable-release` とペアで運用する前提です（詳細は上記 [Release Flow](#release-flow) を参照）。
デフォルトで対応する type は `feat`, `fix`, `ci`, `docs`, `refactor`, `chore` で、それぞれ `enhancement`, `bug`, `ci`, `documentation`, `refactor`, `chore` ラベルにマッピングされます。`fix!:` のように title へ `!` を付けると `breaking-change` ラベルも付与され、`!` を外すと外れます。

```yaml
name: Conventional PR

on:
  pull_request:
    types: [opened, edited, synchronize]

permissions:
  contents: read
  pull-requests: write

jobs:
  conventional-pr:
    uses: thaim/actions/.github/workflows/reusable-conventional-pr.yml@v2.0.0
```

許可する type やラベルマッピングをカスタマイズする場合は `types` / `type_labels` を指定します。`types` に追加した type は、`other` ラベル付与を避けるため `type_labels` にも同じキーを追加してください。

```yaml
jobs:
  conventional-pr:
    uses: thaim/actions/.github/workflows/reusable-conventional-pr.yml@v2.0.0
    with:
      types: |
        feat
        fix
        perf
      type_labels: |
        {
          "feat": "enhancement",
          "fix": "bug",
          "perf": "performance"
        }
```

| 入力 | 必須 | デフォルト | 説明 |
|------|------|----------|------|
| `types` | no | `feat, fix, ci, docs, refactor, chore`（改行区切り） | 許可する conventional commit type の一覧 |
| `type_labels` | no | 上記 type → 対応ラベルの JSON マッピング | type → ラベル名のマッピング（JSON 文字列） |
| `breaking_labels` | no | `breaking-change`（改行区切り） | title が `!` で破壊的変更を示すときに付与するラベル。空文字で無効化 |
| `product_labels` | no | `""` | モノレポのプロダクトのディレクトリ → ラベル名のマッピング（JSON 文字列）。指定すると変更したプロダクトのラベルを付与する（[モノレポでの利用](#モノレポでの利用)） |
| `common_label` | no | `product:common` | どのプロダクトのディレクトリにも属さないファイルを変更したときに付与するラベル。空文字で無効化 |

### reusable-release

[Songmu/tagpr](https://github.com/Songmu/tagpr) によるリリースフローを提供します。main ブランチへの push 時にリリース PR を自動作成し、リリース PR がマージされると自動的にタグを付与します。version bump の判定や CHANGELOG 生成は PR に付与されたラベルと PR title を参照するため、`reusable-conventional-pr` とペアで運用してください（詳細は上記 [Release Flow](#release-flow) を参照）。

version bump は、前回のリリース以降にマージされた PR のラベルで決まります。`major` または `breaking-change`（`reusable-conventional-pr` が title の `!` から付与）が付いていれば major、`minor` なら minor、いずれも無ければ patch です。

リリース PR (branch 名が `tagpr-from-` で始まる PR) に `tagpr:major` または `tagpr:minor` ラベルを付与すると workflow が再実行され、version bump が再計算されます。これを有効化するには呼び出し側で `pull_request: types: [labeled, unlabeled]` を on に追加してください。

```yaml
name: Release

on:
  push:
    branches: [main]
  pull_request:
    types: [labeled, unlabeled]

permissions:
  contents: write
  pull-requests: write
  issues: read

jobs:
  release:
    uses: thaim/actions/.github/workflows/reusable-release.yml@v2.0.0
```

| 入力 | 必須 | デフォルト | 説明 |
|------|------|----------|------|
| `config` | no | `.tagpr` | tagpr の設定ファイルのパス |
| `release_drafter_config` | no | なし | `.github` 配下の [release-drafter](https://github.com/release-drafter/release-drafter) 設定ファイル名。指定すると GitHub Release を tagpr ではなく release-drafter が作成する |

#### モノレポでの利用

1 つのリポジトリで複数のプロダクトを独立にバージョニングする場合は、プロダクトごとに設定ファイルと workflow ファイルを用意します。CHANGELOG は tagpr がプロダクト単位でまとめ、GitHub Release は release-drafter が変更種別ごとに分類して作成します。

PR には `reusable-conventional-pr` の `product_labels` で、変更したプロダクトのラベル（`product:foo`）と、どのプロダクトにも属さないファイルを変更した場合の `product:common` を付与します。

```yaml
jobs:
  conventional-pr:
    uses: thaim/actions/.github/workflows/reusable-conventional-pr.yml@v2.0.0
    with:
      product_labels: |
        {
          "packages/foo": "product:foo",
          "packages/bar": "product:bar"
        }
```

```ini
# packages/foo/.tagpr
[tagpr]
	releaseBranch = main
	vPrefix = true
	versionFile = -
	tagPrefix = packages/foo
	changelogFile = packages/foo/CHANGELOG.md
	releaseYAMLPath = packages/foo/release.yml
```

```yaml
# packages/foo/release.yml（CHANGELOG 用）
changelog:
  exclude:
    labels: [tagpr]
  categories:
    - title: Changes
      labels: [product:foo, product:common]
```

```yaml
# .github/release-drafter-foo.yml（GitHub Release 用）
tag-prefix: packages/foo/
template: |
  $CHANGES
categories:
  - type: pre-include
    when:
      labels: [product:foo, product:common]
  - type: pre-exclude
    when:
      label: tagpr
  - title: Breaking Changes
    exclusive: true
    when:
      conventional:
        breaking: true
  - title: New Features & Bug Fixes
    when:
      conventional:
        types: [feat, fix]
  - title: Internal Changes
```

```yaml
# .github/workflows/release-foo.yml
name: Release foo

on:
  push:
    branches: [main]
    paths: ["packages/foo/**"]
  pull_request:
    types: [labeled, unlabeled]
    paths: ["packages/foo/**"]

permissions:
  contents: write
  pull-requests: write
  issues: read

jobs:
  release:
    uses: thaim/actions/.github/workflows/reusable-release.yml@v2.0.0
    with:
      config: packages/foo/.tagpr
      release_drafter_config: release-drafter-foo.yml
```

- `tagPrefix` と `paths` はプロダクトのディレクトリと一致させてください。tagpr はリリース PR を main へのコミットがあるたびに作成・更新するため、`paths` で他プロダクトの変更による実行を防ぎます
- `changelogFile` はプロダクトのディレクトリ内に置いてください。リリース PR の merge 時の push を `paths` に一致させ、タグを付与するためです
- release-drafter は前回の範囲を `tag-prefix` に一致する公開済みリリースから決めます。GitHub Release を下書きに戻したり削除したりしないでください

### reusable-gha-security

GitHub Actions ワークフローに対して [actionlint](https://github.com/rhysd/actionlint)、[ghalint](https://github.com/suzuki-shunsuke/ghalint)、[zizmor](https://github.com/woodruffw/zizmor) によるセキュリティチェックを実行します。
PRでは [reviewdog](https://github.com/reviewdog/reviewdog) によるインラインコメントで問題箇所を通知します。

```yaml
name: Security

on:
  push:
    branches: [main]
  pull_request:

permissions:
  contents: read
  pull-requests: write

jobs:
  security:
    uses: thaim/actions/.github/workflows/reusable-gha-security.yml@v2.0.0
```

## Development

Composite action を変更する際は、composite action 修正の PR と reusable workflow 内の SHA 更新の PR を分けて作成する。詳細は [CLAUDE.md #開発フロー](CLAUDE.md#開発フロー) を参照。

## License

MIT
