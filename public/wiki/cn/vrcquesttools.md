# VRCQuestTools

<span class="badge">工具</span>

## 什么是？
VRCQuestTools 是由 **kurotu** 开发的 Unity 扩展，允许将针对 PC 设计的 VRChat 头像转换为 Android 平台（Meta Quest/PICO）。该工具可自动让头像兼容移动设备的严格性能限制。

> [!NOTE]
> VRCQuestTools 在最新版本中通过 **Non-Destructive Modular Framework (NDMF)** 系统工作，允许在处理头像时不会修改原始文件。

## 用途是什么？
- 只需点击几次即可将 PC 头像转换为 Android
- 自动减少多边形和材质
- 删除与 Quest 不兼容的组件（灯光、布料等）
- 调整纹理和材质以优化性能
- 用于将头像上传到 Quest 的各种实用程序

> [!WARNING]
> 重要提示：VRoid Studio 头像与 Android 不兼容，因为它们大量使用透明材质。VRCQuestTools 无法帮助你处理这些头像；你必须手动修改它们。

## 环境要求

| 要求 | 最低版本 |
|------|----------|
| Unity | 2019.4.31f1、2022.3.6f1 或 2022.3.22f1 |
| VRChat SDK | Avatars 3.3.0 或更高版本 |
| Android Build Support 模块 | 已安装在 Unity 中 |

## 在哪里获取？
- **官方网站：** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **文档：** [VRCQuestTools 文档](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub：** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth（捐赠）：** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## 如何安装？

### 通过 VCC 安装（VRChat Creator Companion）

1. 将存储库添加到 VCC：
   - 点击：[将 VRCQuestTools 添加到 VCC](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - 或转到 **Settings** → **Packages** → **Add Repository**，粘贴 URL `https://kurotu.github.io/vpm-repos/vpm.json` 然后点击 **Add**
2. 进入项目的 **Manage Project**
3. 在包列表中，搜索 **VRCQuestTools** 然后点击 **[+]** 添加
4. 在 VCC 中点击 **Open Project**

## 如何将头像转换为 Android？

### 快速方法（使用 NDMF 非破坏性）

1. 在 Unity 层级中右键点击你的头像
2. 选择 **VRCQuestTools** → **Convert Avatar For Android**
3. 在打开的窗口中，点击 **Begin Converter Settings** 然后点击 **Convert**
4. 等待转换完成
5. 进入 **File** → **Build Settings**
6. 选择 **Android** 平台，然后点击 **Switch Platform**
7. 等待 Unity 切换平台
8. 将转换后的头像上传到 VRChat

> [!TIP]
> 原始头像在转换后会被停用。如有需要，你可以从 Inspector 中重新激活它。

> [!NOTE]
> 转换后的头像**不会自动优化性能**。在大多数情况下，转换后的头像对于 Android 来说会被评为 **Very Poor**。你可以使用 Avatar Display 设置（显示头像）来查看它。

## Quest 性能限制

| 指标 | Excellent | Good | Medium | Poor | Very Poor |
|------|-----------|------|--------|------|-----------|
| **三角形** | 7,500 | 10,000 | 15,000 | 20,000 | >20,000 |
| **材质槽** | 1 | 1 | 1 | 2 | >2 |
| **蒙皮网格** | 1 | 1 | 1 | 2 | >2 |
| **PhysBones** | 2 | 4 | 6 | 8 | >8 |

> [!NOTE]
> 默认情况下，移动设备上的 **Minimum Displayed Performance Rank** 级别设置为 **Medium**。这意味着被归类为 Poor 或 Very Poor 的头像将不会对其他用户可见，除非他们选择手动显示你的头像。

有关性能排名系统的更多信息，请参阅 [VRChat 官方文档](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/)。

## 与其他工具的关系

- **[Modular Avatar](/wiki?topic=modular-avatar)**：如果你使用 Modular Avatar 或其他 NDMF 工具，转换将完全是非破坏性的。
- **[VRCFury](/wiki?topic=vrcfury)**：VRCFury 可帮助你在转换前准备动画和手势。
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**：转换后请确保着色器与 Android 兼容。

---

## 参考资料

kurotu. (n.d.). *VRCQuestTools - Avatar Converter and Utilities for Android*. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/

kurotu. (n.d.). *Introduction*. VRCQuestTools Docs. Retrieved from https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). *kurotu/VRCQuestTools* [Software]. GitHub. Retrieved from https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). *Performance Ranks*. VRChat Creator Documentation. Retrieved from https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
