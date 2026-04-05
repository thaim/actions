# thaim/actions

複数リポジトリで共用する Composite Actions と Reusable Workflows を管理するリポジトリ。

## Reusable Workflows

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
