# Inside View

<span class="badge badge-blue">ビジュアル</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## これはなに？
**Inside View**は、**Liindy** [1]によって作成されたVRChatアバター用のアセットで、擬似的な視覚的深度を追加することで、メッシュの内部（SPSの穴など）を見ることができるようにします。

単にメッシュの背面を削除する（バックフェイスカリング）のとは異なり、Inside Viewは「Screen Shader」を使用して穴の内部に深度テクスチャを投影し、複雑な内部ジオメトリをモデリングすることなく、リアルな内部の錯覚を作り出します。[SPS](./sps.md)などのシステムと一緒によく使用され、ERP中の視覚化を向上させます。

## 主な特徴
- **擬似深度:** トンネルや詳細な内部の錯覚を作り出します。
- **最適化:** シェーダーを使用して、重い余分なジオメトリを回避します。
- **SPS統合:** SPSの挿入と連携して動作するように設計されています[3]。
- **簡単なインストール:** **VRCFury**と互換性があり、「ドラッグ＆ドロップ」で設定できます[2]。

## 前提条件
- **Unity:** VRChatに推奨されるバージョン（現在は2022.3.22f1など）[1]。
- **VRChat SDK 3.0:** (Avatars) VCC経由でダウンロード[1]。
- **VRCFury:** 自動インストールに必要です[2]。
- **Poiyomi Toon Shader:** (オプションですが推奨) マテリアルの互換性のためにバージョン8.1以上[3]。

## インストールガイド

> [!NOTE]
> このガイドは、作成者が推奨する公式の方法である**VRCFury**の使用を前提としています。

### ステップ 1: インポート
JinxxyまたはGumroadからパッケージ（無料または有料）を入手したら：
1. SDKとVRCFuryがすでにインストールされているUnityプロジェクトを開きます。
2. **Inside View**の `.unitypackage` をインポートします。

### ステップ 2: 配置 (VRCFury)
1. アセットフォルダ（通常は `Assets/Liindy/Inside View`）でInside Viewプレハブを探します。
2. プレハブをドラッグして、アバターの階層内にドロップします。
   - **重要:** 穴（またはSPS Socket）があるボーンまたはオブジェクトの「子」として配置してください。
3. SPSの「Socket」オブジェクトと「Inside View」が同じ位置と回転に揃っていることを確認してください。

### ステップ 3: 深度設定
このアセットは深度アニメーション（Depth Animation）によって機能します。
1. Inside ViewプレハブのVRCFuryコンポーネントを選択します。
2. それが穴の正しい**Renderer**（メッシュ）を指していることを確認してください。
3. アバターをアップロードすると、VRCFuryは必要なメニューとロジックを自動的にマージします。

### 追加の注意点
- **パラメータコスト:** 「Full」バージョンは最大35ビットのパラメータメモリを使用する可能性がありますが、「Standard」バージョンは約17を使用します。アバターにすでに多くのパラメータがある場合は、この点に注意してください[1]。
- **バックフェイスカリング:** 効果が正しい角度から見えるように、シェーダーの指示に従って穴のマテリアルの「Cull」を「Off」または「Back」に設定してください。

---

## 参考文献

[1] Liindy. (n.d.). *Inside View (VRCFury)*. Jinxxy. https://jinxxy.com/Liindy/InsideView

[2] VRModels. (n.d.). *Liindy – Inside View*. VRModels Store. https://vrmodels.store/avatars/7010-liindy-inside-view.html

[3] Liindy. (n.d.). *Inside View*. Gumroad. https://liindy.gumroad.com/l/InsideView
