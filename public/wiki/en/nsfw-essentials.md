# NSFW Essentials Guide

<span class="badge badge-red">NSFW</span> <span class="badge">TOS</span> <span class="badge">OPTIMIZATION</span>

## Introduction
VRChat allows for great creative freedom, including adult content (NSFW) and erotic roleplay (ERP). However, it is **CRUCIAL** to understand the rules and appropriate tools to enjoy this content without risking your account or the performance of others.

## VRChat Rules (TOS)
VRChat has a zero-tolerance policy regarding certain content in public spaces.

- **Public Worlds:** It is **strictly prohibited** to display sexually explicit content, nudity, or erotic behavior in public instances. Doing so may result in a **permanent ban**.
- **Private Worlds:** NSFW content and ERP are tolerated in private instances (Friends+, Invite, etc.) where all participants are adults and have given their consent.
- **Avatars:** You can upload NSFW avatars, but you must **NOT** use their explicit features in public. Use the "Toggles" system to keep everything hidden by default.

## Essential Tools
To have a complete experience, these are the standard tools that most of the community uses:

1.  **VRCFury:** The "Swiss Army Knife" tool. Essential for adding Toggles, clothes, and complex systems without breaking your avatar.
    *   [View VRCFury guide](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader):** The standard system for physical interaction (penetration and deformation). It is free and much better than the old DPS.
    *   [View SPS guide](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB):** The gold standard for connecting sex toys (Lovense) to VRChat via haptic vibration.
    *   [View Haptics guide](/wiki?topic=haptics)

## Optimization and Texture Memory
NSFW avatars tend to be "heavy" due to the large amount of clothing and high-quality skin textures.

- **VRAM (Video Memory):** This is the scarcest resource. If your avatar uses more than 150MB of texture memory, you will cause people to crash.
- **Compression:** Always make sure to compress your textures in Unity. An uncompressed 4K texture takes up a lot of space.

## Contacts and PhysBones
Interaction in VRChat relies on **Contacts** (VRCContactReceiver and VRCContactSender).
- **Headpat:** Done by detecting the hand on the head.
- **Sexual Interaction:** SPS and OGB use contacts to detect when an object enters another, triggering animations, sounds, or vibrations in your real toy.
