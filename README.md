# GUIOSappstore

[GUIOS](https://github.com/prak59459-create/GUIOS) / Nebula 5 Gate 用のアプリ配布リポジトリです。
このリポジトリの `main` ブランチに置かれた `catalog.json` を、OS 側の「ストア」アプリが直接
fetch してアプリ一覧を表示・インストールします。

```
https://raw.githubusercontent.com/prak59459-create/GUIOSappstore/main/catalog.json
```

## アプリを追加する

1. アプリ本体は **HTML1ファイル** にまとめ、このリポジトリのどこか（ルート直下や任意のフォルダ）に置く。
2. ファイルの一番先頭に、次の形式のマニフェストコメントを書く（`GUIOS-APP` / `N5-APP` どちらも可）。

   ```html
   <!--GUIOS-APP {"id":"my-app","name":"マイアプリ","icon":"🧩","color":"#22d3ee","version":"1.0.0","author":"あなた","description":"アプリの説明"}-->
   ```

3. `main` ブランチに push する。

これだけで `catalog.json` が **自動生成・自動コミット**されます（`.github/workflows/build-catalog.yml`
が `*.html` の変更を検知して `scripts/build-catalog.js` を実行し、差分があれば
`github-actions[bot]` がその場で `catalog.json` をコミット・push します）。

手元で確認したいときは、ローカルでも同じスクリプトを実行できます。

```
node scripts/build-catalog.js
```

## catalog.json のスキーマ

`build-catalog.js` は、マニフェストが見つかった `*.html` ファイルごとに次の形の
エントリを生成します（余分なフィールドは無視されるだけなので安全です）。

```json
{
  "id": "mini-games-50",
  "name": "50in1ミニゲーム",
  "version": "3.0.0",
  "icon": "🎮",
  "color": "#e94560",
  "description": "説明文",
  "author": "あなた",
  "url": "https://raw.githubusercontent.com/prak59459-create/GUIOSappstore/main/50Games.html"
}
```

- `id` はマニフェストの `id`（なければファイル名）を英数字スラッグ化したもの。重複した場合は
  最初に見つかったファイルが優先され、警告がビルドログに出力されます。
- `url` は常にそのファイルの `main` ブランチ上の raw URL になります。
- マニフェストコメントが無い `*.html` ファイルはアプリとして扱われず、静かにスキップされます。

## なぜ自動生成にしているか

`catalog.json` を手で書くと、アプリを追加するたびに ID の重複や URL のタイプミスが起きやすく、
「ファイルは置いたのにストアに出てこない」という事故の元になります。`build-catalog.js` は
既存の各アプリの実ファイルだけを唯一の情報源として `catalog.json` を機械的に再構築するので、
リポジトリの内容と `catalog.json` が食い違うことがありません。
