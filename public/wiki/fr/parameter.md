# Paramètres d'Avatar (Expression Parameters)

<span class="badge badge-blue">Logique</span> <span class="badge badge-yellow">Optimisation</span>

## Qu'est-ce que c'est ?
Les **Expression Parameters** (ou simplement paramètres) sont des variables qui servent de "mémoire" pour votre avatar VRChat [1]. Ils agissent comme un pont entre le **Menu d'Expressions** (le menu radial en jeu) et l'**Animator Controller** (la logique qui fait jouer les animations).

Lorsque vous sélectionnez une option dans votre menu (par ex. "Enlever chemise"), le menu change la valeur d'un paramètre (par ex. `Shirt = 0`), et l'Animator lit ce changement pour exécuter l'animation correspondante.

## Types de Paramètres
Il existe trois principaux types de données que vous pouvez utiliser, chacun avec un coût de mémoire différent [2] :

| Type | Description | Coût Mémoire | Usage Courant |
| :--- | :--- | :--- | :--- |
| **Bool** | Vrai ou Faux (On/Off). | 1 bit | Bascules simples (vêtements, accessoires). |
| **Int** | Entiers (0 à 255). | 8 bits | Changements de tenue avec multiples options, curseurs par étapes. |
| **Float**| Nombres décimaux (0.0 à 1.0). | 8 bits | Curseurs continus (épaisseur, teinte, radial puppet). |

## Limite de Mémoire (Synced Bits)
VRChat impose une limite stricte de **256 bits** de données synchronisées par avatar [2].
- **Synchronisés (Synced) :** Paramètres dont la valeur est envoyée aux autres joueurs via le réseau. Si vous enlevez votre chemise, vous voulez que les autres le voient.
- **Non Synchronisés (Local) :** Paramètres qui n'existent que sur votre PC. Utiles pour la logique interne qui n'a pas besoin d'être vue par les autres.

> [!WARNING]
> Si vous dépassez la limite de mémoire, vous ne pourrez pas télécharger l'avatar ou les paramètres supplémentaires cesseront de fonctionner. Optimisez en utilisant `Bool` au lieu de `Int` lorsque cela est possible.

## Usages Avancés
En plus de contrôler les vêtements depuis le menu, les paramètres peuvent être contrôlés par :
- **PhysBones :** Pour détecter si quelqu'un touche votre oreille ou vos cheveux [3].
- **Contacts :** Pour détecter les collisions (comme dans les systèmes [SPS](/wiki?topic=sps) ou [PCS](/wiki?topic=pcs)).
- **OSC :** Pour recevoir des données de programmes externes (comme des moniteurs de fréquence cardiaque, le suivi facial ou Spotify) [3].

