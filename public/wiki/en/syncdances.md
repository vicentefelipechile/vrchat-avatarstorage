# SyncDances

<span class="badge">TOOL</span>

## What is it?

SyncDances is a Unity prefab for VRChat that allows avatars to dance in perfect synchronization. When a player starts a dance, everyone who has the system installed starts dancing at the same time.

> [!NOTE]
> SyncDances was inspired by the [CuteDancer](https://github.com/Krysiek/CuteDancer) prefab.

## What is it for?

- Synchronized dances between multiple players in VRChat
- Transmitter-receiver system where one controls and the rest follow
- Dance speed control (synchronized)
- 24 slots for custom dances

## Main Features

| Feature                 | Description                                        |
| ----------------------- | -------------------------------------------------- |
| **Synchronization**     | All players with the system dance at the same time |
| **Speed control**       | You can speed up, slow down, or freeze dances      |
| **Custom slots**        | 24 spaces to add your own dances                   |
| **Quest compatibility** | Works on Quest (but not recommended)               |
| **Multiple versions**   | Available for VRCFury and Modular Avatar           |

## Available Versions

| Version          | Price    | Description             |
| ---------------- | -------- | ----------------------- |
| **Original**     | 600 JPY  | Original files          |
| **With support** | 1000 JPY | Files + creator support |
| **DLC**          | 350 JPY~ | Additional content      |

## Requirements

- **VRCFury** installed in the project (recommended)
- Optional: **Modular Avatar** for automatic installation

## Installation

### Method with VRCFury (Recommended)

1. Download the `SyncDancesPrefab PC (VRCFURY)` file from the package
2. Drag and drop the prefab onto your avatar in Unity
3. Done! The avatar is ready to upload

> [!IMPORTANT]
> Do not install the item files individually - only the main prefab.

### Modular Avatar Version

If you prefer to use Modular Avatar instead of VRCFury:

- Find the specific version at: [SyncDances Modular Avatar](https://booth.pm/en/items/6311129)

## How to use

1. Install the prefab on your avatar
2. Use the VRChat menu to select a dance
3. If you are the "transmitter", the others ("receivers") will dance synchronized

### Transmitter-receiver system

- **One player acts as antenna (transmitter)** - controls which dance plays
- **Others are receivers** - receive the signal and dance synchronized

> [!TIP]
> To increase the transmission range, join all transmitters and receivers together. But be careful! This can cause crashes due to a VRChat bug.

## Included Dances

SyncDances includes multiple pre-configured dances. Some of the recognized creators include:

| Dance      | Creator    |
| ---------- | ---------- |
| El bicho   | THEDAO77   |
| Chainsaw   | THEDAO77   |
| Ankha      | THEDAO77   |
| Sad Cat    | Evendora   |
| Crisscross | (Rat meme) |
| PUBG       | Toca Toca  |

> [!NOTE]
> More than half of the dances were found randomly on the internet. If you created any of the included dances, contact the creator to give you credit.

## Speed Control

As of version 4.0, SyncDances includes speed control:

- **0%**: Frozen
- **100%**: Normal speed
- **Over 100%**: Accelerated dance

> [!WARNING]
> Speed control does NOT work with people using SyncDances 3.1 or earlier. They will do the dances at default speed instead.

## Parameters and Performance

| Aspect                       | PC      | Quest    |
| ---------------------------- | ------- | -------- |
| **Contacts**                 | 16      | 12       |
| **Audio sources**            | 1       | 0 (lite) |
| **Parameter bits (speed)**   | 18 bits | N/A      |
| **Parameter bits (default)** | 10 bits | N/A      |

## Updates

### Version 4.5

- Improved backward compatibility (2.x and 3.x sync properly)
- Fixed custom emote 2 and custom emote 21
- 16 new slots for custom emotes (now 24 total)

### Version 4.2

- Custom menus fixed
- Modular Avatar compatibility fixed
- Menus for Custom 9-17 and 18-24 added

### Version 3.1

- Contacts reduced from 114 to only 16
- Audio sources reduced from 32 to 1
- Added 15 new dances and 8 slots for custom ones

## Common Errors

### Players don't synchronize

- Verify everyone has the same version of SyncDances
- Make sure the transmitter is within range
- Players using 3.1 cannot control speed

### Avatar freezes

- May be due to version incompatibility
- Verify the prefab is correctly installed

### Custom emotes don't work

- Verify you are using the correct slot
- Some emotes require VRCFury installed

## Difference from OpenSyncDance

| Feature           | SyncDances          | OpenSyncDance |
| ----------------- | ------------------- | ------------- |
| **Price**         | Paid (600-1000 JPY) | Free          |
| **Code**          | Closed              | Open Source   |
| **Speed control** | Yes                 | No            |
| **Development**   | Active              | Active        |
| **Support**       | Creator's Discord   | Community     |

## Additional Resources

- **Purchase:** [BOOTH - SyncDances 4.5](https://booth.pm/en/items/4881102)
- **SyncDances Modular Avatar:** [BOOTH](https://booth.pm/en/items/6311129)
- **DLC:** [BOOTH](https://booth.pm/en/items/7423127)
- **Discord:** Kinimara (creator)

---

## References

Kinimara. (2025). _SyncDances 4.5_. BOOTH. https://booth.pm/en/items/4881102

Krysiek. (2022). _CuteDancer_. GitHub. https://github.com/Krysiek/CuteDancer
