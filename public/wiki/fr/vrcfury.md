# VRCFury

<span class="badge">OPTIONNEL</span>

## Qu'est-ce que c'est ?
VRCFury est un plugin Unity gratuit qui simplifie grandement la configuration des avatars VRChat. Il facilite l'installation de vêtements, accessoires, gestes et animations sans éditer manuellement les contrôleurs d'animation.

## À quoi ça sert ?
- Installation en un clic de vêtements et accessoires
- Configuration automatique des gestes et animations
- Génération automatique des menus VRChat
- Non destructif : ne modifie pas vos fichiers originaux
- Optimiseur de blendshapes (supprime ceux non utilisés)

> [!NOTE]
> Note
> VRCFury est un outil OPTIONNEL mais fortement recommandé. Certains avatars en ont besoin pour fonctionner correctement. Si un avatar en a besoin, cela sera indiqué dans la description.

## Où l'obtenir ?
- **Site officiel (Téléchargements):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## Comment l'installer ?

Comme beaucoup d'outils VRChat modernes, il existe deux méthodes pour installer VRCFury. La méthode officiellement recommandée est d'utiliser **VCC (VRChat Creator Companion)**.

### Méthode 1 : Installation via VCC (Recommandé)

L'utilisation de VCC garantit que VRCFury est toujours à jour et ne cause pas de problèmes de compatibilité lors de l'utilisation de plusieurs projets.

1. **Ajouter le dépôt à VCC :**
   - Allez sur la page de téléchargement officielle : [vrcfury.com/download](https://vrcfury.com/download/).
   - À l'étape 1 ("Install VRChat Creator Companion"), si vous avez déjà installé VCC, vous pouvez l'ignorer. À l'étape 2, cliquez sur le bouton **"Click Here to add VRCFury to VCC"**.
   - Votre navigateur demandera l'autorisation d'ouvrir VCC. Acceptez, et une fois dans VCC, cliquez sur **"I Understand, Add Repository"**.
   - *(Alternative manuelle)* : Ouvrez VCC, allez dans **Settings** -> onglet **Packages** -> **Add Repository**, collez l'URL `https://vcc.vrcfury.com` dans l'espace correspondant et cliquez sur **Add**.
2. **Ajoute VRCFury à votre projet :**
   - Dans VCC, allez dans la liste de vos projets et cliquez sur **Manage Project** sur le projet que vous utilisez.
   - Dans la liste des dépôts à gauche (ou en haut à droite), assurez-vous que **"VRCFury Repo"** est coché.
   - Dans la liste des paquets disponibles pour votre projet, recherchez **"VRCFury"** et cliquez sur l'icône **[+]** à droite pour l'ajouter à votre projet.
3. **Terminé !** Cliquez sur **Open Project** dans VCC et les prefabs avec VRCFury s'installeront ou se configureront automatiquement lors du téléchargement de votre avatar ou de leur ajout dans la scène.

> [!NOTE]
> Si la fenêtre se ferme inopinément lors de l'installation via VCC, c'est normal. Pour corriger cela, fermez simplement VCC, rouvrez-le et répétez le processus ; vous verrez que cela fonctionne correctement maintenant.

### Méthode 2 : Installation manuelle via .unitypackage (Obsolète)

Cette méthode n'est plus recommandée et est considérée comme obsolète (Legacy), mais il est toujours possible de l'utiliser si vous rencontrez des problèmes avec VCC.

1. Téléchargez le fichier d'installation de VRCFury au format `.unitypackage` depuis la section des téléchargements sur [GitHub](https://github.com/VRCFury/VRCFury/releases).
2. Ouvrez le projet Unity où vous prévoyez de travailler sur votre avatar.
3. Dans le menu supérieur de Unity, allez dans **Assets** → **Import Package** → **Custom Package...**
4. Sélectionnez le fichier `.unitypackage` de VRCFury que vous venez de télécharger.
5. Assurez-vous que tous les fichiers sont sélectionnés dans la fenêtre contextuelle et cliquez sur **Import**.
6. VRCFury sera installé, et un nouveau menu apparaîtra dans la barre supérieure appelé **Tools > VRCFury**. (De là, vous pouvez le mettre à jour si vous utilisez cette méthode manuelle).

---

## Références

VRCFury. (s.d.). *Download*. VRCFury. Récupéré de https://vrcfury.com/download/

VRCFury. (s.d.). *VRCFury*. GitHub. Récupéré de https://github.com/VRCFury/VRCFury
