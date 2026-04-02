# Poiyomi Toon Shader

<span class="badge badge-blue">ABHÄNGIGKEIT</span>

## Was ist das?
Poiyomi ist ein Shader für Unity, speziell für VRChat entwickelt. Er ermöglicht es, stilisierte und Cartoon-artige Darstellungen auf Avataren mit fortgeschrittenen visuellen Effekten zu erstellen.

## Wofür ist es?
- Anpassbare stilisierte Schattierung (Toon, realistisch, flach)
- Spezialeffekte: Outlines, Decals, Glitzer, Funkeln
- AudioLink-Unterstützung (audioreaktive Effekte)
- Physikalisch korrekte Reflexionen und Glanzlichter
- Optimiert für VRChat-Performance

> [!WARNING]
> SEHR WICHTIG
> Poiyomi ist NICHT in den Avatar-Dateien enthalten, die du herunterlädst. Du musst es selbst in Unity installieren, BEVOR du den Avatar öffnest.

## Wo bekommt man es?
- **Offizielle Seite (Downloads):** [poiyomi.com/download](https://poiyomi.com/download)
- **Kostenlose Version:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Pro-Version:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## Wie installieren?

Derzeit gibt es zwei Hauptmethoden um Poiyomi in deinem Projekt zu installieren. Die von der VRChat-Community empfohlene Methode ist die Verwendung von **VCC (VRChat Creator Companion)**, aber du kannst auch den klassischen **UnityPackage**-Import verwenden.

### Methode 1: Installation über VCC (Empfohlen)

Die Verwendung von VCC (VRChat Creator Companion) ist der sauberste und empfohlene Weg, Poiyomi zu installieren und zu verwalten, da es dir ermöglicht, den Shader direkt aus der Anwendung einfach zu aktualisieren.

1. **Repository zu VCC hinzufügen:**
   - Am einfachsten gehst du auf die offizielle Downloads-Seite: [poiyomi.com/download](https://poiyomi.com/download).
   - Scrolle nach unten zu „Method 2", finde den Abschnitt **Creator Companion (VCC)** und klicke den **„Add to VCC"**-Button.
   - Dein Browser wird nach Erlaubnis fragen, VCC zu öffnen. Akzeptiere es, und klicke in VCC auf **„I Understand, Add Repository"**.
   - *(Manuelle Alternative)*: Öffne VCC, gehe zu **Settings** -> **Packages**-Tab -> **Add Repository**, füge die URL `https://poiyomi.github.io/vpm/index.json` im entsprechenden Feld ein und klicke **Add**.
2. **Shader zu deinem Projekt hinzufügen:**
   - Navigiere in VCC zum Bereich Projekte und klicke bei dem VRChat-Projekt, in dem du den Shader installieren möchtest, auf **Manage Project**.
   - Im Abschnitt **Selected Repos** (Seitenmenü oder obere Dropdown-Liste der Repositories) stelle sicher, dass **„Poiyomi's VPM Repo"** angekreuzt ist.
   - Suche in der Liste der verfügbaren Pakete für das Projekt nach **„Poiyomi Toon Shader"** und klicke das **[+]**-Symbol rechts, um es hinzuzufügen.
3. **Fertig!** Du kannst nun in VCC auf **Open Project** klicken, und Poiyomi wird in deinem Unity-Projekt verfügbar sein.

> [!NOTE]
> Wenn sich das VCC-Fenster beim Installieren unerwartet schließt, ist das normal. Um es zu beheben, schließe VCC einfach, öffne es erneut und versuche die Installation über VCC nochmal. Du wirst sehen, dass es jetzt korrekt funktioniert.

### Methode 2: Manuelle Installation über .unitypackage

Dies ist die klassische Methode. Beachte, dass es schwieriger ist, in Zukunft zu aktualisieren, und es können Restdateien übrig bleiben, wenn du später zur VCC-Methode wechseln möchtest.

1. Lade die neueste `.unitypackage`-Datei von der Releases-Seite auf [GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases) oder von deinem [Patreon](https://www.patreon.com/poiyomi)-Konto herunter, falls du die Pro-Version verwendest.
2. Öffne das Unity-Projekt, in dem du deinen Avatar importieren möchtest.
3. Importiere im Unity-Fenster das Paket über das obere Menü: **Assets** → **Import Package** → **Custom Package...**
4. Wähle die `.unitypackage`-Datei aus, die du gerade heruntergeladen hast.
5. Ein Fenster erscheint mit einer Liste aller zu importierenden Dateien. Stelle sicher, dass alles ausgewählt ist (du kannst den „All"-Button verwenden) und klicke unten auf **Import**.
6. Warte, bis der Fortschrittsbalken fertig ist, und die Installation ist abgeschlossen. Poiyomi ist bereit, Materialien in deinem Projekt zuzuweisen.

---

## Referenzen

Poiyomi. (n.d.). *Download*. Poiyomi Shaders. Retrieved from https://poiyomi.com/download

Poiyomi. (n.d.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Retrieved from https://github.com/poiyomi/PoiyomiToonShader
