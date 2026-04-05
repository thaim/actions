# thaim/actions

複数リポジトリで共用する Composite Actions と Reusable Workflows を管理するリポジトリ。

## GitHub Actions セキュリティチェック

GitHub Actions ワークフローに対するセキュリティチェックを提供します。
PRでは [reviewdog](https://github.com/reviewdog/reviewdog) によるインラインコメントで問題箇所を通知します。

| ツール | 用途 |
|--------|------|
| [actionlint](https://github.com/rhysd/actionlint) | ワークフロー YAML の構文チェック |
| [ghalint](https://github.com/suzuki-shunsuke/ghalint) | GitHub Actions のセキュリティベストプラクティスチェック |
| [zizmor](https://github.com/woodruffw/zizmor) | GitHub Actions ワークフローの脆弱性検出 |

### 再利用可能なワークフロー（推奨）

3つのチェックをまとめて実行できます。

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
