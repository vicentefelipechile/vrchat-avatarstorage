# Inside View

<span class="badge badge-blue">视觉</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## 它是什么？
**Inside View**，由 **Liindy** [1] 创建，是一个用于 VRChat 虚拟形象的资产，它允许通过添加模拟的视觉深度来查看网格内部（如 SPS 孔）。

与简单地删除网格的背面（背面剔除）不同，Inside View 使用“屏幕着色器”在孔内投射深度纹理，从而在不需要建模复杂的内部几何形状的情况下创造逼真的内部错觉。它通常与 [SPS](./sps.md) 等系统一起使用，以改善 ERP 期间的可视化。

## 主要特点
- **模拟深度:** 创造隧道或详细内部的错觉。
- **优化:** 使用着色器避免沉重的额外几何形状。
- **SPS 集成:** 旨在与 SPS 插入协同工作 [3]。
- **易于安装:** 兼容 **VRCFury**，可进行“拖放”设置。

## 先决条件
- **Unity:** VRChat 推荐的版本（目前是 2022.3.22f1 或类似版本） [1]。
- **VRChat SDK 3.0:** (Avatars) 通过 VCC 下载 [1]。
- **VRCFury:** 自动安装所必需。
- **Poiyomi Toon Shader:** (可选但推荐) 版本 8.1 或更高以获得材质兼容性 [2].

## 安装指南

> [!NOTE]
> 本指南假设使用 **VRCFury**，这是创建者推荐的官方方法。

### 步骤 1: 导入
从 Jinxxy 或 Gumroad 获取包（免费或付费）后：
1. 打开已安装 SDK 和 VRCFury 的 Unity 项目。
2. 导入 **Inside View** `.unitypackage`。

### 步骤 2: 放置 (VRCFury)
1. 在资产文件夹（通常是 `Assets/Liindy/Inside View`）中搜索 Inside View 预制件。
2. 将预制件拖放到你的虚拟形象层级结构中。
   - **重要:** 将其作为孔（或 SPS Socket）所在的骨骼或对象的“子级”放置。
3. 确保 SPS "Socket" 对象和 "Inside View" 在相同的位置和旋转上对齐。

### 步骤 3: 深度配置
该资产通过深度动画 (Depth Animation) 工作。
1. 选择 Inside View 预制件上的 VRCFury 组件。
2. 验证它是否指向你孔的正确 **Renderer** (网格)。
3. 上传虚拟形象时，VRCFury 将自动合并必要的菜单和逻辑。

### 附加说明
- **参数成本:** "Full" 版本最多可以使用 35 bits 的参数内存，而 "Standard" 版本使用大约 17 bits。如果你的虚拟形象已经有很多参数，请记住这一点 [1]。
- **背面剔除:** 确保你的孔材质根据着色器说明将 "Cull" 设置为 "Off" 或 "Back"，以便从正确的角度可以看到效果。

---

## 参考资料

[1] Liindy. (n.d.). *Inside View (VRCFury)*. Jinxxy. https://jinxxy.com/Liindy/InsideView

[2] Liindy. (n.d.). *Inside View*. Gumroad. https://liindy.gumroad.com/l/InsideView
