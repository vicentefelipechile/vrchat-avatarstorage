# Actiemenu

<span class="badge badge-blue">Logica</span> <span class="badge badge-purple">Workflow</span>

## Introductie
Het **Actiemenu** (ook bekend als Expression Menu) is het radiaalmenuw dat je in VRChat gebruikt om animaties te activeren, kleding te wisselen of avatarparameters te wijzigen [1].

---

## Simulatietools

### 1. Gesture Manager (van BlackStartx)
De populairste tool voor het visualiseren van het radiaalmenuw.

> [!NOTE]
> Voor een gedetailleerde handleiding, bekijk ons artikel: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (van Lyuma)
Meer technisch en krachtig, ideaal voor het debuggen van complexe logica.

*   **Hoe te gebruiken:**
    1.  Ga naar `Tools` > `Avatar 3.0 Emulator`.
    2.  In **Play Mode** verschijnt een bedieningspaneel.
    3.  Hiermee kun je [parameterwaarden](/wiki?topic=parameter) forceren.

---

## Welke kiezen?

| Functie | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Visuele Interface** | Uitstekend (Radiaal) | Basis (Knoppen/Sliders) |
| **Menu Testen** | Ja | Beperkt |
| **Logica Debuggen** | Basis | Geavanceerd |

**Aanbeveling:** Gebruik **Gesture Manager** voor de meeste tests. Gebruik **Av3 Emulator** als animaties niet werken en je "onder de motorkap" moet kijken.

---

## Build & Test
Als je netwerkfuncties moet testen, gebruik **Build & Test** van de officiële SDK [1]:
1.  Open het `VRChat SDK Control Panel`.
2.  Klik op `Build & Test`.
3.  Unity compileert de avatar en opent een lokale VRChat-instantie.

---

## Referenties

* VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* Lyuma. (n.d.). Av3Emulator. GitHub. https://github.com/lyuma/Av3Emulator
