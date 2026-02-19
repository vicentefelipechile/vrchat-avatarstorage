# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">Audio</span>

## What is it?
**PCS** (Penetration Contact System), created by **Dismay** [1], is a complementary system for VRChat avatars that uses **Contacts** (Contact Senders and Receivers) to add advanced interactivity to sexual relations (ERP).

Its main function is to generate **auditory feedback** (sounds). Optionally, it allows controlling real sex toys via vibration (Haptics) [3][4].

### Key Difference
- **Without OSC (Basic):** The system plays "slap", "slide", and fluid sounds inside the game. Everyone nearby can hear it. It works autonomously in VRChat [1].
- **With OSC (Advanced/Optional):** Sends data outside VRChat to vibrate sex toys (Lovense, etc.) synchronized with penetration.

## Basic Functionality (Sound)
This is the default function of PCS and **does not require external software**.

1. **Detection:** The "Receivers" (orifices) detect when a "Sender" (penis/penetrator) enters them.
2. **Dynamic Sound:**
   - On rubbing the entrance: Rubbing or "slap" sounds.
   - On penetration: Friction/liquid sounds ("squelch") that vary in intensity according to speed and depth.
3. **Plug & Play:** Once installed on the avatar, it works automatically with any other user who has their "Senders" configured (or if you have the "Receivers").

## OSC and Haptics Integration (Optional)
**OSC** (Open Sound Control) is a protocol that allows VRChat to "talk" to external programs [3]. PCS uses this to convert game action into real vibrations.

### Why does this integration exist?
To increase immersion. If you have a compatible sex toy, PCS "tells" the toy when and with what intensity to vibrate based on how deep the penetrator is in the game.

### Requirements for Haptics
- **Compatible Toy:** (e.g., Lovense Hush, Lush, Max, etc.).
- **Bridge Software:** A program that receives the signal from VRChat and controls the toy.
  - *OscGoesBrrr* (Free, popular) [3].
  - *VibeGoesBrrr*.
  - *Intiface Central* (Connection engine) [4].

### OSC Setup
You only need to activate this if you are going to use toys:
1. In VRChat, open the **Action Menu**.
2. Go to `Options` > `OSC` > **Enabled**.
3. Open your bridge software and connect your toy.

---

## Unity Installation Guide
This installs both the sound system and the parameters for OSC (even if you don't use it, the parameters are there by default).

### Requirements
- **Unity** and **VRChat SDK 3.0**.
- **PCS Asset** (Dismay's Package) [1].
- **VRCFury** (Highly recommended for easier installation) [2].

### Step 1: Import
Drag the PCS `.unitypackage` into your project.

### Step 2: Configure Components
The system uses two types of prefabs:

**A. The Receiver (Orifices)**
1. Search for the `PCS_Orifice` prefab.
2. Place it inside the corresponding bone (Hips, Head, etc.).
3. Align it with the entrance of your mesh's hole.

**B. The Penetrator (Penetrators)**
1. Search for the `PCS_Penetrator` prefab.
2. Place it inside the penis bone.
3. Align it so it covers the length of the penis.

### Step 3: Finalize
If you use VRCFury, the system will merge automatically when uploading the avatar.
If not, use **Avatars 3.0 Manager** to merge the FX Controller and PCS Parameters with those of your avatar.

---

## References

[1] Dismay. (n.d.). *Penetration Contact System*. Gumroad. https://dismay.booth.pm/items/5001027

[2] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[3] OscGoesBrrr. (n.d.). *OscGoesBrrr*. https://osc.toys

[4] Intiface. (n.d.). *Intiface Central*. https://intiface.com/desktop/
