# 虚拟形象参数 (Expression Parameters)

<span class="badge badge-blue">逻辑</span> <span class="badge badge-yellow">优化</span>

## 它们是什么？
**Expression Parameters**（或者简称参数）是作为 VRChat 虚拟形象“记忆”的变量 [1]。它们充当 **表情菜单**（游戏内的径向菜单）和 **Animator Controller**（播放动画的逻辑）之间的桥梁。

当你在菜单中选择一个选项（例如“脱掉衬衫”）时，菜单会改变一个参数的值（例如 `Shirt = 0`），Animator 读取该变化并执行相应的动画。

## 参数类型
你可以使用三种主要的数据类型，每种都有不同的内存成本 [2]：

| 类型 | 描述 | 内存成本 | 常见用途 |
| :--- | :--- | :--- | :--- |
| **Bool** | 真或假 (On/Off)。 | 1 bit | 简单的开关（衣服，道具）。 |
| **Int** | 整数 (0 到 255)。 | 8 bits | 具有多个选项的服装更换，步进滑块。 |
| **Float**| 小数 (0.0 到 1.0)。 | 8 bits | 连续滑块（厚度，色调，径向控制）。 |

## 内存限制 (Synced Bits)
VRChat 对每个虚拟形象施加了 **256 bits** 同步数据的严格限制 [2]。
- **同步 (Synced):** 其值通过网络发送给其他玩家的参数。如果你脱掉衬衫，你会希望别人也能看到。
- **非同步 (Local):** 仅存在于你电脑上的参数。对于不需要被他人看到的内部逻辑很有用。

> [!WARNING]
> 如果你超过了内存限制，你将无法上传虚拟形象，或者多余的参数将停止工作。尽可能使用 `Bool` 代替 `Int` 进行优化。

## 高级用途
除了从菜单控制衣服外，参数还可以通过以下方式控制：
- **PhysBones:** 检测是否有人触摸你的耳朵或头发 [3]。
- **Contacts:** 检测碰撞（如在 [SPS](./sps.md) 或 [PCS](./pcs.md) 系统中）。
- **OSC:** 接收来自外部程序的数据（如心率监测器、面部追踪或 Spotify）[3]。

## 如何创建
1. 在你的 Unity 项目中，右键点击 `Assets`。
2. 转到 `Create` > `VRChat` > `Avatars` > `Expression Parameters`。
3. 添加你需要的参数（例如 "Outfit", "Sword", "HueShift"）。
4. 将此文件分配给你虚拟形象的 **VRC Avatar Descriptor** 组件中的 "Expressions" 部分。

## 限制和常见问题

### 为什么会有 256 位限制？
VRChat 施加此限制主要是为了 **网络优化** [1]。每个同步参数都必须发送给实例中的所有其他玩家。如果没有限制：
- 更新 80 名玩家的位置和状态所需的带宽将是不可持续的。
- 连接速度慢的用户将遭受极端的延迟或断开连接。
- 由于过多的网络数据处理，整体 FPS 性能将下降。

### 与复杂资产的冲突 (GoGo Loco, SPS, 舞蹈)
在一个虚拟形象上结合多个“重型”系统时，经常会出现问题：

1.  **参数耗尽 (Parameter Exhaustion):**
    像 **GoGo Loco** 这样的资产消耗大量的内存。如果你尝试添加 SPS、复杂的舞蹈系统和衣服开关，很容易超过 256 个同步位。
    *   *后果:* VRChat 将阻止虚拟形象上传，或者最后安装的组件将无法工作。

2.  **逻辑冲突:**
    *   **GoGo Loco:** 如果与基础运动层或旧版本的资产发生冲突，可能会导致虚拟形象“沉”入地板或漂浮 [4]。
    *   **SPS (Super Plug Shader):** 将 SPS 与 Constraints 结合可能会导致接触点出现“抖动”（快速晃动），这是由于 VRChat 处理物理和触觉更新的方式造成的 [5]。

