# VRCFury

<span class="badge">选项</span>

## 这是什么？
VRCFury是一个免费的Unity插件，大大简化了VRChat模型的配置。它使安装服装、道具、手势和动画变得容易，无需手动编辑动画控制器。

## 用途是什么？
- 一键安装服装和配饰
- 自动设置手势和动画
- 自动生成VRChat菜单
- 非破坏性：不修改原始文件
- Blendshape优化器（删除未使用的）

> [!NOTE]
> 注意
> VRCFury是一个可选但强烈推荐的工具。某些模型需要它才能正常工作。如果模型需要它，将在描述中说明。

## 在哪里获取？
- **官方网站 (下载):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## 如何安装？

与许多现代VRChat工具一样，有两种安装VRCFury的方法。官方推荐的方法是使用 **VCC (VRChat Creator Companion)**。

### 方法1：通过VCC安装 (推荐)

使用VCC可确保VRCFury始终保持最新，并且在多个项目中使用时不会造成兼容性问题。

1. **将存储库添加到VCC：**
   - 前往官方下载页面：[vrcfury.com/download](https://vrcfury.com/download/)。
   - 在第1步（“Install VRChat Creator Companion”）中，如果您已经安装了VCC，则可以跳过它。在第2步，点击 **"Click Here to add VRCFury to VCC"** 按钮。
   - 您的浏览器会请求打开VCC的权限。接受它，进入VCC后，点击 **"I Understand, Add Repository"**。
   - *(手动替代方案)*: 打开VCC，前往 **Settings** -> **Packages** 标签页 -> **Add Repository**，在相应的空白处粘贴URL `https://vcc.vrcfury.com`，然后点击 **Add**。
2. **将VRCFury添加到您的项目：**
   - 在VCC中，前往您的项目列表并在您正在使用的项目上点击 **Manage Project**。
   - 在左侧（或右上角）的存储库列表中，确保已勾选 **"VRCFury Repo"**。
   - 在该项目可用包的列表中，搜索 **"VRCFury"** 并点击右侧的 **[+]** 图标将其添加到您的项目中。
3. **完成！** 在VCC中点击 **Open Project**，当上传您的模型或将它们添加到场景时，带有VRCFury的预制件将自动安装或配置。

> [!NOTE]
> 如果在通过VCC安装时窗口意外关闭，这是正常的。要修复它，只需关闭VCC，重新打开，然后重复此过程；您会发现现在它可以正常工作了。

### 方法2：通过.unitypackage手动安装 (旧版)

此方法不再被推荐，并被认为是已废弃的 (Legacy)，但如果您的VCC有问题，仍然可以使用它。

1. 从[GitHub](https://github.com/VRCFury/VRCFury/releases)的下载部分下载 `.unitypackage` 格式的VRCFury安装程序文件。
2. 打开您打算制作模型的Unity项目。
3. 在Unity的顶部菜单中，前往 **Assets** → **Import Package** → **Custom Package...**
4. 选择您刚刚下载的VRCFury `.unitypackage` 文件。
5. 确保在弹出窗口中选择了所有文件，然后点击 **Import**。
6. VRCFury 将被安装，顶部栏中将出现一个名为 **Tools > VRCFury** 的新菜单。（如果您使用此手动方法，可以在此处进行更新）。

---

## 参考资料

VRCFury. (n.d.). *Download*. VRCFury. Retrieved from https://vrcfury.com/download/

VRCFury. (n.d.). *VRCFury*. GitHub. Retrieved from https://github.com/VRCFury/VRCFury
