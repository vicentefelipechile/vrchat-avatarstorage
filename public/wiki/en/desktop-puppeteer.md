# Esska Desktop Puppeteer

<span class="badge">UTILITY</span>

## What is it?
**Esska Desktop Puppeteer** is an advanced tool for desktop users in VRChat created by **Esska**. It consists of a two-part system (a desktop app and an avatar package) that allows you to control specific body parts of your avatar using your computer mouse, offering a level of precision and expressiveness normally only available to Virtual Reality (VR) users.

## What is it for?
- **Limb control:** Allows you to move your avatar's arms and hands independently and precisely directly with the mouse.
- **Custom parts:** Makes it easy to control additional avatar parts, such as ears, tails, or accessories.
- **VR Simulation on Desktop:** Its main goal is to give desktop users a freedom of movement that makes them look as if they were playing in VR.
- **Head Tracking:** It features support for TrackIR devices, allowing your avatar's head to move according to your real movements.

> [!NOTE]
> Note
> This tool uses **OSC (Open Sound Control)** to send parameters from the desktop application to your VRChat client. Make sure you have the OSC option enabled in the VRChat Radial Menu.

## Where to get it?
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Prerequisites
Before you start, make sure you meet the following:
- **Operating System:** Windows 10 or Windows 11.
- **Software:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0) installed on your PC.
  - *How to download:* When you click the link, look for the section that says "**.NET Desktop Runtime**". In the small table below, in the "Windows" row, click on the **x64** link to download the installer.
- **Hardware:** A mouse with a middle button (scroll wheel).
- **VRChat SDK:** Installed in your Unity project (via VCC).
- **Avatar:** A compatible humanoid avatar (works best with standard human proportions).

## Step-by-Step Installation Guide

The installation process is divided into two main parts: preparing the avatar in Unity and setting up the desktop application.

### Part 1: Installation on Avatar (Unity)
1. **Import the Package:** Download the "Base Package" from the official page and drag the `.unitypackage` file into the `Assets` folder of your Unity project.
2. **Add to Avatar:** Find the prefab included in the Esska Desktop Puppeteer package and drag it onto your avatar in the `Hierarchy`.
3. **Parameter Configuration:** The system uses OSC parameters. Make sure your avatar has enough parameter memory (Parameters Memory) to accommodate the new controls.
4. **Upload the Avatar:** Once the prefab is correctly positioned and configured, upload your avatar to VRChat as you normally would.

### Part 2: Desktop Application Setup
1. **Download the App:** Download the "Esska Desktop Puppeteer App" application.
2. **Run:** Open the application on your PC before or during your VRChat session.
3. **Enable OSC in VRChat:** Inside VRChat, open your radial menu, go to `Options` -> `OSC` and make sure it is set to **Enabled**.
4. **Usage:** Use your mouse buttons (especially the middle button) and keyboard according to the application's instructions to start moving your avatar's limbs.

> [!WARNING]
> Warning: Privacy and Controls
> The application needs to "listen" to your keyboard and mouse inputs (global hooks) to be able to work while the VRChat window is active. The creator states that it does not collect personal data, but it is important to know how the program works to avoid interference with other applications.

---

## References

[1] Esska. (n.d.). *Esska Desktop Puppeteer*. BOOTH. https://esska.booth.pm/items/6366670
