# ステップバイステップガイド：VCCを使用したUnityの準備
ダウンロードしたアバターをインポートする**前に**、以下の手順に従ってください

### ステップ1：VRChat Creator Companion (VCC)をインストール
[vrchat.com/home/download](https://vrchat.com/home/download)から**VRChat Creator Companion**をダウンロードします。**VCC**は、Unity、VRChat SDK、および必要なすべてのパッケージを自動的に管理する公式ツールです。

### ステップ2：新しいアバタープロジェクトを作成
VCCを開く → **Projects** → **Create New Project**。**"Avatars"**テンプレートを選択します。名前を付けます（例：「私のVRChatアバター」）。VCCは自動的に**Unity**と**VRChat SDK**をインストールします。

### ステップ3：Poiyomiリポジトリを追加
VCCで、**Settings** → **Packages** → **Add Repository**に移動します。このURLを貼り付けます：[https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json)、「Add」をクリックします。これにより、**Poiyomi**を簡単にインストールできます。

### ステップ4：VRCFuryリポジトリを追加（オプション）
アバターに必要な場合は、**Settings** → **Packages** → **Add Repository**で、[https://vcc.vrcfury.com](https://vcc.vrcfury.com)を貼り付け、「Add」をクリックします。**VRCFury**は、衣服やアクセサリーのインストールを容易にします。

### ステップ5：プロジェクトにパッケージをインストール
VCCで、プロジェクトを選択 → **Manage Project**。**"Poiyomi Toon Shader"**を見つけ、**"+"**ボタンをクリックして追加します。VRCFuryが必要な場合は、それも追加します。**"Apply"**をクリックします。

### ステップ6：プロジェクトを開いてアバターをインポート
VCCで、**"Open Project"**をクリックしてUnityを起動します。開いたら、アバターをインポートします：**.unitypackage**ファイルをUnityウィンドウにドラッグするか、**Assets → Import Package → Custom Package**を使用します。

### ステップ7：確認と設定
**アバターのプレハブ**をシーンにドラッグします。すべてが正しい場合、**マゼンタ色（ピンク）のマテリアルは表示されません**。**VRChat SDK → Show Control Panel → Builder**を使用してアバターを設定します。**"Auto Fix"**でエラーを修正し、**"Build & Publish"**でアップロードします。

> [!TIP]
> 重要なヒント
> VCCはすべてを簡素化します。Unityを手動でインストールしたり、正しいバージョンを探したりする必要はもうありません。VCCが自動的に行います。VRChatプロジェクトの管理には常にVCCを使用してください。
