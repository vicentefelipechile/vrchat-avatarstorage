# PhysBones

<span class="badge badge-blue">依存関係</span>

## 概要
PhysBonesは、VRChat SDKに組み込まれたコンポーネントセットで、アバターやワールドのオブジェクトに副次的動き（物理）を追加できます。PhysBonesを使用すると、毛髪、しっぽ、耳、衣類、ワイヤ、植物などに動きを追加できます。正しく使用すると、アバターがより動的でリアルに見えます。

> [!NOTE]
> PhysBonesはVRChatにおけるDynamic Bonesの**公式な代替手段**です。Dynamic Bonesはまだ既存のアバターで動作しますが（自動的に変換されます）、新しいアバターでは全員がPhysBonesを使用する必要があります。

## 用途
- 毛髪、しっぽ、耳、衣類に物理を追加
- 他のプレイヤーがアンバーの要素を操作できるようにする（掴む、ポーズする）
- 動的でリアルな副次的動きを作成
- シンプルな布のためのUnity Clothコンポーネントの代用品

## メインコンポーネント

PhysBonesは協力して動作する3つのコンポーネントで構成されています：

| コンポーネント | 説明 |
|------------|-------------|
| **VRCPhysBone** | 物理でアニメーション化される骨のチェーンを定義するメインコンポーネント |
| **VRCPhysBoneCollider** | PhysBonesに影響を与えるコライダーを定義（頭、体、手など） |
| **VRCPhysBoneRoot** | オプション。複数のPhysBonesの移動ルートを定義（ワールドのみ） |

## 詳細設定

### バージョン

VRCPhysBoneコンポーネントのバージョンはインスペクターで直接選択できます。デフォルトでは最新のバージョンが使用されます。

**バージョン1.0：**
- PhysBoneコンポーネントのベースバージョン

**バージョン1.1（Squishy Bones）：**
- 骨の圧縮と伸張が可能
- 重力は休息位置での骨の回転量として機能するようになりました
- 重力方向に骨を移動させるには正のPullが必要です

### Transforms

| 設定 | 説明 |
|------------|-------------|
| **Root Transform** | コンポーネントが開始するトランスフォーム。空の場合、このGameObjectで開始 |
| **Ignore Transforms** | コンポーネントの影響を受けないトランスフォームのリスト |
| **Ignore Other Phys Bones** | 有効にすると、PhysBoneは階層内の他のPhysBonesを無視します |
| **Endpoint Position** | チェーンのエンドポイントに骨を追加するためのベクトル |
| **Multi-Child Type** | 複数のチェーンが存在する場合のルート骨の動作 |

> [!CAUTION]
> 単一のルート骨、または子を持つルート（孫なし）を使用する場合は、Endpoint Positionを定義する必要があります！これはDynamic Bonesとは異なります。

### Forces（力）

**Integration Type：**
- **Simplified**：より安定、外部力に対して反応しにくい、設定が簡単
- **Advanced**：安定性が低い、より複雑な設定が可能、外部力に反応しやすい

利用可能なパラメータ：
- **Pull**：骨を休息位置に戻す力
- **Spring**（Simplified）/ **Momentum**（Advanced）：休息位置に到達しようとしたときの振動量
- **Stiffness**（Advancedのみ）：休息位置に留まろうとする力
- **Gravity**：適用される重力。正の値は下へ、負の値は上へ引き寄せます
- **Gravity Falloff**：休息位置で重力がどの程度削除されるかを制御（1.0 = 休息時の重力なし）

> [!TIP]
> 毛髪が立ち姿勢で 원하는位置にモデリングされている場合は、Gravity Falloffを1.0に使用してください。これにより、立っているときには重力が影響しなくなります。

### Limits（制限）

制限を使用すると、PhysBoneチェーンが移動できる量を制限できます。毛髪が頭にめり込むのを防ぐのに非常に効果的で、コライダーよりも**はるかにパフォーマンスが良い**です。

| タイプ | 説明 |
|------|-------------|
| **None** | 制限なし |
| **Angle** | 軸からの最大角度に制限。円錐として視覚化 |
| **Hinge** | 平面に沿って制限。ピザの一切れのようなもの |
| **Polar** | HingeとYawを組み合わせる。複雑なので控えめに使用 |

> [!WARNING]
> Polar制限を亂用しないでください。64を超えるとパフォーマンスの問題が発生する可能性があります。

### Collision（衝突）

| 設定 | 説明 |
|------------|-------------|
| **Radius** | 各骨周囲の衝突半径（メートル） |
| **Allow Collision** | グローバルコライダー（他のプレイヤーの手、ワールドコライダー）との衝突を許可 |
| **Colliders** | このPhysBoneが衝突する特定のコライダーのリスト |

**Allow Collisionオプション：**
- **True**：グローバルコライダーと衝突
- **False**：リストにあるコライダーのみ衝突
- **Other**：タイプ（アバター、ワールドアイテム）ごとにフィルタリングする詳細オプション

### Stretch & Squish（v1.1のみ）

| 設定 | 説明 |
|------------|-------------|
| **Stretch Motion** | 骨の伸張/圧縮に影響する動作量 |
| **Max Stretch** | 許可される最大伸張（元の長さの倍数） |
| **Max Squish** | 許可される最大圧縮（元の長さの倍数） |

