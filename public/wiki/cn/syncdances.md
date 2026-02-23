# SyncDances

<span class="badge">工具</span>

## 什么是SyncDances？
SyncDances 是一个用于 VRChat 的 Unity 预制体（Prefab），它允许虚拟形象以完美的同步进行舞蹈。当一名玩家开始舞蹈时，所有安装了该系统的玩家都会同时开始跳舞。

> [!NOTE]
> SyncDances 的灵感来源于 [CuteDancer](https://github.com/Krysiek/CuteDancer) 预制体。

## 用途
- VRChat 中多名玩家之间的同步舞蹈
- 发射器-接收器系统，由一人控制，其余人跟随
- 舞蹈速度控制（已同步）
- 24 个自定义舞蹈槽位

## 主要特点

| 特点 | 描述 |
|---------|-------------|
| **同步** | 所有拥有该系统的玩家同时跳舞 |
| **速度控制** | 你可以加速、减速或冻结舞蹈 |
| **自定义槽位** | 24 个空间用于添加你自己的舞蹈 |
| **Quest 兼容性** | 可以在 Quest 上运行（但不推荐） |
| **多个版本** | 适用于 VRCFury 和 Modular Avatar |

## 可选版本

| 版本 | 价格 | 描述 |
|---------|-------|-------------|
| **原版** | 600 JPY | 原始文件 |
| **含支持** | 1000 JPY | 文件 + 创作者支持 |
| **DLC** | 350 JPY~ | 额外内容 |

## 要求

- 项目中已安装 **VRCFury**（推荐）
- 可选：用于自动安装的 **Modular Avatar**

## 安装方法

### 使用 VRCFury 的方法（推荐）

1. 从包中下载 `SyncDancesPrefab PC (VRCFURY)` 文件
2. 在 Unity 中将预制体拖放到你的虚拟形象上
3. 完成！虚拟形象已准备好上传

> [!IMPORTANT]
> 请勿单独安装物品文件 - 仅使用主预制体。

### Modular Avatar 版本

如果你更喜欢使用 Modular Avatar 而不是 VRCFury：
- 请在此链接查找特定版本：[SyncDances Modular Avatar](https://booth.pm/en/items/6311129)

## 如何使用

1. 在你的虚拟形象上安装预制体
2. 使用 VRChat 菜单选择一个舞蹈
3. 如果你是“发射器”，其他“接收器”将同步跳舞

### 发射器-接收器系统

- **一名玩家充当天线（发射器）** - 控制播放哪个舞蹈
- **其他人是接收器** - 接收信号并同步跳舞

> [!TIP]
> 为了增加传输范围，请将所有发射器和接收器连接在一起。但要小心！由于 VRChat 的一个错误，这可能会导致游戏崩溃。

## 包含的舞蹈

SyncDances 包含多个预配置的舞蹈。一些公认的创作者包括：

| 舞蹈 | 创作者 |
|-------|---------|
| El bicho | THEDAO77 |
| Chainsaw | THEDAO77 |
| Ankha | THEDAO77 |
| Sad Cat | Evendora |
| Crisscross | (鼠鼠梗) |
| PUBG | Toca Toca |

> [!NOTE]
> 包含的舞蹈中有一半以上是从互联网上随机找到的。如果你创建了其中任何包含的舞蹈，请联系创作者以获得署名。

## 速度控制

从 4.0 版本开始，SyncDances 包含速度控制：
- **0%**: 冻结
- **100%**: 正常速度
- **100% 以上**: 加速舞蹈

> [!WARNING]
> 速度控制不适用于使用 SyncDances 3.1 或更早版本的玩家。他们将以默认速度跳舞。

## 参数与性能

| 方面 | PC | Quest |
|--------|-----|-------|
| **接触点** | 16 | 12 |
| **音频源** | 1 | 0 (lite) |
| **参数位 (速度)** | 18 位 | 不适用 |
| **参数位 (默认)** | 10 位 | 不适用 |

## 更新日志

### 4.5 版本
- 改进了向后兼容性（2.x 和 3.x 现可正常同步）
- 修复了自定义表情 2 和 21
- 16 个新的自定义表情槽位（现在共 24 个）

### 4.2 版本
- 修复了自定义菜单
- 修复了 Modular Avatar 兼容性
- 增加了 Custom 9-17 和 18-24 的菜单

### 3.1 版本
- 接触点从 114 个减少到仅 16 个
- 音频源从 32 个减少到 1 个
- 增加了 15 个新舞蹈和 8 个自定义槽位

## 常见错误

### 玩家不同步
- 验证每个人是否都拥有相同版本的 SyncDances
- 确保发射器在范围内
- 使用 3.1 版本的玩家无法控制速度

### 虚拟形象冻结
- 可能是由于版本不兼容
- 验证预制体是否正确安装

### 自定义表情无法运行
- 验证你是否使用了正确的槽位
- 某些表情需要安装 VRCFury

## 与 OpenSyncDance 的区别

| 特性 | SyncDances | OpenSyncDance |
|---------|------------|---------------|
| **价格** | 付费 (600-1000 JPY) | 免费 |
| **代码** | 闭源 | 开源 |
| **速度控制** | 是 | 否 |
| **开发** | 活跃 | 活跃 |
| **支持** | 创作者的 Discord | 社区 |

## 其他资源

- **购买:** [BOOTH - SyncDances 4.5](https://booth.pm/en/items/4881102)
- **SyncDances Modular Avatar:** [BOOTH](https://booth.pm/en/items/6311129)
- **DLC:** [BOOTH](https://booth.pm/en/items/7423127)
- **Discord:** Kinimara (创作者)

---

## 参考文献

Kinimara. (2025). *SyncDances 4.5*. BOOTH. https://booth.pm/en/items/4881102

Krysiek. (2022). *CuteDancer*. GitHub. https://github.com/Krysiek/CuteDancer
