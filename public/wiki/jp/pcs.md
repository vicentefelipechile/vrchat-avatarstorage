# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">オーディオ</span>

## これはなに？
**PCS** (Penetration Contact System) は、**Dismay** [1]によって作成されたVRChatアバター用の補助システムで、**Contacts** (Contact Senders および Receivers) を使用して、性的関係 (ERP) に高度な双方向性を追加します。

主な機能は、**聴覚フィードバック**（音）を生成することです。オプションで、振動（ハプティクス）によって実際の大人のおもちゃを制御することもできます[3][4]。

### 主な違い
- **OSCなし (基本):** システムは、ゲーム内で「叩く」、「滑る」、「液体」の音を再生します。近くにいる全員がそれを聞くことができます。VRChat内で自律的に動作します[1]。
- **OSCあり (高度/オプション):** データをVRChatの外に送信し、挿入と同期して大人のおもちゃ（Lovenseなど）を振動させます。

## 基本機能 (音)
これはPCSのデフォルト機能であり、**外部ソフトウェアは必要ありません**。

1. **検出:** 「Receivers」（穴）は、「Sender」（ペニス/挿入物）が中に入ったことを検出します。
2. **ダイナミックサウンド:**
   - 入口をこするとき: こすれる音や「叩く」音。
   - 挿入時: 速度と深さに応じて強度が変化する摩擦/液体の音（"squelch"）。
3. **プラグ＆プレイ:** アバターにインストールされると、「Senders」が設定されている他のユーザー（またはあなたが「Receivers」を持っている場合）と自動的に連携します。

## OSCとハプティクスの統合 (オプション)
**OSC** (Open Sound Control) は、VRChatが外部プログラムと「会話」できるようにするプロトコルです[3]。PCSはこれを使用して、ゲームのアクションを実際の振動に変換します。

### なぜこの統合が存在するのですか？
没入感を高めるためです。互換性のある大人のおもちゃを持っている場合、PCSは挿入物がゲーム内でどれだけ深く入っているかに基づいて、いつ、どのくらいの強度で振動するかを「伝えます」。

### ハプティクスの要件
- **互換性のあるおもちゃ:** (例: Lovense Hush, Lush, Maxなど)。
- **ブリッジソフトウェア:** VRChatからの信号を受信しておもちゃを制御するプログラム。
  - *OscGoesBrrr* (無料、人気) [3]。
  - *VibeGoesBrrr*。
  - *Intiface Central* (接続エンジン) [4]。

### OSC設定
おもちゃを使用する場合にのみ、これを有効にする必要があります。
1. VRChatで、**Action Menu**を開きます。
2. `Options` > `OSC` > **Enabled** に移動します。
3. ブリッジソフトウェアを開き、おもちゃを接続します。

---

## Unityでのインストールガイド
これは、サウンドシステムとOSC用のパラメータの両方をインストールします（使用しなくても、パラメータはデフォルトで存在します）。

### 要件
- **Unity** および **VRChat SDK 3.0**。
- **PCS Asset** (Dismayのパッケージ) [1]。
- **VRCFury** (インストールを容易にするために強く推奨) [2]。

### ステップ 1: インポート
PCSの `.unitypackage` をプロジェクトにドラッグします。

### ステップ 2: コンポーネントの設定
システムは2種類のプレハブを使用します。

**A. 受け入れる側 (Orifices)**
1. `PCS_Orifice` プレハブを探します。
2. 対応するボーン（Hips, Headなど）の中に配置します。
3. メッシュの穴の入口と位置を合わせます。

**B. 挿入する側 (Penetrators)**
1. `PCS_Penetrator` プレハブを探します。
2. ペニスのボーンの中に配置します。
3. ペニスの長さをカバーするように位置を合わせます。

### ステップ 3: 仕上げ
VRCFuryを使用する場合、システムはアバターのアップロード時に自動的にマージされます。
そうでない場合は、**Avatars 3.0 Manager**を使用して、FX ControllerとPCSパラメータをアバターのものとマージしてください。

---

## 参考文献

[1] Dismay. (n.d.). *Penetration Contact System*. Gumroad. https://dismay.gumroad.com/l/PCS

[2] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[3] OscGoesBrrr. (n.d.). *OscGoesBrrr*. https://oscgoesbrrr.com

[4] Intiface. (n.d.). *Intiface Central*. https://intiface.com/central
