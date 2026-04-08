# JustKissSFX

<span class="badge">SFX</span> <span class="badge badge-purple">INTERACTION</span> <span class="badge badge-red">ERP</span>

## Qu'est-ce que c'est ?

JustKissSFX est un asset d'effets sonores (SFX) pour VRChat développé par **NEVER STOP DREAMING** (@vrc_eun). Il permet d'ajouter des sons de baisers à votre avatar, des baisers normaux aux baisers profonds (deep kisses), créant une expérience plus immersive dans les interactions sociales et ERP.

## À quoi ça sert ?

- Ajouter des sons de baisers à votre avatar VRChat
- Détecter les baisers continus et reproduire automatiquement des sons de baiser profond
- Plus d'immersion dans les interactions sociales et le contenu pour adultes
- Alternative silencieuse pour les utilisateurs qui ne veulent pas utiliser de microphone

## Caractéristiques principales

| Caractéristique     | Description                                  |
| ------------------- | -------------------------------------------- |
| **Sons inclus**     | 32 effets sonores de baisers                 |
| **Baisers normaux** | 20 types différents                          |
| **Deep kisses**     | 12 types différents                          |
| **Voix**            | Non incluse (effets sonores uniquement)      |
| **Compatibilité**   | [Modular Avatar](/wiki?topic=modular-avatar) |

### Spécifications techniques

- **Système utilisé :** Contact Receiver
- **Paramètres Sync :** 4 paramètres (consomme 18 de mémoire)
- **Audio clips :** 32 clips audio compressés avec perte
- **Menu :** 1 menu pour le contrôle bool
- **Constraint :** 1 constraint

> [!NOTE]
> Nécessite [Modular Avatar](/wiki?topic=modular-avatar) pour la configuration des paramètres. Pas nécessaire pour l'installation manuelle.

> [!WARNING]
> Les effets sonores ne seront pas reproduits si :
>
> - L'avatar opposite a le head collider désactivé
> - Les Contacts sont configurés pour désactiver les interactions
> - Les paramètres de sécurité de VRChat limitent la lecture audio

## Exigences

- **[Modular Avatar](/wiki?topic=modular-avatar) :** 1.11 ou supérieur
- **VRCSDK :** 3.7.5 ou supérieur

## Où l'obtenir ?

- **BOOTH :** [JustKissSFX](https://booth.pm/ja/items/5534236)

## Comment installer ?

1. Ajoutez le prefab **KissSFX** à la hiérarchie de votre avatar
2. Positionnez l'objet **CenterOfHead** :
   - Le gizmo (centre) doit être placé à la **pointe du nez** ou entre le nez et la bouche
3. Dans les paramètres de [Modular Avatar](/wiki?topic=modular-avatar), vous pouvez changer l'emplacement où le menu toggle sera installé

> [!TIP]
> Si vous utilisez un avatar avec WD (World Disabled) off, il existe un paket spécifique disponible sur BOOTH qui inclut des prefabs pour l'installation manuelle.

---

## Références

Never Stop Dreaming. (2024). _チュパサウンド JustKissSFX_. BOOTH. Récupéré de https://booth.pm/ja/items/5534236
