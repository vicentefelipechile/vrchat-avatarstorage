# Action Menu

<span class="badge badge-blue">Logic</span> <span class="badge badge-purple">Workflow</span>

## Introduction
The **Action Menu** (also known as the Expression Menu) is the radial menu you use inside VRChat to trigger animations, change clothes, or modify your avatar's parameters [1].

Traditionally, creators upload their avatar to VRChat every time they want to test a small change, which is very time-consuming. Fortunately, there are tools that allow you to simulate this menu **directly in Unity**, letting you see how your toggles and sliders work instantly.

---

## Simulation Tools

There are two main tools recommended by the community and compatible with the **VRChat Creator Companion (VCC)**.

### 1. Gesture Manager (by BlackStartx)
This is the most popular tool for visualizing the radial menu just as it appears in-game. It allows you to test gestures, contacts, and parameters intuitively.

> [!NOTE]
> For a detailed guide on how to install it and all its features, check out our dedicated article: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (by Lyuma)
This tool is more technical and powerful, ideal for debugging the complex logic behind the avatar.

*   **Installation:** Available in VCC or via GitHub. It is often installed automatically with tools like [VRCFury](/wiki?topic=vrcfury) [3].
*   **How to use:**
    1.  Go to `Tools` > `Avatar 3.0 Emulator`.
    2.  Upon entering **Play Mode**, a control panel will be generated.
    3.  It allows you to force [parameter](/wiki?topic=parameter) values and see in real-time which Animator layer is playing.

---

## Which one should I use?

| Feature | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Visual Interface** | Excellent (Radial) | Basic (Buttons/Sliders) |
| **Menu Testing** | Yes | Limited |
| **Logic Debugging** | Basic | Advanced |
| **Gesture Testing** | Easy (Buttons) | Manual (Animator) |

**Recommendation:** Use **Gesture Manager** for most of your toggle and clothing tests. Use **Av3 Emulator** if your animations are not triggering when they should and you need to see what's happening "under the hood".

---

## Build & Test (The official alternative)
If you need to test something that requires networking or interactions with others (like [PhysBones](/wiki?topic=parameter)), use the **Build & Test** function from the official SDK [1]:
1.  Open the `VRChat SDK Control Panel`.
2.  In the `Builder` tab, look for the "Offline Testing" section.
3.  Click `Build & Test`.
4.  Unity will compile the avatar and open a local instance of VRChat where only you can see it without having uploaded it to the servers.

---

## References

[1] VRChat. (n.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[2] BlackStartx. (n.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[3] Lyuma. (n.d.). *Av3Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
