# Modular Avatar

<span class="badge">工具</span>

## 是什么？

Modular Avatar 是一套**非破坏性**工具，用于模块化您的 VRChat 头像和分发头像组件。使用 Modular Avatar，向头像添加新服装或功能就像拖放一样简单。

> [!NOTE]
> Modular Avatar 通过**非破坏性模块化框架 (NDMF)** 系统工作，它在构建时处理头像而不会修改您的原始文件。

## 有什么用？

- 通过**拖放**一键安装服装和配饰
- 动画器组织：将 FX 动画器拆分为多个子动画器并在运行时合并
- 自动配置 VRChat 菜单
- **切换**系统，用于激活/停用对象和混合形状
- 响应头像变化的响应式组件
- 带自动安装的预制件分发

## 主要功能

| 功能             | Modular Avatar | VRCFury    |
| ---------------- | -------------- | ---------- |
| **服装安装**     | 是（拖放自动） | 是（点击） |
| **切换系统**     | 是（高级）     | 是（基础） |
| **动画器组织**   | 是（合并）     | 否         |
| **自动菜单**     | 是（完整）     | 是（基础） |
| **非破坏性流程** | 是（NDMF）     | 是         |
| **混合形状同步** | 是             | 否         |
| **骨骼代理**     | 是             | 否         |

### 组件描述

| 组件                | 描述                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------- |
| **Merge Armature**  | 将预制件骨架合并到父头像中，常用于添加服装。MA 尽量减少创建的骨骼数量，尽可能重用现有骨骼。 |
| **Merge Animator**  | 将子动画器合并到父头像中，适用于各种类型的头像功能。                                        |
| **Object Toggle**   | 创建用于激活或停用对象的菜单项。切换时也可更新混合形状。                                    |
| **Blendshape Sync** | 当您调整身体形状时，将服装或配饰的混合形状与基础头像同步。                                  |
| **Bone Proxy**      | 允许添加独特的道具，如武器或特殊效果，直接附着在头像骨骼上。                                |
| **Menu System**     | 完整的菜单系统，可从 VRChat 菜单编辑您的头像。                                              |

> [!TIP]
> 当您想将服装或配饰作为预制件分发时，Modular Avatar 特别有用。用户只需将预制件拖到他们的头像上，MA 就会自动处理一切。

## 在哪里获取？

- **官方网站：** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **文档：** [Modular Avatar 文档](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub：** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord：** [Discord 社区](https://discord.gg/dV4cVpewmM)

## 如何安装？

### 通过 VCC（VRChat Creator Companion）安装

1. 将仓库添加到 VCC：
   - 点击：[Add Modular Avatar to VCC](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - 或转到 **Settings** → **Packages** → **Add Repository**，粘贴 URL `https://vpm.nadena.dev/vpm.json` 并点击 **Add**
2. 转到您项目的 **Manage Project**
3. 在包列表中，搜索 **Modular Avatar** 并点击 **[+]** 添加
4. 在 VCC 中点击 **Open Project**

## 如何使用？

### 创建基本切换

1. 在 Unity 中右键单击您的头像
2. 选择 **Modular Avatar → Create Toggle**
3. 将创建一个带有 **Menu Item**、**Menu Installer** 和 **Object Toggle** 组件的新游戏对象
4. 在 **Object Toggle** 组件中，点击 **+** 按钮添加条目
5. 将要切换的对象拖到空字段中
6. 完成！切换将自动出现在您头像的菜单中

### 安装服装

1. 将服装预制件拖到您的头像上
2. 右键单击服装并选择 **ModularAvatar → Setup Outfit**
3. MA 将自动配置骨架和动画

> [!TIP]
> 您可以在 [Modular Avatar 文档](https://modular-avatar.nadena.dev/docs/tutorials) 中查看官方教程。

## 与其他工具的关系

> [!TIP]
> 请参阅上面的比较表，了解 Modular Avatar 和 VRCFury 之间的区别。

Modular Avatar 和 VRCFury 是**互补工具**。许多现代服装都支持两者。请查看服装的文档以了解创建者推荐的方法。

- **[VRCFury](/wiki?topic=vrcfury)**：专注于动画和手势安装。
- **NDMF（非破坏性模块化框架）**：实现非破坏处理的基础框架。它会随 Modular Avatar 自动安装。

---

## 参考文献

Modular Avatar. (n.d.). _Modular Avatar_. Nadena Dev. 取自 https://modular-avatar.nadena.dev/

Modular Avatar. (n.d.). _Tutorials_. Nadena Dev. 取自 https://modular-avatar.nadena.dev/docs/tutorials

bd\_. (2026). _bdunderscore/modular-avatar_ [软件]. GitHub. 取自 https://github.com/bdunderscore/modular-avatar
