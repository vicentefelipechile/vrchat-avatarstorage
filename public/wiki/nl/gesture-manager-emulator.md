# Gesture Manager Emulator

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## Wat is de Gesture Manager?
De **Gesture Manager**, ontwikkeld door **BlackStartx**, is een essentiële tool voor VRChat avatar-makers. Het stelt je in staat om animaties, gebaren en menu's van een avatar direct in Unity te bekijken en bewerken [1].

Het simuleert vrijwel volledig het animatiesysteem van VRChat, inclusief het **Radiaalmenuw (Expressions Menu)**.

---

## Installatie

### Methode 1: VRChat Creator Companion (Aanbevolen)
1. Open **VCC**.
2. Selecteer je project.
3. Zoek naar **"Gesture Manager"** en klik op **"Add"**.
4. Open je Unity-project.

### Methode 2: Handmatig
1. Download het `.unitypackage` van GitHub [3].
2. Importeer in Unity (`Assets > Import Package > Custom Package`).

---

## Belangrijkste Functies

*   **Radial Menu 3.0:** Nauwkeurige recreatie van het VRChat-expressiemenu.
*   **Gebarenemulatie:** Test gebaren met knoppen in de inspector.
*   **Contact Testen:** Activeer *VRCContacts* met muisklik.
*   **Parameter Debugging:** Toont alle parameters en hun huidige waarden.

---

## Hoe gebruiken

1.  Ga naar `Tools > Gesture Manager Emulator`.
2.  Er verschijnt een `GestureManager`-object in de hiërarchie.
3.  Ga naar **Play Mode** in Unity.
4.  Selecteer het `GestureManager`-object.
5.  In de **Inspector** zie je het radiaalmenuw en alle besturingselementen.

> [!IMPORTANT]
> Je moet het `GestureManager`-object geselecteerd hebben om de besturingselementen te zien.

---

## Referenties

* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
