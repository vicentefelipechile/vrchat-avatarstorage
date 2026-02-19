# Inside View

<span class="badge badge-blue">Visual</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## What is it?
**Inside View**, created by **Liindy** [1], is an asset for VRChat avatars that allows seeing the inside of a mesh (like an SPS orifice) by adding simulated visual depth.

Unlike simply deleting the back faces of the mesh (backface culling), Inside View uses a "Screen Shader" that projects a depth texture inside the orifice, creating a realistic interior illusion without needing to model complex internal geometry. It is commonly used alongside systems like [SPS](./sps.md) to improve visualization during ERP.

## Main Features
- **Simulated Depth:** Creates the illusion of a tunnel or detailed interior.
- **Optimized:** Uses shaders to avoid heavy extra geometry.
- **SPS Integration:** Designed to work in conjunction with SPS penetrations [3].
- **Easy Installation:** Compatible with **VRCFury** for a "drag-and-drop" setup.

## Prerequisites
- **Unity:** Version recommended for VRChat (currently 2022.3.22f1 or similar) [1].
- **VRChat SDK 3.0:** (Avatars) Downloaded via VCC [1].
- **VRCFury:** Necessary for automatic installation.
- **Poiyomi Toon Shader:** (Optional but recommended) Version 8.1 or higher for material compatibility [2].

## Installation Guide

> [!NOTE]
> This guide assumes the use of **VRCFury**, which is the official method recommended by the creator.

### Step 1: Import
Once you have acquired the package (free or paid) from Jinxxy or Gumroad:
1. Open your Unity project with the SDK and VRCFury already installed.
2. Import the **Inside View** `.unitypackage`.

### Step 2: Placement (VRCFury)
1. Search for the Inside View prefab in the asset folder (usually `Assets/Liindy/Inside View`).
2. Drag the prefab and drop it inside your avatar's hierarchy.
   - **Important:** Place it as a "child" of the bone or object where the orifice (or the SPS Socket) is.
3. Ensure that the SPS "Socket" object and "Inside View" are aligned in the same position and rotation.

### Step 3: Depth Configuration
The asset works via a Depth Animation.
1. Select the VRCFury component on the Inside View prefab.
2. Verify that it is pointing to the correct **Renderer** (mesh) of your orifice.
3. Upon uploading the avatar, VRCFury will automatically merge the necessary menus and logic.

### Additional Notes
- **Parameter Cost:** The "Full" version can use up to 35 bits of parameter memory, while the "Standard" version uses around 17. Keep this in mind if your avatar already has many parameters [1].
- **Backface Culling:** Ensure that your orifice material has "Cull" set to "Off" or "Back" according to the shader instructions so the effect is visible from the correct angle.

---

## References

[1] Liindy. (n.d.). *Inside View (VRCFury)*. Jinxxy. https://jinxxy.com/Liindy/InsideView

[2] Liindy. (n.d.). *Inside View*. Gumroad. https://liindy.gumroad.com/l/InsideView
