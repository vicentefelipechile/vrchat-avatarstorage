# Gogo Loco

<span class="badge">推荐</span>

## 是什么？
Gogo Loco 是由 **franada** [1] 创建的 VRChat 虚拟形象高级运动系统。它允许没有“全身追踪”设备（Full Body Tracking）的桌面和 VR 用户访问通常不可用的姿势、飞行和头像调整功能。

## 有什么用？
- **静态姿势：** 允许在任何地方坐下、躺下和进行各种艺术姿势。
- **全身模拟：** 包含模拟腿部追踪器的动画。
- **飞行：** 允许在有碰撞或跳跃限制的世界中飞行。
- **高度调整：** 允许在游戏中缩放你的头像大小。
- **固定模式：** 允许在视觉上移动你的头像而不移动物理位置（适合拍照）。

> [!NOTE]
> 注意
> 虽然可以手动安装，但强烈建议使用 **VRCFury** 以简化安装并避免与其他菜单冲突。

## 哪里获取？
- [GitHub - Gogo Loco (免费)](https://github.com/franada/gogo-loco)
- [Gumroad - Gogo Loco (支持作者)](https://franadavrc.gumroad.com/l/gogoloco)

## 可以添加到没有它的模型上吗？
是的，**Gogo Loco** 几乎可以添加到任何头像上，只要满足一个主要要求：
- **必须是人形头像**（或者在 Unity 中骨架配置为 Humanoid）。

“通用”或非人形头像（如漂浮物体、没有人类骨骼的复杂蜘蛛等）可能会出现问题或无法正常工作，因为 Gogo Loco通过操作特定的人类骨骼（臀部、腿部、背部）来工作。

## 先决条件
在开始之前，请确保你拥有以下内容：
- **Unity：** VRChat 推荐的版本（目前大约是 2022.3.22f1）。
- **VRChat SDK：** 已安装在你的项目中 (VCC)。
- **Gogo Loco：** 下载的 `.unitypackage` 文件（免费版或付费版）。
- **VRCFury（可选但推荐）：** 用于简单安装。
- **Avatar 3.0 Manager（可选）：** 用于手动安装。

## 分步安装指南

主要有两种方法可以在你的头像上安装 Gogo Loco。选择最适合你需求的一种。

---

### 方法 1：使用 VRCFury（推荐且简单）
这是最简单、自动化程度最高且最不容易出错的方法 [3]。

1. **安装 VRCFury：** 确保通过 VRChat Creator Companion (VCC) 在你的项目中安装了 **VRCFury**。
2. **导入 Gogo Loco：** 将 Gogo Loco 的 `.unitypackage` 文件拖入项目的 `Assets` 文件夹，或双击导入。
3. **查找预制件 (Prefab)：**
   - 在 Unity 的 `Project` 窗口中，导航到文件夹：`Assets/GoGo/Loco/Prefabs`。
   - 寻找名为 **GoGo Loco Beyond** 的预制件。
     - *注意：* "Beyond" 包含飞行、缩放和姿势功能。如果你只想要部分功能，请浏览其他文件夹。
4. **安装到头像上：**
   - 将 **GoGo Loco Beyond** 预制件**直接拖放到你的头像上**（在层级视图 `Hierarchy` 中）。该预制件应成为你头像的“子对象”(child)。
   - 完成！你不需要配置任何其他东西。
5. **上传：** 当你上传头像到 VRChat 时，VRCFury 会检测到预制件并自动合并所有必要的控制器、菜单和参数。

---

### 方法 2：使用 Avatar 3.0 Manager 手动安装
如果你不想使用 VRCFury 或需要完全控制，请使用此工具以避免在复制参数和层时出现人为错误 [4]。

1. **VRLabs Avatar 3.0 Manager：** 下载并导入此免费工具（可在 GitHub 或 VCC 上找到）。
2. **导入 Gogo Loco：** 将包导入 Unity。
3. **打开 Avatar 3.0 Manager：** 转到顶部菜单 `VRLabs` -> `Avatar 3.0 Manager`。
4. **选择头像：** 将你的头像拖入工具的“Avatar”字段。
5. **合并控制器 (FX)：**
   - 在 "FX" 部分，展开选项。
   - 点击 **"Add Animator to Merge"**。
   - 选择 Gogo Loco FX 控制器（通常位于 `GoGo/Loco/Controllers`）。
   - 点击 **"Merge on Current"**。这将合并 Gogo Loco 的层到你的控制器，而不会覆盖。
6. **复制参数：**
   - 转到 Manager 的 **"Parameters"** 选项卡。
   - 选择 **"Copy Parameters"** 选项。
   - 选择 Gogo Loco 参数列表作为源，并将其复制到你的头像。
7. **添加菜单：**
   - 在 Inspector 中转到你头像的 **VRChat Avatar Descriptor**。
   - 找到 **Expressions Menu** 部分。
   - 打开你的主菜单（双击文件）。
   - 添加新控件 (Control -> Add Control)。
   - 命名为 "Gogo Loco"。
   - 类型：**Sub Menu**。
   - Parameter：None。
   - Sub Menu：将 `GoGo Loco Menu`（或 `GoGo Loco All`）菜单拖到此处。
8. **Action & Base 层（可选）：**
   - 如果你想要自定义的坐姿和 "afk" 动画，请在 Avatar Descriptor 中对 **Action** 和 **Base** 层重复合并步骤。

> [!WARNING]
> 警告：Write Defaults
> Gogo Loco 通常在 **Write Defaults OFF** [1] 状态下工作得最好。如果你的头像使用 "Mixed Write Defaults"（混合了 ON 和 OFF），你可能会遇到奇怪的行为。VRCFury 通常会自动修复此问题，但在手动操作时必须小心。

---

## 参考资料

[1] Franada. (n.d.). *Gogo Loco*. GitHub. https://github.com/franada/gogo-loco

[2] Franada. (n.d.). *Gogo Loco*. Gumroad. https://franadavrc.gumroad.com/l/gogoloco

[3] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[4] VRLabs. (n.d.). *Avatar 3.0 Manager*. GitHub. https://github.com/VRLabs/Avatars-3.0-Manager
