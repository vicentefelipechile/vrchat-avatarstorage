# Poiyomi Toon Shader

<span class="badge badge-blue">DEPENDENCY</span>

## What is it?
Poiyomi is a shader for Unity designed specifically for VRChat. It allows you to create stylized and cartoon-like appearances on avatars with advanced visual effects.

## What is it for?
- Customizable stylized shading (toon, realistic, flat)
- Special effects: outlines, decals, glitter, sparkle
- AudioLink support (audio-reactive effects)
- Physically accurate reflections and specular
- Optimized for VRChat performance

> [!WARNING]
> VERY IMPORTANT
> Poiyomi is NOT included in the avatar files you download. You must install it yourself in Unity BEFORE opening the avatar.

## Where to get it?
- **Official site (Downloads):** [poiyomi.com/download](https://poiyomi.com/download)
- **Free Version:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Pro Version:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## How to install?

Currently, there are two main methods to install Poiyomi in your project. The method recommended by the VRChat community is using **VCC (VRChat Creator Companion)**, but you can also use the classic **UnityPackage** import.

### Method 1: Installation via VCC (Recommended)

Using VCC (VRChat Creator Companion) is the cleanest and most recommended way to install and manage Poiyomi, as it allows you to easily update the shader right from the application.

1. **Add the repository to VCC:**
   - The easiest way is to go to the official downloads page: [poiyomi.com/download](https://poiyomi.com/download).
   - Scroll down to where it says "Method 2", find the **Creator Companion (VCC)** section, and click the **"Add to VCC"** button.
   - Your browser will ask for permission to open VCC. Accept it, and once inside VCC, click **"I Understand, Add Repository"**.
   - *(Manual alternative)*: Open VCC, go to **Settings** -> **Packages** tab -> **Add Repository**, paste the URL `https://poiyomi.github.io/vpm/index.json` in the corresponding field, and click **Add**.
2. **Add the shader to your project:**
   - In VCC, navigate to the projects section and click **Manage Project** on the VRChat project where you want to install the shader.
   - In the **Selected Repos** section (side menu or top dropdown list of repositories), make sure **"Poiyomi's VPM Repo"** is checked.
   - In the list of available packages for the project, search for **"Poiyomi Toon Shader"** and click the **[+]** icon on the right to add it.
3. **Done!** You can now click **Open Project** in VCC, and Poiyomi will be available in your Unity project.

> [!NOTE]
> If the VCC window unexpectedly closes while installing, that's normal. To fix it, simply close VCC, open it again, and try installing via VCC once more. You'll see it works correctly now.

### Method 2: Manual installation via .unitypackage

This is the classic method. Bear in mind that it is harder to update in the future and may leave residual files if you try to switch to the VCC method later on.

1. Download the latest `.unitypackage` file from the releases page on [GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases) or from your [Patreon](https://www.patreon.com/poiyomi) account if you use the Pro version.
2. Open the Unity project where you plan to import your avatar.
3. In the Unity window, import the package by going to the top menu: **Assets** → **Import Package** → **Custom Package...**
4. Select the `.unitypackage` file you just downloaded to your computer.
5. A window will appear showing a list of all files to import. Make sure everything is selected (you can use the "All" button) and click the lower button **Import**.
6. Wait for the progress bar to finish, and the installation will be complete. Poiyomi will be ready to assign tomaterials in your project.

---

## References

Poiyomi. (n.d.). *Download*. Poiyomi Shaders. Retrieved from https://poiyomi.com/download

Poiyomi. (n.d.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Retrieved from https://github.com/poiyomi/PoiyomiToonShader
