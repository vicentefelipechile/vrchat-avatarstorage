# VRCFury

<span class="badge">OPTIONAL</span>

## Was ist das?
VRCFury ist ein kostenloses Unity-Plugin, das die Konfiguration von VRChat-Avataren erheblich vereinfacht. Es erleichtert die Installation von Kleidung, Props, Gesten und Animationen, ohne Animations-Controller manuell bearbeiten zu müssen.

## Wofür ist es?
- Ein-Klick-Installation von Kleidung und Accessoires
- Automatische Einrichtung von Gesten und Animationen
- Automatische VRChat-Menügenerierung
- Nicht-destruktiv: ändert deine Originaldateien nicht
- Blendshape-Optimierer (entfernt ungenutzte)

> [!NOTE]
> Hinweis
> VRCFury ist ein OPTIONALES, aber sehr empfohlenes Tool. Einige Avatare benötigen es, um korrekt zu funktionieren. Wenn ein Avatar es braucht, wird es in der Beschreibung angegeben.

## Wo bekommt man es?
- **Offizielle Seite (Downloads):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## Wie installieren?

Wie viele moderne VRChat-Tools gibt es zwei Methoden, VRCFury zu installieren. Die offiziell empfohlene Methode ist die Verwendung von **VCC (VRChat Creator Companion)**.

### Methode 1: Installation über VCC (Empfohlen)

Die Verwendung von VCC stellt sicher, dass VRCFury immer aktuell ist und keine Kompatibilitätsprobleme bei der Verwendung mehrerer Projekte verursacht.

1. **Repository zu VCC hinzufügen:**
   - Gehe zur offiziellen Downloads-Seite: [vrcfury.com/download](https://vrcfury.com/download/).
   - In Schritt 1 („Install VRChat Creator Companion"), falls du VCC bereits installiert hast, kannst du es überspringen. In Schritt 2 klicke den **„Click Here to add VRCFury to VCC"**-Button.
   - Dein Browser wird nach Erlaubnis fragen, VCC zu öffnen. Akzeptiere es, und klicke in VCC auf **„I Understand, Add Repository"**.
   - *(Manuelle Alternative)*: Öffne VCC, gehe zu **Settings** -> **Packages**-Tab -> **Add Repository**, füge die URL `https://vcc.vrcfury.com` im entsprechenden Feld ein und klicke **Add**.
2. **VRCFury zu deinem Projekt hinzufügen:**
   - Gehe in VCC zu deiner Projektliste und klicke bei dem Projekt, das du verwendest, auf **Manage Project**.
   - Stelle in der Repository-Liste links (oder oben rechts) sicher, dass **„VRCFury Repo"** angekreuzt ist.
   - Suche in der Liste der verfügbaren Pakete für dein Projekt nach **„VRCFury"** und klicke das **[+]**-Symbol rechts, um es zu deinem Projekt hinzuzufügen.
3. **Fertig!** Klicke in VCC auf **Open Project** und die Prefabs mit VRCFury werden automatisch installiert oder konfiguriert, wenn du deinen Avatar hochlädst oder sie zur Szene hinzufügst.

> [!NOTE]
> Wenn sich das VCC-Fenster beim Installieren unerwartet schließt, ist das normal. Um es zu beheben, schließe VCC einfach, öffne es erneut und wiederhole den Vorgang; du wirst sehen, dass es jetzt korrekt funktioniert.

### Methode 2: Manuelle Installation über .unitypackage (Legacy)

Diese Methode wird nicht mehr empfohlen und gilt als veraltet (Legacy), ist aber weiterhin nutzbar, falls du Probleme mit VCC hast.

1. Lade die VRCFury-Installationsdatei im `.unitypackage`-Format vom Download-Bereich auf [GitHub](https://github.com/VRCFury/VRCFury/releases) herunter.
2. Öffne das Unity-Projekt, in dem du an deinem Avatar arbeiten möchtest.
3. Gehe im oberen Unity-Menü zu **Assets** → **Import Package** → **Custom Package...**
4. Wähle die VRCFury `.unitypackage`-Datei aus, die du gerade heruntergeladen hast.
5. Stelle sicher, dass im Popup-Fenster alle Dateien ausgewählt sind, und klicke **Import**.
6. VRCFury wird installiert und ein neues Menü erscheint in der oberen Leiste namens **Tools > VRCFury**. (Von dort aus kannst du es aktualisieren, falls du diese manuelle Methode verwendest).

---

## Referenzen

VRCFury. (n.d.). *Download*. VRCFury. Retrieved from https://vrcfury.com/download/

VRCFury. (n.d.). *VRCFury*. GitHub. Retrieved from https://github.com/VRCFury/VRCFury
