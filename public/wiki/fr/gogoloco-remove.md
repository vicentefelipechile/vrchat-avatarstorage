# Supprimer GoGo Loco d'un Projet Unity

<span class="badge badge-blue">Logic</span>

## Qu'est-ce que c'est ?

GoGo Loco est un prefab de locomotion créé par Franada qui remplace ou modifie plusieurs Playable Layers du descripteur d'avatar (Base/Locomotion, Additive, Gesture) et injecte ses propres paramètres et entrées dans le menu d'expression de l'avatar. Parce qu'il touche à de nombreuses parties interconnectées d'un projet d'avatar, sa suppression complète nécessite de travailler à travers plusieurs couches — des objets de la scène aux assets du projet et, le cas échéant, au manifeste VPM.

> [!WARNING]
> Sauvegardez toujours votre projet Unity (ou commitez-le dans votre contrôle de version) avant de commencer ce processus. Bon nombre de ces étapes suppriment ou écrasent des Animator Controllers et des assets d'Expression qui peuvent être partagés avec d'autres parties de votre avatar.

## Pourquoi le supprimer ?

- Remplacer GoGo Loco par un autre système de locomotion (par ex., la locomotion de Modular Avatar, Locomotion Fix de WetCat, ou les contrôleurs par défaut de VRChat).
- Nettoyer un avatar acheté qui est fourni avec GoGo Loco pré-installé alors que vous n'en voulez pas.
- Résoudre les conflits avec NSFW Locomotion ou d'autres paquets qui partagent les couches et noms de paramètres de GoGo Loco.
- Réduire l'utilisation de la mémoire des paramètres (GoGo Loco consomme 16–17 bits de mémoire synchronisée par défaut).

## Étape 1 : Supprimer le Prefab de la Scène

GoGo Loco peut être installé en tant que GameObject enfant sur la racine de l'avatar, particulièrement lorsqu'il est configuré via VRCFury ou Modular Avatar.

1. Ouvrez la scène contenant votre avatar dans la fenêtre **Hierarchy**.
2. Développez le GameObject racine de l'avatar.
3. Cherchez tout objet enfant nommé `GoGo Loco`, `GGL`, `GoGoLoco` ou similaire. Sélectionnez-le et appuyez sur **Delete**.
4. Si GoGo Loco a été installé via [VRCFury](/wiki?topic=vrcfury), cherchez un objet enfant avec un composant `VRCFury` qui référence un prefab GoGo Loco — supprimez également cet objet.
5. Si installé via [Modular Avatar](/wiki?topic=modular-avatar), cherchez un objet enfant avec un composant `MA Merge Animator` ou `MA Menu Installer` pointant vers des assets GoGo Loco et supprimez-le.

> [!NOTE]
> Si l'avatar a été acheté et que GoGo Loco y était intégré (c'est-à-dire qu'aucun GameObject enfant séparé n'existe), passez cette étape et allez directement à l'Étape 2.

## Étape 2 : Restaurer les Playable Layers du Descripteur d'Avatar

GoGo Loco remplace jusqu'à trois des cinq Playable Layers sur le composant `VRCAvatarDescriptor`. Vous devez réaffecter chacune d'elles aux contrôleurs par défaut de VRChat ou à vos propres contrôleurs personnalisés.

1. Sélectionnez la racine de l'avatar dans la Hiérarchie et localisez le composant **VRC Avatar Descriptor** dans l'Inspecteur.
2. Développez la section **Playable Layers**.
3. Pour chacune des couches suivantes, vérifiez si un contrôleur GoGo Loco lui est actuellement assigné (les noms de fichiers commenceront par `go_` ou contiendront `GoGoLoco/GGL`) :

| Couche | Nom de fichier GoGo Loco (approximatif) | Remplacement par défaut |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (des exemples VRCSDK) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (des exemples VRCSDK) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (des exemples VRCSDK) |

4. Pour chaque couche affectée, cliquez sur le petit cercle à droite du champ et assignez le contrôleur VRChat par défaut approprié, ou assignez votre propre contrôleur personnalisé.
5. Si vous n'avez pas les contrôleurs VRChat par défaut dans votre projet, ils se trouvent sous `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Si votre avatar avait des gestes de la main personnalisés avant l'ajout de GoGo Loco, vous devez restaurer votre contrôleur de couche Gesture original ici plutôt que celui par défaut de VRChat — vérifiez votre contrôle de version ou vos sauvegardes pour cela.

## Étape 3 : Supprimer les Couches GoGo Loco du Contrôleur FX

