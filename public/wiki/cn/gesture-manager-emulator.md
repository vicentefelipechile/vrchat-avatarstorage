# Gesture Manager 模拟器

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## 什么是 Gesture Manager？
由 **BlackStartx** 开发的 **Gesture Manager** 是 VRChat 化身创作者的必备工具。它允许你直接在 Unity 中预览和编辑化身的动画、手势和菜单，无需为了测试每个改动而将化身上传到游戏中 [1]。

它几乎完全模拟了 VRChat 的动画系统，包括**径向菜单 (Expressions Menu)**，让你可以立即验证开关和滑块是否正常工作。

---

## 安装

在你的项目中安装此工具有两种主要方法。

### 方法 1：VRChat Creator Companion (推荐)
这是最简单的方法，并确保你始终拥有与项目兼容的最新版本 [2]。
1. 打开 **VRChat Creator Companion (VCC)**。
2. 选择你的项目。
3. 确保没有过滤 “Curated” 包。
4. 搜索 **“Gesture Manager”** 并点击 **“Add”** 按钮。
5. 打开你的 Unity 项目。

### 方法 2：手动 (Unity Package)
如果你不使用 VCC 或需要特定版本：
1. 从 BlackStartx 的 GitHub 的 *Releases* 部分或他的 BOOTH 页面下载 `.unitypackage` 文件 [3]。
2. 将包导入到你的 Unity 项目中 (`Assets > Import Package > Custom Package`)。

---

## 主要特性

*   **径向菜单 3.0：** 忠实地重现了 VRChat 的表情菜单。
*   **手势模拟：** 允许通过检视面板中的按钮测试左手和右手的手势。
*   **活动场景摄像机：** 将游戏摄像机与场景摄像机同步，以便于 PhysBones 和接触测试。
*   **接触测试：** 允许通过鼠标点击激活 *VRCContacts*。
*   **参数调试：** 显示所有化身参数及其当前值的列表。

---

## 如何使用

1.  安装后，转到顶部栏并选择 `Tools > Gesture Manager Emulator`。
2.  这将在你的层级结构中添加一个名为 `GestureManager` 的对象。
3.  在 Unity 中进入 **Play Mode**。
4.  在层级结构中选择 `GestureManager` 对象。
5.  在 **Inspector (检视面板)** 窗口中，你将看到径向菜单和用于测试化身的所有控件。

> [!IMPORTANT]
> 你必须选中 `GestureManager` 对象才能在 Unity 运行时在检视面板中看到控件。

---

## 参考文献

[1] BlackStartx. (n.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[2] VRChat. (n.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[3] VRChat. (n.d.). *VCC Documentation*. VRChat Creator Companion. https://vcc.docs.vrchat.com

[4] BlackStartx. (n.d.). *Gesture Manager*. Booth. https://blackstartx.booth.pm/items/3922472
