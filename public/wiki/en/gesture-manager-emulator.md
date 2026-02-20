# Gesture Manager Emulator

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## What is the Gesture Manager?
The **Gesture Manager**, developed by **BlackStartx**, is an essential tool for VRChat avatar creators. It allows you to preview and edit animations, gestures, and menus of an avatar directly within Unity, eliminating the need to upload the avatar to the game to test every change [1].

It almost completely simulates the VRChat animation system, including the **Radial Menu (Expressions Menu)**, which allows you to verify that your toggles and sliders are working correctly instantly.

---

## Installation

There are two main methods for installing this tool in your project.

### Method 1: VRChat Creator Companion (Recommended)
This is the easiest way and ensures you always have the latest version compatible with your project [2].
1. Open the **VRChat Creator Companion (VCC)**.
2. Select your project.
3. Make sure "Curated" packages are not filtered.
4. Search for **"Gesture Manager"** and click the **"Add"** button.
5. Open your Unity project.

### Method 2: Manual (Unity Package)
If you do not use VCC or need a specific version:
1. Download the `.unitypackage` file from the *Releases* section on BlackStartx's GitHub or from his BOOTH page [3].
2. Import the package into your Unity project (`Assets > Import Package > Custom Package`).

---

## Main Features

*   **Radial Menu 3.0:** Faithfully recreates the VRChat expression menu.
*   **Gesture Emulation:** Allows you to test left and right hand gestures using buttons in the inspector.
*   **Active Scene Camera:** Synchronizes the game camera with the scene camera to facilitate PhysBones and Contacts testing.
*   **Contacts Testing:** Allows you to trigger *VRCContacts* by clicking on them with the mouse.
*   **Parameter Debugging:** Displays a list of all avatar parameters and their current values.

---

## How to use it

1.  Once installed, go to the top bar and select `Tools > Gesture Manager Emulator`.
2.  This will add an object named `GestureManager` to your hierarchy.
3.  Enter **Play Mode** in Unity.
4.  Select the `GestureManager` object in the hierarchy.
5.  In the **Inspector** window, you will see the radial menu and all the controls to test your avatar.

> [!IMPORTANT]
> You must have the `GestureManager` object selected to see the controls in the inspector while Unity is running.

---

## References

[1] BlackStartx. (n.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[2] VRChat. (n.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[3] VRChat. (n.d.). *VCC Documentation*. VRChat Creator Companion. https://vcc.docs.vrchat.com

[4] BlackStartx. (n.d.). *Gesture Manager*. Booth. https://blackstartx.booth.pm/items/3922472
