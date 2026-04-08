# PhysBones

<span class="badge badge-blue">DÉPENDANCE</span>

## Qu'est-ce que c'est ?

PhysBones est un ensemble de composants intégrés au SDK VRChat qui permet d'ajouter un mouvement secondaire (physique) aux objets dans les avatars et les mondes. Avec PhysBones, vous pouvez ajouter du mouvement aux cheveux, queues, oreilles, vêtements, câbles, plantes et plus encore. Les utiliser correctement rend vos avatars plus dynamiques et réalistes.

> [!NOTE]
> PhysBones est le **remplacement officiel** de Dynamic Bones dans VRChat. Bien que Dynamic Bones fonctionne encore sur les avatars existants (il se convertit automatiquement), tous les créateurs devraient utiliser PhysBones pour les nouveaux avatars.

## À quoi ça sert ?

- Ajouter de la physique aux cheveux, queues, oreilles et vêtements
- Permettre à d'autres joueurs d'interagir avec les éléments de votre avatar (saisir, positionner)
- Créer un mouvement secondaire dynamique et réaliste
- Substitut du composant Cloth d'Unity pour les tissus simples

## Composants principaux

PhysBones est composé de trois composants qui fonctionnent ensemble :

| Composant               | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| **VRCPhysBone**         | Composant principal qui définit la chaîne d'os qui sera animée avec la physique        |
| **VRCPhysBoneCollider** | Définit les colliders qui affectent PhysBones (tête, torse, mains, etc.)               |
| **VRCPhysBoneRoot**     | Optionnel. Définit la racine du mouvement pour plusieurs PhysBones (mondes uniquement) |

## Configuration détaillée

### Versions

Vous pouvez sélectionner la version du composant VRCPhysBone directement dans l'inspecteur. Par défaut, la dernière version disponible est utilisée.

**Version 1.0 :**

- Version de base du composant PhysBone

**Version 1.1 (Squishy Bones) :**

- Permet aux os de se comprimer et de s'étirer
- La gravité agit maintenant comme une proportion de la rotation des os au repos
- Un Pull positif est requis pour que les os se déplacent dans la direction de la gravité

### Transforms

| Paramètre                   | Description                                                               |
| --------------------------- | ------------------------------------------------------------------------- |
| **Root Transform**          | Transform où le composant commence. Si vide, commence à ce GameObject     |
| **Ignore Transforms**       | Liste des transforms qui ne doivent pas être affectés par le composant    |
| **Ignore Other Phys Bones** | Si activé, le PhysBone ignore les autres PhysBones dans la hiérarchie     |
| **Endpoint Position**       | Vecteur pour créer des os supplémentaires à chaque extrémité de la chaîne |
| **Multi-Child Type**        | Comportement de l'os racine quand plusieurs chaînes existent              |

> [!CAUTION]
> Si vous utilisez un seul os racine, ou une racine avec plusieurs enfants (sans petits-enfants), vous DEVEZ définir un Endpoint Position ! C'est différent de Dynamic Bones.

### Forces

**Type d'intégration :**

- **Simplified** : Plus stable, plus facile à configurer, moins réactif aux forces externes
- **Advanced** : Moins stable, permet des configurations plus complexes, plus réactif aux forces externes

Paramètres disponibles :

- **Pull** : Force pour retourner les os à leur position de repos
- **Spring** (Simplified) / **Momentum** (Advanced) : Quantité d'oscillation pour atteindre la position de repos
- **Stiffness** (Advanced uniquement) : Force pour rester à la position de repos
- **Gravity** : Quantité de gravité appliquée. Valeur positive tire vers le bas, négative vers le haut
- **Gravity Falloff** : Contrôle la quantité de gravité supprimée au repos (1.0 = pas de gravité au repos)

> [!TIP]
> Si vos cheveux sont modélisés dans la position souhaitée quand vous êtes debout normalement, utilisez Gravity Falloff à 1.0. Comme ça, la gravité ne vous affectera pas quand vous restez immobile.

### Limits (Limites)

Les limites permettent de restreindre le mouvement d'une chaîne PhysBones. Elles sont très utiles pour éviter que les cheveux traversent la tête, et sont **beaucoup plus performantes** que les colliders.

| Type      | Description                                                     |
| --------- | --------------------------------------------------------------- |
| **None**  | Pas de limites                                                  |
| **Angle** | Limité à un angle max depuis un axe. Visualisé comme un cône    |
| **Hinge** | Limité le long d'un plan. Similaire à une part de pizza         |
| **Polar** | Combine Hinge avec Yaw. Plus complexe, utiliser avec modération |

> [!WARNING]
> N'abusez pas des limites Polar. Utiliser plus de 64 peut causer des problèmes de performance.

### Collision

| Paramètre           | Description                                                                                   |
| ------------------- | --------------------------------------------------------------------------------------------- |
| **Radius**          | Rayon de collision autour de chaque os (en mètres)                                            |
| **Allow Collision** | Permet la collision avec les colliders globaux (mains des autres joueurs, colliders du monde) |
| **Colliders**       | Liste des colliders spécifiques avec lesquels ce PhysBone collide                             |

**Options Allow Collision :**

- **True** : Collide avec les colliders globaux
- **False** : Collide seulement avec les colliders listés
- **Other** : Options avancées pour filtrer par type (avatar, monde, objet)

### Stretch & Squish (v1.1 uniquement)

| Paramètre          | Description                                                    |
| ------------------ | -------------------------------------------------------------- |
| **Stretch Motion** | Quantité de mouvement affectant l'étirement/compression des os |
| **Max Stretch**    | Étirement max autorisé (multiple de la longueur originale)     |
| **Max Squish**     | Compression max autorisée (multiple de la longueur originale)  |

