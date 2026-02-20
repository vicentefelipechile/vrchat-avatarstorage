# Esska Desktop Puppeteer

<span class="badge">UTILITAIRE</span>

## Qu'est-ce que c'est ?
**Esska Desktop Puppeteer** est un outil avancé pour les utilisateurs de bureau dans VRChat créé par **Esska**. Il consiste en un système en deux parties (une application de bureau et un package pour l'avatar) qui vous permet de contrôler des parties spécifiques du corps de votre avatar en utilisant votre souris d'ordinateur, offrant un niveau de précision et d'expressivité normalement réservé aux utilisateurs de Réalité Virtuelle (VR).

## À quoi ça sert ?
- **Contrôle des membres :** Vous permet de bouger les bras et les mains de votre avatar de manière indépendante et précise directement avec la souris.
- **Parties personnalisées :** Facilite le contrôle des parties supplémentaires de l'avatar, comme les oreilles, les queues ou les accessoires.
- **Simulation VR sur Bureau :** Son objectif principal est de donner aux utilisateurs de bureau une liberté de mouvement qui donne l'impression qu'ils jouent en VR.
- **Suivi de la tête (Head Tracking) :** Prend en charge les dispositifs TrackIR, permettant à la tête de votre avatar de bouger selon vos mouvements réels.

> [!NOTE]
> Note
> Cet outil utilise l'**OSC (Open Sound Control)** pour envoyer les paramètres depuis l'application de bureau vers votre client VRChat. Assurez-vous d'avoir activé l'option OSC dans le menu radial (Radial Menu) de VRChat.

## Où l'obtenir ?
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Prérequis
Avant de commencer, assurez-vous de remplir les conditions suivantes :
- **Système d'exploitation :** Windows 10 ou Windows 11.
- **Logiciel :** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0) installé sur votre PC.
  - *Comment télécharger :* Lorsque vous cliquez sur le lien, cherchez la section intitulée "**\.NET Desktop Runtime**". Dans le petit tableau en dessous, sur la ligne "Windows", cliquez sur le lien "**x64**" pour télécharger le programme d'installation.
- **Matériel :** Une souris avec un bouton central (molette de défilement).
- **VRChat SDK :** Installé dans votre projet Unity (via VCC).
- **Avatar :** Un avatar humanoïde compatible (fonctionne mieux avec des proportions humaines standards).

## Guide d'installation étape par étape

Le processus d'installation est divisé en deux parties principales : la préparation de l'avatar dans Unity et la configuration de l'application de bureau.

### Partie 1 : Installation sur l'Avatar (Unity)
1. **Importer le package :** Téléchargez le "Base Package" depuis la page officielle et glissez le fichier `.unitypackage` dans le dossier `Assets` de votre projet Unity.
2. **Ajouter à l'Avatar :** Trouvez le prefab inclus dans le package Esska Desktop Puppeteer et glissez-le sur votre avatar dans la hiérarchie (`Hierarchy`).
3. **Configuration des paramètres :** Le système utilise des paramètres OSC. Assurez-vous que votre avatar dispose de suffisamment de mémoire de paramètres (Parameters Memory) pour accueillir les nouveaux contrôles.
4. **Uploader l'Avatar :** Une fois le prefab correctement positionné et configuré, téléversez votre avatar dans VRChat comme vous le feriez normalement.

### Partie 2 : Configuration de l'application de bureau
1. **Télécharger l'App :** Téléchargez l'application "Esska Desktop Puppeteer App".
2. **Exécuter :** Ouvrez l'application sur votre PC avant ou pendant votre session VRChat.
3. **Activer l'OSC dans VRChat :** Dans VRChat, ouvrez votre menu radial, allez dans `Options` -> `OSC` et assurez-vous qu'il est défini sur **Enabled**.
4. **Utilisation :** Utilisez les boutons de votre souris (en particulier le bouton central) et le clavier selon les instructions de l'application pour commencer à bouger les membres de votre avatar.

> [!WARNING]
> Avertissement : Confidentialité et contrôles
> L'application doit "écouter" vos frappes au clavier et interactions avec la souris (hooks globaux) pour pouvoir fonctionner tant que la fenêtre VRChat est active. Le créateur affirme qu'elle ne collecte pas de données personnelles, mais il est important de savoir comment le programme fonctionne pour éviter toute interférence avec d'autres applications.

---

## Références

[1] Esska. (s.d.). *Esska Desktop Puppeteer*. BOOTH. https://esska.booth.pm/items/6366670
