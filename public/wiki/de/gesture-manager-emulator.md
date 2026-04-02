# Gesture Manager Emulator

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## Was ist der Gesture Manager?
Der **Gesture Manager**, entwickelt von **BlackStartx**, ist ein unverzichtbares Tool für VRChat-Avatar-Ersteller. Es ermöglicht dir, Animationen, Gesten und Menüs eines Avatars direkt in Unity vorzuschauen und zu bearbeiten, ohne den Avatar ins Spiel hochladen zu müssen, um jede Änderung zu testen [1].

Es simuliert das VRChat-Animationssystem nahezu vollständig, einschließlich des **Radialmenüs (Expressions Menu)**, mit dem du sofort überprüfen kannst, ob deine Toggles und Slider korrekt funktionieren.

---

## Installation

Es gibt zwei Hauptmethoden, um dieses Tool in deinem Projekt zu installieren.

### Methode 1: VRChat Creator Companion (Empfohlen)
Dies ist der einfachste Weg und stellt sicher, dass du immer die neueste, mit deinem Projekt kompatible Version hast [2].
1. Öffne den **VRChat Creator Companion (VCC)**.
2. Wähle dein Projekt aus.
3. Stelle sicher, dass „Curated" Pakete nicht gefiltert sind.
4. Suche nach **„Gesture Manager"** und klicke auf **„Add"**.
5. Öffne dein Unity-Projekt.

### Methode 2: Manuell (Unity Package)
Falls du VCC nicht verwendest oder eine bestimmte Version benötigst:
1. Lade die `.unitypackage`-Datei aus dem *Releases*-Bereich auf BlackStartx's GitHub oder von seiner BOOTH-Seite herunter [3].
2. Importiere das Paket in dein Unity-Projekt (`Assets > Import Package > Custom Package`).

---

## Hauptfunktionen

*   **Radial Menu 3.0:** Erstellt das VRChat Expression-Menü originalgetreu nach.
*   **Gesten-Emulation:** Ermöglicht das Testen von linken und rechten Handgesten über Buttons im Inspector.
*   **Aktive Szenenkamera:** Synchronisiert die Spielkamera mit der Szenenkamera, um PhysBones- und Contacts-Tests zu erleichtern.
*   **Contacts-Test:** Ermöglicht das Auslösen von *VRCContacts* durch Anklicken mit der Maus.
*   **Parameter-Debugging:** Zeigt eine Liste aller Avatar-Parameter und ihrer aktuellen Werte an.

---

## Wie benutzt man es

1.  Gehe nach der Installation zur oberen Leiste und wähle `Tools > Gesture Manager Emulator`.
2.  Dies fügt ein Objekt namens `GestureManager` zu deiner Hierarchie hinzu.
3.  Wechsle in den **Play Mode** in Unity.
4.  Wähle das `GestureManager`-Objekt in der Hierarchie aus.
5.  Im **Inspector**-Fenster siehst du das Radialmenü und alle Steuerungselemente, um deinen Avatar zu testen.

> [!IMPORTANT]
> Du musst das `GestureManager`-Objekt ausgewählt haben, um die Steuerungselemente im Inspector zu sehen, während Unity läuft.

---

## Referenzen

* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
* VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
* BlackStartx. (n.d.). Gesture Manager. Booth. https://blackstartx.booth.pm/items/3922472
