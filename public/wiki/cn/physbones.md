# PhysBones

<span class="badge badge-blue">依赖项</span>

## 什么是PhysBones？

PhysBones是集成在VRChat SDK中的一组组件，允许为虚拟形象和世界中的物体添加次级运动（物理效果）。通过PhysBones，你可以为头发、尾巴、耳朵、服装、电线、植物等添加运动。正确使用它们可以使你的虚拟形象看起来更加动态和真实。

> [!NOTE]
> PhysBones是VRChat中**官方替代**Dynamic Bones的组件。虽然Dynamic Bones在现有虚拟形象上仍然有效（会自动转换），但所有创作者都应该为新虚拟形象使用PhysBones。

## 用途

- 为头发、尾巴、耳朵和服装添加物理效果
- 允许其他玩家与你的虚拟形象元素交互（抓取、摆姿势）
- 创建动态且真实的次级运动
- 替代Unity的Cloth组件用于简单布料

## 主要组件

PhysBones由三个协同工作的组件组成：

| 组件                    | 描述                                          |
| ----------------------- | --------------------------------------------- |
| **VRCPhysBone**         | 定义将使用物理动画的骨骼链的主组件            |
| **VRCPhysBoneCollider** | 定义影响PhysBones的碰撞器（头部、躯干、手等） |
| **VRCPhysBoneRoot**     | 可选。为多个PhysBones定义运动根（仅限世界）   |

## 详细配置

### 版本

你可以直接在检查器中选择VRCPhysBone组件的版本。默认使用最新版本。

**版本1.0：**

- PhysBone组件的基础版本

**版本1.1（Squishy Bones）：**

- 允许骨骼压缩和拉伸
- 重力现在作为休息时骨骼旋转程度的比例
- 需要正Pull值才能使骨骼沿重力方向移动

### Transforms

| 设置                        | 描述                                              |
| --------------------------- | ------------------------------------------------- |
| **Root Transform**          | 组件开始的变换。如果为空，从这个GameObject开始    |
| **Ignore Transforms**       | 不应受组件影响的变换列表                          |
| **Ignore Other Phys Bones** | 如果启用，PhysBone将忽略层次结构中的其他PhysBones |
| **Endpoint Position**       | 用于在链端点创建额外骨骼的向量                    |
| **Multi-Child Type**        | 存在多个链时根骨骼的行为                          |

> [!CAUTION]
> 如果使用单个根骨骼或带有多个子级的根（没有孙级），你必须定义Endpoint Position！这与Dynamic Bones不同。

### Forces（力）

**Integration Type：**

- **Simplified**：更稳定，更容易配置，对外力反应较慢
- **Advanced**：不太稳定，允许更复杂的配置，对外力反应更快

可用参数：

- **Pull**：将骨骼拉回休息位置的力
- **Spring**（Simplified）/ **Momentum**（Advanced）：尝试到达休息位置时的摆动量
- **Stiffness**（仅Advanced）：保持在休息位置的力
- **Gravity**：应用的重力。正值向下拉，负值向上拉
- **Gravity Falloff**：控制休息位置移除重力的程度（1.0 = 休息时无重力）

> [!TIP]
> 如果你的头发建模时已经是站立时的理想位置，请将Gravity Falloff设置为1.0。这样当你静止站立时重力不会影响它。

### Limits（限制）

限制允许限制PhysBone链可以移动的程度。它们对于防止头发穿过头部非常有用，而且比碰撞器**性能更好**。

| 类型      | 描述                                 |
| --------- | ------------------------------------ |
| **None**  | 无限制                               |
| **Angle** | 限制在距轴的最大角度。以圆锥体可视化 |
| **Hinge** | 限制在平面内。像披萨片               |
| **Polar** | 结合Hinge和Yaw。更复杂，谨慎使用     |

> [!WARNING]
> 不要过度使用Polar限制。使用超过64个可能会导致性能问题。

### Collision（碰撞）

| 设置                | 描述                                             |
| ------------------- | ------------------------------------------------ |
| **Radius**          | 每个骨骼周围的碰撞半径（米）                     |
| **Allow Collision** | 允许与全局碰撞器碰撞（其他玩家的手、世界碰撞器） |
| **Colliders**       | 此PhysBone专门碰撞的碰撞器列表                   |

**Allow Collision选项：**

- **True**：与全局碰撞器碰撞
- **False**：仅与列出的碰撞器碰撞
- **Other**：按类型过滤的高级选项（虚拟形象、世界、物品）

### Stretch & Squish（仅v1.1）

| 设置               | 描述                             |
| ------------------ | -------------------------------- |
| **Stretch Motion** | 运动影响骨骼拉伸/压缩的程度      |
| **Max Stretch**    | 允许的最大拉伸（原始长度的倍数） |
| **Max Squish**     | 允许的最大压缩（原始长度的倍数） |

