# 逐步指南：使用VCC准备Unity
在导入下载的模型**之前**，请按照以下步骤操作

### 步骤1：安装VRChat Creator Companion (VCC)
从[vrchat.com/home/download](https://vrchat.com/home/download)下载**VRChat Creator Companion**。**VCC**是自动管理Unity、VRChat SDK和所有必要包的官方工具。

### 步骤2：创建一个新的模型项目
打开VCC → **Projects** → **Create New Project**。选择**"Avatars"**模板。给它一个名字（例如：“我的VRChat模型”）。VCC将自动安装**Unity**和**VRChat SDK**。

### 步骤3：添加Poiyomi存储库
在VCC中，转到**Settings** → **Packages** → **Add Repository**。粘贴此URL：[https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json)并点击“Add”。这将允许您轻松安装**Poiyomi**。

### 步骤4：添加VRCFury存储库（可选）
如果您的模型需要它，在**Settings** → **Packages** → **Add Repository**中，粘贴：[https://vcc.vrcfury.com](https://vcc.vrcfury.com)并点击“Add”。**VRCFury**使安装服装和配饰变得容易。

### 步骤5：将包安装到您的项目
在VCC中，选择您的项目 → **Manage Project**。找到**"Poiyomi Toon Shader"**并点击**"+"**按钮添加它。如果您需要VRCFury，也添加它。点击**"Apply"**。

### 步骤6：打开项目并导入模型
在VCC中，点击**"Open Project"**以启动Unity。打开后，导入您的模型：将**.unitypackage**文件拖入Unity窗口或使用**Assets → Import Package → Custom Package**。

### 步骤7：验证并配置
将**模型预制件**拖入场景。如果一切正确，您将**不会看到洋红色**（粉红色）的材质。使用**VRChat SDK → Show Control Panel → Builder**配置模型。使用**"Auto Fix"**修复错误并使用**"Build & Publish"**上传。

> [!TIP]
> 重要提示
> VCC简化了一切。您不再需要手动安装Unity或查找正确的版本。VCC会自动执行此操作。始终使用VCC来管理您的VRChat项目。