### Grab & Pose

| Paramètre          | Description                                                                          |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Allow Grabbing** | Permet aux joueurs de saisir les os                                                  |
| **Allow Posing**   | Permet aux joueurs de positionner après avoir saisi                                  |
| **Grab Movement**  | Contrôle comment les os bougent quand saisis (0 = utilise pull/spring, 1 = immédiat) |
| **Snap To Hand**   | L'os s'ajuste automatiquement à la main qui le saisit                                |

## Cas d'utilisation pratiques

### Exemple 1 : Cheveux longs

1. Sélectionnez l'os racine des cheveux (habituellement sur le cou ou la tête)
2. Ajoutez le composant **VRCPhysBone**
3. Configurez :
   - **Root Transform** : Os racine des cheveux
   - **Ignore Transforms** : Yeux et tout os qui ne doit pas bouger
   - **Multi-Child Type** : Ignore (ainsi tous les os des cheveux sont affectés par un seul composant)
   - **Pull** : 0.3 - 0.5
   - **Gravity** : 0.5 - 1.0
   - **Gravity Falloff** : 0.5 - 0.8 (ajustez selon comment vous voulez qu'ils tombent au repos)
   - **Radius** : 0.05 - 0.1
4. Ajoutez des **Limits** type Angle pour éviter que les cheveux traversent la tête

> [!TIP]
> Pour des cheveux très longs, envisagez de les diviser en plusieurs composants PhysBone (un pour chaque section) pour une meilleure performance.

### Exemple 2 : Queue d'animal

1. Sélectionnez l'os base de la queue
2. Ajoutez le composant **VRCPhysBone**
3. Configurez :
   - **Root Transform** : Os base de la queue
   - **Integration Type** : Advanced
   - **Pull** : 0.2 - 0.4
   - **Spring/Momentum** : 0.5 - 0.7
   - **Stiffness** : 0.1 - 0.3
   - **Gravity** : 0.3 - 0.6
4. Utilisez des limites **Hinge** pour limiter le mouvement latéral

### Exemple 3 : Jupe ou cape

1. Assurez-vous que les vêtements ont leur propre armature séparée de l'avatar
2. Sélectionnez l'os racine de la jupe/cape
3. Ajoutez le composant **VRCPhysBone**
4. Configurez :
   - **Pull** : 0.1 - 0.3 (plus doux pour les tissus)
   - **Gravity** : 0.8 - 1.0
   - **Gravity Falloff** : 0.3 - 0.5
   - **Radius** : 0.05
5. Ajoutez **VRCPhysBoneCollider** au torse de l'avatar
6. Dans le composant PhysBone, dans **Colliders**, ajoutez le collider du torse

> [!NOTE]
> Pour les jupes très longues ou les capes complètes, envisagez d'utiliser le composant Cloth d'Unity au lieu de PhysBones, car il est optimisé pour ce type de tissu.

## Dynamic Bones vs PhysBones

VRChat convertit automatiquement les composants Dynamic Bones en PhysBones lors du chargement de l'avatar. Cependant, cette conversion n'est pas parfaite.

**Différences principales :**

- Dynamic Bones utilise le mode Advanced par défaut lors de la conversion
- Certains paramètres de Dynamic Bones n'ont pas d'équivalent dans PhysBones
- La conversion automatique utilise "Ignore" pour Multi-Child Type

**Conversion manuelle :**
Vous pouvez convertir manuellement vos avatars en utilisant VRChat SDK → Utilities → Convert DynamicBones to PhysBones.

> [!WARNING]
> Faites une sauvegarde de votre avatar avant de convertir, car le processus n'est pas réversible.

## Limites et performances

| Plateforme     | Limite                                                             |
| -------------- | ------------------------------------------------------------------ |
| **PC**         | ~256 transforms par composant                                      |
| **Meta Quest** | Limite plus basse (consulter la documentation Performance Ranking) |

**Conseils d'optimisation :**

- N'avez pas plus de 256 transforms par composant PhysBone
- Si vous avez plus de 128 transforms, envisagez de diviser en plusieurs composants
- Utilisez **Limits** au lieu des colliders quand possible
- N'utilisez pas os humanoides (Hip, Spine, Chest, Neck, Head) comme racine PhysBone

> [!IMPORTANT]
> PhysBones a une limite stricte sur Meta Quest. Consultez les limites "Very Poor" dans le système Performance Ranking.

## Erreurs courantes

### Le PhysBone ne bouge pas

- Vérifiez que Root Transform est correctement assigné
- Assurez-vous qu'il n'est pas sur "Ignore" dans Multi-Child Type
- Vérifiez que la valeur Pull n'est pas 0

### Le PhysBone traverse le corps

- Ajoutez des limites (Limits) au composant
- Ajoutez des colliders à l'avatar et configurez-les dans PhysBone
- Augmentez la valeur Pull

### Les os n'atteignent pas la position de repos

- Augmentez la valeur Pull
- Ajustez Spring/Momentum selon le type d'intégration

### Les os traversent le corps

- Ajoutez VRCPhysBoneCollider à l'avatar
- Configurez le collider dans la liste Colliders de PhysBone
- Vérifiez que le Radius est approprié

## Où en savoir plus ?

- **Documentation officielle :** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **Exemple SDK :** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **Communauté :** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## Références

VRChat. (2025). _PhysBones_. VRChat Creators. Récupéré de https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). _VRCPhysBoneCollider_. VRChat Creators. Récupéré de https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
