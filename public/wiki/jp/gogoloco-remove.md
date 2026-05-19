# UnityプロジェクトからGoGo Locoを削除する方法

<span class="badge badge-blue">Logic</span>

## GoGo Locoとは？

GoGo Locoは、Franada氏によって作成されたロコモーション（移動）プレハブで、Avatar DescriptorのいくつかのPlayable Layers（Base/Locomotion、Additive、Gesture）を置き換えまたは変更し、独自のアバターのExpression Menuに独自のパラメーターと項目を注入します。アバタープロジェクトの相互に関連する多くの部分に触れるため、完全に削除するには、シーンのオブジェクトからプロジェクトレベルのアセット、そして場合によってはVPMマニフェストまで、複数のレイヤーを操作する必要があります。

> [!WARNING]
> このプロセスを開始する前に、必ずUnityプロジェクトのバックアップを取るか、バージョン管理にコミットしてください。これらの手順の多くは、アバターの他の部分と共有されている可能性のあるAnimator ControllerやExpressionアセットを削除または上書きします。

## 削除の目的

- GoGo Locoを別のロコモーションシステム（例：Modular Avatarのロコモーション、WetCatのLocomotion Fix、またはVRChatデフォルトコントローラー）に置き換えるため。
- GoGo Locoがプリインストールされた購入済みのアバターから、それを削除するため。
- GoGo Locoのレイヤーとパラメーター名を共有するNSFW Locomotionやその他のパッケージとの競合を解決するため。
- パラメーターのメモリ使用量を削減するため（GoGo Locoはデフォルトで16〜17ビットの同期メモリを消費します）。

## ステップ1：シーンからプレハブを削除する

GoGo Locoは、特にVRCFuryやModular Avatarを介してセットアップされた場合、アバターのルート直下の子GameObjectとしてインストールされることがあります。

1. **Hierarchy**ウィンドウで、アバターが含まれているシーンを開きます。
2. アバターのルートGameObjectを展開します。
3. `GoGo Loco`、`GGL`、`GoGoLoco`または同様の名前の子オブジェクトを探します。それを選択し、**Delete**を押します。
4. GoGo Locoが[VRCFury](/wiki?topic=vrcfury)を介してインストールされている場合は、GoGo Locoプレハブを参照する`VRCFury`コンポーネントを持つ子オブジェクトを探し、それも削除します。
5. [Modular Avatar](/wiki?topic=modular-avatar)を介してインストールされている場合は、GoGo Locoアセットを指す`MA Merge Animator`または`MA Menu Installer`コンポーネントを持つ子オブジェクトを探し、削除します。

> [!NOTE]
> アバターが購入済みであり、GoGo Locoが直接組み込まれている場合（つまり、独立した子GameObjectが存在しない場合）は、この手順をスキップしてステップ2に直接進んでください。

## ステップ2：Avatar DescriptorのPlayable Layersを復元する

GoGo Locoは、`VRCAvatarDescriptor`コンポーネントの5つのPlayable Layersのうち最大3つを置き換えます。これらをそれぞれVRChatのデフォルトコントローラー、または独自のカスタムコントローラーに再割り当てする必要があります。

1. Hierarchyでアバターのルートを選択し、Inspectorの**VRC Avatar Descriptor**コンポーネントを見つけます。
2. **Playable Layers**セクションを展開します。
3. 以下の各レイヤーについて、現在GoGo Locoのコントローラーが割り当てられているかどうかを確認します（ファイル名は`go_`で始まるか、`GoGoLoco/GGL`を含みます）：

| レイヤー | GoGo Locoファイル名（およそ） | デフォルトの置き換え |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (VRCSDK samplesより) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (VRCSDK samplesより) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (VRCSDK samplesより) |

4. 影響を受ける各レイヤーのフィールドの右側にある小さな円のピッカーをクリックし、適切なVRChatのデフォルトコントローラーを割り当てるか、独自のカスタムコントローラーを割り当てます。
5. プロジェクトにデフォルトのVRChatコントローラーがない場合は、`Assets/VRCSDK/Examples3/Animation/Controllers/`の下にあります。

> [!TIP]
> GoGo Locoを追加する前にアバターにカスタムのハンドジェスチャーがあった場合は、VRChatのデフォルトではなく、ここから元のGestureレイヤーコントローラーを復元する必要があります。バージョン管理やバックアップを確認してください。

## ステップ3：FXコントローラーからGoGo Locoのレイヤーを削除する

