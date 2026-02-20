# VRCFury

<span class="badge">OPTIONAL</span>

## What is it?
VRCFury is a free Unity plugin that greatly simplifies VRChat avatar configuration. It makes it easy to install clothing, props, gestures, and animations without manually editing animation controllers.

## What is it for?
- One-click clothing and accessory installation
- Automatic gesture and animation setup
- Automatic VRChat menu generation
- Non-destructive: doesn't modify your original files
- Blendshape optimizer (removes unused ones)

> [!NOTE]
> Note
> VRCFury is an OPTIONAL but highly recommended tool. Some avatars require it to work properly. If an avatar needs it, it will be indicated in the description.

## Where to get it?
- **Official site (Downloads):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## How to install?

Like many modern VRChat tools, there are two methods to install VRCFury. The officially recommended method is using **VCC (VRChat Creator Companion)**.

### Method 1: Installation via VCC (Recommended)

Using VCC ensures that VRCFury is always up to date and does not cause compatibility issues when using multiple projects.

1. **Add the repository to VCC:**
   - Go to the official downloads page: [vrcfury.com/download](https://vrcfury.com/download/).
   - In step 1 ("Install VRChat Creator Companion"), if you already have VCC installed, you can skip it. In step 2, click the **"Click Here to add VRCFury to VCC"** button.
   - Your browser will ask for permission to open VCC. Accept it, and once inside VCC, click **"I Understand, Add Repository"**.
   - *(Manual alternative)*: Open VCC, go to **Settings** -> **Packages** tab -> **Add Repository**, paste the URL `https://vcc.vrcfury.com` in the corresponding field, and click **Add**.
2. **Add VRCFury to your project:**
   - In VCC, go to your projects list and click **Manage Project** on the project you are using.
   - In the repositories list on the left (or top right), make sure **"VRCFury Repo"** is checked.
   - In the list of available packages for your project, search for **"VRCFury"** and click the **[+]** icon on the right to add it to your project.
3. **Done!** Click **Open Project** in VCC and the prefabs with VRCFury will be installed or configured automatically when uploading your avatar or adding them to the scene.

> [!NOTE]
> If the VCC window closes unexpectedly when installing, it is normal. To fix it, just close VCC, open it again, and repeat the process; you'll see it works correctly now.

### Method 2: Manual installation via .unitypackage (Legacy)

This method is no longer recommended and is considered obsolete (Legacy), but it is still possible to use if you have problems with VCC.

1. Download the VRCFury installer file in `.unitypackage` format from the downloads section on [GitHub](https://github.com/VRCFury/VRCFury/releases).
2. Open the Unity project where you plan to work on your avatar.
3. In the top Unity menu, go to **Assets** → **Import Package** → **Custom Package...**
4. Select the VRCFury `.unitypackage` file you just downloaded.
5. Make sure all files are selected in the pop-up window and click **Import**.
6. VRCFury will install, and a new menu will appear on the top bar called **Tools > VRCFury**. (From there you can update it if you use this manual method).

---

## References

VRCFury. (n.d.). *Download*. VRCFury. Retrieved from https://vrcfury.com/download/

VRCFury. (n.d.). *VRCFury*. GitHub. Retrieved from https://github.com/VRCFury/VRCFury
