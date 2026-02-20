# Poiyomi Toon Shader

<span class="badge badge-blue">DÉPENDANCE</span>

## Qu'est-ce que c'est ?
Poiyomi est un shader pour Unity conçu spécifiquement pour VRChat. Il permet de créer des apparences stylisées et cartoon sur les avatars avec des effets visuels avancés.

## À quoi ça sert ?
- Ombrage stylisé personnalisable (toon, réaliste, plat)
- Effets spéciaux : contours, décalcomanies, paillettes, étincelles
- Support AudioLink (effets réactifs au son)
- Réflexions et spéculaire physiquement précis
- Optimisé pour les performances VRChat

> [!WARNING]
> TRÈS IMPORTANT
> Poiyomi n'est PAS inclus dans les fichiers d'avatar que vous téléchargez. Vous devez l'installer vous-même dans Unity AVANT d'ouvrir l'avatar.

## Où l'obtenir ?
- **Site officiel (Téléchargements):** [poiyomi.com/download](https://poiyomi.com/download)
- **Version gratuite:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Version Pro:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## Comment l'installer ?

Actuellement, il existe deux méthodes principales pour installer Poiyomi dans votre projet. La méthode recommandée par la communauté VRChat est d'utiliser **VCC (VRChat Creator Companion)**, mais vous pouvez également utiliser l'importation classique de **UnityPackage**.

### Méthode 1 : Installation via VCC (Recommandé)

L'utilisation de VCC (VRChat Creator Companion) est le moyen le plus propre et le plus recommandé d'installer et de gérer Poiyomi, car il vous permet de mettre à jour facilement le shader directement depuis l'application.

1. **Ajouter le dépôt à VCC :**
   - Le moyen le plus simple est d'aller sur la page de téléchargement officielle : [poiyomi.com/download](https://poiyomi.com/download).
   - Faites défiler jusqu'à "Method 2", trouvez la section **Creator Companion (VCC)** et cliquez sur le bouton **"Add to VCC"**.
   - Votre navigateur demandera l'autorisation d'ouvrir VCC. Acceptez, et une fois dans VCC, cliquez sur **"I Understand, Add Repository"**.
   - *(Alternative manuelle)* : Ouvrez VCC, allez dans **Settings** -> onglet **Packages** -> **Add Repository**, collez l'URL `https://poiyomi.github.io/vpm/index.json` dans l'espace correspondant et cliquez sur **Add**.
2. **Ajouter le shader à votre projet :**
   - Dans VCC, accédez à la section des projets et cliquez sur **Manage Project** sur le projet VRChat où vous souhaitez installer le shader.
   - Dans la section **Selected Repos** (menu latéral ou liste déroulante supérieure des dépôts), assurez-vous que **"Poiyomi's VPM Repo"** est coché.
   - Dans la liste des paquets disponibles pour le projet, recherchez **"Poiyomi Toon Shader"** et cliquez sur l'icône **[+]** à droite pour l'ajouter.
3. **Terminé !** Vous pouvez maintenant cliquer sur **Open Project** dans VCC, et Poiyomi sera disponible dans votre projet Unity.

> [!NOTE]
> Si la fenêtre se ferme inopinément lors de l'installation via VCC, c'est normal. Pour corriger cela, fermez simplement VCC, rouvrez-le et réessayez l'installation via VCC ; vous verrez que cela fonctionne correctement maintenant.

### Méthode 2 : Installation manuelle via .unitypackage

C'est la méthode classique. Gardez à l'esprit qu'il est plus difficile à mettre à jour à l'avenir et peut laisser des fichiers résiduels si vous essayez de passer à la méthode VCC plus tard.

1. Téléchargez le dernier fichier `.unitypackage` depuis la page des versions sur [GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases) ou depuis votre compte [Patreon](https://www.patreon.com/poiyomi) si vous utilisez la version Pro.
2. Ouvrez le projet Unity où vous prévoyez d'importer votre avatar.
3. Dans la fenêtre Unity, importez le paquet en allant dans le menu supérieur : **Assets** → **Import Package** → **Custom Package...**
4. Sélectionnez le fichier `.unitypackage` que vous venez de télécharger sur votre ordinateur.
5. Une fenêtre apparaîtra montrant une liste de tous les fichiers à importer. Assurez-vous que tout est sélectionné (vous pouvez utiliser le bouton "All") et cliquez sur le bouton inférieur **Import**.
6. Attendez que la barre de progression se termine, et l'installation sera terminée. Poiyomi sera prêt à être assigné aux matériaux de votre projet.

---

## Références

Poiyomi. (s.d.). *Download*. Poiyomi Shaders. Récupéré de https://poiyomi.com/download

Poiyomi. (s.d.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Récupéré de https://github.com/poiyomi/PoiyomiToonShader