飛行機能のため、GoGo LocoはアバターのFX Animator Controllerに2つの追加レイヤーを結合します。これらはプレハブが削除された後も残るため、手動で削除する必要があります。

1. ProjectウィンドウでアバターのFX Animator Controllerを見つけ、ダブルクリックして**Animator**ウィンドウを開きます。
2. 左側の**Layers**パネルで、`GoGo Fly`、`GoGo Freeze`という名前のレイヤー、または名前が`go_`で始まるレイヤーを探します。
3. 各GoGo Locoレイヤーを右クリックし、**Delete Layer**を選択します。
4. 同じAnimatorウィンドウで、**Parameters**タブをクリックします。
5. GoGo Locoに属するすべてのパラメーターを削除します。一般的なものは次のとおりです。

| パラメーター名 | タイプ |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

`go_`または`Go/`で始まるパラメーターはGoGo Locoのパラメーターです。これらをすべて削除してください。`VelocityY`、`VRCFaceBlendH`、`Grounded`などのパラメーターは標準のVRChat組み込みパラメーターです。これらは**削除しないでください**。

> [!CAUTION]
> 残っているアニメーション状態やトランジションでまだ参照されているパラメーターを削除すると、それらの状態が壊れます。削除する前に、GoGo Loco以外のレイヤーがパラメーターに依存していないことを常に確認してください。

## ステップ4：Expression Parametersアセットのクリーンアップ

GoGo Locoは、アバターの`VRCExpressionParameters`アセットにパラメーターを追加し、同期メモリを消費します。残されたGoGo Locoパラメーターはビットを無駄にします。

1. Projectウィンドウで、Avatar Descriptorの**Expression Parameters**に割り当てられた`.asset`ファイルを見つけます。
2. それを選択し、Inspectorでパラメーターリストを確認します。
3. GoGo Locoパラメーターに対応するすべてのエントリを削除します（ステップ3にリストされている名前と同じです）。
4. 削除後、Inspectorの下部に表示される**Total Cost**が減少したことを確認します。

## ステップ5：GoGo Locoのメニューエントリの削除

GoGo Locoは、アバターのルートExpression Menuにサブメニューエントリをインストールします。

1. Avatar Descriptorの**Expressions Menu**に割り当てられた`.asset`ファイルを見つけます。
2. それを選択し、**Controls**リストを調べます。
3. GoGo Locoサブメニューアセットにリンクしている、`GoGo Loco`、`GGL`、`Loco`などの名前の付いたエントリを削除します。
4. 残っている各サブメニューを再帰的に開き、その中にネストされているGoGo Locoのコントロールエントリをすべて削除します。

## ステップ6：プロジェクトからGoGo Locoアセットファイルを削除する

アバターからGoGo Locoを切り離したら、Unityプロジェクトからそのファイルを削除して`Assets/`フォルダーをクリーンに保ちます。

1. Projectウィンドウで、検索バーを使用して`go_`を検索します（検索範囲が**All**に設定されていることを確認します）。
2. 結果を確認します。`go_`で始まるファイルはほぼ常にGoGo Locoアセットです（メニューアイコン用のAnimation Clips、Animator Controllers、Textures、Materialsなど）。
3. 完全な名前を使用しているファイルをキャッチするために、`GoGoLoco`と`GGL`も検索します。
4. 確認されたすべてのGoGo Locoアセットを選択し、**Delete**を押します（または右クリック → **Delete**）。
5. Unityが削除の確認を求めてきます。受け入れます。

> [!WARNING]
> 名前が`go_`で始まるアセットが、あなた自身のプロジェクト（たとえば、あなたがそう名付けたGameObjectやアニメーションなど）に属している場合は、削除しないでください。削除する前に各ファイルを検査してください。

GoGo Locoファイルの一般的なフォルダーの場所：

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- 購入したアバターが`.unitypackage`を解凍した場所のどこか。

含まれるすべてのファイルがGoGo Locoのものであることが確認されたら、フォルダー全体を削除します。

## ステップ7：VPMパッケージの削除（VCCインストールのみ）

GoGo LocoがVRChat Creator Companionを介してVPMパッケージとしてインストールされた場合、パッケージファイルは`Assets/`ではなく`Packages/`に存在し、VCCまたはマニフェストを介して削除する必要があります。

### オプションA — VCC GUI経由

