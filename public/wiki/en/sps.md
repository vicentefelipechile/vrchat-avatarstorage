# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## What is it?
**SPS** (Super Plug Shader), sometimes colloquially referred to as "SSP", is a free and modern mesh deformation system for VRChat designed by the **VRCFury** team. It allows avatar parts to deform realistically when interacting with other avatars or objects, replacing older and paid systems like **DPS** (Dynamic Penetration System) and **TPS** [1].

## What is it for?
- **Realistic Deformation:** Simulates penetration and physical contact by deforming the avatar's mesh.
- **Optimization:** It is much lighter and more efficient than older systems.
- **Free:** Unlike DPS, SPS is completely free and open source.
- **Compatibility:** Works with most modern shaders (Poiyomi, LilToon, etc.) and is backward compatible with avatars using DPS or TPS.

## Prerequisites
Before starting, ensure you have the following:
- **Unity:** The recommended version for VRChat.
- **VRChat SDK:** Installed in your project (VCC).
- **VRCFury:** Installed and updated to the latest version [2].
- **3D Model:** An avatar with the meshes you want to animate (sockets or plugs).

## Step-by-Step Installation Guide

SPS is fully managed through VRCFury tools in Unity. You don't need to import strange shader packages or make complex manual animation configurations.

### Step 1: Install VRCFury
If you don't have it yet, install VRCFury from the VRChat Creator Companion (VCC).
1. Open VCC.
2. Go to "Manage Project".
3. Search for "VRCFury" in the package list and click install (or add the repository if it doesn't appear).

### Step 2: Create a Socket (Orifice)
A "Socket" is the receiver of the interaction (mouth, etc.).

1. **Tools:** In the top bar of Unity, go to `Tools` > `VRCFury` > `SPS` > `Create Socket` [1].
2. **Placement:** A new object will appear in your scene.
   - Drag this object into your avatar's hierarchy, and **make it a child of the corresponding bone** (e.g., `Hip` or `Head`).
3. **Adjustment:** Move and rotate the Socket object to match the entry of the orifice on your mesh.
   - The gizmo arrow must point **inwards** into the orifice.
   - Ensure the Socket type (in the inspector) matches what you want (e.g., Vagina, Anal, Oral).
4. **Lights:** You don't need to configure ID lights manually; VRCFury does it for you.

> [!TIP]
> **Placement Note (ERP)**
> Do not place the points (Sockets) too deep inside the avatar. If the "hole" is too deep, it becomes difficult to ERP comfortably. It is recommended to place them just at the entrance or slightly outwards.
>
> **Watch out for Large Proportions:** If your avatar has very wide hips or a very large butt ("huge asses"), **move the Socket even further out**. Otherwise, the other person will collide with the body mesh before being able to "reach" the interaction point.

### Step 3: Create a Plug (Penetrator)
A "Plug" is the object that penetrates and deforms.

1. **Mesh Preparation:**
   - Ensure your penetrator mesh is "straight" and "extended" in the rest position in Unity. SPS needs to know the total length.
   - If coming from DPS/TPS, make sure to remove old scripts or special materials. Use a normal shader (Poiyomi) [1].
2. **Tools:** Go to `Tools` > `VRCFury` > `SPS` > `Create Plug` [1].
3. **Placement:**
   - **Option A (With bones):** If your penis has bones, drag the Plug object and make it a child of the **base bone** of the penis.
   - **Option B (No bones):** If it's just a mesh (mesh renderer), drag the Plug object and drop it directly onto the object with the **Mesh Renderer**.
4. **Configuration:**
   - In the inspector of the `VRCFury | SPS Plug` component, ensure the **Renderer** is your penis mesh.
   - Adjust the orientation: The curved part of the gizmo should be at the tip and the base at the base.
   - Configure the appropriate **Type**.

### Step 4: Test in Unity
You don't need to upload the avatar to test if it works.
1. Install **Gesture Manager** from the VCC [1].
2. Enter **Play Mode** in Unity.
3. Select the Gesture Manager.
4. In the emulated expressions menu, go to SPS options.
   - VRCFury automatically generates a test menu with options to enable/disable and test deformation.
   - You can create a "Test Socket" from the tools menu to test interaction in real-time.

> [!WARNING]
> Warning: Constraints
> Avoid using Unity Constraints on the same bones that SPS deforms, as they can cause motion conflicts (jitter) [4].

---

## References

[1] VRCFury. (n.d.). *SPS (Super Plug Shader)*. VRCFury Documentation. https://vrcfury.com/sps

[2] VRCFury. (n.d.). *Download & Install*. VRCFury Documentation. https://vrcfury.com/download

[3] VRCD. (n.d.). *SPS Tutorial*. VRCD. https://vrcd.org.cn

[4] VRCFury. (n.d.). *SPS Troubleshooting*. VRCFury Documentation. https://vrcfury.com/sps