3.  **性能等级 (Performance Rank):**
    *   **SPS:** 通常需要额外的灯光或渲染器，这可能会立即将虚拟形象的性能等级降低到“Very Poor”。
    *   **GoGo Loco:** 向 Animator Controller 添加多个层。虽然它对图形影响不大，但它增加了处理动画逻辑的 CPU 使用率 [4]。

> [!TIP]
> 像 **VRCFury** 这样的工具对于管理这些冲突至关重要。VRCFury 自动化了控制器和参数的合并（“非破坏性工作流”），减少了人为错误并在可能的情况下优化内存使用。

## 优化和技巧：如何减少位的使用

为了在不牺牲功能的情况下避免达到 256 位限制，创作者使用几种巧妙的技术。最常见的是 **合并互斥状态**。

#### “单 Int”技巧 (Single Int)
想象一下你的虚拟形象有 10 件不同的衬衫。
*   **低效方式 (Bools):** 你创建 10 个 `Bool` 参数 (Shirt1, Shirt2... Shirt10)。
    *   *成本:* 10 Bits。
    *   *缺点:* 每增加一件衣服你就花费 1 bit。
*   **高效方式 (Int):** 你创建 **1** 个名为 `Top_Clothing` 的 `Int` 参数。
    *   *成本:* 8 Bits (总是，因为它是 Int)。
    *   *优点:* 你可以使用相同的 8 bits拥有多达 **255 件衬衫**！
    *   *如何工作:* 在 Animator 中，你设置如果值为 1，则衬衫 A 激活；如果是 2，则衬衫 B，依此类推。

> [!NOTE]
> **黄金法则:** 如果你有超过 8 个不能同时使用的选项（例如服装类型、眼睛颜色），请使用 `Int`。如果少于 8 个，请使用单独的 `Bool`。

#### 基本配置示例
如果你想为你的衣服创建一个颜色选择器：
1.  创建一个名为 `ColorBoots` 的 **Int** 参数。
2.  在你的 **Expression Menu** 中，创建一个子菜单或“Radial Puppet”控件（尽管对于精确更改，设置精确值的按钮更好）。
3.  配置菜单按钮：
    *   "Red" 按钮 -> Sets `ColorBoots` to 1.
    *   "Blue" 按钮 -> Sets `ColorBoots` to 2.
    *   "Black" 按钮 -> Sets `ColorBoots` to 3.
4.  在 **Animator (FX Layer)** 中：
    *   创建从 `Any State` 到颜色状态的过渡。
    *   Red 的条件: `ColorBoots` equals 1.
    *   Blue 的条件: `ColorBoots` equals 2.

这样你只需要花费总预算中的 8 bits 就可以控制多个选项！

## 汇总表：使用哪种类型？

| 用例 | 推荐类型 | 为什么？ |
| :--- | :--- | :--- |
| **开关 1 个物体** (眼镜, 帽子) | `Bool` | 简单直接。花费 1 bit。 |
| **服装选择器** (衬衫 A, B, C...) | `Int` | 允许数百个选项，仅花费 8 bits。 |
| **渐变更改** (厚度, 颜色, 亮度) | `Float` | 对于小数值 (0.0 到 1.0) 是必需的。 |
| **复杂状态** (舞蹈, AFK, 表情) | `Int` | 具有多个条件的状态机的理想选择。 |
| **独立开关** (< 8 个物体) | `Bool` | 如果数量少且互不排斥，设置起来更容易。 |

---

## 参考资料

[1] VRChat. (n.d.). *Expression Parameters*. VRChat Documentation. https://docs.vrchat.com/docs/expression-parameters

[2] VRChat. (n.d.). *Avatar Parameter Driver*. VRChat Documentation. https://docs.vrchat.com/docs/avatar-parameter-driver

[3] VRChat. (n.d.). *OSC Overview*. VRChat Documentation. https://docs.vrchat.com/docs/osc-overview

[4] Franada. (n.d.). *GoGo Loco Documentation*. https://www.3d.franada.com/gogoloco

[5] VRCFury. (n.d.). *SPS - Super Plug Shader*. VRCFury Documentation. https://vrcfury.com/components/sps
