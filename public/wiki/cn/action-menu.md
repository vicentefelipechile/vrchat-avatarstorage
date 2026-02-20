# 操作菜单 (Action Menu)

<span class="badge badge-blue">Logic</span> <span class="badge badge-purple">Workflow</span>

## 简介
**操作菜单**（也称为 Expression Menu）是你在 VRChat 中使用的径向菜单，用于触发动画、更换衣服或修改化身的参数 [1]。

传统上，创作者每次想要测试一个小改动时都必须将化身上传到 VRChat，这非常耗时。幸运的是，有一些工具可以让你**直接在 Unity 中**模拟此菜单，让你立即看到开关和滑块的工作情况。

---

## 模拟工具

社区推荐并兼容 **VRChat Creator Companion (VCC)** 的主要工具有两个。

### 1. Gesture Manager (由 BlackStartx 开发)
这是最流行的工具，可以像在游戏中一样可视化径向菜单。它允许你直观地测试手势、接触和参数。

> [!NOTE]
> 有关如何安装它及其所有功能的详细指南，请参阅我们的专题文章：**[Gesture Manager 模拟器](/wiki?topic=gesture-manager-emulator)**。

### 2. Avatars 3.0 Emulator (由 Lyuma 开发)
这个工具更偏向技术性且功能强大，非常适合调试化身背后的复杂逻辑。

*   **安装：** 可在 VCC 中或通过 GitHub 获取。通常会随 [VRCFury](/wiki?topic=vrcfury) 等工具自动安装 [3]。
*   **如何使用：**
    1.  转到 `Tools` > `Avatar 3.0 Emulator`。
    2.  进入 **Play Mode** 后，将生成一个控制面板。
    3.  它允许你强制设置[参数](/wiki?topic=parameter)值，并实时查看正在播放的 Animator 层。

---

## 我该用哪一个？

| 特性 | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **视觉界面** | 优秀 (径向) | 基础 (按钮/滑块) |
| **菜单测试** | 是 | 有限 |
| **逻辑调试** | 基础 | 高级 |
| **手势测试** | 简单 (按钮) | 手动 (Animator) |

**建议：** 在进行大多数开关和衣服测试时使用 **Gesture Manager**。如果你的动画没有按预期触发，并且需要查看“底层”发生了什么，请使用 **Av3 Emulator**。

---

## Build & Test (官方替代方案)
如果你需要测试需要联网或与他人互动的内容（如 [PhysBones](/wiki?topic=parameter)），请使用官方 SDK 的 **Build & Test** 功能 [1]：
1.  打开 `VRChat SDK Control Panel`。
2.  在 `Builder` 选项卡中，找到 “Offline Testing” 部分。
3.  点击 `Build & Test`。
4.  Unity 将编译化身并打开一个本地 VRChat 实例，在那只有你能看到它，而无需上传到服务器。

---

## 参考文献

[1] VRChat. (n.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[2] BlackStartx. (n.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[3] Lyuma. (n.d.). *Av3Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
