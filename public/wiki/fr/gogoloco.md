# Gogo Loco

<span class="badge">RECOMMANDÉ</span>

## Qu'est-ce que c'est ?
Gogo Loco est un système de locomotion avancé pour les avatars VRChat créé par **franada** [1]. Il permet aux utilisateurs de bureau et VR sans "full body tracking" d'accéder à des fonctionnalités de pose, de vol et d'ajustement d'avatar qui ne seraient normalement pas disponibles.

## À quoi ça sert ?
- **Poses statiques :** Permet de s'asseoir, de s'allonger et d'effectuer diverses poses artistiques n'importe où.
- **Simulation Full Body :** Inclut des animations qui simulent le port de capteurs aux jambes.
- **Vol :** Permet de voler dans des mondes qui ont des collisions ou des restrictions de saut.
- **Ajustement de la hauteur :** Permet de redimensionner la taille de votre avatar dans le jeu.
- **Mode Stationnaire :** Permet de déplacer votre avatar visuellement sans vous déplacer physiquement (utile pour les photos).

> [!NOTE]
> Note
> Bien qu'il puisse être installé manuellement, il est fortement recommandé d'utiliser **VRCFury** pour faciliter l'installation et éviter les conflits avec d'autres menus.

## Où l'obtenir ?
- [GitHub - Gogo Loco (Gratuit)](https://github.com/franada/gogo-loco)
- [Gumroad - Gogo Loco (Soutenir le créateur)](https://franadavrc.gumroad.com/l/gogoloco)

## Peut-on l'ajouter à des modèles qui ne l'ont pas ?
Oui, **Gogo Loco** peut être ajouté à pratiquement n'importe quel avatar, à condition qu'il remplisse une condition principale :
- **Ce doit être un avatar humanoïde** (ou avoir le squelette configuré comme humanoïde dans Unity).

Les avatars "génériques" ou non humanoïdes (comme des objets flottants, des araignées complexes sans squelette humain, etc.) peuvent avoir des problèmes ou ne pas fonctionner correctement, car Gogo Loco manipule des os humains spécifiques (hanches, jambes, dos).

## Prérequis
Avant de commencer, assurez-vous d'avoir les éléments suivants :
- **Unity :** La version recommandée pour VRChat (actuellement quelque chose comme 2022.3.22f1).
- **VRChat SDK :** Installé dans votre projet (VCC).
- **Gogo Loco :** Le paquet `.unitypackage` téléchargé (version gratuite ou payante).
- **VRCFury (Optionnel mais recommandé) :** Pour une installation facile.
- **Avatar 3.0 Manager (Optionnel) :** Pour l'installation manuelle.

## Guide d'Installation Étape par Étape

Il existe deux méthodes principales pour installer Gogo Loco sur votre avatar. Choisissez celle qui correspond le mieux à vos besoins.

---

### Méthode 1 : Utiliser VRCFury (Recommandé et Facile)
C'est la méthode la plus simple, automatisée et la moins sujette aux erreurs [3].

1. **Installer VRCFury :** Assurez-vous d'avoir **VRCFury** installé dans votre projet via le VRChat Creator Companion (VCC).
2. **Importer Gogo Loco :** Faites glisser le fichier `.unitypackage` de Gogo Loco dans le dossier `Assets` de votre projet, ou double-cliquez dessus pour l'importer.
3. **Trouver le Prefab :**
   - Dans la fenêtre `Project` de Unity, naviguez vers le dossier : `Assets/GoGo/Loco/Prefabs`.
   - Cherchez le prefab nommé **GoGo Loco Beyond**.
     - *Note :* "Beyond" inclut les fonctionnalités de vol, d'échelle et de poses. Si vous ne voulez que certaines fonctionnalités, explorez les autres dossiers.
4. **Installer sur l'Avatar :**
   - Faites glisser le prefab **GoGo Loco Beyond** et **déposez-le directement sur votre avatar** dans la hiérarchie (`Hierarchy`). Le prefab doit devenir un "enfant" (child) de votre avatar.
   - C'est tout ! Vous n'avez besoin de rien configurer d'autre.
5. **Mettre en ligne :** Lors de la mise en ligne de votre avatar sur VRChat, VRCFury détectera le prefab et fusionnera automatiquement tous les contrôleurs, menus et paramètres nécessaires.

---

### Méthode 2 : Installation Manuelle avec Avatar 3.0 Manager
Si vous préférez ne pas utiliser VRCFury ou avez besoin d'un contrôle total, utilisez cet outil pour éviter les erreurs humaines lors de la copie des paramètres et des calques [4].

1. **VRLabs Avatar 3.0 Manager :** Téléchargez et importez cet outil gratuit (disponible sur GitHub ou VCC).
2. **Importer Gogo Loco :** Importez le paquet dans Unity.
3. **Ouvrir Avatar 3.0 Manager :** Allez dans le menu supérieur `VRLabs` -> `Avatar 3.0 Manager`.
4. **Sélectionner l'Avatar :** Faites glisser votre avatar dans le champ "Avatar" de l'outil.
5. **Fusionner les Contrôleurs (FX) :**
   - Dans la section "FX", développez les options.
   - Cliquez sur **"Add Animator to Merge"**.
   - Sélectionnez le contrôleur FX de Gogo Loco (généralement situé dans `GoGo/Loco/Controllers`).
   - Cliquez sur **"Merge on Current"**. Cela combinera les calques de Gogo Loco avec les vôtres sans écraser.
6. **Copier les Paramètres :**
   - Allez dans l'onglet **"Parameters"** du Manager.
   - Sélectionnez l'option **"Copy Parameters"**.
   - Sélectionnez la liste de paramètres de Gogo Loco comme source et copiez-les sur votre avatar.
7. **Ajouter le Menu :**
   - Allez dans le **VRChat Avatar Descriptor** de votre avatar dans l'Inspecteur.
   - Cherchez la section **Expressions Menu**.
   - Ouvrez votre menu principal (double-cliquez sur le fichier).
   - Ajoutez un nouveau contrôle (Control -> Add Control).
   - Nommez-le "Gogo Loco".
   - Type : **Sub Menu**.
   - Parameter : Aucun.
   - Sub Menu : Faites glisser le menu `GoGo Loco Menu` (ou `GoGo Loco All`) ici.
8. **Calques Action & Base (Optionnel) :**
   - Si vous voulez les animations personnalisées pour s'asseoir et "afk", répétez l'étape de fusion pour les calques **Action** et **Base** dans l'Avatar Descriptor.

> [!WARNING]
> Avertissement : Write Defaults
> Gogo Loco fonctionne généralement mieux avec **Write Defaults OFF** [1]. Si votre avatar utilise "Mixed Write Defaults" (un mélange de ON et OFF), vous pourriez rencontrer des comportements étranges. VRCFury corrige généralement cela automatiquement, mais en manuel vous devez faire attention.

---

## Références

[1] Franada. (s.d.). *Gogo Loco*. GitHub. https://github.com/franada/gogo-loco

[2] Franada. (s.d.). *Gogo Loco*. Gumroad. https://franadavrc.gumroad.com/l/gogoloco

[3] VRCFury. (s.d.). *VRCFury Documentation*. https://vrcfury.com

[4] VRLabs. (s.d.). *Avatar 3.0 Manager*. GitHub. https://github.com/VRLabs/Avatar-3.0-Manager
