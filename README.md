# thaim/actions

複数リポジトリで共用する Composite Actions と Reusable Workflows を管理するリポジトリ。

## Reusable Workflows

### reusable-conventional-pr

PR に対して conventional commit 規約の準拠を保証する reusable workflow です。PR title を [amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request) で検証し、title の type に対応するラベルを [thaim/actions/actions/sync-pr-labels](actions/sync-pr-labels) で付与します。
デフォルトで対応する type は `feat`, `fix`, `ci`, `docs`, `refactor`, `chore` で、それぞれ `enhancement`, `bug`, `ci`, `documentation`, `refactor`, `chore` ラベルにマッピングされます。

```yaml
name: Conventional PR

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  conventional-pr:
    uses: thaim/actions/.github/workflows/reusable-conventional-pr.yml@v1.0.2
```

許可する type やラベルマッピングをカスタマイズする場合は `types` / `type_labels` を指定します。`types` に追加した type は、`other` ラベル付与を避けるため `type_labels` にも同じキーを追加してください。

```yaml
jobs:
  conventional-pr:
    uses: thaim/actions/.github/workflows/reusable-conventional-pr.yml@v1.0.2
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

### reusable-release

[Songmu/tagpr](https://github.com/Songmu/tagpr) によるリリースフローを提供します。main ブランチへの push 時にリリース PR を自動作成し、リリース PR がマージされると自動的にタグを付与します。

リリース PR (branch 名が `tagpr-from-` で始まる PR) に `tagpr:major` または `tagpr:minor` ラベルを付与すると workflow が再実行され、version bump が再計算されます。これを有効化するには呼び出し側で `pull_request: types: [labeled, unlabeled]` を on に追加してください。

```yaml
name: Release

on:
  push:
    branches: [main]
  pull_request:
    types: [labeled, unlabeled]

jobs:
  release:
    uses: thaim/actions/.github/workflows/reusable-release.yml@v1.0.2
```

### reusable-gha-security

GitHub Actions ワークフローに対して [actionlint](https://github.com/rhysd/actionlint)、[ghalint](https://github.com/suzuki-shunsuke/ghalint)、[zizmor](https://github.com/woodruffw/zizmor) によるセキュリティチェックを実行します。
PRでは [reviewdog](https://github.com/reviewdog/reviewdog) によるインラインコメントで問題箇所を通知します。

```yaml
name: Security

on:
  push:
    branches: [main]
  pull_request:

jobs:
  security:
    uses: thaim/actions/.github/workflows/reusable-gha-security.yml@v1.0.2
```

## Development

Composite action を変更する際は、composite action 修正の PR と reusable workflow 内の SHA 更新の PR を分けて作成する。詳細は [CLAUDE.md #開発フロー](CLAUDE.md#開発フロー) を参照。

## License

MIT
