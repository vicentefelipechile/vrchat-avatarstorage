# Poiyomi Toon Shader

<span class="badge badge-blue">依存関係</span>

## これは何ですか？
PoiyomiはVRChat専用に設計されたUnity用シェーダーです。高度な視覚効果を使用してアバターにスタイライズされた漫画のような外観を作成できます。

## 何のためのものですか？
- カスタマイズ可能なスタイライズされたシェーディング（トゥーン、リアル、フラット）
- 特殊効果：アウトライン、デカール、グリッター、スパークル
- AudioLinkサポート（オーディオリアクティブエフェクト）
- 物理的に正確な反射とスペキュラー
- VRChatのパフォーマンスに最適化

> [!WARNING]
> 非常に重要
> Poiyomiはダウンロードしたアバターファイルに含まれていません。アバターを開く前にUnityに自分でインストールする必要があります。

## どこで入手できますか？
- **公式サイト (ダウンロード):** [poiyomi.com/download](https://poiyomi.com/download)
- **無料版:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Pro版:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## インストール方法は？

現在、プロジェクトにPoiyomiをインストールする主な方法は2つあります。VRChatコミュニティで推奨されている方法は **VCC (VRChat Creator Companion)** を使用することですが、従来の **UnityPackage** インポートを使用することもできます。

### 方法1: VCCによるインストール (推奨)

VCC (VRChat Creator Companion) を使用することは、アプリケーションから直接シェーダーを簡単に更新できるため、Poiyomiをインストールおよび管理するための最もクリーンで推奨される方法です。

1. **VCCにリポジトリを追加します：**
   - 最も簡単な方法は、公式のダウンロードページに行くことです：[poiyomi.com/download](https://poiyomi.com/download)。
   - 「Method 2」と書かれている場所までスクロールダウンし、**Creator Companion (VCC)** のセクションを見つけて、**「Add to VCC」** ボタンをクリックします。
   - ブラウザがVCCを開く許可を求めてきます。これを承認し、VCCに入ったら **「I Understand, Add Repository」** をクリックします。
   - *(手動の代替方法)*: VCCを開き、**Settings** -> **Packages**タブ -> **Add Repository**に行き、該当するスペースにURL `https://poiyomi.github.io/vpm/index.json` を貼り付けて **Add** をクリックします。
2. **プロジェクトにシェーダーを追加します：**
   - VCCでプロジェクトセクションに移動し、シェーダーをインストールしたいVRChatプロジェクトの **Manage Project** をクリックします。
   - **Selected Repos** セクション（サイドメニューまたはリポジトリの上部ドロップダウンリスト）で、**「Poiyomi's VPM Repo」** にチェックが入っていることを確認します。
   - プロジェクトで利用可能なパッケージのリストで **「Poiyomi Toon Shader」** を検索し、右側の **[+]** アイコンをクリックして追加します。
3. **完了です！** VCCで **Open Project** をクリックすると、UnityプロジェクトでPoiyomiが利用可能になります。

> [!NOTE]
> VCC経由でインストールしているときにウィンドウが予期せず閉じたとしても、それは正常です。修正するには、VCCを閉じて再度開き、もう一度VCC経由でインストールしてみてください。今度は正しく動作するはずです。

### 方法2: .unitypackageによる手動インストール

これは従来の方法です。将来的に更新が難しくなり、後でVCCの方法に切り替えようとすると、古いファイルが残る可能性があることに留意してください。

1. [GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases)のリリースベージから、またはPro版を使用している場合は[Patreon](https://www.patreon.com/poiyomi)アカウントから、最新の`.unitypackage`ファイルをダウンロードします。
2. アバターをインポートする予定のUnityプロジェクトを開きます。
3. Unityウィンドウの上部メニューからパッケージをインポートします：**Assets** → **Import Package** → **Custom Package...**
4. コンピューターにダウンロードした`.unitypackage`ファイルを選択します。
5. インポートするすべてのファイルのリストを示すウィンドウが表示されます。すべてが選択されていることを確認し（「All」ボタンを使用できます）、下の **Import** ボタンをクリックします。
6. プログレスバーが終了するのを待つと、インストールが完了します。これでプロジェクトのマテリアルにPoiyomiを割り当てる準備が整いました。

---

## 参考文献

Poiyomi. (n.d.). *Download*. Poiyomi Shaders. Retrieved from https://poiyomi.com/download

Poiyomi. (n.d.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Retrieved from https://github.com/poiyomi/PoiyomiToonShader
