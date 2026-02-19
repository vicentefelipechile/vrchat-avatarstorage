# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## What is it?
**SPS** (Super Plug Shader), sometimes colloquially referred to as "SSP", is a free and modern mesh deformation system for VRChat. It allows avatar parts to deform realistically when interacting with other avatars or objects, replacing older, paid systems like **DPS** (Dynamic Penetration System).

## What is it for?
- **Realistic Deformation:** Simulates penetration and physical contact by deforming the avatar's mesh.
- **Optimization:** It is much lighter and more efficient than older systems.
- **Free:** Unlike DPS, SPS is completely free and open source.
- **Compatibility:** Works with most modern shaders (Poiyomi, LilToon, etc.).

## Where to get it?
SPS comes integrated and is managed primarily through **VRCFury**. You don't need to manually download a separate "shader" if you use VRCFury.

- [VRCFury (Includes SPS)](https://vrcfury.com)
- [Official SPS Guide](https://vrcfury.com/sps)

## How to install it?
Installation is done almost entirely within Unity using **VRCFury**:

1. Ensure you have **VRCFury** installed in your project (see VRCFury guide).
2. On your avatar, select the mesh object or bone where you want to add the component.
3. Add a **VRCFury** component to the object.
4. In the VRCFury component, search for and add the **SPS Plug** (for the penetrator) or **SPS Socket** (for the orifice) prop.
5. Configure the parameters (size, type) directly in the component.
6. Done! When uploading the avatar, VRCFury will automatically generate all necessary animations, menus, and logic.

> [!TIP]
> DPS Compatibility
> SPS is capable of interacting with avatars using old DPS. You don't need the other person to have SPS for it to work.
