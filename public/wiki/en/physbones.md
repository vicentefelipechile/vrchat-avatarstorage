# PhysBones

<span class="badge badge-blue">DEPENDENCY</span>

## What is it?

PhysBones is a set of components integrated into the VRChat SDK that allows adding secondary motion (physics) to objects in avatars and worlds. With PhysBones you can add movement to hair, tails, ears, clothing, wires, plants and more. Using them correctly makes your avatars look more dynamic and realistic.

> [!NOTE]
> PhysBones is the **official replacement** for Dynamic Bones in VRChat. Although Dynamic Bones still works on existing avatars (it converts automatically), all creators should use PhysBones for new avatars.

## What is it for?

- Add physics to hair, tails, ears and clothing
- Allow other players to interact with elements of your avatar (grab, pose)
- Create dynamic and realistic secondary motion
- Substitute for Unity's Cloth component for simple fabrics

## Main Components

PhysBones consists of three components that work together:

| Component               | Description                                                                       |
| ----------------------- | --------------------------------------------------------------------------------- |
| **VRCPhysBone**         | Main component that defines the chain of bones that will be animated with physics |
| **VRCPhysBoneCollider** | Defines colliders that affect PhysBones (head, torso, hands, etc.)                |
| **VRCPhysBoneRoot**     | Optional. Defines the movement root for multiple PhysBones (worlds only)          |

## Detailed Configuration

### Versions

You can select the version of the VRCPhysBone component directly in the inspector. By default, the latest available version is used.

**Version 1.0:**

- Base version of the PhysBone component

**Version 1.1 (Squishy Bones):**

- Allows bones to compress and stretch
- Gravity now acts as a proportion of how much bones will rotate at rest
- A positive Pull is required for bones to move in the direction of gravity

### Transforms

| Setting                     | Description                                                                      |
| --------------------------- | -------------------------------------------------------------------------------- |
| **Root Transform**          | The transform where the component begins. If empty, it starts at this GameObject |
| **Ignore Transforms**       | List of transforms that should not be affected by the component                  |
| **Ignore Other Phys Bones** | If enabled, the PhysBone ignores other PhysBones in the hierarchy                |
| **Endpoint Position**       | Vector to create additional bones at the endpoint of the chain                   |
| **Multi-Child Type**        | Behavior of the root bone when multiple chains exist                             |

> [!CAUTION]
> If you use a single root bone or a root with several children (no grandchildren), you MUST define an Endpoint Position! This is different from Dynamic Bones.

### Forces (Fuerzas)

**Integration Type:**

- **Simplified**: More stable, easier to configure, less reactive to external forces
- **Advanced**: Less stable, allows more complex configurations, more reactive to external forces

Available parameters:

- **Pull**: Force to return bones to their rest position
- **Spring** (Simplified) / **Momentum** (Advanced): Amount of oscillation when trying to reach rest position
- **Stiffness** (Advanced only): Amount of effort to stay in rest position
- **Gravity**: Amount of gravity applied. Positive value pulls down, negative pulls up
- **Gravity Falloff**: Controls how much gravity is removed at rest position (1.0 = no gravity at rest)

> [!TIP]
> If your hair is modeled in the position you want when standing normally, use Gravity Falloff at 1.0. That way gravity won't affect you when you're standing still.

### Limits

Limits allow restricting how much a PhysBone chain can move. They are very useful for preventing hair from clipping through the head, and are **much more performant** than colliders.

| Type      | Description                                                   |
| --------- | ------------------------------------------------------------- |
| **None**  | No limits                                                     |
| **Angle** | Limited to a maximum angle from an axis. Visualized as a cone |
| **Hinge** | Limited along a plane. Similar to a slice of pizza            |
| **Polar** | Combines Hinge with Yaw. More complex, use with moderation    |

> [!WARNING]
> Don't abuse Polar limits. Using more than 64 can cause performance issues.

### Collision

