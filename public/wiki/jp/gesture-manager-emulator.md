# Gesture Manager エミュレーター

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## Gesture Manager とは？
**Gesture Manager**（BlackStartx氏開発）は、VRChatアバタークリエイターにとって不可欠なツールです。Unity内でアバターのアニメーション、ジェスチャー、メニューを直接プレビュー・編集できるため、変更のたびにゲームへアップロードしてテストする手間を省くことができます [1]。

VRChatのアニメーションシステムをほぼ完全にシミュレートしており、**ラジアルメニュー（エクスプレッションメニュー）**も含まれるため、トグルやスライダーが正しく動作するかを即座に確認できます。

---

## インストール

プロジェクトにこのツールをインストールするには、主に2つの方法があります。

### 方法 1: VRChat Creator Companion (推奨)
最も簡単な方法であり、プロジェクトに適合する最新バージョンを常に使用できます [2]。
1. **VRChat Creator Companion (VCC)** を開きます。
2. プロジェクトを選択します。
3. "Curated" パッケージがフィルタリングされていないことを確認します。
4. **"Gesture Manager"** を検索し、**"Add"** ボタンをクリックします。
5. Unityプロジェクトを開きます。

### 方法 2: 手動 (Unity Package)
VCCを使用していない場合や、特定のバージョンが必要な場合：
1. BlackStartx氏のGitHubの *Releases* セクション、または BOOTH ページから `.unitypackage` ファイルをダウンロードします [3]。
2. Unityプロジェクトにパッケージをインポートします（`Assets > Import Package > Custom Package`）。

---

## 主な特徴

*   **ラジアルメニュー 3.0:** VRChatのエクスプレッションメニューを忠実に再現。
*   **ジェスチャーエミュレーション:** インスペクター上のボタンを使用して、左右の手のジェスチャーをテスト可能。
*   **アクティブシーンカメラ:** ゲームカメラをシーンカメラと同期させ、PhysBonesやコンタクトのテストを容易にします。
*   **コンタクトのテスト:** マウスでクリックすることで *VRCContacts* を起動可能。
*   **パラメーターのデバッグ:** 全てのアバターパラメーターとその現在値をリスト表示。

---

## 使い方

1.  インストール後、上部バーから `Tools > Gesture Manager Emulator` を選択します。
2.  これにより、ヒエラルキーに `GestureManager` というオブジェクトが追加されます。
3.  Unityで **Play Mode** に入ります。
4.  ヒエラルキー内の `GestureManager` オブジェクトを選択します。
5.  **Inspector** ウィンドウにラジアルメニューと、アバターをテストするための全てのコントロールが表示されます。

> [!IMPORTANT]
> Unityの実行中にインスペクターでコントロールを表示するには、`GestureManager` オブジェクトを選択している必要があります。

---

## 参考文献

[1] BlackStartx. (n.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[2] VRChat. (n.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[3] VRChat. (n.d.). *VCC Documentation*. VRChat Creator Companion. https://vcc.docs.vrchat.com

[4] BlackStartx. (n.d.). *Gesture Manager*. Booth. https://blackstartx.booth.pm/items/3922472
