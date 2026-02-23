# SyncDances

<span class="badge">OUTIL</span>

## Qu'est-ce que c'est ?
SyncDances est un prefab Unity pour VRChat qui permet aux avatars de danser en parfaite synchronisation. Lorsqu'un joueur commence une danse, tous ceux qui ont le système installé commencent à danser en même temps.

> [!NOTE]
> SyncDances a été inspiré par le prefab [CuteDancer](https://github.com/Krysiek/CuteDancer).

## À quoi ça sert ?
- Danses synchronisées entre plusieurs joueurs dans VRChat
- Système émetteur-récepteur où l'un contrôle et les autres suivent
- Contrôle de la vitesse de danse (synchronisé)
- 24 emplacements pour des danses personnalisées

## Caractéristiques principales

| Caractéristique | Description |
|-----------------|-------------|
| **Synchronisation** | Tous les joueurs équipés du système dansent en même temps |
| **Contrôle de vitesse** | Vous pouvez accélérer, ralentir ou figer les danses |
| **Emplacements personnalisés** | 24 espaces pour ajouter vos propres danses |
| **Compatibilité Quest** | Fonctionne sur Quest (mais non recommandé) |
| **Plusieurs versions** | Disponible pour VRCFury et Modular Avatar |

## Versions disponibles

| Version | Prix | Description |
|---------|-------|-------------|
| **Original** | 600 JPY | Fichiers originaux |
| **Avec support** | 1000 JPY | Fichiers + support du créateur |
| **DLC** | 350 JPY~ | Contenu additionnel |

## Configuration requise

- **VRCFury** installé dans le projet (recommandé)
- Optionnel : **Modular Avatar** pour une installation automatique

## Installation

### Méthode avec VRCFury (Recommandé)

1. Téléchargez le fichier `SyncDancesPrefab PC (VRCFURY)` du pack
2. Glissez-déposez le prefab sur votre avatar dans Unity
3. Terminé ! L'avatar est prêt à être mis en ligne

> [!IMPORTANT]
> N'installez pas les fichiers d'objets individuellement - utilisez uniquement le prefab principal.

### Version Modular Avatar

Si vous préférez utiliser Modular Avatar au lieu de VRCFury :
- Trouvez la version spécifique sur : [SyncDances Modular Avatar](https://booth.pm/en/items/6311129)

## Comment utiliser

1. Installez le prefab sur votre avatar
2. Utilisez le menu VRChat pour sélectionner une danse
3. Si vous êtes l'« émetteur », les autres (« récepteurs ») danseront de manière synchronisée

### Système émetteur-récepteur

- **Un joueur agit comme antenne (émetteur)** - contrôle quelle danse est jouée
- **Les autres sont des récepteurs** - reçoivent le signal et dansent en synchronisation

> [!TIP]
> Pour augmenter la portée de transmission, rejoignez tous les émetteurs et récepteurs ensemble. Mais attention ! Cela peut provoquer des crashs à cause d'un bug de VRChat.

## Danses incluses

SyncDances inclut plusieurs danses préconfigurées. Certains créateurs reconnus incluent :

| Danse | Créateur |
|-------|----------|
| El bicho | THEDAO77 |
| Chainsaw | THEDAO77 |
| Ankha | THEDAO77 |
| Sad Cat | Evendora |
| Crisscross | (Rat meme) |
| PUBG | Toca Toca |

> [!NOTE]
> Plus de la moitié des danses ont été trouvées au hasard sur Internet. Si vous avez créé l'une des danses incluses, contactez le créateur pour obtenir votre crédit.

## Contrôle de la vitesse

Depuis la version 4.0, SyncDances inclut un contrôle de vitesse :
- **0%** : Figé
- **100%** : Vitesse normale
- **Plus de 100%** : Danse accélérée

> [!WARNING]
> Le contrôle de vitesse ne fonctionne PAS avec les personnes utilisant SyncDances 3.1 ou une version antérieure. Elles danseront à la vitesse par défaut.

## Paramètres et performances

| Aspect | PC | Quest |
|--------|-----|-------|
| **Contacts** | 16 | 12 |
| **Sources audio** | 1 | 0 (lite) |
| **Bits de paramètres (speed)** | 18 bits | N/A |
| **Bits de paramètres (default)** | 10 bits | N/A |

## Mises à jour

### Version 4.5
- Amélioration de la rétrocompatibilité (les versions 2.x et 3.x se synchronisent correctement)
- Correction des emotes personnalisées 2 et 21
- 16 nouveaux emplacements pour emotes personnalisées (désormais 24 au total)

### Version 4.2
- Menus personnalisés corrigés
- Compatibilité Modular Avatar corrigée
- Menus ajoutés pour Custom 9-17 et 18-24

### Version 3.1
- Nombre de contacts réduit de 114 à seulement 16
- Sources audio réduites de 32 à 1
- Ajout de 15 nouvelles danses et de 8 emplacements personnalisés

## Erreurs courantes

### Les joueurs ne se synchronisent pas
- Vérifiez que tout le monde utilise la même version de SyncDances
- Assurez-vous que l'émetteur est à portée
- Les joueurs utilisant la version 3.1 ne peuvent pas contrôler la vitesse

### L'avatar se fige
- Peut être dû à une incompatibilité de version
- Vérifiez que le prefab est correctement installé

### Les emotes personnalisées ne fonctionnent pas
- Vérifiez que vous utilisez le bon emplacement
- Certaines emotes nécessitent l'installation de VRCFury

## Différence avec OpenSyncDance

| Caractéristique | SyncDances | OpenSyncDance |
|-----------------|------------|---------------|
| **Prix** | Payant (600-1000 JPY) | Gratuit |
| **Code** | Fermé | Open Source |
| **Contrôle de vitesse** | Oui | Non |
| **Développement** | Actif | Activo |
| **Support** | Discord du créateur | Communauté |

## Ressources supplémentaires

- **Achat :** [BOOTH - SyncDances 4.5](https://booth.pm/en/items/4881102)
- **SyncDances Modular Avatar :** [BOOTH](https://booth.pm/en/items/6311129)
- **DLC :** [BOOTH](https://booth.pm/en/items/7423127)
- **Discord :** Kinimara (créateur)

---

## Références

Kinimara. (2025). *SyncDances 4.5*. BOOTH. https://booth.pm/en/items/4881102

Krysiek. (2022). *CuteDancer*. GitHub. https://github.com/Krysiek/CuteDancer