Pour la fonction de vol, GoGo Loco fusionne deux couches supplémentaires dans le contrôleur FX Animator de l'avatar. Celles-ci restent même après la suppression du prefab et doivent être supprimées manuellement.

1. Localisez le contrôleur FX Animator de votre avatar dans la fenêtre Project et double-cliquez dessus pour ouvrir la fenêtre **Animator**.
2. Dans le panneau **Layers** à gauche, cherchez les couches nommées `GoGo Fly`, `GoGo Freeze`, ou toute couche dont le nom commence par `go_`.
3. Faites un clic droit sur chaque couche GoGo Loco et sélectionnez **Delete Layer**.
4. Dans la même fenêtre Animator, cliquez sur l'onglet **Parameters**.
5. Supprimez chaque paramètre appartenant à GoGo Loco. Les plus courants incluent :

| Nom du paramètre | Type |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Les paramètres commençant par `go_` ou `Go/` sont des paramètres GoGo Loco. Supprimez-les tous. Les paramètres comme `VelocityY`, `VRCFaceBlendH`, `Grounded`, etc., sont des paramètres intégrés standard de VRChat — **ne les supprimez pas**.

> [!CAUTION]
> La suppression d'un paramètre qui est encore référencé par un état d'animation ou une transition restante cassera ces états. Vérifiez toujours qu'aucune couche non-GoGo-Loco ne dépend d'un paramètre avant de le supprimer.

## Étape 4 : Nettoyer l'Asset Expression Parameters

GoGo Loco ajoute ses paramètres à l'asset `VRCExpressionParameters` de l'avatar, consommant de la mémoire synchronisée. Chaque paramètre GoGo Loco laissé de côté gaspille des bits.