### Grab & Pose（抓取和摆姿势）

| 设置               | 描述                                                    |
| ------------------ | ------------------------------------------------------- |
| **Allow Grabbing** | 允许玩家抓取骨骼                                        |
| **Allow Posing**   | 允许玩家抓取后摆姿势                                    |
| **Grab Movement**  | 控制抓取时骨骼如何移动（0 = 使用pull/spring，1 = 立即） |
| **Snap To Hand**   | 骨骼被抓取时自动吸附到手上                              |

## 实际用例

### 示例1：长发

1. 选择头发的根骨骼（通常在颈部或头部）
2. 添加**VRCPhysBone**组件
3. 配置：
   - **Root Transform**：头发根骨骼
   - **Ignore Transforms**：眼睛和任何不应移动的骨骼
   - **Multi-Child Type**：Ignore（这样所有头发骨骼用一个组件影响）
   - **Pull**：0.3 - 0.5
   - **Gravity**：0.5 - 1.0
   - **Gravity Falloff**：0.5 - 0.8（根据你想要的休息状态调整）
   - **Radius**：0.05 - 0.1
4. 添加**Limits**类型Angle以防止头发穿过头部

> [!TIP]
> 对于很长的头发，考虑将其分成多个PhysBone组件（每个部分一个）以获得更好的性能。

### 示例2：动物尾巴

1. 选择尾巴的基部骨骼
2. 添加**VRCPhysBone**组件
3. 配置：
   - **Root Transform**：尾巴基部骨骼
   - **Integration Type**：Advanced
   - **Pull**：0.2 - 0.4
   - **Spring/Momentum**：0.5 - 0.7
   - **Stiffness**：0.1 - 0.3
   - **Gravity**：0.3 - 0.6
4. 使用**Hinge**限制来限制横向运动

### 示例3：裙子或披风

1. 确保服装有自己的独立骨架，与虚拟形象分开
2. 选择裙子/披风的根骨骼
3. 添加**VRCPhysBone**组件
4. 配置：
   - **Pull**：0.1 - 0.3（布料更柔软）
   - **Gravity**：0.8 - 1.0
   - **Gravity Falloff**：0.3 - 0.5
   - **Radius**：0.05
5. 在虚拟形象的躯干上添加**VRCPhysBoneCollider**
6. 在PhysBone组件的**Colliders**中，添加躯干碰撞器

> [!NOTE]
> 对于很长的裙子或完整披风，考虑使用Unity的Cloth组件而不是PhysBones，因为它针对此类布料进行了优化。

## Dynamic Bones与PhysBones

VRChat在加载虚拟形象时会自动将Dynamic Bones组件转换为PhysBones。但是，此转换并不完美。

**主要区别：**

- Dynamic Bones在转换时默认使用Advanced模式
- 某些Dynamic Bones设置在PhysBones中没有等效项
- 自动转换对Multi-Child Type使用"Ignore"

**手动转换：**
你可以使用VRChat SDK → Utilities → Convert DynamicBones to PhysBones手动转换你的虚拟形象。

> [!WARNING]
> 在转换前备份你的虚拟形象，因为此过程不可逆。

## 限制和性能

| 平台           | 限制                             |
| -------------- | -------------------------------- |
| **PC**         | 每个组件约256个变换              |
| **Meta Quest** | 更低的限制（请参阅性能排名文档） |

**优化提示：**

- 每个PhysBone组件不要超过256个变换
- 如果有超过128个变换，考虑拆分为多个组件
- 尽可能使用**Limits**而不是碰撞器
- 不要使用人形骨骼（Hip、Spine、Chest、Neck、Head）作为PhysBone根

> [!IMPORTANT]
> PhysBones在Meta Quest上有硬限制。请参阅性能排名系统中的"Very Poor"限制。

## 常见错误

### PhysBone不动

- 验证Root Transform是否正确分配
- 确保它在Multi-Child Type中未设置为"Ignore"
- 验证Pull值不为0

### PhysBone穿过头部

- 向组件添加限制（Limits）
- 向虚拟形象添加碰撞器并在PhysBone中配置
- 增加Pull值

### 骨骼无法到达休息位置

- 增加Pull值
- 根据集成类型调整Spring/Momentum

### 骨骼穿过身体

- 向虚拟形象添加VRCPhysBoneCollider
- 在PhysBone的Colliders列表中配置碰撞器
- 验证半径是否合适

## 在哪里了解更多？

- **官方文档：** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **SDK示例：** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **社区：** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## 参考文献

VRChat. (2025). _PhysBones_. VRChat Creators. 检索自 https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). _VRCPhysBoneCollider_. VRChat Creators. 检索自 https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
