# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## 是什么？
**SPS** (Super Plug Shader)，有时俗称为 "SSP"，是 VRChat 的一个免费且现代的网格变形系统。它允许头像的某些部分在与其他头像或物体交互时进行逼真的变形，取代了像 **DPS** (Dynamic Penetration System) 这样的旧付费系统。

## 有什么用？
- **逼真的变形：** 通过使头像的网格变形来模拟穿透和物理接触。
- **优化：** 比旧系统更轻便、更高效。
- **免费：** 与 DPS 不同，SPS 是完全免费且开源的。
- **兼容性：** 适用于大多数现代着色器（Poiyomi, LilToon 等）。

## 哪里可以获得？
SPS 集成在 **VRCFury** 中，主要通过它进行管理。如果你使用 VRCFury，不需要手动下载单独的 "shader"。

- [VRCFury (包含 SPS)](https://vrcfury.com)
- [SPS 官方指南](https://vrcfury.com/sps)

## 如何安装？
安装几乎完全在 Unity 中使用 **VRCFury** 完成：

1. 确保你的项目中安装了 **VRCFury**（参见 VRCFury 指南）。
2. 在你的头像上，选择你想要添加组件的网格对象 (mesh) 或骨骼。
3. 给该对象添加一个 **VRCFury** 组件。
4. 在 VRCFury 组件中，搜索并添加 **SPS Plug** (用于穿透者) 或 **SPS Socket** (用于孔洞) 道具。
5. 直接在组件中配置参数（大小、类型）。
6. 完成！上传头像时，VRCFury 会自动生成所有必要的动画、菜单和逻辑。

> [!TIP]
> 与 DPS 的兼容性
> SPS 能够与使用旧版 DPS 的头像进行交互。你不需要对方拥有 SPS 也能正常工作。
