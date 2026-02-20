# Unity Hub Error Fix

If Unity Hub won't open, gets stuck on an infinite loading screen, or you experience login errors that prevent you from using the program, the most effective solution is to perform a **clean reinstall**.

Here's how to delete all temporary files and corrupted settings.

## Method 1: Clean Reinstall (Remove all traces)

Follow these steps carefully to ensure Unity Hub works again:

### 1. Uninstall Unity Hub
> [!WARNING]
> Warning
> For this step, you must use the **official Windows uninstaller** (from *Settings -> Apps* or *Control Panel*). **DO NOT use third-party programs** like IObit Uninstaller, Revo Uninstaller, etc., as they can delete necessary registry keys and worsen the problem.

- Go to **Windows Settings** -> **Apps**.
- Find "Unity Hub" in the list and click **Uninstall**.

### 2. Delete residual directories
Even after uninstalling, Unity leaves hidden configuration (cache) folders on your system. You must find and delete them manually.

Open Windows File Explorer, copy each of the following addresses into the top bar, and press Enter. **If the folder exists, delete it completely:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*(Note: You can copy and paste the `%USERPROFILE%` path directly into the explorer bar, just like you would use `%appdata%` to install Minecraft mods, and it will automatically take you to your current user folder).*

### 3. Reinstall Unity Hub
Once the system is completely clean of Unity files:
1. Go to the [official Unity website](https://unity.com/download) and download the latest version of Unity Hub.
2. Run the installer and follow the normal steps.
3. Wait for everything to install correctly, log in again, and confirm the error is fixed.
