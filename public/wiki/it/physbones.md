# PhysBones

<span class="badge badge-blue">DIPENDENZA</span>

## Cos'è?

PhysBones è una raccolta di componenti integrati nel VRChat SDK che aggiungono movimento secondario (fisica) agli oggetti in avatar e mondi. Con PhysBones puoi aggiungere movimento a capelli, code, orecchie, vestiti, cavi, piante e molto altro. L'uso corretto rende i tuoi avatar più dinamici e realistici.

> [!NOTE]
> PhysBones è il **sostituto ufficiale** di Dynamic Bones in VRChat. Sebbene Dynamic Bones funzioni ancora sugli avatar esistenti (viene convertito automaticamente), tutti i creatori dovrebbero usare PhysBones per i nuovi avatar.

## A cosa serve?

- Aggiungere fisica a capelli, code, orecchie e vestiti
- Permettere ad altri giocatori di interagire con gli elementi del tuo avatar (afferrare, posare)
- Creare movimento secondario dinamico e realistico
- Sostituto del componente Cloth di Unity per tessuti semplici

## Componenti Principali

| Componente              | Descrizione                                                                 |
| ----------------------- | --------------------------------------------------------------------------- |
| **VRCPhysBone**         | Componente principale che definisce la catena di bone animati con la fisica |
| **VRCPhysBoneCollider** | Definisce collider che influenzano i PhysBones (testa, torso, mani, ecc.)   |

## Configurazione Dettagliata

### Transforms

| Impostazione          | Descrizione                                                                  |
| --------------------- | ---------------------------------------------------------------------------- |
| **Root Transform**    | Il transform dove inizia il componente. Se vuoto, parte da questo GameObject |
| **Ignore Transforms** | Lista di transforms che non devono essere influenzati dal componente         |
| **Endpoint Position** | Vettore per creare bone aggiuntivi al punto finale della catena              |
| **Multi-Child Type**  | Comportamento del bone root con catene multiple                              |

> [!CAUTION]
> Se usi un singolo bone root o un root con più figli (nessun nipote), DEVI definire una Endpoint Position!

### Forze

- **Pull**: Forza per riportare i bone alla posizione di riposo
- **Spring/Momentum**: Oscillazione nel tentativo di raggiungere la posizione di riposo
- **Stiffness** (solo Advanced): Resistenza a rimanere nella posizione di riposo
- **Gravity**: Quantità di gravità applicata
- **Gravity Falloff**: Controlla quanta gravità viene rimossa nella posizione di riposo

> [!TIP]
> Se i tuoi capelli sono modellati nella posizione desiderata stando normalmente in piedi, usa Gravity Falloff a 1.0. Così la gravità non agirà quando sei fermo.

### Limiti

| Tipo      | Descrizione                                                     |
| --------- | --------------------------------------------------------------- |
| **None**  | Nessun limite                                                   |
| **Angle** | Limitato a un angolo massimo da un asse. Visualizzato come cono |
| **Hinge** | Limitato lungo un piano. Simile a una fetta di pizza            |
| **Polar** | Combina Hinge con Yaw. Più complesso                            |

### Collisione

| Impostazione        | Descrizione                                                                            |
| ------------------- | -------------------------------------------------------------------------------------- |
| **Radius**          | Raggio di collisione attorno a ogni bone (in metri)                                    |
| **Allow Collision** | Permette collisione con collider globali (mani di altri giocatori, collider del mondo) |
| **Colliders**       | Lista di collider specifici con cui questo PhysBone collide                            |

### Grab & Pose

| Impostazione       | Descrizione                                             |
| ------------------ | ------------------------------------------------------- |
| **Allow Grabbing** | Permette ai giocatori di afferrare i bone               |
| **Allow Posing**   | Permette ai giocatori di posare dopo aver afferrato     |
| **Grab Movement**  | Controlla come si muovono i bone quando afferrati       |
| **Snap To Hand**   | Il bone si adatta automaticamente alla mano che afferra |

## Casi d'Uso Pratici

### Esempio 1: Capelli Lunghi

1. Seleziona il bone root dei capelli
2. Aggiungi il componente **VRCPhysBone**
3. Configura:
   - **Pull**: 0.3 - 0.5
   - **Gravity**: 0.5 - 1.0
   - **Gravity Falloff**: 0.5 - 0.8
   - **Radius**: 0.05 - 0.1
4. Aggiungi **Limits** di tipo Angle per prevenire il clipping con la testa

### Esempio 2: Coda Animale

1. Seleziona il bone base della coda
2. Aggiungi il componente **VRCPhysBone**
3. Configura:
   - **Pull**: 0.2 - 0.4
   - **Momentum**: 0.5 - 0.7
   - **Gravity**: 0.3 - 0.6
4. Usa limiti **Hinge** per limitare il movimento laterale

### Esempio 3: Gonna

1. Seleziona il bone root della gonna
2. Aggiungi il componente **VRCPhysBone**
3. Configura:
   - **Pull**: 0.1 - 0.3 (più morbido per i tessuti)
   - **Gravity**: 0.8 - 1.0
4. Aggiungi **VRCPhysBoneCollider** al torso dell'avatar

## Errori Comuni

### Il PhysBone non si muove

- Verifica che Root Transform sia assegnato correttamente
- Assicurati che non sia impostato su "Ignore" nel Multi-Child Type
- Controlla che il valore Pull non sia 0

### Il PhysBone clipping con il corpo

- Aggiungi Limits al componente
- Aggiungi Collider all'avatar e configurali nel PhysBone

### I bone attraversano il corpo

- Aggiungi VRCPhysBoneCollider all'avatar
- Configura il collider nella lista Colliders del PhysBone

## Dove saperne di più?

- **Documentazione Ufficiale:** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **Esempio SDK:** VRChat SDK → Samples → Avatar Dynamics Robot Avatar

---

## Riferimenti

VRChat. (2025). _PhysBones_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/
