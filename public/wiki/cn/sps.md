# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## 是什么？
**SPS** (Super Plug Shader)，有时通俗地称为 "SSP"，是由 **VRCFury** 团队设计的 VRChat 免费现代网格变形系统。它允许头像部分在与其他头像或物体交互时真实地变形，取代了 **DPS** (Dynamic Penetration System) 和 **TPS** 等旧的付费系统 [1]。

## 有什么用？
- **真实变形：** 通过使头像网格变形来模拟穿透和物理接触。
- **优化：** 它比旧系统更轻便、更高效。
- **免费：** 与 DPS 不同，SPS 是完全免费且开源的。
- **兼容性：** 适用于大多数现代着色器（Poiyomi, LilToon 等），并向后兼容使用 DPS 或 TPS 的头像。

## 先决条件
在开始之前，请确保你拥有以下内容：
- **Unity：** VRChat 推荐的版本。
- **VRChat SDK：** 已安装在你的项目中 (VCC)。
- **VRCFury：** 已安装并更新到最新版本 [2]。
- **3D 模型：** 一个带有你想制作动画的网格（孔或插入物）的头像。

## 分步安装指南

SPS 完全通过 Unity 中的 VRCFury 工具进行管理。你不需要导入奇怪的着色器包或进行复杂的特定手动动画配置。

### 第 1 步：安装 VRCFury
如果你还没有，请从 VRChat Creator Companion (VCC) 安装 VRCFury。
1. 打开 VCC。
2. 转到 "Manage Project"。
3. 在包列表中搜索 "VRCFury" 并点击安装（如果未出现，请添加存储库）。

### 第 2 步：创建 Socket (孔/插座)
"Socket" 是交互的接收器（嘴巴等）。

1. **工具：** 在 Unity 的顶部栏中，转到 `Tools` > `VRCFury` > `SPS` > `Create Socket` [1]。
2. **放置：** 一个新对象将出现在你的场景中。
   - 将此对象拖入你的头像层级结构中，并**使其成为相应骨骼的子对象**（例如：`Hip` 或 `Head`）。
3. **调整：** 移动并旋转 Socket 对象以匹配网格上孔的入口。
   - Gizmo 箭头必须指向孔的**内部**。
   - 确保 Socket 类型（在检查器中）与你想要的相符（例如：Vagina, Anal, Oral）。
4. **灯光：** 你不需要手动配置 ID 灯光；VRCFury 会为你完成。

> [!TIP]
> **放置注意事项 (ERP)**
> 不要将点 (Sockets) 放置在头像内部太深的地方。如果“洞”太深，舒适地进行 ERP 会变得困难。建议将它们刚好放在入口处或稍微向外。
>
> **注意大比例：** 如果你的头像臀部很宽或屁股很大（"巨臀"），**请将 Socket 进一步向外移动**。否则，对方在能够“到达”交互点之前就会与身体网格发生碰撞。

### 第 3 步：创建 Plug (插入物/插头)
"Plug" 是穿透并变形的对象。

1. **网格准备：**
   - 确保你的插入物网格在 Unity 的静止位置是“直的”且“伸展的”。SPS 需要知道总长度。
   - 如果来自 DPS/TPS，请确保删除旧脚本或特殊材质。使用普通着色器 (Poiyomi) [1]。
2. **工具：** 转到 `Tools` > `VRCFury` > `SPS` > `Create Plug` [1]。
3. **放置：**
   - **选项 A（有骨骼）：** 如果你的阴茎有骨骼，请拖动 Plug 对象并使其成为阴茎**基础骨骼**的子对象。
   - **选项 B（无骨骼）：** 如果只是一个网格 (mesh renderer)，请拖动 Plug 对象并将其直接拖放到带有 **Mesh Renderer** 的对象上。
4. **配置：**
   - 在 `VRCFury | SPS Plug` 组件的检查器中，确保 **Renderer** 是你的阴茎网格。
   - 调整方向：Gizmo 的弯曲部分应位于尖端，基部位于基部。
   - 配置适当的 **Type**。

### 第 4 步：在 Unity 中测试
你不需要上传头像来测试它是否有效。
1. 从 VCC 安装 **Gesture Manager** [1]。
2. 进入 Unity 的 **Play Mode**。
3. 选择 Gesture Manager。
4. 在模拟的表情菜单中，转到 SPS 选项。
   - VRCFury 会自动生成一个测试菜单，其中包含启用/禁用和测试变形的选项。
   - 你可以从工具菜单创建一个 "Test Socket" 来测试实时交互。

> [!WARNING]
> 警告：Constraints (约束)
> 避免在 SPS 变形的相同骨骼上使用 Unity Constraints，因为它们可能会导致运动冲突 (抖动) [4]。

---

## 参考资料

[1] VRCFury. (n.d.). *SPS (Super Plug Shader)*. VRCFury Documentation. https://vrcfury.com/sps

[2] VRCFury. (n.d.). *Download & Install*. VRCFury Documentation. https://vrcfury.com/download

[3] VRCD. (n.d.). *SPS Tutorial*. VRCD. https://vrcd.org.cn

[4] VRCFury. (n.d.). *SPS Troubleshooting*. VRCFury Documentation. https://vrcfury.com/sps
