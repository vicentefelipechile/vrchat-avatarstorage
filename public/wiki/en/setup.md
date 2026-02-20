# Step-by-Step Guide: Preparing Unity with VCC
Follow these steps BEFORE importing your downloaded avatar

> [!NOTE]
> Note
> You do not need to install, manipulate, or manage Unity directly on your own. The whole project preparation and dependency installation process is done within VCC. You will only open Unity at the end to import and upload your avatar.

### Step 1: Install VRChat Creator Companion (VCC)
Download the **VRChat Creator Companion** from [vrchat.com/home/download](https://vrchat.com/home/download). The **VCC** is the official tool that manages Unity, the VRChat SDK, and all necessary packages automatically.

### Step 2: Install Unity Hub and Unity via VCC
When opening VCC for the first time, it will detect if you have Unity installed. Follow the setup wizard so it installs **Unity Hub** and then downloads the correct version of **Unity** required by VRChat (currently the 2022.3 series). Allow VCC to install both programs automatically.

### Step 3: Create a New Avatar Project
Open VCC → **Projects** → **Create New Project**. Select the **"Avatars"** template. Give it a name (e.g., "My VRChat Avatars"). VCC will automatically prepare your project with the **VRChat SDK**.

### Step 4: Add Poiyomi Repository
In VCC, go to **Settings** → **Packages** → **Add Repository**. Paste this URL: [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) and click "Add". This will allow you to easily install **Poiyomi**, which is vital for avatar textures to look right. You can find more details in our [guide on Poiyomi](/wiki?topic=poiyomi).

### Step 5: Add VRCFury Repository (Optional)
If your avatar requires it, in **Settings** → **Packages** → **Add Repository**, paste: [https://vcc.vrcfury.com](https://vcc.vrcfury.com) and click "Add". **VRCFury** makes installing clothes and accessories easy using drag and drop. We recommend checking out the [guide on VRCFury](/wiki?topic=vrcfury) for more information.

### Step 6: Install Packages in Your Project
In VCC, select your newly created project → **Manage Project**. Search for **"Poiyomi Toon Shader"** and click the **"+"** button to add it. If you need VRCFury, add it as well using the same button. Click **"Apply"** or simply wait for it to load.

### Step 7: Open Project and Import Avatar
In your VCC project menu, click on **"Open Project"** to open Unity for the first time (it may take a while). Once open, import your avatar: drag the **.unitypackage** file into the Unity window (in the `Project` or `Assets` tab) or use **Assets → Import Package → Custom Package**.

### Step 8: Verify and Configure
Drag the **avatar prefab** into the scene. If everything is correct and Poiyomi is installed, you will **NOT see magenta (pink) materials**. Configure the avatar using **VRChat SDK → Show Control Panel → Builder**. Resolve errors with **"Auto Fix"** and upload with **"Build & Publish"**.

> [!TIP]
> Important Tip
> VCC simplifies EVERYTHING. You no longer need to find the correct version of Unity on the internet or deal with incompatibilities. Always use VCC as the central hub to manage your VRChat projects.

---

## References

[1] VRChat Inc. (n.d.). *VRChat Creator Companion*. VRChat. https://vrchat.com/home/download

[2] Unity Technologies. (n.d.). *Unity Hub*. Unity. https://unity.com/download

[3] Poiyomi. (n.d.). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader

[4] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com
