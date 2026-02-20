# Esska Desktop Puppeteer

<span class="badge">实用工具</span>

## 这是什么？
**Esska Desktop Puppeteer** 是由 **Esska** 为 VRChat 桌面用户创建的高级工具。它包含一个由两部分组成的系统（一个桌面应用程序和一个虚拟形象包），允许您使用计算机鼠标控制虚拟形象的特定身体部位，提供通常只有虚拟现实 (VR) 用户才能获得的精确度和表现力水平。

## 它有什么用？
- **肢体控制：** 允许您直接使用鼠标独立而精确地移动您虚拟形象的胳膊和手。
- **自定义部件：** 使控制额外的虚拟形象部件（例如耳朵、尾巴或配饰）变得容易。
- **桌面 VR 模拟：** 其主要目标是为桌面用户提供自由移动的能力，使他们看起来就像在 VR 中玩耍一样。
- **头部追踪 (Head Tracking)：** 支持 TrackIR 设备，让您的虚拟形象的头部可以根据您的实际动作移动。

> [!NOTE]
> 注意
> 此工具使用 **OSC (Open Sound Control)** 将参数从桌面应用程序发送到您的 VRChat 客户端。确保在 VRChat 轮盘菜单 (Radial Menu) 中启用了 OSC 选项。

## 在哪里获取？
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## 先决条件
在开始之前，请确保您满足以下要求：
- **操作系统：** Windows 10 或 Windows 11。
- **软件：** 您的电脑上安装了 [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)。
  - *如何下载：* 进入链接后，寻找写有 "**.NET Desktop Runtime**" 的部分。在下方的小表格中，在 "Windows" 这一行，点击 "**x64**" 链接即可下载安装程序。
- **硬件：** 带有中键（滚轮）的鼠标。
- **VRChat SDK：** 安装在您的 Unity 项目中（通过 VCC）。
- **虚拟形象：** 兼容的人形虚拟形象（在标准人类比例下效果最佳）。

## 循序渐进安装指南

安装过程分为两个主要部分：在 Unity 中准备虚拟形象和设置桌面应用程序。

### 第 1 部分：在虚拟形象上安装 (Unity)
1. **导入包：** 从官方页面下载 "Base Package"，并将 `.unitypackage` 文件拖入 Unity 项目的 `Assets` 文件夹。
2. **添加到虚拟形象：** 找到 Esska Desktop Puppeteer 包中包含的预制件 (prefab)，将其拖到层次结构 (`Hierarchy`) 中的虚拟形象上。
3. **参数配置：** 系统使用 OSC 参数。确保您的虚拟形象有足够的参数内存 (Parameters Memory) 来容纳新的控制项。
4. **上传虚拟形象：** 一旦预制件正确放置和配置，即可像平常一样将您的虚拟形象上传到 VRChat。

### 第 2 部分：桌面应用程序设置
1. **下载应用程序：** 下载 "Esska Desktop Puppeteer App" 应用程序。
2. **运行：** 在您的 VRChat 会话之前或期间在电脑上打开应用程序。
3. **在 VRChat 中启用 OSC：** 在 VRChat 内，打开您的轮盘菜单，转到 `Options` -> `OSC` 并确保将其设置为 **Enabled** (已启用)。
4. **使用方法：** 根据应用程序的说明，使用鼠标按钮（尤其是中键）和键盘，开始移动虚拟形象的肢体。

> [!WARNING]
> 警告：隐私与控制
> 为了能在 VRChat 窗口处于活动状态时正常工作，该应用程序需要“监听”您的键盘和鼠标输入（全局钩子）。开发者声明它不收集个人数据，但了解该程序的工作原理对于避免与其他应用程序产生干扰很重要。

---

## 参考资料

[1] Esska. (n.d.). *Esska Desktop Puppeteer*. BOOTH. https://esska.booth.pm/items/6366670
