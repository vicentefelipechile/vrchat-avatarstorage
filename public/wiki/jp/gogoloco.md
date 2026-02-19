# Gogo Loco

<span class="badge">推奨</span>

## 概要
Gogo Locoは、**franada** [1] によって作成されたVRChatアバター用の高度なロコモーションシステムです。「フルボディトラッキング」を持たないデスクトップおよびVRユーザーが、通常は利用できないポーズ、飛行、アバター調整機能にアクセスできるようにします。

## 何ができるの？
- **静的ポーズ：** どこでも座ったり、横になったり、さまざまな芸術的なポーズをとることができます。
- **フルボディシミュレーション：** 脚にトラッカーがあるかのようなアニメーションが含まれています。
- **飛行：** 衝突判定やジャンプ制限のあるワールドでも飛行できます。
- **高さ調整：** ゲーム内でアバターのサイズを調整できます。
- **固定モード：** 物理的に移動せずにアバターを視覚的に移動できます（写真撮影に便利です）。

> [!NOTE]
> 注意
> 手動でインストールすることも可能ですが、インストールを容易にし、他のメニューとの競合を避けるために、**VRCFury** の使用を強くお勧めします。

## 入手場所
- [GitHub - Gogo Loco (無料)](https://github.com/franada/gogo-loco)
- [Gumroad - Gogo Loco (制作者を支援)](https://franadavrc.gumroad.com/l/gogoloco)

## 持っていないモデルに追加できますか？
はい、**Gogo Loco** は、主に1つの要件を満たしていれば、実質的にどのアバターにも追加できます：
- **人型アバターであること**（またはUnityでリグがHumanoidとして設定されていること）。

「ジェネリック」または非人型アバター（浮遊物、人間の骨格を持たない複雑な蜘蛛など）は、Gogo Locoが特定の人間の骨（腰、脚、背中）を操作するため、問題が発生したり、正しく動作しない場合があります。

## 前提条件
始める前に、以下が揃っていることを確認してください：
- **Unity：** VRChat推奨バージョン（現在は2022.3.22f1など）。
- **VRChat SDK：** プロジェクトにインストール済み (VCC)。
- **Gogo Loco：** ダウンロードした `.unitypackage` ファイル（無料版または有料版）。
- **VRCFury（オプションですが推奨）：** 簡単なインストール用。
- **Avatar 3.0 Manager（オプション）：** 手動インストール用。

## ステップバイステップ・インストールガイド

アバターに Gogo Loco をインストールするには、主に2つの方法があります。ニーズに合った方法を選択してください。

---

### 方法1：VRCFuryを使用する（推奨・簡単）
これは最も簡単で自動化されており、エラーが発生しにくい方法です [3]。

1. **VRCFuryのインストール：** VRChat Creator Companion (VCC) を介してプロジェクトに **VRCFury** がインストールされていることを確認してください。
2. **Gogo Locoのインポート：** Gogo Locoの `.unitypackage` ファイルをプロジェクトの `Assets` フォルダにドラッグするか、ダブルクリックしてインポートします。
3. **プレハブ (Prefab) を探す：**
   - Unityの `Project` ウィンドウで、`Assets/GoGo/Loco/Prefabs` フォルダに移動します。
   - **GoGo Loco Beyond** という名前のプレハブを探します。
     - *注意：* "Beyond" には、飛行、スケール、ポーズ機能が含まれています。一部の機能のみ必要な場合は、他のフォルダを確認してください。
4. **アバターへのインストール：**
   - **GoGo Loco Beyond** プレハブをドラッグして、ヒエラルキー (`Hierarchy`) 内の**あなたのアバターに直接ドロップ**します。プレハブはアバターの「子オブジェクト」(child) になるはずです。
   - 完了！他に設定する必要はありません。
5. **アップロード：** アバターをVRChatにアップロードすると、VRCFuryがプレハブを検出し、必要なすべてのコントローラー、メニュー、パラメーターを自動的に統合します。

---

### 方法2：Avatar 3.0 Managerを使用した手動インストール
VRCFuryを使用したくない場合や、完全に制御したい場合は、パラメーターやレイヤーをコピーする際の人為的ミスを避けるためにこのツールを使用してください [4]。

1. **VRLabs Avatar 3.0 Manager：** この無料ツールをダウンロードしてインポートします（GitHubまたはVCCで入手可能）。
2. **Gogo Locoのインポート：** パッケージをUnityにインポートします。
3. **Avatar 3.0 Managerを開く：** 上部メニューの `VRLabs` -> `Avatar 3.0 Manager` に移動します。
4. **アバターの選択：** アバターをツールの「Avatar」フィールドにドラッグします。
5. **コントローラーの統合 (FX)：**
   - "FX" セクションで、オプションを展開します。
   - **"Add Animator to Merge"** をクリックします。
   - Gogo Loco FXコントローラー（通常 `GoGo/Loco/Controllers` にあります）を選択します。
   - **"Merge on Current"** をクリックします。これにより、上書きせずにGogo Locoのレイヤーがあなたのものと統合されます。
6. **パラメーターのコピー：**
   - Managerの **"Parameters"** タブに移動します。
   - **"Copy Parameters"** オプションを選択します。
   - Gogo Locoのパラメーターリストをソースとして選択し、アバターにコピーします。
7. **メニューの追加：**
   - インスペクターでアバターの **VRChat Avatar Descriptor** に移動します。
   - **Expressions Menu** セクションを見つけます。
   - メインメニューを開きます（ファイルをダブルクリック）。
   - 新しいコントロールを追加します (Control -> Add Control)。
   - 名前を "Gogo Loco" にします。
   - タイプ：**Sub Menu**。
   - Parameter：None。
   - Sub Menu：ここに `GoGo Loco Menu`（または `GoGo Loco All`）メニューをドラッグします。
8. **Action & Base レイヤー（オプション）：**
   - カスタムの座りポーズや「afk」アニメーションが必要な場合は、Avatar Descriptorで **Action** および **Base** レイヤーに対して統合手順を繰り返します。

> [!WARNING]
> 警告：Write Defaults
> Gogo Locoは通常、**Write Defaults OFF** [1] で最適に動作します。アバターが "Mixed Write Defaults"（ONとOFFの混在）を使用している場合、奇妙な挙動が発生する可能性があります。VRCFuryは通常これを自動的に修正しますが、手動で行う場合は注意が必要です。

---

## 参考文献

[1] Franada. (n.d.). *Gogo Loco*. GitHub. https://github.com/franada/gogo-loco

[2] Franada. (n.d.). *Gogo Loco*. Gumroad. https://franadavrc.gumroad.com/l/gogoloco

[3] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[4] VRLabs. (n.d.). *Avatar 3.0 Manager*. GitHub. https://github.com/VRLabs/Avatars-3.0-Manager
