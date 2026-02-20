# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## What is it?
**NSFW Locomotion** is a customized and explicit version of the **GoGo Loco** system (originally created by franada). It is designed specifically for "adult-themed" or ERP avatars, expanding locomotion functionalities to include suggestive or explicit poses and animations.

It maintains all the functions of the original GoGo Loco but adds specific content for intimate interactions.

> [!WARNING]
> Important
> **DO NOT install NSFW Locomotion and regular Gogo Loco in the same project.** They share menu and layer names, which will cause conflicts and errors. Choose only one.

## Features
- **GoGo Loco Base:** Includes all standard flight, scale, and pose functions.
- **"Poses Only" Version:** Lightweight, adds only additional static poses.
- **"Emotes + Poses" Version:** Includes full emotes, dynamic movements, and custom animations for roleplay.
- **Easy Installation:** Integration with **VRCFury** and a one-click installation script.

## Where to get it?
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (For VCC)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## What to do if the avatar already has GoGo Loco?
As mentioned in the warning, **you cannot have both systems installed at the same time**. If your avatar already came with GoGo Loco or you installed it previously, you must remove it completely before adding NSFW Locomotion to avoid Unity errors or broken menus.

### Steps to uninstall the original GoGo Loco:
1. **If installed with VRCFury (Easy method):**
   - In Unity, find the GoGo Loco prefab in the hierarchy (`Hierarchy`) as a child of your avatar and delete it (Right click -> `Delete`).
2. **If manually integrated into the avatar:**
   - **Playable Layers:** Select your avatar, go to the `VRC Avatar Descriptor` component and scroll down to "Playable Layers". Remove or replace the GoGo Loco controllers (Base, Action, FX) with the original ones that came with the avatar.
   - **Parameters and Menu:** In the same component, open your parameters list (`Expressions Parameters`) and delete all those belonging to GoGo Loco (usually starting with `Go/`). Then open your menu (`Expressions Menu`) and delete the button that opens the GoGo submenu.
   - *(Optional)* If you don't have other avatars using normal GoGo Loco in that project, delete the `GoGo` folder from your `Assets`.

Once the avatar is completely wiped clean from the old system, you can proceed to install NSFW Locomotion normally.

## How to install it? (Recommended with VCC)
The easiest way is to use the **VRChat Creator Companion (VCC)**.

1. Add the **Lastation Package Listing (LPL)** repository to your VCC.
2. Search for and install the **NSFW Locomotion** package.
3. Make sure you have **VRCFury** installed in the project via VCC as well.
4. Open your Unity project.
5. In the top menu bar, go to: `LastationVRChat` -> `NSFW Locomotion`.
6. Select your avatar and choose the version you want:
   - **Full Version:** (Emotes + Poses)
   - **Poses Version:** (Poses only, lighter)

## Manual Installation
If you prefer not to use VCC (not recommended):
1. Download the latest "Release" from GitHub.
2. Import the package into Unity.
3. Drag the corresponding prefab to your avatar (the one that indicates `(VRCFury)`).
   - Use `WD` if you have "Write Defaults" enabled, or the normal version if not.

---

## References

LastationVRChat. (n.d.). *NSFW Locomotion* [Computer software]. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Reddit User. (n.d.). *Help! How do i remove gogoloco from my avatar?* [Online forum post]. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
