# Guide Essentiel NSFW

<span class="badge badge-red">NSFW</span> <span class="badge">TOS</span> <span class="badge">OPTIMISATION</span>

## Introduction
VRChat permet une grande liberté de création, y compris pour le contenu adulte (NSFW) et le jeu de rôle érotique (ERP). Cependant, il est **CRUCIAL** de comprendre les règles et les outils appropriés pour profiter de ce contenu sans risquer votre compte ou la performance des autres.

## Règles de VRChat (TOS)
VRChat a une politique de tolérance zéro concernant certains contenus dans les espaces publics.

- **Mondes Publics :** Il est **strictement interdit** d'afficher du contenu sexuellement explicite, de la nudité ou un comportement érotique dans les instances publiques. Cela peut entraîner un **bannissement permanent**.
- **Mondes Privés :** Le contenu NSFW et l'ERP sont tolérés dans les instances privées (Friends+, Invite, etc.) où tous les participants sont adultes et ont donné leur consentement.
- **Avatars :** Vous pouvez télécharger des avatars NSFW, mais vous ne devez **PAS** utiliser leurs fonctions explicites en public. Utilisez le système de "Toggles" pour tout garder caché par défaut.

## Outils Essentiels
Pour une expérience complète, voici les outils standard que la plupart de la communauté utilise :

1.  **VRCFury :** L'outil "couteau suisse". Essentiel pour ajouter des Toggles, des vêtements et des systèmes complexes sans casser votre avatar.
    *   [Voir le guide VRCFury](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader) :** Le système standard pour l'interaction physique (pénétration et déformation). Il est gratuit et bien meilleur que l'ancien DPS.
    *   [Voir le guide SPS](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB) :** L'étalon-or pour connecter des jouets sexuels (Lovense) à VRChat via vibration haptique.
    *   [Voir le guide Haptiques](/wiki?topic=haptics)

## Optimisation et Mémoire de Texture
Les avatars NSFW ont tendance à être "lourds" en raison de la grande quantité de vêtements et de textures de peau de haute qualité.

- **VRAM (Mémoire Vidéo) :** C'est la ressource la plus rare. Si votre avatar utilise plus de 150 Mo de mémoire de texture, vous ferez planter (crash) les autres.
- **Compression :** Assurez-vous toujours de compresser vos textures dans Unity. Une texture 4K non compressée prend beaucoup de place.

## Contacts et PhysBones
L'interaction dans VRChat repose sur les **Contacts** (VRCContactReceiver et VRCContactSender).
- **Headpat (Caresse) :** Se fait en détectant la main sur la tête.
- **Interaction Sexuelle :** SPS et OGB utilisent des contacts pour détecter quand un objet entre dans un autre, déclenchant des animations, des sons ou des vibrations dans votre jouet réel.
