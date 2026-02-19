# Avatar Parameters (Expression Parameters)

<span class="badge badge-blue">Logic</span> <span class="badge badge-yellow">Optimization</span>

## What are they?
**Expression Parameters** (or simply parameters) are variables that serve as "memory" for your VRChat avatar [1]. They act as a bridge between the **Expressions Menu** (the radial menu in-game) and the **Animator Controller** (the logic that makes animations play).

When you select an option in your menu (e.g., "Remove Shirt"), the menu changes the value of a parameter (e.g., `Shirt = 0`), and the Animator reads that change to execute the corresponding animation.

## Parameter Types
There are three main data types you can use, each with a different memory cost [2]:

| Type | Description | Memory Cost | Common Use |
| :--- | :--- | :--- | :--- |
| **Bool** | True or False (On/Off). | 1 bit | Simple toggles (clothes, props). |
| **Int** | Integers (0 to 255). | 8 bits | Outfit changes with multiple options, step sliders. |
| **Float**| Decimal numbers (0.0 to 1.0). | 8 bits | Continuous sliders (thickness, hue, radial puppet). |

## Memory Limit (Synced Bits)
VRChat imposes a strict limit of **256 bits** of synced data per avatar [2].
- **Synced:** Parameters whose value is sent to other players over the network. If you take off your shirt, you want others to see it.
- **Not Synced (Local):** Parameters that only exist on your PC. Useful for internal logic that doesn't need to be seen by others.

> [!WARNING]
> If you exceed the memory limit, you won't be able to upload the avatar or the extra parameters will stop working. Optimize by using `Bool` instead of `Int` whenever possible.

## Advanced Uses
Besides controlling clothes from the menu, parameters can be controlled by:
- **PhysBones:** To detect if someone touches your ear or hair [3].
- **Contacts:** To detect collisions (like in [SPS](./sps.md) or [PCS](./pcs.md) systems).
- **OSC:** To receive data from external programs (like heart rate monitors, facial tracking, or Spotify) [3].

## How to Create Them
1. In your Unity project, right-click in `Assets`.
2. Go to `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Add the parameters you need (e.g., "Outfit", "Sword", "HueShift").
4. Assign this file in the **VRC Avatar Descriptor** component of your avatar, in the "Expressions" section.

## Limitations and Common Issues

### Why is there a 256-bit limit?
VRChat imposes this limit primarily for **network optimization** [1]. Every synced parameter must be sent to all other players in the instance. If there were no limit:
- The bandwidth needed to update the position and state of 80 players would be unsustainable.
- Users with slow connections would suffer from extreme lag or disconnects.
- Overall FPS performance would drop due to excessive network data processing.

### Conflicts with Complex Assets (GoGo Loco, SPS, Dances)
When combining multiple "heavy" systems on a single avatar, frequent issues arise:

1.  **Parameter Exhaustion:**
    Assets like **GoGo Loco** consume a considerable amount of memory. If you try to add SPS, a complex dance system, and clothes toggles, it's very easy to exceed 256 synced bits.
    *   *Consequence:* VRChat will block the avatar upload or the last installed components will not work.

2.  **Logic Conflicts:**
    *   **GoGo Loco:** Can cause the avatar to "sink" into the floor or float if there are conflicts with base locomotion layers or old asset versions [4].
    *   **SPS (Super Plug Shader):** Combining SPS with Constraints can cause "jitter" (rapid shaking) at contact points due to how VRChat handles physics and haptics updates [5].

3.  **Performance Rank:**
    *   **SPS:** Often requires extra lights or renderers that can degrade the avatar's performance rank to "Very Poor" immediately.
    *   **GoGo Loco:** Adds multiple layers to the Animator Controller. While it doesn't affect graphics as much, it increases CPU usage for processing animation logic [4].

> [!TIP]
> Tools like **VRCFury** are essential for managing these conflicts. VRCFury automates the merging of controllers and parameters ("Non-Destructive Workflow"), reducing human error and optimizing memory usage where possible.

## Optimization and Tricks: How to reduce bit usage

To avoid hitting the 256-bit limit without sacrificing features, creators use several smart techniques. The most common is **combining mutually exclusive states**.

#### The "Single Int" Trick
Imagine you have 10 different shirts for your avatar.
*   **Inefficient Way (Bools):** You create 10 `Bool` parameters (Shirt1, Shirt2... Shirt10).
    *   *Cost:* 10 Bits.
    *   *Disadvantage:* You spend 1 bit for each extra garment.
*   **Efficient Way (Int):** You create **1** single `Int` parameter called `Top_Clothing`.
    *   *Cost:* 8 Bits (always, since it's an Int).
    *   *Advantage:* You can have up to **255 shirts** using the same 8 bits!
    *   *How it works:* In the Animator, you set it so if the value is 1, Shirt A activates; if it's 2, Shirt B, etc.

> [!NOTE]
> **Golden Rule:** If you have more than 8 options that cannot be used at the same time (e.g., clothing types, eye colors), use an `Int`. If fewer than 8, use individual `Bool`s.

#### Basic Configuration Example
If you want to create a color selector for your clothes:
1.  Create an **Int** parameter called `ColorBoots`.
2.  In your **Expression Menu**, create a sub-menu or a "Radial Puppet" control (though for exact changes, buttons setting exact values are better).
3.  Configure the menu buttons:
    *   "Red" Button -> Sets `ColorBoots` to 1.
    *   "Blue" Button -> Sets `ColorBoots` to 2.
    *   "Black" Button -> Sets `ColorBoots` to 3.
4.  In the **Animator (FX Layer)**:
    *   Create transitions from `Any State` to the color states.
    *   Condition for Red: `ColorBoots` equals 1.
    *   Condition for Blue: `ColorBoots` equals 2.

This way you control multiple options spending only 8 bits of your total budget!

## Summary Table: Which type to use?

| Use Case | Recommended Type | Why? |
| :--- | :--- | :--- |
| **Toggle 1 object** (Glasses, hat) | `Bool` | Simple and direct. Costs 1 bit. |
| **Clothing Selector** (Shirt A, B, C...) | `Int` | Allows hundreds of options spending only 8 bits. |
| **Gradual Changes** (Thickness, Color, Brightness) | `Float` | Necessary for decimal values (0.0 to 1.0). |
| **Complex States** (Dances, AFK, Emotes) | `Int` | Ideal for state machines with multiple conditions. |
| **Independent Toggles** (< 8 objects) | `Bool` | If few and they don't cancel each other out, easier to setup. |

---

## References

[1] VRChat. (n.d.). *Expression Parameters*. VRChat Documentation. https://docs.vrchat.com/docs/expression-parameters

[2] VRChat. (n.d.). *Avatar Parameter Driver*. VRChat Documentation. https://docs.vrchat.com/docs/avatar-parameter-driver

[3] VRChat. (n.d.). *OSC Overview*. VRChat Documentation. https://docs.vrchat.com/docs/osc-overview

[4] Franada. (n.d.). *GoGo Loco Documentation*. https://www.3d.franada.com/gogoloco

[5] VRCFury. (n.d.). *SPS - Super Plug Shader*. VRCFury Documentation. https://vrcfury.com/components/sps
