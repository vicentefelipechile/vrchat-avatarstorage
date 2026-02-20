# アクションメニュー (Action Menu)

<span class="badge badge-blue">Logic</span> <span class="badge badge-purple">Workflow</span>

## はじめに
**アクションメニュー**（エクスプレッションメニューとも呼ばれます）は、VRChat内でアニメーションの再生、衣装の着せ替え、アバターのパラメーター変更などに使用するラジアルメニューです [1]。

従来、クリエイターは小さな変更をテストするたびにアバターをVRChatにアップロードしていましたが、これには非常に時間がかかります。幸いなことに、このメニューを**Unity上で直接**シミュレートできるツールが存在し、トグルやスライダーの動作を即座に確認することができます。

---

## シミュレーションツール

コミュニティで推奨されており、**VRChat Creator Companion (VCC)** と互換性のある主なツールは2つあります。

### 1. Gesture Manager (BlackStartx氏作)
ゲーム内での見え方そのままにラジアルメニューを視覚化できる、最もポピュラーなツールです。ジェスチャー、コンタクト、パラメーターを直感的にテストできます。

> [!NOTE]
> インストール方法や全機能の詳細なガイドについては、専用の記事を参照してください：**[Gesture Manager エミュレーター](/wiki?topic=gesture-manager-emulator)**。

### 2. Avatars 3.0 Emulator (Lyuma氏作)
こちらはよりテクニカルで強力なツールで、アバターの背後にある複雑なロジックのデバッグに最適です。

*   **インストール:** VCCまたはGitHub経由で入手可能です。[VRCFury](/wiki?topic=vrcfury) などのツールと一緒に自動的にインストールされることもよくあります [3]。
*   **使い方:**
    1.  `Tools` > `Avatar 3.0 Emulator` を開きます。
    2.  **Play Mode** に入ると、コントロールパネルが生成されます。
    3.  [パラメーター](/wiki?topic=parameter)の値を強制的に変更したり、 Animatorのどのレイヤーが再生されているかをリアルタイムで確認したりできます。

---

## どちらを使うべきか？

| 特徴 | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **ビジュアルインターフェース** | 非常に優れている（ラジアル） | 基本的（ボタン/スライダー） |
| **メニューのテスト** | 可能 | 限定的 |
| **ロジックのデバッグ** | 基本的 | 高度 |
| **ジェスチャーのテスト** | 簡単（ボタン） | 手動（Animator） |

**推奨:** トグルや衣装のテストの大部分には **Gesture Manager** を使用してください。アニメーションが意図通りに動作せず、「内部」で何が起きているかを確認する必要がある場合は **Av3 Emulator** を使用してください。

---

## Build & Test（公式の代替案）
ネットワーク接続や他者とのインタラクション（[PhysBones](/wiki?topic=parameter) など）が必要なものをテストする場合は、公式SDKの **Build & Test** 機能を使用してください [1]:
1.  `VRChat SDK Control Panel` を開きます。
2.  `Builder` タブ内の「Offline Testing」セクションを探します。
3.  `Build & Test` をクリックします。
4.  Unityがアバターをビルドし、サーバーにアップロードすることなく、自分だけが確認できるVRChat of the local instance を起動します。

---

## 参考文献

[1] VRChat. (n.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[2] BlackStartx. (n.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[3] Lyuma. (n.d.). *Av3Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
