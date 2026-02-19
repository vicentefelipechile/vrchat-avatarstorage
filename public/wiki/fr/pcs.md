# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">Audio</span>

## Qu'est-ce que c'est ?
**PCS** (Penetration Contact System), créé par **Dismay** [1], est un système complémentaire pour les avatars VRChat qui utilise les **Contacts** (Contact Senders et Receivers) pour ajouter une interactivité avancée aux relations sexuelles (ERP).

Sa fonction principale est de générer un **retour auditif** (sons). En option, il permet de contrôler de vrais sex toys via vibration (Haptique) [3][4].

### Différence Clé
- **Sans OSC (Basique) :** Le système joue des sons de "claque", "glissement" et de fluides à l'intérieur du jeu. Tous ceux qui sont à proximité peuvent l'entendre. Il fonctionne de manière autonome dans VRChat [1].
- **Avec OSC (Avancé/Optionnel) :** Envoie des données hors de VRChat pour faire vibrer des sex toys (Lovense, etc.) synchronisés avec la pénétration.

## Fonctionnalité de Base (Son)
C'est la fonction par défaut de PCS et **ne nécessite pas de logiciel externe**.

1. **Détection :** Les "Receivers" (orifices) détectent quand un "Sender" (pénis/pénétrateur) entre en eux.
2. **Son Dynamique :**
   - En frôlant l'entrée : Sons de frottement ou de "claque".
   - En pénétrant : Sons de friction/liquides ("squelch") qui varient en intensité selon la vitesse et la profondeur.
3. **Plug & Play :** Une fois installé sur l'avatar, il fonctionne automatiquement avec tout autre utilisateur ayant configuré ses "Senders" (ou si vous avez les "Receivers").

## Intégration OSC et Haptique (Optionnel)
**OSC** (Open Sound Control) est un protocole qui permet à VRChat de "parler" avec des programmes externes [3]. PCS utilise cela pour convertir l'action du jeu en vibrations réelles.

### Pourquoi cette intégration existe-t-elle ?
Pour augmenter l'immersion. Si vous avez un sex toy compatible, PCS "dit" au jouet quand et avec quelle intensité vibrer en fonction de la profondeur du pénétrateur dans le jeu.

### Prérequis pour l'Haptique
- **Jouet Compatible :** (Par ex. Lovense Hush, Lush, Max, etc.).
- **Logiciel Passerelle :** Un programme qui reçoit le signal de VRChat et contrôle le jouet.
  - *OscGoesBrrr* (Gratuit, populaire) [3].
  - *VibeGoesBrrr*.
  - *Intiface Central* (Moteur de connexion) [4].

### Configuration OSC
Vous n'avez besoin d'activer cela que si vous allez utiliser des jouets :
1. Dans VRChat, ouvrez le **Action Menu**.
2. Allez dans `Options` > `OSC` > **Enabled**.
3. Ouvrez votre logiciel passerelle et connectez votre jouet.

---

## Guide d'Installation dans Unity
Ceci installe à la fois le système audio et les paramètres pour OSC (même si vous ne l'utilisez pas, les paramètres sont là par défaut).

### Prérequis
- **Unity** et **VRChat SDK 3.0**.
- **Asset PCS** (Paquet de Dismay) [1].
- **VRCFury** (Hautement recommandé pour faciliter l'installation) [2].

### Étape 1 : Importer
Faites glisser le `.unitypackage` de PCS dans votre projet.

### Étape 2 : Configurer les Composants
Le système utilise deux types de préfabriqués :

**A. Celui qui reçoit (Orifices)**
1. Cherchez le préfabriqué `PCS_Orifice`.
2. Placez-le à l'intérieur de l'os correspondant (Hips, Head, etc.).
3. Alignez-le avec l'entrée du trou de votre maillage.

**B. Celui qui pénètre (Pénétrateurs)**
1. Cherchez le préfabriqué `PCS_Penetrator`.
2. Placez-le à l'intérieur de l'os du pénis.
3. Alignez-le pour qu'il couvre la longueur du pénis.

### Étape 3 : Finaliser
Si vous utilisez VRCFury, le système fusionnera automatiquement lors du téléchargement de l'avatar.
Sinon, utilisez **Avatars 3.0 Manager** pour fusionner le FX Controller et les Paramètres PCS avec ceux de votre avatar.

---

## Références

[1] Dismay. (n.d.). *Penetration Contact System*. Gumroad. https://dismay.booth.pm/items/5001027

[2] VRCFury. (n.d.). *VRCFury Documentation*. https://vrcfury.com

[3] OscGoesBrrr. (n.d.). *OscGoesBrrr*. https://osc.toys

[4] Intiface. (n.d.). *Intiface Central*. https://intiface.com/desktop/
