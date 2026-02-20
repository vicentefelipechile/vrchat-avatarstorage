# Gesture Manager Emulator

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## Qu'est-ce que le Gesture Manager ?
Le **Gesture Manager**, développé par **BlackStartx**, est un outil essentiel pour les créateurs d'avatars VRChat. Il permet de prévisualiser et de modifier les animations, les gestes et les menus d'un avatar directement dans Unity, éliminant ainsi le besoin de télécharger l'avatar dans le jeu pour tester chaque modification [1].

Il simule presque complètement le système d'animation de VRChat, y compris le **Menu Radial (Expressions Menu)**, ce qui permet de vérifier instantanément que vos commutateurs (toggles) et vos curseurs (sliders) fonctionnent correctement.

---

## Installation

Il existe deux méthodes principales pour installer cet outil dans votre projet.

### Méthode 1 : VRChat Creator Companion (Recommandée)
C'est le moyen le plus simple et cela garantit que vous avez toujours la version la plus récente compatible avec votre projet [2].
1. Ouvrez le **VRChat Creator Companion (VCC)**.
2. Sélectionnez votre projet.
3. Assurez-vous que les paquets "Curated" ne sont pas filtrés.
4. Recherchez **"Gesture Manager"** et cliquez sur le bouton **"Add"**.
5. Ouvrez votre projet Unity.

### Méthode 2 : Manuelle (Unity Package)
Si vous n'utilisez pas le VCC ou si vous avez besoin d'une version spécifique :
1. Téléchargez le fichier `.unitypackage` depuis la section *Releases* du GitHub de BlackStartx ou depuis sa page sur BOOTH [3].
2. Importez le paquet dans votre projet Unity (`Assets > Import Package > Custom Package`).

---

## Caractéristiques Principales

*   **Menu Radial 3.0 :** Recrée fidèlement le menu d'expressions de VRChat.
*   **Émulation de Gestes :** Permet de tester les gestes de la main gauche et de la main droite via des boutons dans l'inspecteur.
*   **Caméra de Scène Active :** Synchronise la caméra du jeu avec celle de la scène pour faciliter les tests de PhysBones et de Contacts.
*   **Test de Contacts :** Permet d'activer les *VRCContacts* en cliquant dessus avec la souris.
*   **Débogage de Paramètres :** Affiche une liste de tous les paramètres de l'avatar et leurs valeurs actuelles.

---

## Comment l'utiliser

1.  Une fois installé, allez dans la barre supérieure et sélectionnez `Tools > Gesture Manager Emulator`.
2.  Cela ajoutera un objet nommé `GestureManager` à votre hiérarchie.
3.  Entrez en **Play Mode** dans Unity.
4.  Sélectionnez l'objet `GestureManager` dans la hiérarchie.
5.  Dans la fenêtre de l'**Inspecteur**, vous verrez le menu radial et toutes les commandes pour tester votre avatar.

> [!IMPORTANT]
> Vous devez avoir sélectionné l'objet `GestureManager` pour voir les commandes dans l'inspecteur pendant l'exécution de Unity.

---

## Références

[1] BlackStartx. (s.d.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[2] VRChat. (s.d.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[3] VRChat. (s.d.). *VCC Documentation*. VRChat Creator Companion. https://vcc.docs.vrchat.com

[4] BlackStartx. (s.d.). *Gesture Manager*. Booth. https://blackstartx.booth.pm/items/3922472
