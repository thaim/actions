# CLAUDE.md

## 開発フロー

composite action (`actions/` 配下) を変更する場合、以下の2段階で PR を作成する:

1. **PR 1: composite action の変更**
   - composite action のコードを修正し、PR を作成してマージする
   - マージコミットの SHA を控える

2. **PR 2: reusable workflow の SHA 更新**（PR 1 のマージ後に作成する）
   - reusable workflow (`.github/workflows/reusable-*.yml`) の `uses:` の SHA を PR 1 のマージコミット SHA に更新する
   - コメントは `# PR#<PR番号>` の形式にする（PR 1 の番号）
   - PR を作成してマージする

## リリース

- tagpr がリリース PR を自動作成・タグ付けする
- リリースは composite action 単位ではなくリポジトリ全体で定期的に行う

## SHA コメントの規則

reusable workflow から同リポジトリの composite action を参照する際は、SHA 固定 + `# PR#<number>` 形式のコメントを付与する。

- 形式: `@<SHA> # PR#<number>`
- 例: `uses: thaim/actions/actions/run-ghalint@6f125b434752f00a844f9a7c7a672dab21e336b6 # PR#42`

以下は使用しない:

- `main` 等のブランチ名
- `v1` 等の参照先が変わるタグ
- `v1.3.3` 等の特定バージョンタグ

## 解決策提示の原則

解決策を提示する前に、その解決策が成立するための前提条件を列挙し、各前提条件が満たされることを検証する。検証できない前提条件がある場合は、その解決策を提示せず別の案を検討する。