1. Dans la fenêtre Project, trouvez le fichier `.asset` assigné à **Expression Parameters** dans le descripteur d'avatar.
2. Sélectionnez-le et regardez la liste des paramètres dans l'Inspecteur.
3. Supprimez chaque entrée correspondant à un paramètre GoGo Loco (mêmes noms que ceux listés à l'Étape 3).
4. Confirmez que le **Total Cost** affiché en bas de l'Inspecteur diminue après la suppression.

## Étape 5 : Supprimer l'Entrée du Menu GoGo Loco

GoGo Loco installe une entrée de sous-menu dans le Expression Menu racine de l'avatar.

1. Trouvez le fichier `.asset` assigné à **Expressions Menu** dans le descripteur d'avatar.
2. Sélectionnez-le et inspectez la liste **Controls**.
3. Supprimez toute entrée nommée `GoGo Loco`, `GGL`, `Loco` ou similaire qui pointe vers un asset de sous-menu GoGo Loco.
4. Ouvrez récursivement chaque sous-menu restant et supprimez toute entrée de contrôle GoGo Loco imbriquée à l'intérieur.

## Étape 6 : Supprimer les Fichiers d'Assets GoGo Loco du Projet

Après avoir déconnecté GoGo Loco de l'avatar, supprimez ses fichiers du projet Unity pour garder le dossier `Assets/` propre.

1. Dans la fenêtre Project, cherchez `go_` en utilisant la barre de recherche (assurez-vous que la portée de recherche est réglée sur **All**).
2. Examinez les résultats — les fichiers commençant par `go_` sont presque toujours des assets GoGo Loco (Animation Clips, Animator Controllers, Textures, Materials pour les icônes du menu).
3. Cherchez également `GoGoLoco` et `GGL` pour attraper tout fichier utilisant le nom complet.
4. Sélectionnez tous les assets GoGo Loco confirmés et appuyez sur **Delete** (ou clic droit → **Delete**).
5. Unity vous demandera de confirmer la suppression. Acceptez.

> [!WARNING]
> Ne supprimez pas les assets dont les noms commencent par `go_` s'ils appartiennent à votre propre projet (par ex., un GameObject ou une animation que vous avez nommée ainsi). Inspectez chaque fichier avant de le supprimer.

Emplacements de dossiers courants pour les fichiers GoGo Loco :

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Partout où un avatar acheté a pu extraire le `.unitypackage`.

Supprimez le dossier entier une fois que tous les fichiers qu'il contient sont confirmés comme appartenant à GoGo Loco.

## Étape 7 : Supprimer le Package VPM (Installation VCC uniquement)

Si GoGo Loco a été installé comme un package VPM via le VRChat Creator Companion, les fichiers du package se trouvent dans `Packages/` plutôt que dans `Assets/` et doivent être supprimés via le VCC ou le manifeste.

### Option A — Via l'interface VCC

1. Ouvrez le **VRChat Creator Companion**.
2. Naviguez vers votre projet dans l'onglet **Projects** et cliquez sur **Manage Project**.
3. Dans la liste des paquets, trouvez `GoGoLoco` (ID du paquet `com.franada.gogoloco` ou similaire).
4. Cliquez sur le bouton **moins (−)** ou réglez le menu déroulant de version sur **Remove** et appliquez.
5. Rouvrez le projet dans Unity. Le Resolver détectera la suppression et nettoiera le dossier `Packages/`.

### Option B — Via `vpm-manifest.json` (manuel)

1. Fermez Unity.
2. Ouvrez `<VotreProjet>/Packages/vpm-manifest.json` dans un éditeur de texte.
3. Supprimez l'entrée pour GoGo Loco des objets `"dependencies"` et `"locked"`.
4. Supprimez le dossier physique `<VotreProjet>/Packages/com.franada.gogoloco/` (ou équivalent).
5. Rouvrez Unity. Le Resolver refera une analyse et confirmera l'absence de paquets manquants.

> [!NOTE]
> La suppression du package VPM n'annule pas automatiquement les couches, paramètres, menus ou objets enfants de prefab ajoutés lors de l'installation. Les Étapes 1–6 doivent toujours être complétées quelle que soit la méthode d'installation utilisée.

## Étape 8 : Réactiver Force Locomotion (si nécessaire)

Lorsque GoGo Loco est installé, il décoche généralement **Force Locomotion animations for 6-point tracking** sur le descripteur d'avatar, car sa couche Locomotion personnalisée gère les modes de tracking en interne. Après la suppression, vous voudrez peut-être restaurer le comportement par défaut.

1. Sélectionnez la racine de l'avatar et ouvrez le **VRC Avatar Descriptor** dans l'Inspecteur.
2. Faites défiler jusqu'à la section **IK**.
3. Réactivez la case **Force Locomotion animations for 6 point tracking** si vous utilisez le contrôleur de Locomotion VRChat par défaut.

> [!TIP]
> Si vous n'utilisez pas le tracking corporel complet (FBT), cette case à cocher n'a aucun effet visible et peut être laissée dans n'importe quel état.

## Liste de Vérification

Avant d'uploader l'avatar, confirmez tout ce qui suit :

| Vérification | Comment vérifier |
| :---------------------------------------- | :--------------------------------------------------- |
| Pas d'objet enfant GoGo Loco dans la Hiérarchie | Inspecter la hiérarchie de l'avatar dans la scène Unity |
| Playable Layers pointent vers les bons contrôleurs | VRC Avatar Descriptor → Section Playable Layers |
| Pas de couches `go_` dans le contrôleur FX | Ouvrir FX Animator Controller → Panneau Layers |
| Pas de paramètres `go_` / `Go/` dans FX | Ouvrir FX Animator Controller → Panneau Parameters |
| Pas d'entrées GoGo Loco dans Expression Parameters | Inspecter le fichier `.asset` dans l'Inspecteur |
| Pas d'entrées GoGo Loco dans Expression Menu | Inspecter récursivement le fichier `.asset` du menu racine |
| Pas de fichiers GoGo Loco dans `Assets/` | Recherche dans la fenêtre Project pour `go_`, `GoGoLoco`, `GGL` |
| Pas de package GoGo Loco dans `vpm-manifest.json` | Ouvrir le fichier dans un éditeur de texte et chercher `gogoloco` |
| Le réglage Force Locomotion est intentionnel | VRC Avatar Descriptor → Section IK |

## Tableau Récapitulatif

| Ce que GoGo Loco ajoute | Où le supprimer |
| :---------------------------------------------- | :------------------------------------------------ |
| Prefab/GameObject enfant sur la racine de l'avatar | Unity Hierarchy → supprimer l'objet enfant |
| Playable Layers Base, Additive, Gesture | VRC Avatar Descriptor → Playable Layers |
| Couches FX (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Panneau Layers |
| Paramètres FX (`Go/*`, `VelocityMagnitude`, etc.) | FX Animator Controller → Panneau Parameters |
| Entrées dans Expression Parameters | VRCExpressionParameters `.asset` → Liste Controls |
| Entrée de sous-menu dans Expression Menu | VRCExpressionsMenu `.asset` → Liste Controls |
| Fichiers d'assets (`go_*.anim`, contrôleurs, textures) | Fenêtre Project → supprimer le dossier `GoGoLoco` |
| Entrée de paquet VPM | Interface VCC ou `vpm-manifest.json` |
| Force Locomotion décoché | VRC Avatar Descriptor → Section IK (restaurer) |

## Références

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* Contributeurs du VRChat Wiki. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
