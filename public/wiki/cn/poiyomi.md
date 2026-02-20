# Poiyomi Toon Shader

<span class="badge badge-blue">依赖项</span>

## 这是什么？
Poiyomi是专为VRChat设计的Unity着色器。它允许您使用高级视觉效果在模型上创建风格化和卡通般的外观。

## 用途是什么？
- 可自定义的风格化着色（卡通、真实、平面）
- 特殊效果：轮廓、贴花、闪光、火花
- AudioLink支持（音频反应效果）
- 物理精确的反射和高光
- 针对VRChat性能优化

> [!WARNING]
> 非常重要
> Poiyomi不包含在您下载的模型文件中。您必须在打开模型之前自己在Unity中安装它。

## 在哪里获取？
- **官方网站 (下载):** [poiyomi.com/download](https://poiyomi.com/download)
- **免费版:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Pro版:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## 如何安装？

目前，在您的项目中安装Poiyomi主要有两种方法。VRChat社区推荐的方法是使用 **VCC (VRChat Creator Companion)**，但您也可以使用经典的 **UnityPackage** 导入。

### 方法1：通过VCC安装 (推荐)

使用VCC (VRChat Creator Companion) 是安装和管理Poiyomi的最干净、最受推荐的方法，因为它允许您轻松从应用程序更新着色器。

1. **将存储库添加到VCC：**
   - 最简单的方法是访问官方下载页面：[poiyomi.com/download](https://poiyomi.com/download)。
   - 向下滚动到写着“Method 2”的地方，找到 **Creator Companion (VCC)** 部分，然后点击 **"Add to VCC"** 按钮。
   - 您的浏览器会请求打开VCC的权限。接受它，进入VCC后，点击 **"I Understand, Add Repository"**。
   - *(手动替代方案)*: 打开VCC，前往 **Settings** -> **Packages** 标签页 -> **Add Repository**，在相应的空白处粘贴URL `https://poiyomi.github.io/vpm/index.json`，然后点击 **Add**。
2. **将着色器添加到您的项目：**
   - 在VCC中，导航到项目部分，并在您想要安装着色器的VRChat项目上点击 **Manage Project**。
   - 在 **Selected Repos** 部分（侧边菜单或顶部存储库下拉列表），确保已勾选 **"Poiyomi's VPM Repo"**。
   - 在该项目可用包的列表中，搜索 **"Poiyomi Toon Shader"** 并点击右侧的 **[+]** 图标进行添加。
3. **完成！** 现在您可以在VCC中点击 **Open Project**，Poiyomi将在您的Unity项目可用。

> [!NOTE]
> 如果在通过VCC安装时窗口意外关闭，这是正常的。要修复它，只需关闭VCC，重新打开，然后再次尝试通过VCC安装；您会发现现在它可以正常工作了。

### 方法2：通过.unitypackage手动安装

这是经典方法。请记住，将来更新会比较困难，如果您以后尝试切换到VCC方法，可能会留下残留文件。

1. 从[GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases)的发布页面，或者如果您使用Pro版，则从您的[Patreon](https://www.patreon.com/poiyomi)帐户，下载最新的 `.unitypackage` 文件。
2. 打开您打算导入模型的Unity项目。
3. 在Unity窗口中，通过顶部菜单导入包：**Assets** → **Import Package** → **Custom Package...**
4. 选择您刚刚下载到计算机的 `.unitypackage` 文件。
5. 将出现一个窗口，显示要导入的所有文件的列表。确保已选择所有内容（您可以使用“All”按钮），然后点击底部的 **Import** 按钮。
6. 等待进度条完成，安装即告完成。Poiyomi将准备好分配给您项目中的材质。

---

## 参考资料

Poiyomi. (n.d.). *Download*. Poiyomi Shaders. Retrieved from https://poiyomi.com/download

Poiyomi. (n.d.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Retrieved from https://github.com/poiyomi/PoiyomiToonShader
