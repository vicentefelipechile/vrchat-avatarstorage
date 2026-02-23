# VRCQuestTools

<span class="badge">OUTIL</span>

## Qu'est-ce que c'est ?
VRCQuestTools est une extension Unity développée par **kurotu** qui permet de convertir des avatars VRChat conçus pour PC vers la plateforme Android (Meta Quest/PICO). Cet outil automatise le processus de rendu d'un avatar compatible avec les strictes limitations de performance des appareils mobiles.

> [!NOTE]
> VRCQuestTools fonctionne via le système **Non-Destructive Modular Framework (NDMF)** dans ses versions les plus récentes, ce qui permet de traiter l'avatar sans modifier les fichiers originaux.

## À quoi ça sert ?
- Convertir des avatars PC vers Android en quelques clics
- Réduire automatiquement les polygones et les matériaux
- Supprimer les composants non compatibles avec Quest (Lights, Cloth, etc.)
- Ajuster les textures et les matériaux pour optimiser les performances
- Divers utilitaires pour télécharger des avatars sur Quest

> [!WARNING]
> IMPORTANT : Les avatars VRoid Studio ne sont pas compatibles avec Android en raison de leur utilisation intensive de matériaux transparents. VRCQuestTools ne peut pas vous aider avec ces avatars ; vous devez les modifier manuellement.

## Exigences环境

| Exigence | Version minimale |
|----------|------------------|
| Unity | 2019.4.31f1, 2022.3.6f1 ou 2022.3.22f1 |
| VRChat SDK | Avatars 3.3.0 ou ultérieure |
| Module Android Build Support | Installé dans Unity |

## Où l'obtenir ?
- **Page officielle :** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **Documentation :** [Documentation VRCQuestTools](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub :** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth (Don) :** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## Comment l'installer ?

### Installation via VCC (VRChat Creator Companion)

1. Ajoutez le dépôt à VCC :
   - Cliquez : [Ajouter VRCQuestTools à VCC](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - Ou allez dans **Settings** → **Packages** → **Add Repository**, collez l'URL `https://kurotu.github.io/vpm-repos/vpm.json` et cliquez sur **Add**
2. Allez dans **Manage Project** pour votre projet
3. Dans la liste des paquets, recherchez **VRCQuestTools** et cliquez sur **[+]** pour l'ajouter
4. Cliquez sur **Open Project** dans VCC

## Comment convertir un avatar pour Android ?

### Méthode rapide (Non destructive avec NDMF)

1. Faites un clic droit sur votre avatar dans la hiérarchie Unity
2. Sélectionnez **VRCQuestTools** → **Convert Avatar For Android**
3. Dans la fenêtre qui s'ouvre, cliquez sur **Begin Converter Settings** puis sur **Convert**
4. Attendez que la conversion soit terminée
5. Allez dans **File** → **Build Settings**
6. Sélectionnez la plateforme **Android** et cliquez sur **Switch Platform**
7. Attendez qu'Unity change de plateforme
8. Téléchargez l'avatar converti sur VRChat

> [!TIP]
> L'avatar original est désactivé après la conversion. Vous pouvez le réactiver depuis l'Inspector si nécessaire.

> [!NOTE]
> L'avatar converti **n'optimise pas automatiquement les performances**. Dans la plupart des cas, l'avatar converti aura la classification **Very Poor** pour Android. Utilisez le paramètre Avatar Display (Afficher l'avatar) pour le voir quand même.

## Limites de performance Quest

| Métrique | Excellent | Good | Medium | Poor | Very Poor |
|----------|-----------|------|--------|------|-----------|
| **Triangles** | 7,500 | 10,000 | 15,000 | 20,000 | >20,000 |
| **Material Slots** | 1 | 1 | 1 | 2 | >2 |
| **Skinned Meshes** | 1 | 1 | 1 | 2 | >2 |
| **PhysBones** | 2 | 4 | 6 | 8 | >8 |

> [!NOTE]
> Par défaut, le niveau **Minimum Displayed Performance Rank** sur les appareils mobiles est défini sur **Medium**. Cela signifie que les avatars classés comme Poor ou Very Poor ne seront pas visibles pour les autres utilisateurs, sauf s'ils choisissent d'afficher manuellement votre avatar.

Pour plus d'informations sur le système de classement des performances, consultez la [documentation officielle VRChat](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/).

## Relation avec d'autres outils

- **[Modular Avatar](/wiki?topic=modular-avatar)** : Si vous utilisez Modular Avatar ou d'autres outils NDMF, la conversion sera complètement non destructive.
- **[VRCFury](/wiki?topic=vrcfury)** : VRCFury peut vous aider à préparer les animations et gestes avant la conversion.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)** : Assurez-vous que les shaders sont compatibles avec Android après la conversion.

---

## Références

kurotu. (s. f.). *VRCQuestTools - Avatar Converter and Utilities for Android*. GitHub Pages. Récupéré de https://kurotu.github.io/VRCQuestTools/

kurotu. (s. f.). *Introduction*. VRCQuestTools Docs. Récupéré de https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). *kurotu/VRCQuestTools* [Logiciel]. GitHub. Récupéré de https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). *Performance Ranks*. VRChat Creator Documentation. Récupéré de https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