## Comment les Créer
1. Dans votre projet Unity, faites un clic droit dans `Assets`.
2. Allez dans `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Ajoutez les paramètres dont vous avez besoin (par ex. "Outfit", "Sword", "HueShift").
4. Assignez ce fichier dans le composant **VRC Avatar Descriptor** de votre avatar, dans la section "Expressions".

## Limitations et Problèmes Courants

### Pourquoi existe-t-il une limite de 256 bits ?
VRChat impose cette limite principalement pour l'**optimisation du réseau** [1]. Chaque paramètre synchronisé doit être envoyé à tous les autres joueurs de l'instance. S'il n'y avait pas de limite :
- La bande passante nécessaire pour mettre à jour la position et l'état de 80 joueurs serait insoutenable.
- Les utilisateurs avec des connexions lentes souffriraient de lag extrême ou de déconnexions.
- La performance globale (FPS) chuterait en raison du traitement excessif des données réseau.

### Conflits avec des Assets Complexes (GoGo Loco, SPS, Danses)
En combinant plusieurs systèmes "lourds" sur un seul avatar, des problèmes fréquents surviennent :

1.  **Épuisement des Paramètres (Parameter Exhaustion) :**
    Des assets comme **GoGo Loco** consomment une quantité considérable de mémoire. Si vous essayez d'ajouter SPS, un système de danse complexe et des bascules de vêtements, il est très facile de dépasser les 256 bits synchronisés.
    *   *Conséquence :* VRChat bloquera le téléchargement de l'avatar ou les derniers composants installés ne fonctionneront pas.

2.  **Conflits de Logique :**
    *   **GoGo Loco :** Peut faire "couler" l'avatar dans le sol ou le faire flotter s'il y a des conflits avec les couches de locomotion de base ou d'anciennes versions de l'asset [4].
    *   **SPS (Super Plug Shader) :** Combiner SPS avec des Constraints peut causer des "jitter" (tremblements rapides) aux points de contact en raison de la façon dont VRChat gère les mises à jour physiques et haptiques [5].

3.  **Classement de Performance (Performance Rank) :**
    *   **SPS :** Nécessite souvent des lumières ou des renderers supplémentaires qui peuvent dégrader le classement de performance de l'avatar à "Very Poor" immédiatement.
    *   **GoGo Loco :** Ajoute plusieurs couches à l'Animator Controller. Bien que cela n'affecte pas autant les graphismes, cela augmente l'utilisation du CPU pour traiter la logique d'animation [4].

> [!TIP]
> Des outils comme **VRCFury** sont essentiels pour gérer ces conflits. VRCFury automatise la fusion des contrôleurs et des paramètres ("Non-Destructive Workflow"), réduisant les erreurs humaines et optimisant l'utilisation de la mémoire lorsque cela est possible.

## Optimisation et Astuces : Comment réduire l'utilisation de bits

Pour éviter d'atteindre la limite de 256 bits sans sacrifier les fonctionnalités, les créateurs utilisent plusieurs techniques intelligentes. La plus courante est de **combiner des états mutuellement exclusifs**.

#### L'Astuce de l'"Int Unique" (Single Int)
Imaginez que vous avez 10 chemises différentes pour votre avatar.
*   **Manière Inefficace (Bools) :** Vous créez 10 paramètres `Bool` (Chemise1, Chemise2... Chemise10).
    *   *Coût :* 10 Bits.
    *   *Désavantage :* Vous dépensez 1 bit pour chaque vêtement supplémentaire.
*   **Manière Efficace (Int) :** Vous créez **1** seul paramètre `Int` appelé `Top_Clothing`.
    *   *Coût :* 8 Bits (toujours, car c'est un Int).
    *   *Avantage :* Vous pouvez avoir jusqu'à **255 chemises** en utilisant les mêmes 8 bits !
    *   *Comment ça marche :* Dans l'Animator, vous configurez que si la valeur est 1, la Chemise A s'active ; si c'est 2, la Chemise B, etc.

> [!NOTE]
> **Règle d'or :** Si vous avez plus de 8 options qui ne peuvent pas être utilisées en même temps (par ex. types de vêtements, couleurs des yeux), utilisez un `Int`. Si moins de 8, utilisez des `Bool`s individuels.

#### Exemple de Configuration de Base
Si vous voulez créer un sélecteur de couleurs pour vos vêtements :
1.  Créez un paramètre **Int** appelé `ColorBoots`.
2.  Dans votre **Expression Menu**, créez un sous-menu ou un contrôle de type "Radial Puppet" (bien que pour des changements exacts, des boutons définissant des valeurs exactes soient préférables).
3.  Configurez les boutons du menu :
    *   Bouton "Rouge" -> Sets `ColorBoots` to 1.
    *   Bouton "Bleu" -> Sets `ColorBoots` to 2.
    *   Bouton "Noir" -> Sets `ColorBoots` to 3.
4.  Dans l'**Animator (FX Layer)** :
    *   Créez des transitions de `Any State` vers les états de couleur.
    *   Condition pour Rouge : `ColorBoots` equals 1.
    *   Condition pour Bleu : `ColorBoots` equals 2.

Ainsi, vous contrôlez plusieurs options en ne dépensant que 8 bits de votre budget total !

## Tableau Récapitulatif : Quelle type utiliser ?

| Cas d'Utilisation | Type Recommandé | Pourquoi ? |
| :--- | :--- | :--- |
| **Activer/Désactiver 1 objet** (Lunettes, chapeau) | `Bool` | Simple et direct. Coûte 1 bit. |
| **Sélecteur de Vêtements** (Chemise A, B, C...) | `Int` | Permet des centaines d'options en ne dépensant que 8 bits. |
| **Changements Graduels** (Épaisseur, Couleur, Luminosité) | `Float` | Nécessaire pour les valeurs décimales (0.0 à 1.0). |
| **États Complexes** (Danses, AFK, Emotes) | `Int` | Idéal pour les machines à états avec de multiples conditions. |
| **Bascules Indépendantes** (< 8 objets) | `Bool` | S'ils sont peu nombreux et ne s'annulent pas, c'est plus facile à configurer. |

---

## Références

[1] VRChat. (n.d.). *Expression Parameters*. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset

[2] VRChat. (n.d.). *Avatar Parameter Driver*. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver

[3] VRChat. (n.d.). *OSC Overview*. VRChat Documentation. https://creators.vrchat.com/avatars/osc/

[4] Franada. (n.d.). *GoGo Loco Documentation*. https://github.com/Franada/goloco

[5] VRCFury. (n.d.). *SPS - Super Plug Shader*. VRCFury Documentation. https://vrcfury.com/sps
