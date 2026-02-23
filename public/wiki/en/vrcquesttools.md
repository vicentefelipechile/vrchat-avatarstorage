# VRCQuestTools

<span class="badge">TOOL</span>

## What is it?
VRCQuestTools is a Unity extension developed by **kurotu** that allows converting VRChat avatars designed for PC to the Android platform (Meta Quest/PICO). This tool automates the process of making an avatar compatible with the strict performance limitations of mobile devices.

> [!NOTE]
> VRCQuestTools works through the **Non-Destructive Modular Framework (NDMF)** system in its latest versions, which allows processing the avatar without modifying the original files.

## What is it for?
- Converting PC avatars to Android with a few clicks
- Automatically reducing polygons and materials
- Removing components not compatible with Quest (Lights, Cloth, etc.)
- Adjusting textures and materials for performance optimization
- Various utilities for uploading avatars to Quest

> [!WARNING]
> IMPORTANT: VRoid Studio avatars are not compatible with Android due to their heavy use of transparent materials. VRCQuestTools cannot help you with these avatars; you must modify them manually.

## Environment requirements

| Requirement | Minimum version |
|-------------|-----------------|
| Unity | 2019.4.31f1, 2022.3.6f1 or 2022.3.22f1 |
| VRChat SDK | Avatars 3.3.0 or later |
| Android Build Support module | Installed in Unity |

## Where to get it?
- **Official Page:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **Documentation:** [VRCQuestTools Documentation](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth (Donation):** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## How to install it?

### Installation via VCC (VRChat Creator Companion)

1. Add the repository to VCC:
   - Click: [Add VRCQuestTools to VCC](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - Or go to **Settings** → **Packages** → **Add Repository**, paste the URL `https://kurotu.github.io/vpm-repos/vpm.json` and click **Add**
2. Go to **Manage Project** for your project
3. In the package list, search for **VRCQuestTools** and click the **[+]** to add it
4. Click **Open Project** in VCC

## How to convert an avatar for Android?

### Quick method (Non-destructive with NDMF)

1. Right-click on your avatar in the Unity hierarchy
2. Select **VRCQuestTools** → **Convert Avatar For Android**
3. In the window that opens, click **Begin Converter Settings** and then **Convert**
4. Wait for the conversion to complete
5. Go to **File** → **Build Settings**
6. Select the **Android** platform and click **Switch Platform**
7. Wait for Unity to switch the platform
8. Upload the converted avatar to VRChat

> [!TIP]
> The original avatar is deactivated after conversion. You can activate it again from the Inspector if needed.

> [!NOTE]
> The converted avatar **does not automatically optimize performance**. In most cases, the converted avatar will have **Very Poor** ranking for Android. Use the Avatar Display setting (Show Avatar) to view it anyway.

## Quest performance limits

| Metric | Excellent | Good | Medium | Poor | Very Poor |
|--------|-----------|------|--------|------|-----------|
| **Triangles** | 7,500 | 10,000 | 15,000 | 20,000 | >20,000 |
| **Material Slots** | 1 | 1 | 1 | 2 | >2 |
| **Skinned Meshes** | 1 | 1 | 1 | 2 | >2 |
| **PhysBones** | 2 | 4 | 6 | 8 | >8 |

> [!NOTE]
> By default, the **Minimum Displayed Performance Rank** level on mobile devices is set to **Medium**. This means that avatars classified as Poor or Very Poor will not be visible to other users, unless they choose to manually show your avatar.

For more information about the performance ranking system, check the [official VRChat documentation](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/).

## Relationship with other tools

- **[Modular Avatar](/wiki?topic=modular-avatar)**: If you use Modular Avatar or other NDMF tools, the conversion will be completely non-destructive.
- **[VRCFury](/wiki?topic=vrcfury)**: VRCFury can help you prepare animations and gestures before converting.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**: Make sure the shaders are compatible with Android after conversion.

---

## References

kurotu. (n.d.). *VRCQuestTools - Avatar Converter and Utilities for Android*. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/

kurotu. (n.d.). *Introduction*. VRCQuestTools Docs. Retrieved from https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). *kurotu/VRCQuestTools* [Software]. GitHub. Retrieved from https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). *Performance Ranks*. VRChat Creator Documentation. Retrieved from https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
