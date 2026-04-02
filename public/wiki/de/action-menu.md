# Aktionsmenü

<span class="badge badge-blue">Logik</span> <span class="badge badge-purple">Workflow</span>

## Einführung
Das **Aktionsmenü** (auch bekannt als Expressions Menu) ist das radiale Menü, das du in VRChat verwendest, um Animationen auszulösen, Kleidung zu wechseln oder die Parameter deines Avatars zu ändern [1].

Traditionell laden Ersteller ihren Avatar jedes Mal zu VRChat hoch, wenn sie eine kleine Änderung testen möchten, was sehr zeitaufwändig ist. Glücklicherweise gibt es Tools, die dieses Menü **direkt in Unity** simulieren können, sodass du sofort sehen kannst, wie deine Toggles und Slider funktionieren.

---

## Simulationstools

Es gibt zwei hauptsächliche Tools, die von der Community empfohlen werden und mit dem **VRChat Creator Companion (VCC)** kompatibel sind.

### 1. Gesture Manager (von BlackStartx)
Dies ist das beliebteste Tool zur Visualisierung des radialen Menüs, genau wie es im Spiel erscheint. Es ermöglicht dir, Gesten, Contacts und Parameter intuitiv zu testen.

> [!NOTE]
> Für eine detaillierte Anleitung zur Installation und allen Funktionen, schaue dir unseren speziellen Artikel an: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (von Lyuma)
Dieses Tool ist technischer und leistungsfähiger, ideal zum Debuggen der komplexen Logik hinter dem Avatar.

*   **Installation:** Verfügbar in VCC oder über GitHub. Es wird oft automatisch mit Tools wie [VRCFury](/wiki?topic=vrcfury) installiert [3].
*   **Verwendung:**
    1.  Gehe zu `Tools` > `Avatar 3.0 Emulator`.
    2.  Beim Wechsel in den **Play Mode** wird ein Steuerungspanel generiert.
    3.  Es ermöglicht dir, [Parameter](/wiki?topic=parameter)-Werte zu erzwingen und in Echtzeit zu sehen, welcher Animator-Layer abgespielt wird.

---

## Welches sollte ich verwenden?

| Funktion | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Visuelle Oberfläche** | Ausgezeichnet (Radial) | Einfach (Buttons/Slider) |
| **Menütest** | Ja | Eingeschränkt |
| **Logik-Debugging** | Einfach | Erweitert |
| **Gestentest** | Einfach (Buttons) | Manuell (Animator) |

**Empfehlung:** Verwende den **Gesture Manager** für die meisten Toggle- und Kleidungstests. Verwende den **Av3 Emulator**, wenn deine Animationen nicht auslösen, wenn sie sollten, und du sehen musst, was „unter der Haube" passiert.

---

## Build & Test (Die offizielle Alternative)
Wenn du etwas testen musst, das Netzwerk oder Interaktionen mit anderen erfordert (wie [PhysBones](/wiki?topic=parameter)), verwende die **Build & Test**-Funktion des offiziellen SDK [1]:
1.  Öffne das `VRChat SDK Control Panel`.
2.  Suche im `Builder`-Tab den Abschnitt „Offline Testing".
3.  Klicke auf `Build & Test`.
4.  Unity wird den Avatar kompilieren und eine lokale VRChat-Instanz öffnen, in der nur du ihn sehen kannst, ohne ihn auf die Server hochgeladen zu haben.

---

## Referenzen

* VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* Lyuma. (n.d.). Av3Emulator. GitHub. https://github.com/lyuma/Av3Emulator
