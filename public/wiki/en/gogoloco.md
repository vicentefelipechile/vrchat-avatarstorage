# Gogo Loco

<span class="badge">RECOMMENDED</span>

## What is it?
Gogo Loco is an advanced locomotion system for VRChat avatars created by **franada** [1]. It allows desktop and VR users without "full body tracking" to access posing, flying, and avatar adjustment features that would normally be unavailable.

## What is it for?
- **Static Poses:** Allows sitting, lying down, and performing various artistic poses anywhere.
- **Full Body Simulation:** Includes animations that simulate having leg trackers.
- **Flying:** Allows flying in worlds that have collisions or jump restrictions.
- **Height Adjustment:** Allows scaling your avatar's size within the game.
- **Stationary Mode:** Allows moving your avatar visually without physically moving (useful for photos).

> [!NOTE]
> Note
> Although it can be installed manually, it is highly recommended to use **VRCFury** to facilitate installation and avoid conflicts with other menus.

## Where to get it?
- [GitHub - Gogo Loco (Free)](https://github.com/franada/gogo-loco)
- [Gumroad - Gogo Loco (Support the creator)](https://franadavrc.gumroad.com/l/gogoloco)

## Can it be added to models that don't have it?
Yes, **Gogo Loco** can be added to practically any avatar, provided it meets one main requirement:
- **It must be a humanoid avatar** (or have its rig configured as humanoid in Unity).

"Generic" or non-humanoid avatars (like floating objects, complex spiders without a human skeleton, etc.) may have issues or not work correctly, as Gogo Loco manipulates specific human bones (hips, legs, back).

## Prerequisites
Before starting, ensure you have the following:
- **Unity:** The recommended version for VRChat (currently something like 2022.3.22f1).
- **VRChat SDK:** Installed in your project (VCC).
- **Gogo Loco:** The downloaded `.unitypackage` file (free or paid version).
- **VRCFury (Optional but recommended):** For easy installation.
- **Avatar 3.0 Manager (Optional):** For manual installation.

## Step-by-Step Installation Guide

There are two main methods to install Gogo Loco on your avatar. Choose the one that best suits your needs.

---

### Method 1: Using VRCFury (Recommended and Easy)
This is the simplest, most automated, and least error-prone method [3].

1. **Install VRCFury:** Ensure you have **VRCFury** installed in your project via the VRChat Creator Companion (VCC).
2. **Import Gogo Loco:** Drag the Gogo Loco `.unitypackage` file into your project's `Assets` folder, or double-click it to import.
3. **Find the Prefab:**
   - In Unity's `Project` window, navigate to the folder: `Assets/GoGo/Loco/Prefabs`.
   - Look for the prefab named **GoGo Loco Beyond**.
     - *Note:* "Beyond" includes flying, scaling, and posing features. If you only want some features, explore the other folders.
4. **Install on Avatar:**
   - Drag the **GoGo Loco Beyond** prefab and **drop it directly onto your avatar** in the hierarchy (`Hierarchy`). The prefab should become a "child" of your avatar.
   - Done! You don't need to configure anything else.
5. **Upload:** When uploading your avatar to VRChat, VRCFury will detect the prefab and automatically merge all necessary controllers, menus, and parameters.

---

### Method 2: Manual Installation with Avatar 3.0 Manager
If you prefer not to use VRCFury or need full control, use this tool to avoid human errors when copying parameters and layers [4].

1. **VRLabs Avatar 3.0 Manager:** Download and import this free tool (available on GitHub or VCC).
2. **Import Gogo Loco:** Import the package into Unity.
3. **Open Avatar 3.0 Manager:** Go to the top menu `VRLabs` -> `Avatar 3.0 Manager`.
4. **Select Avatar:** Drag your avatar into the "Avatar" field of the tool.
5. **Merge Controllers (FX):**
   - In the "FX" section, expand the options.
   - Click on **"Add Animator to Merge"**.
   - Select the Gogo Loco FX controller (usually located in `GoGo/Loco/Controllers`).
   - Click on **"Merge on Current"**. This will combine Gogo Loco's layers with yours without overwriting.
6. **Copy Parameters:**
   - Go to the **"Parameters"** tab of the Manager.
   - Select the **"Copy Parameters"** option.
   - Select the Gogo Loco parameter list as the source and copy them to your avatar.
7. **Add Menu:**
   - Go to your avatar's **VRChat Avatar Descriptor** in the Inspector.
   - Find the **Expressions Menu** section.
   - Open your main menu (double-click the file).
   - Add a new control (Control -> Add Control).
   - Name it "Gogo Loco".
   - Type: **Sub Menu**.
   - Parameter: None.
   - Sub Menu: Drag the `GoGo Loco Menu` (or `GoGo Loco All`) menu here.
8. **Action & Base Layers (Optional):**
   - If you want the custom sitting and "afk" animations, repeat the merge step for the **Action** and **Base** layers in the Avatar Descriptor.

> [!WARNING]
> Warning: Write Defaults
> Gogo Loco usually works best with **Write Defaults OFF** [1]. If your avatar uses "Mixed Write Defaults" (a mix of ON and OFF), you might experience strange behaviors. VRCFury usually fixes this automatically, but you must be careful when doing it manually.

---

## References

[1] Franada. (n.d.). *Gogo Loco*. GitHub. https://github.com/franada/gogo-loco

[2] Franada. (n.d.). *Gogo Loco*. Gumroad. https://franadavrc.gumroad.com/l/gogoloco

[3] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[4] VRLabs. (n.d.). *Avatar 3.0 Manager*. GitHub. https://github.com/VRLabs/Avatars-3.0-Manager
