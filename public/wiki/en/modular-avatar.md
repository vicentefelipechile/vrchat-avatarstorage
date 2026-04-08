# Modular Avatar

<span class="badge">TOOL</span>

## What is it?

Modular Avatar is a suite of **non-destructive** tools for modularizing your VRChat avatars and distributing avatar components. With Modular Avatar, adding a new outfit or gimmick to your avatar is as easy as drag-and-drop.

> [!NOTE]
> Modular Avatar works through the **Non-Destructive Modular Framework (NDMF)** system, which processes the avatar at build time without modifying your original files.

## What is it for?

- One-click clothing and accessory installation via **drag-and-drop**
- Animator organization: split the FX animator into multiple sub-animators and merge at runtime
- Automatic VRChat menu configuration
- **Toggle** system to activate/deactivate objects and blenshapes
- Reactive components that respond to changes in the avatar
- Prefab distribution with automatic installation

## Main features

| Feature                     | Modular Avatar      | VRCFury         |
| --------------------------- | ------------------- | --------------- |
| **Outfit installation**     | Yes (drag-and-drop) | Yes (one click) |
| **Toggle system**           | Yes (advanced)      | Yes (basic)     |
| **Animator organization**   | Yes (merge)         | No              |
| **Automatic menus**         | Yes (complete)      | Yes (basic)     |
| **Non-destructive process** | Yes (NDMF)          | Yes             |
| **Blenshape sync**          | Yes                 | No              |
| **Bone proxy**              | Yes                 | No              |

### Component descriptions

| Component           | Description                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Merge Armature**  | Merges prefab armatures into the parent avatar, common for adding clothing. MA minimizes the number of bones created, reusing existing bones when possible. |
| **Merge Animator**  | Merges sub-animators into the parent avatar, useful for various types of avatar gimmicks.                                                                   |
| **Object Toggle**   | Creates menu items to activate or deactivate objects. Can also update blenshapes when toggling.                                                             |
| **Blendshape Sync** | Synchronizes the blenshapes of clothing or accessories with the base avatar when you adjust body shape.                                                     |
| **Bone Proxy**      | Allows adding unique props like weapons or special effects directly attached to avatar bones.                                                               |
| **Menu System**     | Complete menu system to edit your avatar from the VRChat menu.                                                                                              |

> [!TIP]
> Modular Avatar is especially useful when you want to distribute clothing or accessories as prefabs. Users just need to drag the prefab onto their avatar and MA handles everything automatically.

## Where to get it?

- **Official Page:** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **Documentation:** [Modular Avatar Documentation](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub:** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord:** [Discord Community](https://discord.gg/dV4cVpewmM)

## How to install?

### Installation via VCC (VRChat Creator Companion)

1. Add the repository to VCC:
   - Click: [Add Modular Avatar to VCC](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - Or go to **Settings** → **Packages** → **Add Repository**, paste the URL `https://vpm.nadena.dev/vpm.json` and click **Add**
2. Go to **Manage Project** for your project
3. In the package list, search for **Modular Avatar** and click the **[+]** to add it
4. Click **Open Project** in VCC

## How to use it?

### Create a basic toggle

1. Right-click on your avatar in Unity
2. Select **Modular Avatar → Create Toggle**
3. A new GameObject will be created with the **Menu Item**, **Menu Installer**, and **Object Toggle** components
4. In the **Object Toggle** component, click the **+** button to add an entry
5. Drag the object you want to toggle to the empty field
6. Done! The toggle will automatically appear in your avatar's menu

### Install an outfit

1. Drag the outfit prefab onto your avatar
2. Right-click on the outfit and select **ModularAvatar → Setup Outfit**
3. MA will automatically configure the armature and animations

> [!TIP]
> You can see the official tutorial in the [Modular Avatar documentation](https://modular-avatar.nadena.dev/docs/tutorials).

## Relationship with other tools

> [!TIP]
> See the comparison table above to see the differences between Modular Avatar and VRCFury.

Modular Avatar and VRCFury are **complementary tools**. Many modern outfits include support for both. Check the outfit's documentation to see which method the creator recommends.

- **[VRCFury](/wiki?topic=vrcfury)**: Focuses on animation and gesture installation.
- **NDMF (Non-Destructive Modular Framework)**: Base framework that enables non-destructive processing. It is automatically installed with Modular Avatar.

---

## References

Modular Avatar. (n.d.). _Modular Avatar_. Nadena Dev. Retrieved from https://modular-avatar.nadena.dev/

Modular Avatar. (n.d.). _Tutorials_. Nadena Dev. Retrieved from https://modular-avatar.nadena.dev/docs/tutorials

bd\_. (2026). _bdunderscore/modular-avatar_ [Software]. GitHub. Retrieved from https://github.com/bdunderscore/modular-avatar
