# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Qu'est-ce que c'est ?
**NSFW Locomotion** est une version personnalisée et explicite du système **GoGo Loco** (créé à l'origine par franada). Il est conçu spécifiquement pour les avatars "adult-themed" ou ERP, élargissant les fonctionnalités de locomotion pour inclure des poses et des animations suggestives ou explicites.

Il conserve toutes les fonctions du GoGo Loco original mais ajoute du contenu spécifique pour les interactions intimes.

> [!WARNING]
> Important
> **N'installez PAS NSFW Locomotion et Gogo Loco normal dans le même projet.** Ils partagent des noms de menus et de couches, ce qui causera des conflits et des erreurs. N'en choisissez qu'un seul.

## Caractéristiques
- **Base GoGo Loco :** Inclut toutes les fonctions standard de vol, d'échelle et de pose.
- **Version "Poses Only" :** Légère, ajoute uniquement des poses statiques supplémentaires.
- **Version "Emotes + Poses" :** Inclut des émotes complètes, des mouvements dynamiques et des animations personnalisées pour le roleplay.
- **Installation facile :** Intégration avec **VRCFury** et un script d'installation en un clic.

## Où l'obtenir ?
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (Pour VCC)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## Que faire si l'avatar a déjà GoGo Loco ?
Comme mentionné dans l'avertissement, **vous ne pouvez pas avoir les deux systèmes installés en même temps**. Si votre avatar venait avec GoGo Loco ou que vous l'avez installé précédemment, vous devez le désinstaller complètement avant d'ajouter NSFW Locomotion pour éviter les erreurs Unity ou les menus cassés.

### Étapes pour désinstaller le GoGo Loco original :
1. **Si installé avec VRCFury (Méthode facile) :**
   - Dans Unity, trouvez le prefab de GoGo Loco dans la hiérarchie (`Hierarchy`) comme enfant de votre avatar et supprimez-le (Clic droit -> `Delete`).
2. **Si intégré manuellement dans l'avatar :**
   - **Playable Layers :** Sélectionnez votre avatar, accédez au composant `VRC Avatar Descriptor` et descendez jusqu'à "Playable Layers". Supprimez ou remplacez les contrôleurs de GoGo Loco (Base, Action, FX) par ceux d'origine fournis avec l'avatar.
   - **Paramètres et Menu :** Dans le même composant, ouvrez votre liste de paramètres (`Expressions Parameters`) et supprimez tous ceux appartenant à GoGo Loco (ils commencent généralement par `Go/`). Ouvrez ensuite votre menu (`Expressions Menu`) et supprimez le bouton qui ouvre le sous-menu de GoGo.
   - *(Facultatif)* Si aucun autre avatar n'utilise GoGo Loco dans ce projet, supprimez le dossier `GoGo` de vos `Assets`.

Une fois que l'avatar est complètement nettoyé de l'ancien système, vous pouvez procéder à l'installation de NSFW Locomotion normalement.

## Comment l'installer ? (Recommandé avec VCC)
La méthode la plus simple est d'utiliser le **VRChat Creator Companion (VCC)**.

1. Ajoutez le dépôt **Lastation Package Listing (LPL)** à votre VCC.
2. Recherchez et installez le package **NSFW Locomotion**.
3. Assurez-vous d'avoir **VRCFury** installé dans le projet via VCC également.
4. Ouvrez votre projet Unity.
5. Dans la barre de menu supérieure, allez à : `LastationVRChat` -> `NSFW Locomotion`.
6. Sélectionnez votre avatar et choisissez la version que vous souhaitez :
   - **Full Version :** (Emotes + Poses)
   - **Poses Version :** (Poses seulement, plus léger)

## Installation Manuelle
Si vous préférez ne pas utiliser VCC (non recommandé) :
1. Téléchargez la dernière "Release" depuis GitHub.
2. Importez le package dans Unity.
3. Glissez le prefab correspondant sur votre avatar (celui qui indique `(VRCFury)`).
   - Utilisez `WD` si vous avez "Write Defaults" activé, ou la version normale sinon.

---

## Références

LastationVRChat. (s.d.). *NSFW Locomotion* [Logiciel informatique]. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Utilisateur Reddit. (s.d.). *Help! How do i remove gogoloco from my avatar?* [Message sur un forum en ligne]. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
