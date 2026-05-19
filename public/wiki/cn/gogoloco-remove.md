# 从Unity项目中移除GoGo Loco

<span class="badge badge-blue">Logic</span>

## 这是什么？

GoGo Loco是Franada创建的一个移动系统预制件（locomotion prefab），它替换或修改了Avatar Descriptor的几个Playable Layers（Base/Locomotion，Additive，Gesture），并向模型的Expression Menu注入了自己的参数和条目。因为它触及了模型项目中如此多相互关联的部分，完全移除它需要通过几个层面进行操作——从场景对象到项目级别的资产，以及（如果适用的话）VPM清单。

> [!WARNING]
> 在开始此过程之前，请务必备份您的Unity项目（或提交到版本控制）。这些步骤中的许多步骤会删除或覆盖可能与模型其他部分共享的Animator Controllers和Expression资产。

## 为什么要移除？

- 用不同的移动系统（例如Modular Avatar移动系统、WetCat's Locomotion Fix或VRChat默认控制器）替换GoGo Loco。
- 清理预装了GoGo Loco但您不需要它的已购买模型。
- 解决与NSFW Locomotion或其他共享GoGo Loco层和参数名称的软件包的冲突。
- 减少参数内存使用量（GoGo Loco默认消耗16-17位同步内存）。

## 步骤 1：从场景中移除预制件

GoGo Loco可以作为模型根目录下的子GameObject进行安装，特别是当通过VRCFury或Modular Avatar进行设置时。

1. 在 **Hierarchy** 窗口中打开包含您的模型的场景。
2. 展开模型根目录下的GameObject。
3. 查找任何名为 `GoGo Loco`、`GGL`、`GoGoLoco` 或类似名称的子对象。选择它并按 **Delete**。
4. 如果GoGo Loco是通过 [VRCFury](/wiki?topic=vrcfury) 安装的，请查找带有引用GoGo Loco预制件的 `VRCFury` 组件的子对象——同样将其删除。
5. 如果是通过 [Modular Avatar](/wiki?topic=modular-avatar) 安装的，请查找带有指向GoGo Loco资产的 `MA Merge Animator` 或 `MA Menu Installer` 组件的子对象并将其删除。

> [!NOTE]
> 如果模型是购买的并且GoGo Loco已烘焙（即不存在单独的子GameObject），请跳过此步骤并直接转到步骤2。

## 步骤 2：恢复Avatar Descriptor的Playable Layers

GoGo Loco在 `VRCAvatarDescriptor` 组件上替换了多达三个（共五个）Playable Layers。您需要将它们各自重新分配为VRChat默认控制器或您自己的自定义控制器。

1. 在Hierarchy中选择模型根目录，并在Inspector中找到 **VRC Avatar Descriptor** 组件。
2. 展开 **Playable Layers** 部分。
3. 对于以下每一层，检查当前是否分配了GoGo Loco控制器（文件名以 `go_` 开头或包含 `GoGoLoco/GGL`）：

| 层 (Layer) | GoGo Loco文件名（大致） | 默认替换 |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (来自VRCSDK samples) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (来自VRCSDK samples) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (来自VRCSDK samples) |

4. 对于每个受影响的层，单击字段右侧的小圆形选择器，并分配适当的VRChat默认控制器，或分配您自己的自定义控制器。
5. 如果您的项目中没有默认的VRChat控制器，可以在 `Assets/VRCSDK/Examples3/Animation/Controllers/` 下找到它们。

> [!TIP]
> 如果您的模型在添加GoGo Loco之前有自定义手势，您应该在此处恢复原始的Gesture层控制器，而不是VRChat默认设置——请检查您的版本控制或备份。

## 步骤 3：从FX Controller中移除GoGo Loco层

对于飞行功能，GoGo Loco将另外两层合并到模型的FX Animator Controller中。即使在预制件被删除后它们仍然存在，必须手动移除。

1. 在Project窗口中找到模型的FX Animator Controller，然后双击打开 **Animator** 窗口。
2. 在左侧的 **Layers** 面板中，查找名为 `GoGo Fly`、`GoGo Freeze` 的层，或任何名称以 `go_` 开头的层。
3. 右键单击每个GoGo Loco层并选择 **Delete Layer**。
4. 在同一个Animator窗口中，单击 **Parameters** 选项卡。
5. 移除属于GoGo Loco的每个参数。常见的包括：

| 参数名称 | 类型 |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

以 `go_` 或 `Go/` 开头的参数是GoGo Loco参数。全部移除。像 `VelocityY`、`VRCFaceBlendH`、`Grounded` 等参数是标准的VRChat内置参数——**不要**移除那些。

> [!CAUTION]
> 删除仍被剩余动画状态或过渡（transition）引用的参数会破坏这些状态。在移除之前，务必验证没有非GoGo Loco的层依赖于该参数。

## 步骤 4：清理Expression Parameters资产

GoGo Loco将其参数添加到模型的 `VRCExpressionParameters` 资产中，消耗了同步内存。留下的每个GoGo Loco参数都会浪费空间。

1. 在Project窗口中，找到在Avatar Descriptor中分配给 **Expression Parameters** 的 `.asset` 文件。
2. 选中它并在Inspector中查看参数列表。
3. 删除对应于GoGo Loco参数的每个条目（与步骤3中列出的名称相同）。
4. 确认在移除后Inspector底部显示的 **Total Cost** 减少了。

## 步骤 5：移除GoGo Loco菜单条目

GoGo Loco在模型的根Expression Menu中安装了一个子菜单条目。

