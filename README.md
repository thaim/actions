# thaim/actions

複数リポジトリで共用する Composite Actions と Reusable Workflows を管理するリポジトリ。

## Reusable Workflows

### reusable-pr-check

PR title が [conventional commit](https://www.conventionalcommits.org/) 形式に従うことを [amannn/action-semantic-pull-request](https://github.com/amannn/action-semantic-pull-request) で検証し、[bcoe/conventional-release-labels](https://github.com/bcoe/conventional-release-labels) で適切なラベルを付与します。
対応する type は `feat`, `fix`, `ci`, `docs`, `refactor`, `chore` で、それぞれ `enhancement`, `bug`, `ci`, `documentation`, `refactor`, `chore` ラベルにマッピングされます。

```yaml
name: PR Check

on:
  pull_request:
    types: [opened, edited, synchronize]

jobs:
  pr-check:
    uses: thaim/actions/.github/workflows/reusable-pr-check.yml@v1.0.2
```

### reusable-release

[Songmu/tagpr](https://github.com/Songmu/tagpr) によるリリースフローを提供します。main ブランチへの push 時にリリース PR を自動作成し、リリース PR がマージされると自動的にタグを付与します。

```yaml
name: Release

on:
  push:
    branches: [main]

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

## License

MIT
