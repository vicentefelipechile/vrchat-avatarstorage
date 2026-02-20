# 循序渐进指南：使用 VCC 准备 Unity
在导入下载的虚拟形象“之前”，请遵循这些步骤

> [!NOTE]
> 注意
> 您不需要自行安装、操作或管理 Unity。整个项目准备和依赖包安装过程都在 VCC 中完成。你只会在最后导入和上传虚拟形象时才打开 Unity。

### 第 1 步：安装 VRChat Creator Companion (VCC)
从 [vrchat.com/home/download](https://vrchat.com/home/download) 下载 **VRChat Creator Companion**。**VCC** 是一个能自动管理 Unity、VRChat SDK 和所有必需包的官方工具。

### 第 2 步：通过 VCC 安装 Unity Hub 和 Unity
首次打开 VCC 时，它会检测你是否安装了 Unity。按照设置向导操作，它会为你安装 **Unity Hub**，然后下载 VRChat 所需的正确版本的 **Unity**（目前为 2022.3 系列）。允许 VCC 自动安装这两个程序。

### 第 3 步：创建一个新的虚拟形象项目
打开 VCC → **Projects** → **Create New Project**。选择 **“Avatars”** 模板。给它起个名字（例如：“我的 VRChat 虚拟形象”）。VCC 将使用 **VRChat SDK** 自动准备好您的项目。

### 第 4 步：添加 Poiyomi 存储库
在 VCC 中，前往 **Settings** → **Packages** → **Add Repository**。粘贴此 URL：[https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) 并点击“Add”。这让你能轻松安装 **Poiyomi**，它对于虚拟形象的纹理正常显示至关重要。你可以在我们[有关 Poiyomi 的指南](/wiki?topic=poiyomi)中找到更多详细信息。

### 第 5 步：添加 VRCFury 存储库 (可选)
如果你的虚拟形象需要它，在 **Settings** → **Packages** → **Add Repository** 中粘贴：[https://vcc.vrcfury.com](https://vcc.vrcfury.com) 并点击“Add”。**VRCFury** 使你能通过拖放轻松安装衣服和配饰。我们建议查看[有关 VRCFury 的指南](/wiki?topic=vrcfury)以了解更多信息。

### 第 6 步：在您的项目中安装包
在 VCC 中，选择你新创建的项目 → **Manage Project**。寻找 **“Poiyomi Toon Shader”** 并点击 **“+”** 按钮来添加它。如果你需要 VRCFury，也用同样按钮添加。点击 **“Apply”** 或等待它加载完毕。

### 第 7 步：打开项目并导入虚拟形象
在你的 VCC 项目菜单中，点击 **“Open Project”** 首次打开 Unity（可能需要一些时间）。打开后，导入你的虚拟形象：将 **.unitypackage** 文件拖入 Unity 窗口（到 `Project` 或 `Assets` 标签页，或使用 **Assets → Import Package → Custom Package**）。

### 第 8 步：验证与配置
将 **虚拟形象预制件(prefab)** 拖入场景(Scene)中。如果一切正确且已安装 Poiyomi，您**将不会看到品红色（粉红色）的材质**。使用 **VRChat SDK → Show Control Panel → Builder** 进行配置。使用 **“Auto Fix”** 解决错误，并使用 **“Build & Publish”** 进行上传。

> [!TIP]
> 重要提示
> VCC 简化了一切。你不再需要在网上寻找正确版本的 Unity，也不需处理兼容性问题。始终使用 VCC 作为管理管理 VRChat 项目的中心枢纽。

---

## 参考资料

[1] VRChat Inc. (无日期). *VRChat Creator Companion*. VRChat. https://vrchat.com/home/download

[2] Unity Technologies. (无日期). *Unity Hub*. Unity. https://unity.com/download

[3] Poiyomi. (无日期). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader

[4] VRCFury. (无日期). *VRCFury Documentation*. https://vrcfury.com
