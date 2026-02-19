# Step-by-Step Guide: Preparing Unity with VCC
Follow these steps BEFORE importing your downloaded avatar

### Step 1: Install VRChat Creator Companion (VCC)
Download the **VRChat Creator Companion** from [vrchat.com/home/download](https://vrchat.com/home/download). The **VCC** is the official tool that manages Unity, VRChat SDK, and all necessary packages automatically.

### Step 2: Create a New Avatar Project
Open VCC → **Projects** → **Create New Project**. Select the **"Avatars"** template. Give it a name (e.g., "My VRChat Avatars"). VCC will automatically install **Unity** and **VRChat SDK**.

### Step 3: Add Poiyomi Repository
In VCC, go to **Settings** → **Packages** → **Add Repository**. Paste this URL: [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) and click "Add". This allows you to easily install **Poiyomi**.

### Step 4: Add VRCFury Repository (Optional)
If your avatar requires it, in **Settings** → **Packages** → **Add Repository**, paste: [https://vcc.vrcfury.com](https://vcc.vrcfury.com) and click "Add". **VRCFury** makes it easy to install clothing and accessories.

### Step 5: Install Packages to Your Project
In VCC, select your project → **Manage Project**. Find **"Poiyomi Toon Shader"** and click the **"+"** button to add it. If you need VRCFury, add it too. Click **"Apply"**.

### Step 6: Open Project and Import Avatar
In VCC, click **"Open Project"** to launch Unity. Once open, import your avatar: drag the **.unitypackage** file into the Unity window or use **Assets → Import Package → Custom Package**.

### Step 7: Verify and Configure
Drag the **avatar prefab** into the scene. If everything is correct, you will **NOT see magenta** (pink) materials. Configure the avatar using **VRChat SDK → Show Control Panel → Builder**. Fix errors with **"Auto Fix"** and upload with **"Build & Publish"**.

> [!TIP]
> Important Tip
> VCC simplifies EVERYTHING. You no longer need to manually install Unity or find the correct version. VCC does it automatically. Always use VCC to manage your VRChat projects.
