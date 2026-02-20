# Unity Hub 错误修复

如果 Unity Hub 无法打开、卡在无限加载屏幕上，或者您遇到导致无法使用该程序的登录错误，最有效的解决方案是执行**全新安装**。

以下是删除所有临时文件和损坏设置的方法。

## 方法 1: 全新安装（清除所有痕迹）

请仔细按照以下步骤操作以确保 Unity Hub 再次正常工作：

### 1. 卸载 Unity Hub
> [!WARNING]
> 警告
> 对于此步骤，您必须使用 **官方 Windows 卸载程序**（从 *设置 -> 应用* 或 *控制面板*）。**切勿使用第三方程序**（如 IObit Uninstaller、Revo Uninstaller 等），因为它们可能会删除必要的注册表项并使问题恶化。

- 转到 **Windows 设置** -> **应用**。
- 在列表中找到 "Unity Hub"，然后单击 **卸载**。

### 2. 删除残留目录
即使在卸载之后，Unity 也会在您的系统上留下隐藏的配置（缓存）文件夹。您必须手动找到并删除它们。

打开 Windows 文件资源管理器，将以下每个地址复制到顶部栏中，然后按 Enter。**如果文件夹存在，请将其完全删除：**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*（注意：您可以将 `%USERPROFILE%` 路径直接复制并粘贴到资源管理器的地址栏中，就像您使用 `%appdata%` 安装 Minecraft 模组一样，它会自动带您到当前用户文件夹）。*

### 3. 重新安装 Unity Hub
完全清除系统中的 Unity 文件后：
1. 转到 [Unity 官方网站](https://unity.com/download) 并下载最新版本的 Unity Hub。
2. 运行安装程序并遵循常规步骤。
3. 等待一切正确安装，再次登录，并确认错误已解决。
