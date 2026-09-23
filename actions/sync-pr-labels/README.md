# sync-pr-labels

PR に、変更の種別と変更したプロダクトを表すラベルを付与する composite action です。通常は [reusable-conventional-pr](../../README.md#reusable-conventional-pr) から呼び出します。

付与したラベルは [reusable-release](../../README.md#reusable-release) の tagpr と release-drafter が version bump の判定と CHANGELOG・リリースノートの生成に使います。

## 付与するラベル

| 分類 | 判定元 | ラベル |
|------|--------|--------|
| 種別 | PR title の conventional commit type | `type_labels` で対応付けたラベル。対応がなければ `other` |
| 破壊的変更 | PR title の `!`（例: `fix!:`） | `breaking_labels` |
| プロダクト | PR の変更ファイル（rename 前のパスを含む） | 変更ファイルを含むディレクトリの `product_labels` のラベル。どのディレクトリにも属さないファイルがあれば `common_label` |

プロダクトのラベルはモノレポ向けの機能で、`product_labels` を指定した場合のみ付与します。

ラベルは PR の更新のたびに判定し直し、条件に合わなくなったラベルを外します。対象は上記の入力で指定したラベルと `other` のみで、それ以外のラベルは変更しません。

## 入力

| 入力 | 必須 | デフォルト | 説明 |
|------|------|----------|------|
| `type_labels` | yes | なし | type → ラベル名のマッピング（JSON 文字列） |
| `breaking_labels` | no | `breaking-change` | title が `!` で破壊的変更を示すときに付与するラベル（改行区切り）。空文字で無効化 |
| `product_labels` | no | `""` | プロダクトのディレクトリ → ラベル名のマッピング（JSON 文字列）。例: `{"packages/foo": "product:foo"}` |
| `common_label` | no | `product:common` | どのプロダクトのディレクトリにも属さないファイルを変更したときに付与するラベル。空文字で無効化 |
| `github_token` | no | `github.token` | 変更ファイルの取得とラベル操作に使うトークン |

`pull_request` イベントで実行し、`pull-requests: write` 権限が必要です。
