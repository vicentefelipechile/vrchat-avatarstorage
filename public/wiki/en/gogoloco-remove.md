# Removing GoGo Loco from a Unity Project

<span class="badge badge-blue">Logic</span>

## What is it?

GoGo Loco is a locomotion prefab created by Franada that replaces or modifies several of the Avatar Descriptor's Playable Layers (Base/Locomotion, Additive, Gesture) and injects its own parameters and Expression Menu entries into the avatar. Because it touches so many interconnected parts of an avatar project, removing it completely requires working through several layers — from surface-level scene objects down to project-level assets and, when applicable, the VPM manifest.

> [!WARNING]
> Always back up your Unity project (or commit to version control) before starting this process. Many of these steps delete or overwrite Animator Controllers and Expression assets that may be shared with other parts of your avatar.

## What is it for?

- Replacing GoGo Loco with a different locomotion system (e.g., Modular Avatar locomotion, WetCat's Locomotion Fix, or the VRChat default controllers).
- Cleaning up a purchased avatar that shipped with GoGo Loco pre-installed and you do not want it.
- Resolving conflicts with NSFW Locomotion or other packages that share GoGo Loco's layer and parameter names.
- Reducing parameter memory usage (GoGo Loco consumes 16–17 bits of synced memory by default).

## Step 1: Remove the Prefab from the Scene

GoGo Loco can be installed as a child GameObject on the avatar root, especially when set up via VRCFury or Modular Avatar.

1. Open the scene containing your avatar in the **Hierarchy** window.
2. Expand the avatar root GameObject.
3. Look for any child object named `GoGo Loco`, `GGL`, `GoGoLoco`, or similar. Select it and press **Delete**.
4. If GoGo Loco was installed via [VRCFury](/wiki?topic=vrcfury), look for a child object with a `VRCFury` component that references a GoGo Loco prefab — delete that object as well.
5. If installed via [Modular Avatar](/wiki?topic=modular-avatar), look for a child object with a `MA Merge Animator` or `MA Menu Installer` component pointing to GoGo Loco assets and delete it.

> [!NOTE]
> If the avatar was purchased and GoGo Loco was baked in (i.e., no separate child GameObject exists), skip this step and proceed directly to Step 2.

## Step 2: Restore the Avatar Descriptor's Playable Layers

GoGo Loco replaces up to three of the five Playable Layers on the `VRCAvatarDescriptor` component. You need to reassign each one to either the VRChat default controllers or your own custom controllers.

1. Select the avatar root in the Hierarchy and locate the **VRC Avatar Descriptor** component in the Inspector.
2. Expand the **Playable Layers** section.
3. For each of the following layers, check whether it is currently assigned a GoGo Loco controller (file names will start with `go_` or contain `GoGoLoco`/`GGL`):

| Layer | GoGo Loco file name (approximate) | Default replacement |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (from VRCSDK samples) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (from VRCSDK samples) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (from VRCSDK samples) |

4. For each affected layer, click the small circle picker to the right of the field and assign the appropriate VRChat default controller, or assign your own custom controller.
5. If you do not have the default VRChat controllers in your project, they can be found under `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> If your avatar had custom hand gestures before GoGo Loco was added, you should restore your original Gesture layer controller here rather than the VRChat default — check your version control or backups for it.

## Step 3: Remove GoGo Loco Layers from the FX Controller

For the flying feature, GoGo Loco merges two additional layers into the avatar's FX Animator Controller. These remain even after the prefab is deleted and must be removed manually.

1. Locate your avatar's FX Animator Controller in the Project window and double-click it to open the **Animator** window.
2. In the **Layers** panel on the left, look for layers named `GoGo Fly`, `GoGo Freeze`, or any layer whose name starts with `go_`.
3. Right-click each GoGo Loco layer and select **Delete Layer**.
4. In the same Animator window, click the **Parameters** tab.
5. Remove every parameter that belongs to GoGo Loco. Common ones include:

| Parameter name | Type |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Parameters that begin with `go_` or `Go/` are GoGo Loco parameters. Remove all of them. Parameters like `VelocityY`, `VRCFaceBlendH`, `Grounded`, etc., are standard VRChat built-in parameters — do **not** remove those.

> [!CAUTION]
> Deleting a parameter that is still referenced by a remaining animation state or transition will break those states. Always verify that no non-GoGo-Loco layers depend on a parameter before removing it.

## Step 4: Clean Up the Expression Parameters Asset

GoGo Loco adds its parameters to the avatar's `VRCExpressionParameters` asset, consuming synced memory. Each GoGo Loco parameter left behind wastes bits.

1. In the Project window, find the `.asset` file assigned to **Expression Parameters** in the Avatar Descriptor.
2. Select it and look at the parameter list in the Inspector.
3. Delete every entry that corresponds to a GoGo Loco parameter (same names as listed in Step 3).
4. Confirm that the **Total Cost** shown at the bottom of the Inspector decreases after removal.

## Step 5: Remove the GoGo Loco Menu Entry

GoGo Loco installs a submenu entry into the avatar's root Expression Menu.

1. Find the `.asset` file assigned to **Expressions Menu** in the Avatar Descriptor.
2. Select it and inspect the **Controls** list.
3. Delete any entry named `GoGo Loco`, `GGL`, `Loco`, or similar that links to a GoGo Loco submenu asset.
4. Open each remaining submenu recursively and remove any GoGo Loco control entries nested inside them.

## Step 6: Delete GoGo Loco Asset Files from the Project

After disconnecting GoGo Loco from the avatar, remove its files from the Unity project to keep the `Assets/` folder clean.

1. In the Project window, search for `go_` using the search bar (ensure the search scope is set to **All**).
2. Review the results — files starting with `go_` are almost always GoGo Loco assets (Animation Clips, Animator Controllers, Textures, Materials for the menu icons).
3. Also search for `GoGoLoco` and `GGL` to catch any files that use the full name.
4. Select all confirmed GoGo Loco assets and press **Delete** (or right-click → **Delete**).
5. Unity will prompt you to confirm deletion. Accept.

> [!WARNING]
> Do not delete assets whose names start with `go_` if they belong to your own project (e.g., a GameObject or animation you named that way). Inspect each file before deleting.

Common folder locations for GoGo Loco files:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Anywhere a purchased avatar may have unpacked the `.unitypackage`.

Delete the entire folder once all contained files are confirmed to be GoGo Loco's.

## Step 7: Remove the VPM Package (VCC Installation Only)

If GoGo Loco was installed as a VPM package via the VRChat Creator Companion, the package files live in `Packages/` rather than `Assets/` and must be removed through the VCC or the manifest.

### Option A — Via VCC GUI

1. Open the **VRChat Creator Companion**.
2. Navigate to your project in the **Projects** tab and click **Manage Project**.
3. In the packages list, find `GoGoLoco` (package ID `com.franada.gogoloco` or similar).
4. Click the **minus (−)** button or set the version dropdown to **Remove** and apply.
5. Reopen the project in Unity. The Resolver will detect the removal and clean up the `Packages/` folder.

### Option B — Via `vpm-manifest.json` (manual)

1. Close Unity.
2. Open `<YourProject>/Packages/vpm-manifest.json` in a text editor.
3. Delete the entry for GoGo Loco from both the `"dependencies"` and `"locked"` objects.
4. Delete the physical folder `<YourProject>/Packages/com.franada.gogoloco/` (or equivalent).
5. Reopen Unity. The Resolver will re-scan and confirm no missing packages.

> [!NOTE]
> Removing the VPM package does not automatically undo the layers, parameters, menus, or prefab child objects added during installation. Steps 1–6 must still be completed regardless of which installation method was used.

## Step 8: Re-enable Force Locomotion (if needed)

When GoGo Loco is installed it typically unchecks **Force Locomotion animations for 6-point tracking** on the Avatar Descriptor, because its custom Locomotion layer handles tracking modes internally. After removal you may want to restore the default behavior.

1. Select the avatar root and open the **VRC Avatar Descriptor** in the Inspector.
2. Scroll to the **IK** section.
3. Re-enable the **Force Locomotion animations for 6 point tracking** checkbox if you are using the default VRChat Locomotion controller.

> [!TIP]
> If you are not using full-body tracking (FBT), this checkbox has no visible effect and can be left in either state.

## Verification Checklist

Before uploading the avatar, confirm all of the following:

| Check | How to verify |
| :---------------------------------------- | :--------------------------------------------------- |
| No GoGo Loco child object in Hierarchy | Inspect avatar hierarchy in Unity scene |
| Playable Layers point to correct controllers | VRC Avatar Descriptor → Playable Layers section |
| No `go_` layers in FX controller | Open FX Animator Controller → Layers panel |
| No `go_` / `Go/` parameters in FX | Open FX Animator Controller → Parameters panel |
| No GoGo Loco entries in Expression Parameters | Inspect the `.asset` file in the Inspector |
| No GoGo Loco entries in Expression Menu | Inspect the root menu `.asset` file recursively |
| No GoGo Loco files in `Assets/` | Project window search for `go_`, `GoGoLoco`, `GGL` |
| No GoGo Loco package in `vpm-manifest.json` | Open file in text editor and search for `gogoloco` |
| Force Locomotion setting is intentional | VRC Avatar Descriptor → IK section |

## Summary Table

| What GoGo Loco adds | Where to remove it |
| :---------------------------------------------- | :------------------------------------------------ |
| Child prefab/GameObject on avatar root | Unity Hierarchy → delete the child object |
| Base, Additive, Gesture Playable Layers | VRC Avatar Descriptor → Playable Layers |
| FX layers (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Layers panel |
| FX parameters (`Go/*`, `VelocityMagnitude`, etc.) | FX Animator Controller → Parameters panel |
| Expression Parameters entries | VRCExpressionParameters `.asset` → Controls list |
| Expression Menu submenu entry | VRCExpressionsMenu `.asset` → Controls list |
| Asset files (`go_*.anim`, controllers, textures) | Project window → delete GoGoLoco folder |
| VPM package entry | VCC GUI or `vpm-manifest.json` |
| Force Locomotion unchecked | VRC Avatar Descriptor → IK section (restore) |

## References

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
