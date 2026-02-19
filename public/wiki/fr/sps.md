# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Qu'est-ce que c'est ?
**SPS** (Super Plug Shader), parfois appelé familièrement "SSP", est un système de déformation de maillage gratuit et moderne pour VRChat. Il permet aux parties de l'avatar de se déformer de manière réaliste lors de l'interaction avec d'autres avatars ou objets, remplaçant les anciens systèmes payants comme **DPS** (Dynamic Penetration System).

## À quoi ça sert ?
- **Déformation réaliste :** Simule la pénétration et le contact physique en déformant le maillage de l'avatar.
- **Optimisation :** Il est beaucoup plus léger et efficace que les anciens systèmes.
- **Gratuit :** Contrairement à DPS, SPS est entièrement gratuit et open source.
- **Compatibilité :** Fonctionne avec la plupart des shaders modernes (Poiyomi, LilToon, etc.).

## Où l'obtenir ?
SPS est intégré et géré principalement via **VRCFury**. Vous n'avez pas besoin de télécharger manuellement un "shader" séparé si vous utilisez VRCFury.

- [VRCFury (Inclut SPS)](https://vrcfury.com)
- [Guide officiel de SPS](https://vrcfury.com/sps)

## Comment l'installer ?
L'installation se fait presque entièrement dans Unity en utilisant **VRCFury** :

1. Assurez-vous d'avoir **VRCFury** installé dans votre projet (voir guide VRCFury).
2. Sur votre avatar, sélectionnez l'objet maillage (mesh) ou l'os où vous souhaitez ajouter le composant.
3. Ajoutez un composant **VRCFury** à l'objet.
4. Dans le composant VRCFury, recherchez et ajoutez l'accessoire **SPS Plug** (pour le pénétrateur) ou **SPS Socket** (pour l'orifice).
5. Configurez les paramètres (taille, type) directement dans le composant.
6. C'est fait ! Lors du téléchargement de l'avatar, VRCFury générera automatiquement toutes les animations, menus et logique nécessaires.

> [!TIP]
> Compatibilité avec DPS
> SPS est capable d'interagir avec des avatars utilisant l'ancien DPS. Vous n'avez pas besoin que l'autre personne ait SPS pour que cela fonctionne.
