# JustKissSFX

<span class="badge">SFX</span> <span class="badge badge-purple">インタラクション</span> <span class="badge badge-red">ERP</span>

## チュパサウンド JustKissSFXとは？
JustKissSFXは**NEVER STOP DREAMING** (@vrc_eun)が開発したVRChat用の効果音（SFX）アセットです。通常の人からディープキスまで、アバターにキスの音を追加でき、SNSやERPでの交流においてより没入感のある体験を提供します。

## どのような役割を果たしますか？
- VRChatアバターにキスの音を追加する
- 連続したキスを検出しディープキズの音を自動再生
- 交流や成人向けコンテンツへの没入感を向上
- マイクを使用したくないユーザーのためのサイレントな代替手段

## 主な特徴

| 特徴 | 説明 |
|----------------|-------------|
| **収録音效** | 32種類のキス効果音 |
| **通常キス** | 20種類 |
| **ディープキス** | 12種類 |
| **ボイス** | なし（効果音のみ） |
| **互換性** | [Modular Avatar](/wiki?topic=modular-avatar) |

### 技術仕様

- **使用システム：** Contact Receiver
- **Syncパラメータ：** 4パラメータ（18メモリ使用）
- **オーディオクリップ：** 32個の非可逆圧縮オーディオクリップ
- **メニュー：** bool制御用メニュー1つ
- **Constraint：** 1つのConstraint

> [!NOTE]
> パラメータ設定には[Modular Avatar](/wiki?topic=modular-avatar)が必要です（手動インストールの場合は不要）。

> [!WARNING]
> 効果音が再生されない場合があります：
> - 相手のアバターがhead colliderをオフにしている
> - Contactが相互作用できないように設定されている
> - セーフティ設定によりオーディオクリップの再生が制限されている

## 必要環境
- **[Modular Avatar](/wiki?topic=modular-avatar)：** 1.11以上
- **VRCSDK：** 3.7.5以上

## どこで入手？
- **BOOTH：** [JustKissSFX](https://booth.pm/ja/items/5534236)

## インストール方法

1. **KissSFX**プレハブをアバター階層に追加
2. **CenterOfHead**オブジェクトを配置：
   - ギズモ（中心）を**鼻の先**または鼻と口の上に配置
3. [Modular Avatar](/wiki?topic=modular-avatar)設定で、トグルメニューがインストールされる位置を変更できます

> [!TIP]
> WD（World Disabled）オフアバターを使用する場合、BOOTHに手動インストール用プレハブを含む専用パッケージがあります。

---

## 参考文献

Never Stop Dreaming. (2024). *チュパサウンド JustKissSFX*. BOOTH. https://booth.pm/ja/items/5534236