1. 找到在Avatar Descriptor中分配给 **Expressions Menu** 的 `.asset` 文件。
2. 选中它并检查 **Controls** 列表。
3. 删除任何名为 `GoGo Loco`、`GGL`、`Loco` 或类似并链接到GoGo Loco子菜单资产的条目。
4. 递归地打开每个剩余的子菜单，并移除嵌套在其中的任何GoGo Loco控制条目。

## 步骤 6：从项目中删除GoGo Loco资产文件

将GoGo Loco与模型断开连接后，从Unity项目中移除其文件以保持 `Assets/` 文件夹干净。

1. 在Project窗口中，使用搜索栏搜索 `go_`（确保搜索范围设置为 **All**）。
2. 查看结果——以 `go_` 开头的文件几乎总是GoGo Loco资产（Animation Clips、Animator Controllers、Textures、用于菜单图标的Materials）。
3. 也可以搜索 `GoGoLoco` 和 `GGL` 来捕获使用全名的任何文件。
4. 选择所有确认的GoGo Loco资产并按 **Delete**（或右键单击 → **Delete**）。
5. Unity将提示您确认删除。接受。

> [!WARNING]
> 不要删除名称以 `go_` 开头的属于您自己项目的资产（例如，您这样命名的GameObject或动画）。在删除之前检查每个文件。

GoGo Loco文件的常见文件夹位置：

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- 任何购买的模型可能解包 `.unitypackage` 的地方。

确认所有包含的文件都是GoGo Loco的文件后，删除整个文件夹。

## 步骤 7：移除VPM包（仅限VCC安装）

如果GoGo Loco是通过VRChat Creator Companion作为VPM包安装的，则包文件位于 `Packages/` 而不是 `Assets/` 中，并且必须通过VCC或清单进行移除。

### 选项 A — 通过VCC界面

1. 打开 **VRChat Creator Companion**。
2. 在 **Projects** 选项卡中导航到您的项目，然后单击 **Manage Project**。
3. 在包列表中，找到 `GoGoLoco`（包ID为 `com.franada.gogoloco` 或类似）。
4. 单击 **减号 (−)** 按钮或将版本下拉菜单设置为 **Remove** 并应用。
5. 在Unity中重新打开项目。Resolver将检测到删除并清理 `Packages/` 文件夹。

### 选项 B — 通过 `vpm-manifest.json`（手动）

1. 关闭Unity。
2. 在文本编辑器中打开 `<YourProject>/Packages/vpm-manifest.json`。
3. 从 `"dependencies"` 和 `"locked"` 对象中删除GoGo Loco的条目。
4. 删除物理文件夹 `<YourProject>/Packages/com.franada.gogoloco/`（或同等文件夹）。
5. 重新打开Unity。Resolver将重新扫描并确认没有丢失包。

> [!NOTE]
> 移除VPM包不会自动撤消安装期间添加的层、参数、菜单或预制件子对象。无论使用哪种安装方法，都必须完成步骤1-6。

## 步骤 8：重新启用Force Locomotion（如果需要）

安装GoGo Loco时，通常会取消选中Avatar Descriptor上的 **Force Locomotion animations for 6-point tracking**，因为它的自定义Locomotion层在内部处理跟踪模式。移除后，您可能希望恢复默认行为。

1. 选择模型根目录并在Inspector中打开 **VRC Avatar Descriptor**。
2. 滚动到 **IK** 部分。
3. 如果您使用的是默认的VRChat Locomotion控制器，请重新选中 **Force Locomotion animations for 6 point tracking** 复选框。

> [!TIP]
> 如果您没有使用全身追踪（FBT），此复选框没有可见的的影响，可以保持在任何状态。

## 验证检查表

在上传模型之前，确认以下所有内容：

| 检查项 | 如何验证 |
| :---------------------------------------- | :--------------------------------------------------- |
| Hierarchy中没有GoGo Loco子对象 | 检查Unity场景中的模型层级结构 |
| Playable Layers指向正确的控制器 | VRC Avatar Descriptor → Playable Layers 部分 |
| FX控制器中没有 `go_` 层 | 打开FX Animator Controller → Layers 面板 |
| FX中没有 `go_` / `Go/` 参数 | 打开FX Animator Controller → Parameters 面板 |
| Expression Parameters中没有GoGo Loco条目 | 在Inspector中检查 `.asset` 文件 |
| Expression Menu中没有GoGo Loco条目 | 递归检查根菜单的 `.asset` 文件 |
| `Assets/` 中没有GoGo Loco文件 | Project窗口搜索 `go_`、`GoGoLoco`、`GGL` |
| `vpm-manifest.json` 中没有GoGo Loco包 | 在文本编辑器中打开文件并搜索 `gogoloco` |
| Force Locomotion设置是有意的 | VRC Avatar Descriptor → IK 部分 |

## 总结表

| GoGo Loco添加了什么 | 在哪里移除 |
| :---------------------------------------------- | :------------------------------------------------ |
| 模型根目录上的子Prefab/GameObject | Unity Hierarchy → 移除子对象 |
| Base, Additive, Gesture Playable Layers | VRC Avatar Descriptor → Playable Layers |
| FX层 (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Layers 面板 |
| FX参数 (`Go/*`, `VelocityMagnitude` 等) | FX Animator Controller → Parameters 面板 |
| Expression Parameters条目 | VRCExpressionParameters `.asset` → Controls 列表 |
| Expression Menu子菜单条目 | VRCExpressionsMenu `.asset` → Controls 列表 |
| 资产文件 (`go_*.anim`，控制器，纹理) | Project窗口 → 删除GoGoLoco文件夹 |
| VPM包条目 | VCC界面 或 `vpm-manifest.json` |
| Force Locomotion被取消选中 | VRC Avatar Descriptor → IK 部分（恢复） |

## 参考资料

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
