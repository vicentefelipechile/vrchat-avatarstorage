# Inside View

<span class="badge badge-blue">Visuel</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## Qu'est-ce que c'est ?
**Inside View**, créé par **Liindy** [1], est un asset pour les avatars VRChat qui permet de voir l'intérieur d'un maillage (comme un orifice SPS) en ajoutant une profondeur visuelle simulée.

Contrairement à la simple suppression des faces arrière du maillage (backface culling), Inside View utilise un "Screen Shader" qui projette une texture de profondeur à l'intérieur de l'orifice, créant une illusion d'intérieur réaliste sans avoir besoin de modéliser une géométrie interne complexe. Il est couramment utilisé avec des systèmes comme [SPS](/wiki?topic=sps) pour améliorer la visualisation pendant le ERP.

## Caractéristiques Principales
- **Profondeur Simulée :** Crée l'illusion d'un tunnel ou d'un intérieur détaillé.
- **Optimisé :** Utilise des shaders pour éviter une géométrie supplémentaire lourde.
- **Intégration SPS :** Conçu pour fonctionner conjointement avec les pénétrations SPS [3].
- **Installation Facile :** Compatible avec **VRCFury** pour une configuration "glisser-déposer".

## Prérequis
- **Unity :** Version recommandée pour VRChat (actuellement 2022.3.22f1 ou similaire) [1].
- **VRChat SDK 3.0 :** (Avatars) Téléchargé via VCC [1].
- **VRCFury :** Nécessaire pour l'installation automatique.
- **Poiyomi Toon Shader :** (Optionnel mais recommandé) Version 8.1 ou supérieure pour la compatibilité des matériaux [2].

## Guide d'Installation

> [!NOTE]
> Ce guide suppose l'utilisation de **VRCFury**, qui est la méthode officielle recommandée par le créateur.

### Étape 1 : Importer
Une fois le paquet acquis (gratuit ou payant) sur Jinxxy ou Gumroad :
1. Ouvrez votre projet Unity avec le SDK et VRCFury déjà installés.
2. Importez le `.unitypackage` de **Inside View**.

### Étape 2 : Placement (VRCFury)
1. Cherchez le préfabriqué Inside View dans le dossier de l'asset (généralement `Assets/Liindy/Inside View`).
2. Faites glisser le préfabriqué et déposez-le dans la hiérarchie de votre avatar.
   - **Important :** Placez-le en tant qu'"enfant" de l'os ou de l'objet où se trouve l'orifice (ou le Socket SPS).
3. Assurez-vous que l'objet "Socket" SPS et "Inside View" sont alignés sur la même position et rotation.

### Étape 3 : Configuration de la Profondeur
L'asset fonctionne via une animation de profondeur (Depth Animation).
1. Sélectionnez le composant VRCFury sur le préfabriqué Inside View.
2. Vérifiez qu'il pointe vers le bon **Renderer** (maillage) de votre orifice.
3. Lors du téléchargement de l'avatar, VRCFury fusionnera automatiquement les menus et la logique nécessaires.

### Notes Supplémentaires
- **Coût des Paramètres :** La version "Full" peut utiliser jusqu'à 35 bits de mémoire de paramètres, tandis que la version "Standard" en utilise environ 17. Gardez cela à l'esprit si votre avatar a déjà beaucoup de paramètres [1].
- **Backface Culling :** Assurez-vous que le matériau de votre orifice a le "Cull" réglé sur "Off" ou "Back" selon les instructions du shader pour que l'effet soit visible sous le bon angle.

---

## Références

[1] Liindy. (n.d.). *Inside View (VRCFury)*. Jinxxy. https://jinxxy.com/Liindy/InsideView

[2] Liindy. (n.d.). *Inside View*. Gumroad. https://jinxxy.com/Liindy/InsideView
