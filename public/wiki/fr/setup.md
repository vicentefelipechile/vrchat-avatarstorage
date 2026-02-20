# Guide Étape par Étape : Préparation de Unity avec VCC
Suivez ces étapes AVANT d'importer votre avatar téléchargé

> [!NOTE]
> Note
> Vous n'avez pas besoin d'installer, manipuler ou gérer Unity directement par vous-même. Tout le processus de préparation du projet et d'installation des dépendances se fait dans VCC. Vous n'ouvrirez Unity qu'à la fin pour importer et télécharger votre avatar.

### Étape 1 : Installer VRChat Creator Companion (VCC)
Téléchargez le **VRChat Creator Companion** sur [vrchat.com/home/download](https://vrchat.com/home/download). Le **VCC** est l'outil officiel qui gère automatiquement Unity, le SDK de VRChat et tous les paquets nécessaires.

### Étape 2 : Installer Unity Hub et Unity via VCC
Lors de l'ouverture de VCC pour la première fois, il détectera si Unity est installé. Suivez l'assistant de configuration pour qu'il installe **Unity Hub**, puis télécharge la bonne version de **Unity** requise par VRChat (actuellement la série 2022.3). Laissez VCC installer les deux programmes automatiquement.

### Étape 3 : Créer un Nouveau Projet d'Avatar
Ouvrez VCC → **Projects** → **Create New Project**. Sélectionnez le modèle **"Avatars"**. Donnez-lui un nom (ex: "Mes Avatars VRChat"). VCC préparera automatiquement votre projet avec le **VRChat SDK**.

### Étape 4 : Ajouter le Dépôt Poiyomi
Dans VCC, allez dans **Settings** → **Packages** → **Add Repository**. Collez cette URL : [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) et cliquez sur "Add". Cela vous permettra d'installer **Poiyomi** facilement, ce qui est vital pour l'apparence des textures de votre avatar. Vous trouverez plus de détails dans notre [guide sur Poiyomi](/wiki?topic=poiyomi).

### Étape 5 : Ajouter le Dépôt VRCFury (Facultatif)
Si votre avatar l'exige, dans **Settings** → **Packages** → **Add Repository**, collez : [https://vcc.vrcfury.com](https://vcc.vrcfury.com) et cliquez sur "Add". **VRCFury** facilite l'installation de vêtements et d'accessoires par glisser-déposer. Nous vous recommandons de consulter le [guide sur VRCFury](/wiki?topic=vrcfury) pour plus d'informations.

### Étape 6 : Installer les Paquets dans Votre Projet
Dans VCC, sélectionnez votre projet nouvellement créé → **Manage Project**. Cherchez **"Poiyomi Toon Shader"** et cliquez sur le bouton **"+"** pour l'ajouter. Si vous avez besoin de VRCFury, ajoutez-le également en utilisant le même bouton. Cliquez sur **"Apply"** ou attendez simplement que cela charge.

### Étape 7 : Ouvrir le Projet et Importer l'Avatar
Dans le menu de votre projet VCC, cliquez sur **"Open Project"** pour ouvrir Unity pour la première fois (cela peut prendre un certain temps). Une fois ouvert, importez votre avatar : faites glisser le fichier **.unitypackage** dans la fenêtre Unity (dans l'onglet `Project` ou `Assets`) ou utilisez **Assets → Import Package → Custom Package**.

### Étape 8 : Vérifier et Configurer
Faites glisser le **prefab de l'avatar** dans la scène. Si tout est correct et que Poiyomi est installé, vous ne verrez **PAS de matériaux magenta (rose)**. Configurez l'avatar en utilisant **VRChat SDK → Show Control Panel → Builder**. Résolvez les erreurs avec **"Auto Fix"** et téléchargez avec **"Build & Publish"**.

> [!TIP]
> Conseil Important
> Le VCC simplifie TOUT. Vous n'avez plus besoin de chercher la bonne version de Unity sur Internet ni de gérer les incompatibilités. Utilisez toujours le VCC comme point central pour gérer vos projets VRChat.

---

## Références

[1] VRChat Inc. (s.d.). *VRChat Creator Companion*. VRChat. https://vrchat.com/home/download

[2] Unity Technologies. (s.d.). *Unity Hub*. Unity. https://unity.com/download

[3] Poiyomi. (s.d.). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader

[4] VRCFury. (s.d.). *VRCFury Documentation*. https://vrcfury.com
