# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## 这是什么？
**NSFW Locomotion** 是 **GoGo Loco** 系统（最初由 franada 创建）的定制和显式版本。它专为“成人主题”或 ERP 头像设计，扩展了运动功能，包括暗示性或显式的姿势和动画。

它保留了原始 GoGo Loco 的所有功能，但添加了用于亲密互动的特定内容。

> [!WARNING]
> 重要
> **不要在同一个项目中同时安装 NSFW Locomotion 和普通 Gogo Loco。** 它们共享菜单和层名称，这将导致冲突和错误。请只选择其中一个。

## 特性
- **GoGo Loco 基础：** 包括所有标准的飞行、缩放和姿势功能。
- **"仅姿势" 版本：** 轻量级，仅添加额外的静态姿势。
- **"表情 + 姿势" 版本：** 包括完整的表情、动态动作和用于角色扮演的自定义动画。
- **简易安装：** 与 **VRCFury** 集成，并提供一键安装脚本。

## 在哪里获取？
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (用于 VCC)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## 如果虚拟形象已经有 GoGo Loco 怎么办？
如警告中所述，**您不能同时安装这两个系统**。如果您的虚拟形象已经带有 GoGo Loco 或者您之前安装了它，您必须在添加 NSFW Locomotion 之前将其完全删除，以避免 Unity 错误或菜单损坏。

### 卸载原始 GoGo Loco 的步骤：
1. **如果使用 VRCFury 安装（简便方法）：**
   - 在 Unity 的层次结构 (`Hierarchy`) 中将 GoGo Loco 预制件作为您的虚拟形象的子项找到并删除（右键单击 -> `Delete`）。
2. **如果手动集成到虚拟形象中：**
   - **Playable Layers:** 选择您的虚拟形象，进入 `VRC Avatar Descriptor` 组件并向下滚动到 “Playable Layers”。删除或替换 GoGo Loco 控制器（Base、Action、FX）为虚拟形象自带的原始控制器。
   - **参数和菜单:** 在同一个组件中，打开您的参数列表 (`Expressions Parameters`) 删除所有属于 GoGo Loco 的参数（通常以 `Go/` 开头）。然后打开您的菜单 (`Expressions Menu`) 删除打开 GoGo 子菜单的按钮。
   - *(可选)* 如果该项目中没有使用普通 GoGo Loco 的其他虚拟形象，请从 `Assets` 中删除 `GoGo` 文件夹。

一旦虚拟形象上的旧系统被完全清除，您就可以继续正常安装 NSFW Locomotion。

## 如何安装？ (推荐使用 VCC)
最简单的方法是使用 **VRChat Creator Companion (VCC)**。

1. 将 **Lastation Package Listing (LPL)** 存储库添加到你的 VCC。
2. 搜索并安装 **NSFW Locomotion** 包。
3. 确保同时通过 VCC 在项目中安装了 **VRCFury**。
4. 打开你的 Unity 项目。
5. 在顶部菜单栏中，转到：`LastationVRChat` -> `NSFW Locomotion`。
6. 选择你的头像并选择你想要的版本：
   - **Full Version:** (表情 + 姿势)
   - **Poses Version:** (仅姿势，更轻便)

## 手动安装
如果你不想使用 VCC（不推荐）：
1. 从 GitHub 下载最新的 "Release"。
2. 将包导入 Unity。
3. 将相应的预制件拖到你的头像上（标有 `(VRCFury)` 的那个）。
   - 如果启用了 "Write Defaults" 请使用 `WD`，如果没有则使用普通版本。

---

## 参考资料

LastationVRChat. (n.d.). *NSFW Locomotion* [计算机软件]. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Reddit 用户. (n.d.). *Help! How do i remove gogoloco from my avatar?* [在线论坛帖子]. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
