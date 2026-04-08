# PhysBones

<span class="badge badge-blue">AFHANKELIJKHEID</span>

## Wat is het?

PhysBones is een verzameling componenten ingebouwd in de VRChat SDK die secundaire beweging (fysica) toevoegen aan objecten. Met PhysBones kun je beweging toevoegen aan haar, staarten, oren, kleding en meer.

> [!NOTE]
> PhysBones is de **officiële vervanger** van Dynamic Bones in VRChat.

## Hoofdcomponenten

| Component               | Beschrijving                                                         |
| ----------------------- | -------------------------------------------------------------------- |
| **VRCPhysBone**         | Hoofdcomponent dat de keten van fysica-geanimeerde botten definieert |
| **VRCPhysBoneCollider** | Definieert colliders die PhysBones beïnvloeden                       |

## Configuratie

### Krachten

- **Pull**: Kracht om botten naar de rustpositie terug te brengen
- **Spring/Momentum**: Oscillatie bij het bereiken van de rustpositie
- **Gravity**: Hoeveelheid zwaartekracht
- **Gravity Falloff**: Hoeveel zwaartekracht wordt verwijderd in rustpositie

> [!TIP]
> Als je haar gemodelleerd is in de gewenste positie tijdens normaal staan, gebruik Gravity Falloff op 1.0.

### Limieten

| Type      | Beschrijving                  |
| --------- | ----------------------------- |
| **None**  | Geen limieten                 |
| **Angle** | Beperkt tot een maximale hoek |
| **Hinge** | Beperkt langs een vlak        |
| **Polar** | Combineert Hinge met Yaw      |

### Grab & Pose

| Instelling         | Beschrijving                                   |
| ------------------ | ---------------------------------------------- |
| **Allow Grabbing** | Staat spelers toe om botten te grijpen         |
| **Allow Posing**   | Staat spelers toe om te poseren na het grijpen |

## Praktische Voorbeelden

### Voorbeeld 1: Lang Haar

1. Selecteer het root-bot van het haar
2. Voeg het **VRCPhysBone**-component toe
3. Configureer: Pull: 0.3-0.5, Gravity: 0.5-1.0, Radius: 0.05-0.1

### Voorbeeld 2: Dierenstaart

1. Selecteer het basis-bot van de staart
2. Configureer: Pull: 0.2-0.4, Momentum: 0.5-0.7, Gravity: 0.3-0.6

### Voorbeeld 3: Rok

1. Selecteer het root-bot van de rok
2. Configureer: Pull: 0.1-0.3, Gravity: 0.8-1.0
3. Voeg **VRCPhysBoneCollider** toe aan de torso

---

## Referenties

VRChat. (2025). _PhysBones_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/
