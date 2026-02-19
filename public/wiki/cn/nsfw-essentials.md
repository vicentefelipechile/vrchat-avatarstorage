# NSFW 基础指南

<span class="badge badge-red">NSFW</span> <span class="badge">服务条款 (TOS)</span> <span class="badge">优化</span>

## 简介
VRChat 允许极大的创作自由，包括成人内容 (NSFW) 和色情角色扮演 (ERP)。 然而，**至关重要**的是要了解规则和适当的工具，以便享受这些内容，而不会给您的帐户或他人的性能带来风险。

## VRChat 规则 (TOS)
VRChat 对公共场所的某些内容采取零容忍政策。

- **公共世界：** **严禁**在公共实例中显示露骨色情内容、裸体或色情行为。 这样做可能会导致**永久封禁**。
- **私人世界：** NSFW 内容和 ERP 在所有参与者均为成年人并已表示同意的私人实例（Friends+、Invite 等）中是可以容忍的。
- **虚拟化身 (Avatar)：** 您可以上传 NSFW 模型，但在公共场合**不得**使用其露骨功能。 使用“Toggles”（切换）系统默认隐藏所有内容。

## 必备工具
为了获得完整的体验，以下是大多数社区使用的标准工具：

1.  **VRCFury：** “瑞士军刀”工具。 对于添加 Toggles、衣服和复杂系统至关重要，而且不会破坏您的模型。
    *   [查看 VRCFury 指南](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader)：** 物理交互（穿透和变形）的标准系统。 它是免费的，并且比旧的 DPS 好得多。
    *   [查看 SPS 指南](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB)：** 通过触觉振动将性玩具 (Lovense) 连接到 VRChat 的黄金标准。
    *   [查看触觉指南](/wiki?topic=haptics)

## 优化与纹理内存
由于大量的衣服和高质量的皮肤纹理，NSFW 模型往往很“重”。

- **VRAM (显存)：** 这是最稀缺的资源。 如果您的模型使用超过 150MB 的纹理内存，您会导致他人崩溃 (Crash)。
- **压缩：** 务必确保在 Unity 中压缩纹理。 未压缩的 4K 纹理会占用大量空间。

## 接触与 PhysBones
VRChat 中的交互依赖于 **Contacts** (VRCContactReceiver 和 VRCContactSender)。
- **摸头 (Headpat)：** 通过检测头部的手来完成。
- **性互动：** SPS 和 OGB 使用接触来检测物体何时进入另一物体，从而触发真实玩具中的动画、声音或振动。
