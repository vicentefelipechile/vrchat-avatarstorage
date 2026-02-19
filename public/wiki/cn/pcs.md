# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">音频</span>

## 它是什么？
**PCS** (Penetration Contact System)，由 **Dismay** [1] 创建，是一个用于 VRChat 虚拟形象的补充系统，它使用 **Contacts** (Contact Senders 和 Receivers) 为性关系 (ERP) 增加高级交互性。

它的主要功能是生成 **听觉反馈**（声音）。作为选项，它允许通过振动（触觉）控制真实的性玩具 [3][4]。

### 关键区别
- **无 OSC (基础):** 系统在游戏内播放“拍打”、“滑动”和液体的声音。附近的每个人都能听到。它在 VRChat 中自主工作 [1]。
- **有 OSC (高级/可选):** 将数据发送到 VRChat 外部，以使性玩具（Lovense 等）与插入同步振动。

## 基础功能 (声音)
这是 PCS 的默认功能，**不需要外部软件**。

1. **检测:** "Receivers"（孔）检测 "Sender"（阴茎/插入物）何时进入它们。
2. **动态声音:**
   - 摩擦入口时: 摩擦或“拍打”声。
   - 插入时: 根据速度和深度而变化的摩擦/液体声音 ("squelch")。
3. **即插即用:** 一旦安装在虚拟形象上，它会自动与任何配置了 "Senders" 的其他用户一起工作（或者如果你有 "Receivers"）。

## OSC 和触觉集成 (可选)
**OSC** (Open Sound Control) 是一种允许 VRChat 与外部程序“对话”的协议 [3]。PCS 使用它将游戏动作转换为真实的振动。

### 为什么存在这种集成？
为了增加沉浸感。如果你有兼容的性玩具，PCS 会根据插入物在游戏中的深度，“告诉”玩具何时以及以何种强度振动。

### 触觉要求
- **兼容的玩具:** (例如 Lovense Hush, Lush, Max 等)。
- **桥接软件:** 一个接收来自 VRChat 的信号并控制玩具的程序。
  - *OscGoesBrrr* (免费，流行) [3]。
  - *VibeGoesBrrr*。
  - *Intiface Central* (连接引擎) [4]。

### OSC 设置
只有在你打算使用玩具时才需要激活此项：
1. 在 VRChat 中，打开 **Action Menu**。
2. 转到 `Options` > `OSC` > **Enabled**。
3. 打开你的桥接软件并连接你的玩具。

---

## Unity 安装指南
这将安装声音系统和 OSC 参数（即使你不使用它，参数默认也在那里）。

### 要求
- **Unity** 和 **VRChat SDK 3.0**。
- **PCS Asset** (Dismay 的包) [1]。
- **VRCFury** (强烈推荐以便于安装) [2]。

### 步骤 1: 导入
将 PCS `.unitypackage` 拖入你的项目。

### 步骤 2: 配置组件
系统使用两种类型的预制件：

**A. 接收者 (Orifices)**
1. 搜索 `PCS_Orifice` 预制件。
2. 将其放置在相应的骨骼内（Hips, Head 等）。
3.将其与网格孔洞的入口对齐。

**B. 插入者 (Penetrators)**
1. 搜索 `PCS_Penetrator` 预制件。
2. 将其放置在阴茎骨骼内。
3. 对齐它以覆盖阴茎的长度。

### 步骤 3: 完成
如果你使用 VRCFury，系统将在上传虚拟形象时自动合并。
如果没有，请使用 **Avatars 3.0 Manager** 将 FX Controller 和 PCS 参数与你的虚拟形象参数合并。

---

## 参考资料

[1] Dismay. (n.d.). *Penetration Contact System*. Gumroad. https://dismay.booth.pm/items/5001027

[2] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[3] OscGoesBrrr. (n.d.). *OscGoesBrrr*. https://osc.toys

[4] Intiface. (n.d.). *Intiface Central*. https://intiface.com/desktop/
