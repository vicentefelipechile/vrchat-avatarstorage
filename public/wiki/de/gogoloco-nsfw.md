# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Was ist das?
**NSFW Locomotion** ist eine angepasste und explizite Version des **GoGo Loco**-Systems (ursprünglich von franada erstellt). Es ist speziell für Erwachsenen- oder ERP-Avatare konzipiert und erweitert die Locomotion-Funktionalitäten um suggestive oder explizite Posen und Animationen.

Es behält alle Funktionen des originalen GoGo Loco bei, fügt aber spezifischen Inhalt für intime Interaktionen hinzu.

> [!WARNING]
> Wichtig
> **Installiere NSFW Locomotion und normales Gogo Loco NICHT im selben Projekt.** Sie teilen Menü- und Layer-Namen, was zu Konflikten und Fehlern führt. Wähle nur eines.

## Funktionen
- **GoGo Loco Basis:** Enthält alle Standard-Flug-, Skalierungs- und Posenfunktionen.
- **„Poses Only"-Version:** Leichtgewichtig, fügt nur zusätzliche statische Posen hinzu.
- **„Emotes + Poses"-Version:** Enthält vollständige Emotes, dynamische Bewegungen und benutzerdefinierte Animationen für Roleplay.
- **Einfache Installation:** Integration mit **VRCFury** und einem Ein-Klick-Installationsskript.

## Wo bekommt man es?
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (Für VCC)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## Was tun, wenn der Avatar bereits GoGo Loco hat?
Wie in der Warnung erwähnt, **kannst du nicht beide Systeme gleichzeitig installiert haben**. Wenn dein Avatar bereits mit GoGo Loco geliefert wurde oder du es zuvor installiert hast, musst du es vollständig entfernen, bevor du NSFW Locomotion hinzufügst, um Unity-Fehler oder kaputte Menüs zu vermeiden.

### Schritte zum Deinstallieren des originalen GoGo Loco:
1. **Bei Installation mit VRCFury (Einfache Methode):**
   - Finde in Unity das GoGo Loco Prefab in der Hierarchie (`Hierarchy`) als Kind deines Avatars und lösche es (Rechtsklick -> `Delete`).
2. **Bei manueller Integration in den Avatar:**
   - **Playable Layers:** Wähle deinen Avatar, gehe zur `VRC Avatar Descriptor`-Komponente und scrolle nach unten zu „Playable Layers". Entferne oder ersetze die GoGo Loco Controller (Base, Action, FX) durch die Originale, die mit dem Avatar geliefert wurden.
   - **Parameter und Menü:** Öffne in derselben Komponente deine Parameterliste (`Expressions Parameters`) und lösche alle, die zu GoGo Loco gehören (beginnen normalerweise mit `Go/`). Öffne dann dein Menü (`Expressions Menu`) und lösche den Button, der das GoGo-Untermenü öffnet.
   - *(Optional)* Wenn du keine anderen Avatare mit normalem GoGo Loco in diesem Projekt hast, lösche den `GoGo`-Ordner aus deinen `Assets`.

Sobald der Avatar vollständig vom alten System bereinigt ist, kannst du mit der normalen Installation von NSFW Locomotion fortfahren.

## Installation (Empfohlen mit VCC)
Der einfachste Weg ist die Verwendung des **VRChat Creator Companion (VCC)**.

1. Füge das **Lastation Package Listing (LPL)**-Repository zu deinem VCC hinzu.
2. Suche und installiere das **NSFW Locomotion**-Paket.
3. Stelle sicher, dass **VRCFury** ebenfalls über VCC in deinem Projekt installiert ist.
4. Öffne dein Unity-Projekt.
5. Gehe in der oberen Menüleiste zu: `LastationVRChat` -> `NSFW Locomotion`.
6. Wähle deinen Avatar und die gewünschte Version:
   - **Vollversion:** (Emotes + Posen)
   - **Posen-Version:** (Nur Posen, leichter)

## Manuelle Installation
Wenn du VCC nicht verwenden möchtest (nicht empfohlen):
1. Lade das neueste „Release" von GitHub herunter.
2. Importiere das Paket in Unity.
3. Ziehe das entsprechende Prefab auf deinen Avatar (das mit `(VRCFury)` gekennzeichnete).
   - Verwende `WD`, wenn du „Write Defaults" aktiviert hast, oder die normale Version, wenn nicht.

---

## Referenzen

LastationVRChat. (n.d.). *NSFW Locomotion* [Computer software]. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Reddit User. (n.d.). *Help! How do i remove gogoloco from my avatar?* [Online forum post]. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
