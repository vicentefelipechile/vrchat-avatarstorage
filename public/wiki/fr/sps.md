# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Qu'est-ce que c'est ?
**SPS** (Super Plug Shader), parfois appelé familièrement "SSP", est un système de déformation de maillage gratuit et moderne pour VRChat conçu par l'équipe de **VRCFury**. Il permet aux parties de l'avatar de se déformer de manière réaliste lors de l'interaction avec d'autres avatars ou objets, remplaçant les systèmes plus anciens et payants comme **DPS** (Dynamic Penetration System) et **TPS** [1].

## À quoi ça sert ?
- **Déformation réaliste :** Simule la pénétration et le contact physique en déformant le maillage de l'avatar.
- **Optimisation :** Il est beaucoup plus léger et efficace que les anciens systèmes.
- **Gratuit :** Contrairement au DPS, SPS est entièrement gratuit et open source.
- **Compatibilité :** Fonctionne avec la plupart des shaders modernes (Poiyomi, LilToon, etc.) et est rétrocompatible avec les avatars utilisant DPS ou TPS.

## Prérequis
Avant de commencer, assurez-vous d'avoir les éléments suivants :
- **Unity :** La version recommandée pour VRChat.
- **VRChat SDK :** Installé dans votre projet (VCC).
- **VRCFury :** Installé et mis à jour vers la dernière version [2].
- **Modèle 3D :** Un avatar avec les maillages que vous souhaitez animer (orifices ou pénétrateurs).

## Guide d'Installation Étape par Étape

SPS est entièrement géré via les outils VRCFury dans Unity. Vous n'avez pas besoin d'importer des paquets de shaders étranges ni de faire des configurations d'animation manuelles complexes.

### Étape 1 : Installer VRCFury
Si vous ne l'avez pas encore, installez VRCFury depuis le VRChat Creator Companion (VCC).
1. Ouvrez VCC.
2. Allez dans "Manage Project".
3. Cherchez "VRCFury" dans la liste des paquets et cliquez sur installer (ou ajoutez le dépôt s'il n'apparaît pas).

### Étape 2 : Créer un Socket (Orifice)
Un "Socket" est le récepteur de l'interaction (bouche, etc.).

1. **Outils :** Dans la barre supérieure de Unity, allez à `Tools` > `VRCFury` > `SPS` > `Create Socket` [1].
2. **Placement :** Un nouvel objet apparaîtra dans votre scène.
   - Faites glisser cet objet dans la hiérarchie de votre avatar, et **rendez-le enfant de l'os** correspondant (ex : `Hip` ou `Head`).
3. **Ajustement :** Déplacez et faites pivoter l'objet Socket pour qu'il corresponde à l'entrée de l'orifice sur votre maillage.
   - La flèche du gizmo doit pointer **vers l'intérieur** de l'orifice.
   - Assurez-vous que le type de Socket (dans l'inspecteur) correspond à ce que vous voulez (ex : Vagina, Anal, Oral).
4. **Lumières :** Vous n'avez pas besoin de configurer les ID de lumières manuellement ; VRCFury le fait pour vous.

> [!TIP]
> **Note de Placement (ERP)**
> Ne placez pas les points (Sockets) trop profondément à l'intérieur de l'avatar. Si le "trou" est trop profond, il devient difficile de faire du ERP confortablement. Il est recommandé de les placer juste à l'entrée ou légèrement vers l'extérieur.
>
> **Attention aux Grandes Proportions :** Si votre avatar a des hanches très larges ou un très gros fessier ("énormes culs"), **déplacez le Socket encore plus vers l'extérieur**. Sinon, l'autre personne entrera en collision avec le maillage du corps avant de pouvoir "atteindre" le point d'interaction.

### Étape 3 : Créer un Plug (Pénétrateur)
Un "Plug" est l'objet qui pénètre et se déforme.

1. **Préparation du Maillage :**
   - Assurez-vous que votre maillage de pénétrateur est "droit" et "étendu" en position de repos dans Unity. SPS a besoin de connaître la longueur totale.
   - Si vous venez de DPS/TPS, assurez-vous de supprimer les anciens scripts ou matériaux spéciaux. Utilisez un shader normal (Poiyomi) [1].
2. **Outils :** Allez à `Tools` > `VRCFury` > `SPS` > `Create Plug` [1].
3. **Placement :**
   - **Option A (Avec des os) :** Si votre pénis a des os, faites glisser l'objet Plug et rendez-le enfant de l'**os de base** du pénis.
   - **Option B (Sans os) :** Si c'est juste un maillage (mesh renderer), faites glisser l'objet Plug et déposez-le directement sur l'objet avec le **Mesh Renderer**.
4. **Configuration :**
   - Dans l'inspecteur du composant `VRCFury | SPS Plug`, assurez-vous que le **Renderer** est votre maillage de pénis.
   - Ajustez l'orientation : La partie courbe du gizmo doit être à la pointe et la base à la base.
   - Configurez le **Type** approprié.

### Étape 4 : Tester dans Unity
Vous n'avez pas besoin de mettre en ligne l'avatar pour tester si cela fonctionne.
1. Installez **Gesture Manager** depuis le VCC [1].
2. Entrez en **Play Mode** dans Unity.
3. Sélectionnez le Gesture Manager.
4. Dans le menu d'expressions émulé, allez dans les options SPS.
   - VRCFury génère automatiquement un menu de test avec des options pour activer/désactiver et tester la déformation.
   - Vous pouvez créer un "Test Socket" depuis le menu outils pour tester l'interaction en temps réel.

> [!WARNING]
> Avertissement : Constraints (Contraintes)
> Évitez d'utiliser des contraintes Unity sur les mêmes os que SPS déforme, car cela peut causer des conflits de mouvement (jitter) [4].

---

## Références

[1] VRCFury. (s.d.). *SPS (Super Plug Shader)*. VRCFury Documentation. https://vrcfury.com/sps

[2] VRCFury. (s.d.). *Download & Install*. VRCFury Documentation. https://vrcfury.com/download

[3] VRCD. (s.d.). *SPS Tutorial*. VRCD. https://vrcd.org.cn

[4] VRCFury. (s.d.). *SPS Troubleshooting*. VRCFury Documentation. https://vrcfury.com/sps