| Setting             | Description                                                                    |
| ------------------- | ------------------------------------------------------------------------------ |
| **Radius**          | Collision radius around each bone (in meters)                                  |
| **Allow Collision** | Allows collision with global colliders (other players' hands, world colliders) |
| **Colliders**       | List of specific colliders this PhysBone collides with                         |

**Allow Collision Options:**

- **True**: Collides with global colliders
- **False**: Only collides with listed colliders
- **Other**: Advanced options to filter by type (avatar, world, item)

### Stretch & Squish (v1.1 only)

| Setting            | Description                                               |
| ------------------ | --------------------------------------------------------- |
| **Stretch Motion** | Amount of motion that affects bone stretching/compression |
| **Max Stretch**    | Maximum stretch allowed (multiple of original length)     |
| **Max Squish**     | Maximum shrinking allowed (multiple of original length)   |

### Grab & Pose

| Setting            | Description                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| **Allow Grabbing** | Allows players to grab the bones                                           |
| **Allow Posing**   | Allows players to pose after grabbing                                      |
| **Grab Movement**  | Controls how bones move when grabbed (0 = uses pull/spring, 1 = immediate) |
| **Snap To Hand**   | Bone automatically adjusts to the hand grabbing it                         |

## Practical Use Cases

### Example 1: Long Hair

1. Select the root bone of the hair (usually on the neck or head)
2. Add the **VRCPhysBone** component
3. Configure:
   - **Root Transform**: Hair root bone
   - **Ignore Transforms**: Eyes and any bone that shouldn't move
   - **Multi-Child Type**: Ignore (so all hair bones are affected with one component)
   - **Pull**: 0.3 - 0.5
   - **Gravity**: 0.5 - 1.0
   - **Gravity Falloff**: 0.5 - 0.8 (adjust depending on how you want it to fall at rest)
   - **Radius**: 0.05 - 0.1
4. Add **Limits** type Angle to prevent hair from clipping through the head

> [!TIP]
> For very long hair, consider splitting it into multiple PhysBone components (one for each section) for better performance.

### Example 2: Animal Tail

1. Select the base bone of the tail
2. Add the **VRCPhysBone** component
3. Configure:
   - **Root Transform**: Tail base bone
   - **Integration Type**: Advanced
   - **Pull**: 0.2 - 0.4
   - **Spring/Momentum**: 0.5 - 0.7
   - **Stiffness**: 0.1 - 0.3
   - **Gravity**: 0.3 - 0.6
4. Use **Hinge** limits to limit lateral movement

### Example 3: Skirt or Cape

1. Make sure the clothing has its own separate armature from the avatar
2. Select the root bone of the skirt/cape
3. Add the **VRCPhysBone** component
4. Configure:
   - **Pull**: 0.1 - 0.3 (softer for fabrics)
   - **Gravity**: 0.8 - 1.0
   - **Gravity Falloff**: 0.3 - 0.5
   - **Radius**: 0.05
5. Add **VRCPhysBoneCollider** to the avatar's torso
6. In the PhysBone component, in **Colliders**, add the torso collider

> [!NOTE]
> For very long skirts or full capes, consider using Unity's Cloth component instead of PhysBones, as it is optimized for this type of fabric.

## Dynamic Bones vs PhysBones

VRChat automatically converts Dynamic Bones components to PhysBones when loading the avatar. However, this conversion is not perfect.

**Main differences:**

- Dynamic Bones uses Advanced mode by default in conversion
- Some Dynamic Bones settings have no equivalent in PhysBones
- Automatic conversion uses "Ignore" for Multi-Child Type

**Manual conversion:**
You can manually convert your avatars using VRChat SDK → Utilities → Convert DynamicBones to PhysBones.

> [!WARNING]
> Make a backup of your avatar before converting, as the process is not reversible.

## Limits and Performance

| Platform       | Limit                                                   |
| -------------- | ------------------------------------------------------- |
| **PC**         | ~256 transforms per component                           |
| **Meta Quest** | Lower limit (consult Performance Ranking documentation) |

**Optimization tips:**

- Don't have more than 256 transforms per PhysBone component
- If you have more than 128 transforms, consider splitting into multiple components
- Use **Limits** instead of colliders when possible
- Don't use humanoid bones (Hip, Spine, Chest, Neck, Head) as PhysBone roots

> [!IMPORTANT]
> PhysBones has a hard limit on Meta Quest. Consult the "Very Poor" limits in the Performance Ranking system.

## Common Errors

### The PhysBone doesn't move

- Verify that Root Transform is correctly assigned
- Make sure it's not set to "Ignore" in Multi-Child Type
- Verify that the Pull value is not 0

### The PhysBone clips with the body

- Add limits (Limits) to the component
- Add colliders to the avatar and configure them in the PhysBone
- Increase the Pull value

### Bones don't reach rest position

- Increase the Pull value
- Adjust Spring/Momentum according to integration type

### Bones go through the body

- Add VRCPhysBoneCollider to the avatar
- Configure the collider in the PhysBone's Colliders list
- Verify that Radius is appropriate

## Where to learn more?

- **Official documentation:** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **SDK example:** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **Community:** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## References

VRChat. (2025). _PhysBones_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). _VRCPhysBoneCollider_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
