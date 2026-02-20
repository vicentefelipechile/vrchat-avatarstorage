# Correction d'erreur Unity Hub

Si Unity Hub ne s'ouvre pas, reste bloqué sur un écran de chargement infini, ou si vous rencontrez des erreurs de connexion qui vous empêchent d'utiliser le programme, la solution la plus efficace consiste à effectuer une **réinstallation propre**.

Voici comment supprimer tous les fichiers temporaires et paramètres corrompus.

## Méthode 1 : Réinstallation Propre (Supprimer toutes les traces)

Suivez attentivement ces étapes pour vous assurer qu'Unity Hub fonctionne à nouveau :

### 1. Désinstaller Unity Hub
> [!WARNING]
> Avertissement
> Pour cette étape, vous devez utiliser le **programme de désinstallation officiel de Windows** (depuis *Paramètres -> Applications* ou le *Panneau de configuration*). **N'utilisez PAS de programmes tiers** comme IObit Uninstaller, Revo Uninstaller, etc., car ils peuvent supprimer des clés de registre nécessaires et aggraver le problème.

- Allez dans les **Paramètres Windows** -> **Applications**.
- Trouvez "Unity Hub" dans la liste et cliquez sur **Désinstaller**.

### 2. Supprimer les répertoires résiduels
Même après la désinstallation, Unity laisse des dossiers de configuration (cache) cachés sur votre système. Vous devez les trouver et les supprimer manuellement.

Ouvrez l'Explorateur de fichiers Windows, copiez chacune des adresses suivantes dans la barre supérieure, puis appuyez sur Entrée. **Si le dossier existe, supprimez-le complètement :**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*(Note : Vous pouvez copier et coller le chemin `%USERPROFILE%` directement dans la barre de l'explorateur, de la même manière que vous utiliseriez `%appdata%` pour installer des mods Minecraft, et cela vous amènera automatiquement à votre dossier utilisateur actuel).*

### 3. Réinstaller Unity Hub
Une fois le système complètement nettoyé des fichiers Unity :
1. Allez sur le [site officiel d'Unity](https://unity.com/download) et téléchargez la dernière version d'Unity Hub.
2. Exécutez le programme d'installation et suivez les étapes normales.
3. Attendez que tout s'installe correctement, reconnectez-vous, et confirmez que l'erreur est résolue.
