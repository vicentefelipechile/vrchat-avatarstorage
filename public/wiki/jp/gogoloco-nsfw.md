# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## これは何ですか？
**NSFW Locomotion**は、**GoGo Loco**システム（元々はfranadaによって作成されました）のカスタマイズされた明示的なバージョンです。「アダルトテーマ」やERPアバター向けに特別に設計されており、ロコモーション機能を拡張して、暗示的または露骨なポーズやアニメーションを含んでいます。

オリジナルのGoGo Locoのすべての機能を維持しながら、親密なインタラクションのための特定のコンテンツを追加しています。

> [!WARNING]
> 重要
> **同じプロジェクトにNSFW Locomotionと通常のGogo Locoを同時にインストールしないでください。** メニューやレイヤー名を共有しているため、競合やエラーが発生します。どちらか一方だけを選択してください。

## 特徴
- **GoGo Locoベース:** すべての標準的な飛行、スケール、ポーズ機能が含まれています。
- **"Poses Only" バージョン:** 軽量で、追加の静止ポーズのみを追加します。
- **"Emotes + Poses" バージョン:** 完全なエモート、動的な動き、ロールプレイ用のカスタムアニメーションが含まれています。
- **簡単なインストール:** **VRCFury**との統合とワンクリックインストールスクリプト。

## どこで入手できますか？
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (VCC用)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## アバターにすでにGoGo Locoがある場合はどうすればいいですか？
警告で述べたように、**両方のシステムを同時にインストールすることはできません**。アバターにすでにGoGo Locoが付属している場合、または以前にインストールした場合は、Unityのエラーやメニューの破損を防ぐために、NSFW Locomotionを追加する前に完全に削除する必要があります。

### オリジナルのGoGo Locoをアンインストールする手順：
1. **VRCFuryでインストールした場合（簡単な方法）：**
   - Unityの階層（`Hierarchy`）でアバターの子としてGoGo Locoのプレハブを見つけ、削除します（右クリック -> `Delete`）。
2. **アバターに手動で統合した場合：**
   - **Playable Layers：** アバターを選択し、`VRC Avatar Descriptor`コンポーネントに移動して、「Playable Layers」まで下にスクロールします。GoGo Locoコントローラー（Base、Action、FX）を削除するか、アバターに付属していたオリジナルと交換します。
   - **パラメータとメニュー：** 同じコンポーネントで、パラメーターリスト（`Expressions Parameters`）を開き、GoGo Locoに属するもの（通常は`Go/`で始まる）をすべて削除します。次に、メニュー（`Expressions Menu`）を開き、GoGoサブメニューを開くボタンを削除します。
   - *（オプション）* そのプロジェクトで通常のGoGo Locoを使用している他のアバターがない場合は、`Assets`から`GoGo`フォルダーを削除します。

アバターが古いシステムから完全に消去されたら、通常どおりNSFW Locomotionをインストールできます。

## インストール方法は？ (VCCの使用を推奨)
最も簡単な方法は、**VRChat Creator Companion (VCC)**を使用することです。

1. **Lastation Package Listing (LPL)**リポジトリをVCCに追加します。
2. **NSFW Locomotion**パッケージを検索してインストールします。
3. VCC経由でプロジェクトに**VRCFury**もインストールされていることを確認してください。
4. Unityプロジェクトを開きます。
5. 上部メニューバーで、`LastationVRChat` -> `NSFW Locomotion`に移動します。
6. アバターを選択し、希望するバージョンを選択します：
   - **Full Version:** (エモート + ポーズ)
   - **Poses Version:** (ポーズのみ、軽量)

## 手動インストール
VCCを使用したくない場合（非推奨）：
1. GitHubから最新の「Release」をダウンロードします。
2. パッケージをUnityにインポートします。
3. 対応するプレハブをアバターにドラッグします（`(VRCFury)`と表示されているもの）。
   - 「Write Defaults」が有効な場合は`WD`を使用し、そうでない場合は通常バージョンを使用してください。

---

## 参考文献

LastationVRChat. (n.d.). *NSFW Locomotion* [コンピューターソフトウェア]. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Redditユーザー. (n.d.). *Help! How do i remove gogoloco from my avatar?* [オンラインフォーラムの投稿]. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
