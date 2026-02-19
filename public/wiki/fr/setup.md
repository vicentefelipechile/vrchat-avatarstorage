# Guide étape par étape : Préparer Unity avec VCC
Suivez ces étapes AVANT d'importer votre avatar téléchargé

### Étape 1 : Installer VRChat Creator Companion (VCC)
Téléchargez le **VRChat Creator Companion** depuis [vrchat.com/home/download](https://vrchat.com/home/download). Le **VCC** est l'outil officiel qui gère Unity, VRChat SDK et tous les packages nécessaires automatiquement.

### Étape 2 : Créer un nouveau projet d'avatar
Ouvrez VCC → **Projects** → **Create New Project**. Sélectionnez le modèle **"Avatars"**. Donnez-lui un nom (ex: "Mes Avatars VRChat"). VCC installera automatiquement **Unity** et **VRChat SDK**.

### Étape 3 : Ajouter le référentiel Poiyomi
Dans VCC, allez dans **Settings** → **Packages** → **Add Repository**. Collez cette URL : [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) et cliquez sur "Add". Cela vous permettra d'installer **Poiyomi** facilement.

### Étape 4 : Ajouter le référentiel VRCFury (Facultatif)
Si votre avatar l'exige, dans **Settings** → **Packages** → **Add Repository**, collez : [https://vcc.vrcfury.com](https://vcc.vrcfury.com) et cliquez sur "Add". **VRCFury** facilite l'installation de vêtements et d'accessoires.

### Étape 5 : Installer les packages dans votre projet
Dans VCC, sélectionnez votre projet → **Manage Project**. Trouvez **"Poiyomi Toon Shader"** et cliquez sur le bouton **"+"** pour l'ajouter. Si vous avez besoin de VRCFury, ajoutez-le aussi. Cliquez sur **"Apply"**.

### Étape 6 : Ouvrir le projet et importer l'avatar
Dans VCC, cliquez sur **"Open Project"** pour lancer Unity. Une fois ouvert, importez votre avatar : faites glisser le fichier **.unitypackage** dans la fenêtre Unity ou utilisez **Assets → Import Package → Custom Package**.

### Étape 7 : Vérifier et configurer
Faites glisser le **prefab de l'avatar** dans la scène. Si tout est correct, vous ne verrez **PAS de matériaux en magenta** (rose). Configurez l'avatar en utilisant **VRChat SDK → Show Control Panel → Builder**. Corrigez les erreurs avec **"Auto Fix"** et téléchargez avec **"Build & Publish"**.

> [!TIP]
> Conseil important
> VCC simplifie TOUT. Vous n'avez plus besoin d'installer Unity manuellement ou de trouver la bonne version. VCC le fait automatiquement. Utilisez toujours VCC pour gérer vos projets VRChat.