### Grab & Pose（掴む・ポーズ）

| 設定 | 説明 |
|------------|-------------|
| **Allow Grabbing** | プレイヤーが骨を掴めるようにする |
| **Allow Posing** | 掴んだ後にプレイヤーがポーズできるようにする |
| **Grab Movement** | 掴まれたときの骨の移動を制御（0 = pull/springを使用、1 = 即時） |
| **Snap To Hand** | 骨が掴んだ手に自動的にスナップする |

## 実用例

### 例1：長い毛髪

1. 毛髪のルート骨を選択（首または頭）
2. **VRCPhysBone**コンポーネントを追加
3. 設定：
   - **Root Transform**：毛髪のルート骨
   - **Ignore Transforms**：目や動かない骨
   - **Multi-Child Type**：Ignore（すべての毛髪が1つのコンポーネントで影響を受ける）
   - **Pull**：0.3 - 0.5
   - **Gravity**：0.5 - 1.0
   - **Gravity Falloff**：0.5 - 0.8（休息時の落ちるinginan調整）
   - **Radius**：0.05 - 0.1
4. **Limits**タイプAngleを追加して毛髪が頭にめり込むのを防ぐ

> [!TIP]
> 非常に長い毛髪の場合は、パフォーマンスを向上させるために複数のPhysBoneコンポーネント（セクションごとに1つ）に分割することを検討してください。

### 例2：動物のしっぽ

1. しっぽのベースに骨を選択
2. **VRCPhysBone**コンポーネントを追加
3. 設定：
   - **Root Transform**：しっぽのベース骨
   - **Integration Type**：Advanced
   - **Pull**：0.2 - 0.4
   - **Spring/Momentum**：0.5 - 0.7
   - **Stiffness**：0.1 - 0.3
   - **Gravity**：0.3 - 0.6
4. **Hinge**制限を使用して横動きを制限

### 例3：スカートやケープ

1. 衣類がアバターとは別の、独自の.armatureを持っていることを確認
2. スカート/ケープのルート骨を選択
3. **VRCPhysBone**コンポーネントを追加
4. 設定：
   - **Pull**：0.1 - 0.3（布地用により柔らかく）
   - **Gravity**：0.8 - 1.0
   - **Gravity Falloff**：0.3 - 0.5
   - **Radius**：0.05
5. アバターのに**VRCPhysBoneCollider**を追加
6. PhysBoneコンポーネントの**Colliders**に体のコライダーを追加

> [!NOTE]
> 非常に長いスカートや完全なケープの場合、PhysBonesの代わりにUnityのClothコンポーネントの使用を検討してください。これはこの種の布に最適化されています。

## Dynamic Bones vs PhysBones

VRChatはアバターを読み込むときにDynamic Bonesコンポーネントを自動的にPhysBonesに変換します。ただし、この変換は完全ではありません。

**主な違い：**
- Dynamic Bonesは変換時にデフォルトでAdvancedモードを使用
- 一部のDynamic Bones設定にはPhysBones equivalentsがない
- 自動変換はMulti-Child Typeに"Ignore"を使用

**手動変換：**
VRChat SDK → Utilities → Convert DynamicBones to PhysBonesを使用して、アバターを手動で変換できます。

> [!WARNING]
> 変換は元に戻せないため、アンバーのバックアップを作成してください。

## 制限とパフォーマンス

| プラットフォーム | 制限 |
|------------|--------|
| **PC** | コンポーネントあたり約256トランスフォーム |
| **Meta Quest** | より低い制限（パフォーマンスランキングドキュメントを参照） |

**最適化のヒント：**
- PhysBoneコンポーネントごとに256トランスフォームを超えない
- 128を超えるトランスフォームがある場合は、複数のコンポーネントに分割することを検討
- 可能な場合はコライダーの代わりに**Limits**を使用
- ヒューマノイド骨（Hip、Spine、Chest、Neck、Head）をPhysBoneルートとして使用しない

> [!IMPORTANT]
> PhysBonesはMeta Questでハード制限があります。パフォーマンスランキングシステムの「Very Poor」制限を参照してください。

## 一般的なエラー

### PhysBoneが動かない
- Root Transformが正しく割り当てられていることを確認
- Multi-Child Typeで"Ignore"に設定されていないことを確認
- Pull値が0でないことを確認

### PhysBoneが体を通り抜ける
- コンポーネントにLimitsを追加
- アバターにコライダーを追加し、PhysBoneで設定
- Pull値を増やす

### 骨が休息位置に到達しない
- Pull値を増やす
- 統合タイプに従ってSpring/Momentumを調整

### 骨が体を通り抜ける
- アバターにVRCPhysBoneColliderを追加
- PhysBoneのCollidersリストでコライダーを設定
- Radiusが適切であることを確認

## 更多信息在哪里？

- **官方文档：** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **SDK示例：** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **コミュニティ：** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## 参考文献

VRChat. (2025). *PhysBones*. VRChat Creators. より取得 https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). *VRCPhysBoneCollider*. VRChat Creators. より取得 https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
