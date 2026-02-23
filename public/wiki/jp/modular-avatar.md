# Modular Avatar

<span class="badge">ツール</span>

## とは？
Modular Avatarは、VRChatアバターをモジュラー化し、アバターコンポーネントを配布するための**非破壊的**ツールスイートです。Modular Avatarを使用すると、新しいアウトフィットやギミックをアバターに追加することがドラッグ＆ドロップするほど簡単です。

> [!NOTE]
> Modular Avatarは**Non-Destructive Modular Framework (NDMF)**システムを通じて動作します。これにより、ビルド時に元のファイルを修改せずにアバターを処理できます。

## 有什么用？
- **ドラッグ＆ドロップ**で衣服やアクセサリーを一括インストール
- アニメーターの整理：FXアニメーターを複数のサブアニメーターに分割し、ランタイムでマージ
- VRChatメニューの自動設定
- オブジェクトやブレンスhapeをアクティブ化/非アクティブ化するための**トグル**システム
- アバターの変更に応答するリアクティブコンポーネント
- 自動インストールによるプレハブ配布

## 主な機能

| 機能 | Modular Avatar | VRCFury |
|------|----------------|---------|
| **アウトフィットインストール** | あり（ドラッグ＆ドロップ） | あり（クリック一つ） |
| **トグルシステム** | あり（高度） | あり（基本） |
| **アニメーター整理** | あり（マージ） | なし |
| **自動メニュー** | あり（完全） | あり（基本） |
| **非破壊プロセス** | あり（NDMF） | あり |
| **ブレンスhape同期** | あり | なし |
| **ボーンプロキシ** | あり | なし |

### コンポーネントの説明

| コンポーネント | 説明 |
|---------------|------|
| **Merge Armature** | プレハブのアーマチャーを親アバターにマージします（衣服の追加に共通）。MAは作成されるボーンの数を最小限に抑え、可能な場合は既存のボーンを再利用します。 |
| **Merge Animator** | サブアニメーターを親アバターにマージします。さまざまなタイプのアバターギミックに役立ちます。 |
| **Object Toggle** | オブジェクトをアクティブ化/非アクティブ化するメニュー項目を作成します。トグル時にブレンスhapeを更新することもできます。 |
| **Blendshape Sync** | 体の形状を調整したときに衣服やアクセサリーのブレンスhapeをベースアバターと同期させます。 |
| **Bone Proxy** | 武器や特殊効果などのユニークなプロップをアバターの骨に直接取り付けることができます。 |
| **Menu System** | VRChatメニューからアバターを編集するための完全なメニューシステム。 |

> [!TIP]
> Modular Avatarは、衣服やアクセサリーをプレハブとして配布したい場合に特に便利です。ユーザーはプレハブをアバターにドラッグするだけですぐに使用できます。

## どこで入手？
- **公式サイト：** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **ドキュメント：** [Modular Avatarドキュメント](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub：** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord：** [Discordコミュニティ](https://discord.gg/dV4cVpewmM)

## インストール方法

### VCC（VRChat Creator Companion）でのインストール

1. VCCにリポジトリを追加：
   - クリック：[Add Modular Avatar to VCC](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - または**Settings** → **Packages** → **Add Repository**に移動し、URL `https://vpm.nadena.dev/vpm.json`を貼り付けて**Add**をクリック
2. プロジェクトの**Manage Project**に移動
3. パッケージリストで**Modular Avatar**を検索し、**[+]**をクリックして追加
4. VCCで**Open Project**をクリック

## 使い方

### 基本トグルを作成

1. Unityでアバターを右クリック
2. **Modular Avatar → Create Toggle**を選択
3. **Menu Item**、**Menu Installer**、**Object Toggle**コンポーネントを持つ新しいGameObjectが作成されます
4. **Object Toggle**コンポーネントで、**+**ボタンをクリックしてエントリを追加
5. トグルしたいオブジェクトを空のフィールドにドラッグ
6. 完了！トグルはアバターメニューに自動的に表示されます

### アウトフィットをインストール

1. アウトフィットプレハブをアバターにドラッグ
2. アウトフィットを右クリックし、**ModularAvatar → Setup Outfit**を選択
3. MAが自動的にアーマチャーとアニメーションを設定します

> [!TIP]
> 公式チュートリアルは[Modular Avatarドキュメント](https://modular-avatar.nadena.dev/docs/tutorials)をご覧ください。

## 他のツールとの関係

> [!TIP]
> Modular AvatarとVRCFuryの違いについては、上の比較表をご覧ください。

Modular AvatarとVRCFuryは**補完的なツール**です。多くの最新のアウトフィットは両方をサポートしています。作成者が推奨する方法は、アウトフィットのドキュメントを確認してください。

- **[VRCFury](/wiki?topic=vrcfury)**：アニメーションとジェスチャーのインストールに焦点を当てています。
- **NDMF（Non-Destructive Modular Framework）**：非破壊処理を可能にする基本フレームワーク。Modular Avatarで自動的にインストールされます。

---

## 参考文献

Modular Avatar. (s. f.). *Modular Avatar*. Nadena Dev. https://modular-avatar.nadena.dev/ より取得

Modular Avatar. (s. f.). *Tutorials*. Nadena Dev. https://modular-avatar.nadena.dev/docs/tutorials より取得

bd_. (2026). *bdunderscore/modular-avatar* [ソフトウェア]. GitHub. https://github.com/bdunderscore/modular-avatar より取得
