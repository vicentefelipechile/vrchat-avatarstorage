# ステップバイステップガイド：VCCを使用したUnityの準備
ダウンロードしたアバターをインポートする「前」に、これらの手順に従ってください

> [!NOTE]
> メモ
> Unityをご自身で直接インストールしたり、操作したり、管理したりする必要はありません。プロジェクトの準備や依存パッケージのインストールプロセスはすべてVCC内で行われます。アバターをインポートしてアップロードする最後の段階でのみUnityを開きます。

### ステップ 1：VRChat Creator Companion (VCC) のインストール
[vrchat.com/home/download](https://vrchat.com/home/download) から **VRChat Creator Companion** をダウンロードします。**VCC**は、Unity、VRChat SDK、すべての必要なパッケージを自動的に管理する公式ツールです。

### ステップ 2：VCC経由でUnity HubとUnityをインストールする
初めてVCCを開いたとき、Unityがインストールされているかどうかが検出されます。セットアップウィザードに従うと、**Unity Hub**がインストールされ、次にVRChatで必要とされる正しいバージョンの **Unity** (現在は2022.3シリーズ) がダウンロードされます。VCCに両方のプログラムを自動的にインストールさせてください。

### ステップ 3：新しいアバタープロジェクトの作成
VCCを開き、**Projects** → **Create New Project**の順に進みます。**"Avatars"**テンプレートを選択します。プロジェクト名（例："VRChat Avatars"）を付けます。VCCが自動的に**VRChat SDK**を含むプロジェクトを準備します。

### ステップ 4：Poiyomiリポジトリの追加
VCCで、**Settings** → **Packages** → **Add Repository**の順に進みます。次のURLを貼り付けます：[https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) し、「Add」をクリックします。これにより、簡単に**Poiyomi**をインストールできるようになります。アバターのテクスチャを正しく表示するために重要です。詳細は[Poiyomiに関するガイド](/wiki?topic=poiyomi)で確認できます。

### ステップ 5：VRCFuryリポジトリの追加 (任意)
アバターに必要な場合、**Settings** → **Packages** → **Add Repository**の順に進み、[https://vcc.vrcfury.com](https://vcc.vrcfury.com) を貼り付けて「Add」をクリックします。**VRCFury**を使用すると、ドラッグアンドドロップで服やアクセサリーを簡単に取り付けることができます。詳細については、[VRCFuryに関するガイド](/wiki?topic=vrcfury)を確認することをお勧めします。

### ステップ 6：プロジェクトにパッケージをインストールする
VCCで、新しく作成したプロジェクトを選択し、**Manage Project**をクリックします。**"Poiyomi Toon Shader"**を検索し、**"+"**ボタンをクリックして追加します。VRCFuryが必要な場合は、同じボタンを使用して追加します。**"Apply"**をクリックするか、単にロードされるのを待ちます。

### ステップ 7：プロジェクトを開き、アバターをインポートする
VCCのプロジェクトメニューで **"Open Project"** をクリックして、初めてUnityを開きます（時間がかかる場合があります）。開いたら、アバターをインポートします：**.unitypackage**ファイルをUnityウィンドウの（`Project`または`Assets`タブに）ドラッグするか、**Assets → Import Package → Custom Package**を使用します。

### ステップ 8：確認と設定
**アバターのプレハブ**をシーン（Scene）にドラッグします。すべてが正しく、Poiyomiがインストールされていれば、**マゼンタ色（ピンク色）のマテリアルは表示されません**。**VRChat SDK → Show Control Panel → Builder**を使用してアバターを設定します。**"Auto Fix"**でエラーを解決し、**"Build & Publish"**を使用してアップロードします。

> [!TIP]
> 重要なヒント
> VCCはすべてを簡素化します。インターネットで正しいバージョンのUnityを探したり、互換性の問題に対処したりする必要はもうありません。VRChatプロジェクトを管理するための心臓部として常にVCCを使用してください。

---

## 参考文献

[1] VRChat Inc. (日付なし). *VRChat Creator Companion*. VRChat. https://vrchat.com/home/download

[2] Unity Technologies. (日付なし). *Unity Hub*. Unity. https://unity.com/download

[3] Poiyomi. (日付なし). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader

[4] VRCFury. (日付なし). *VRCFury Documentation*. https://vrcfury.com
