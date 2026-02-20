# Menu d'Actions (Action Menu)

<span class="badge badge-blue">Logic</span> <span class="badge badge-purple">Workflow</span>

## Introduction
Le **Menu d'Actions** (également connu sous le nom d'Expression Menu) est le menu radial que vous utilisez dans VRChat pour déclencher des animations, changer de vêtements ou modifier les paramètres de votre avatar [1].

Traditionnellement, les créateurs téléchargent l'avatar sur VRChat chaque fois qu'ils souhaitent tester un petit changement, ce qui prend beaucoup de temps. Heureusement, il existe des outils qui permettent de simuler ce menu **directement dans Unity**, vous permettant de voir instantanément comment fonctionnent vos commutateurs (toggles) et vos curseurs (sliders).

---

## Outils de Simulation

Il existe deux outils principaux recommandés par la communauté et compatibles avec le **VRChat Creator Companion (VCC)**.

### 1. Gesture Manager (par BlackStartx)
C'est l'outil le plus populaire pour visualiser le menu radial tel qu'il apparaît dans le jeu. Il permet de tester les gestes, les contacts et les paramètres de manière intuitive.

> [!NOTE]
> Pour un guide détaillé sur son installation et toutes ses fonctions, consultez notre article dédié : **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (par Lyuma)
Cet outil est plus technique et puissant, idéal pour déboguer la logique complexe derrière l'avatar.

*   **Installation :** Disponible dans le VCC ou via GitHub. Il est souvent installé automatiquement avec des outils comme [VRCFury](/wiki?topic=vrcfury) [3].
*   **Comment l'utiliser :**
    1.  Allez dans `Tools` > `Avatar 3.0 Emulator`.
    2.  En entrant en **Play Mode**, un panneau de contrôle sera généré.
    3.  Il permet de forcer les valeurs des [paramètres](/wiki?topic=parameter) et de voir en temps réel quelle couche de l'Animator est en cours de lecture.

---

## Lequel dois-je utiliser ?

| Caractéristique | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Interface Visuelle** | Excellente (Radial) | Basique (Boutons/Sliders) |
| **Test de Menus** | Oui | Limité |
| **Débogage de Logique** | Basique | Avancé |
| **Test de Gestes** | Facile (Boutons) | Manuel (Animator) |

**Recommandation :** Utilisez **Gesture Manager** pour la plupart de vos tests de commutateurs et de vêtements. Utilisez **Av3 Emulator** si vos animations ne se déclenchent pas comme elles le devraient et que vous avez besoin de voir ce qui se passe "sous le capot".

---

## Build & Test (L'alternative officielle)
Si vous devez tester quelque chose qui nécessite le réseau ou des interactions avec d'autres (comme les [PhysBones](/wiki?topic=parameter)), utilisez la fonction **Build & Test** du SDK officiel [1] :
1.  Ouvrez le `VRChat SDK Control Panel`.
2.  Dans l'onglet `Builder`, recherchez la section "Offline Testing".
3.  Cliquez sur `Build & Test`.
4.  Unity compilera l'avatar et ouvrira une instance locale de VRChat où vous seul pourrez le voir sans l'avoir téléchargé sur les serveurs.

---

## Références

[1] VRChat. (s.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[2] BlackStartx. (s.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[3] Lyuma. (s.d.). *Av3Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