1. **VRChat Creator Companion**を開きます。
2. **Projects**タブでプロジェクトに移動し、**Manage Project**をクリックします。
3. パッケージリストで、`GoGoLoco`（パッケージID`com.franada.gogoloco`または同様のもの）を見つけます。
4. **マイナス（−）**ボタンをクリックするか、バージョンのドロップダウンを**Remove**に設定して適用します。
5. Unityでプロジェクトを再度開きます。Resolverが削除を検出し、`Packages/`フォルダーをクリーンアップします。

### オプションB — `vpm-manifest.json`経由（手動）

1. Unityを閉じます。
2. テキストエディタで`<あなたのプロジェクト>/Packages/vpm-manifest.json`を開きます。
3. `"dependencies"`と`"locked"`オブジェクトの両方からGoGo Locoのエントリを削除します。
4. 物理フォルダー`<あなたのプロジェクト>/Packages/com.franada.gogoloco/`（または同等のもの）を削除します。
5. Unityを再度開きます。Resolverが再スキャンし、パッケージが不足していないことを確認します。

> [!NOTE]
> VPMパッケージを削除しても、インストール中に追加されたレイヤー、パラメーター、メニュー、またはプレハブの子オブジェクトは自動的に元に戻りません。使用したインストール方法に関係なく、ステップ1〜6を引き続き完了する必要があります。

## ステップ8：Force Locomotionを再度有効にする（必要な場合）

GoGo Locoをインストールすると、通常、Avatar Descriptorの**Force Locomotion animations for 6-point tracking**のチェックが外れます。これは、カスタムのLocomotionレイヤーが追跡モードを内部的に処理するためです。削除後、デフォルトの動作に戻したい場合があります。

1. アバターのルートを選択し、Inspectorで**VRC Avatar Descriptor**を開きます。
2. **IK**セクションまでスクロールします。
3. デフォルトのVRChat Locomotionコントローラーを使用している場合は、**Force Locomotion animations for 6 point tracking**チェックボックスを再び有効にします。

> [!TIP]
> フルトラッキング（FBT）を使用していない場合、このチェックボックスは目に見える影響を及ぼさないため、どの状態でも構いません。

## 検証チェックリスト

アバターをアップロードする前に、以下のすべてを確認してください：

| チェック項目 | 確認方法 |
| :---------------------------------------- | :--------------------------------------------------- |
| HierarchyにGoGo Locoの子オブジェクトがないこと | Unityシーンでのアバターの階層を検査する |
| Playable Layersが正しいコントローラーを指していること | VRC Avatar Descriptor → Playable Layers セクション |
| FXコントローラーに`go_`レイヤーがないこと | FX Animator Controllerを開く → Layers パネル |
| FXに`go_` / `Go/` パラメーターがないこと | FX Animator Controllerを開く → Parameters パネル |
| Expression ParametersにGoGo Locoのエントリがないこと | Inspectorで`.asset`ファイルを検査する |
| Expression MenuにGoGo Locoのエントリがないこと | ルートメニューの`.asset`ファイルを再帰的に検査する |
| `Assets/`にGoGo Locoファイルがないこと | Projectウィンドウで`go_`、`GoGoLoco`、`GGL`を検索 |
| `vpm-manifest.json`にGoGo Locoパッケージがないこと | テキストエディタでファイルを開き、`gogoloco`を検索 |
| Force Locomotionの設定が意図的であること | VRC Avatar Descriptor → IK セクション |

## サマリー表

| GoGo Locoが追加するもの | どこで削除するか |
| :---------------------------------------------- | :------------------------------------------------ |
| アバターのルートの子プレハブ/GameObject | Unity Hierarchy → 子オブジェクトを削除 |
| Base, Additive, GestureのPlayable Layers | VRC Avatar Descriptor → Playable Layers |
| FXレイヤー (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Layers パネル |
| FXパラメーター (`Go/*`, `VelocityMagnitude` など) | FX Animator Controller → Parameters パネル |
| Expression Parametersのエントリ | VRCExpressionParameters `.asset` → Controls リスト |
| Expression Menuのサブメニューエントリ | VRCExpressionsMenu `.asset` → Controls リスト |
| アセットファイル (`go_*.anim`、コントローラー、テクスチャ) | Projectウィンドウ → GoGoLocoフォルダーを削除 |
| VPMパッケージエントリ | VCC GUI または `vpm-manifest.json` |
| Force Locomotionのチェックが外れている | VRC Avatar Descriptor → IK セクション（復元する） |

## 参考文献

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
