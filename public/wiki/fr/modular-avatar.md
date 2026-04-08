# Modular Avatar

<span class="badge">OUTIL</span>

## Qu'est-ce que c'est ?

Modular Avatar est une suite d'outils **non destructifs** pour modulariser vos avatars VRChat et distribuer des composants d'avatar. Avec Modular Avatar, ajouter une nouvelle outfit ou gimmick à votre avatar est aussi simple que de glisser-déposer.

> [!NOTE]
> Modular Avatar fonctionne grâce au système **Non-Destructive Modular Framework (NDMF)**, qui traite l'avatar au moment de la construction sans modifier vos fichiers originaux.

## À quoi ça sert ?

- Installation de vêtements et accessoires en un clic via **drag-and-drop**
- Organisation des animateurs : divisez le FX animator en plusieurs sous-animateurs et fusionnez-les à l'exécution
- Configuration automatique des menus VRChat
- Système de **toggles** pour activer/désactiver les objets et blenshapes
- Composants réactifs qui répondent aux changements de l'avatar
- Distribution de prefabs avec installation automatique

## Principales fonctionnalités

| Fonctionnalité                  | Modular Avatar      | VRCFury       |
| ------------------------------- | ------------------- | ------------- |
| **Installation d'outfits**      | Oui (drag-and-drop) | Oui (un clic) |
| **Système de toggles**          | Oui (avancé)        | Oui (basique) |
| **Organisation des animateurs** | Oui (fusion)        | Non           |
| **Menus automatiques**          | Oui (complet)       | Oui (basique) |
| **Processus non destructif**    | Oui (NDMF)          | Oui           |
| **Blenshape sync**              | Oui                 | Non           |
| **Bone proxy**                  | Oui                 | Non           |

### Descriptions des composants

| Composant           | Description                                                                                                                                                                  |
| ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Merge Armature**  | Fusionne les armatures de prefabs dans l'avatar parent, courant pour ajouter des vêtements. MA minimise le nombre d'os créés, réutilisant les os existants lorsque possible. |
| **Merge Animator**  | Fusionne les sous-animateurs dans l'avatar parent, utile pour différents types de gimmicks d'avatar.                                                                         |
| **Object Toggle**   | Crée des éléments de menu pour activer ou désactiver les objets. Peut également mettre à jour les blenshapes lors du toggle.                                                 |
| **Blendshape Sync** | Synchronise les blenshapes des vêtements ou accessoires avec l'avatar de base lorsque vous ajustez la forme du corps.                                                        |
| **Bone Proxy**      | Permet d'ajouter des props uniques comme des armes ou des effets spéciaux directement attachés aux os de l'avatar.                                                           |
| **Menu System**     | Système complet de menus pour éditer votre avatar depuis le menu VRChat.                                                                                                     |

> [!TIP]
> Modular Avatar est particulièrement utile lorsque vous souhaitez distribuer des vêtements ou accessoires en tant que prefabs. Les utilisateurs n'ont qu'à glisser le prefab sur leur avatar et MA s'occupe de tout automatiquement.

## Où l'obtenir ?

- **Page Officielle :** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **Documentation :** [Documentation Modular Avatar](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub :** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord :** [Communauté Discord](https://discord.gg/dV4cVpewmM)

## Comment installer ?

### Installation via VCC (VRChat Creator Companion)

1. Ajoutez le dépôt à VCC :
   - Cliquez : [Add Modular Avatar to VCC](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - Ou allez dans **Settings** → **Packages** → **Add Repository**, collez l'URL `https://vpm.nadena.dev/vpm.json` et cliquez sur **Add**
2. Allez dans **Manage Project** de votre projet
3. Dans la liste des paquets, recherchez **Modular Avatar** et cliquez sur **[+]** pour l'ajouter
4. Cliquez sur **Open Project** dans VCC

## Comment l'utiliser ?

### Créer un toggle basique

1. Faites un clic droit sur votre avatar dans Unity
2. Sélectionnez **Modular Avatar → Create Toggle**
3. Un nouveau GameObject sera créé avec les composants **Menu Item**, **Menu Installer** et **Object Toggle**
4. Dans le composant **Object Toggle**, cliquez sur le bouton **+** pour ajouter une entrée
5. Faites glisser l'objet que vous voulez toggler vers le champ vide
6. C'est fait ! Le toggle apparaîtra automatiquement dans le menu de votre avatar

### Installer une outfit

1. Faites glisser le prefab de l'outfit sur votre avatar
2. Faites un clic droit sur l'outfit et sélectionnez **ModularAvatar → Setup Outfit**
3. MA configurera automatiquement l'armature et les animations

> [!TIP]
> Vous pouvez voir le tutoriel officiel dans la [documentation Modular Avatar](https://modular-avatar.nadena.dev/docs/tutorials).

## Relation avec d'autres outils

> [!TIP]
> Consultez le tableau comparatif ci-dessus pour voir les différences entre Modular Avatar et VRCFury.

Modular Avatar et VRCFury sont des **outils complémentaires**. De nombreuses outfits modernes incluent le support des deux. Consultez la documentation de l'outfit pour voir quelle méthode le créateur recommande.

- **[VRCFury](/wiki?topic=vrcfury)** : Se concentre sur l'installation des animations et gestes.
- **NDMF (Non-Destructive Modular Framework)** : Framework de base qui permet le traitement non destructif. Il est installé automatiquement avec Modular Avatar.

---

## Références

Modular Avatar. (s. f.). _Modular Avatar_. Nadena Dev. Récupéré de https://modular-avatar.nadena.dev/

Modular Avatar. (s. f.). _Tutorials_. Nadena Dev. Récupéré de https://modular-avatar.nadena.dev/docs/tutorials

bd\_. (2026). _bdunderscore/modular-avatar_ [Logiciel]. GitHub. Récupéré de https://github.com/bdunderscore/modular-avatar
