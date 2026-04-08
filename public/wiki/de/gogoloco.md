# Gogo Loco

<span class="badge">EMPFOHLEN</span>

## Was ist das?

Gogo Loco ist ein fortschrittliches Locomotion-System für VRChat-Avatare, erstellt von **franada** [1]. Es ermöglicht Desktop- und VR-Nutzern ohne „Full Body Tracking" den Zugang zu Posing-, Flug- und Avatar-Anpassungsfunktionen, die normalerweise nicht verfügbar wären.

## Wofür ist es?

- **Statische Posen:** Ermöglicht Sitzen, Liegen und das Ausführen verschiedener künstlerischer Posen überall.
- **Full Body Simulation:** Enthält Animationen, die Bein-Tracker simulieren.
- **Fliegen:** Ermöglicht das Fliegen in Welten mit Kollisionen oder Sprungbeschränkungen.
- **Höhenanpassung:** Ermöglicht das Skalieren der Avatar-Größe im Spiel.
- **Stationärer Modus:** Ermöglicht das visuelle Bewegen deines Avatars, ohne dich physisch zu bewegen (nützlich für Fotos).

> [!NOTE]
> Hinweis
> Obwohl es manuell installiert werden kann, wird dringend empfohlen, **VRCFury** zu verwenden, um die Installation zu erleichtern und Konflikte mit anderen Menüs zu vermeiden.

## Wo bekommt man es?

- [GitHub - Gogo Loco (Kostenlos)](https://github.com/Franada/goloco)
- [Gumroad - Gogo Loco (Unterstütze den Ersteller)](https://franadavrc.gumroad.com/l/gogoloco)

## Kann es zu Modellen hinzugefügt werden, die es nicht haben?

Ja, **Gogo Loco** kann praktisch jedem Avatar hinzugefügt werden, vorausgesetzt, eine Hauptanforderung ist erfüllt:

- **Es muss ein humanoider Avatar sein** (oder sein Rig muss in Unity als humanoid konfiguriert sein).

„Generische" oder nicht-humanoide Avatare (wie schwebende Objekte, komplexe Spinnen ohne menschliches Skelett, etc.) können Probleme haben oder nicht korrekt funktionieren, da Gogo Loco spezifische menschliche Bones (Hüften, Beine, Rücken) manipuliert.

## Voraussetzungen

Stelle vor dem Start sicher, dass du Folgendes hast:

- **Unity:** Die empfohlene Version für VRChat (derzeit 2022.3.22f1 oder ähnlich).
- **VRChat SDK:** In deinem Projekt installiert (VCC).
- **Gogo Loco:** Die heruntergeladene `.unitypackage`-Datei (kostenlose oder kostenpflichtige Version).
- **VRCFury (Optional aber empfohlen):** Für einfache Installation.
- **Avatar 3.0 Manager (Optional):** Für manuelle Installation.

## Schritt-für-Schritt-Installationsanleitung

Es gibt zwei Hauptmethoden, um Gogo Loco auf deinem Avatar zu installieren. Wähle die, die am besten zu deinen Bedürfnissen passt.

---

### Methode 1: Mit VRCFury (Empfohlen und Einfach)

Dies ist die einfachste, am stärksten automatisierte und am wenigsten fehleranfällige Methode [3].

1. **VRCFury installieren:** Stelle sicher, dass **VRCFury** über den VRChat Creator Companion (VCC) in deinem Projekt installiert ist.
2. **Gogo Loco importieren:** Ziehe die Gogo Loco `.unitypackage`-Datei in den `Assets`-Ordner deines Projekts oder doppelklicke sie zum Importieren.
3. **Prefab finden:**
   - Navigiere im Unity `Project`-Fenster zum Ordner: `Assets/GoGo/Loco/Prefabs`.
   - Suche das Prefab namens **GoGo Loco Beyond**.
     - _Hinweis:_ „Beyond" enthält Flug-, Skalierungs- und Posing-Funktionen. Wenn du nur einige Funktionen willst, erkunde die anderen Ordner.
4. **Auf Avatar installieren:**
   - Ziehe das **GoGo Loco Beyond**-Prefab und **lege es direkt auf deinen Avatar** in der Hierarchie (`Hierarchy`). Das Prefab sollte ein „Kind" deines Avatars werden.
   - Fertig! Du musst nichts weiter konfigurieren.
5. **Hochladen:** Beim Hochladen deines Avatars zu VRChat erkennt VRCFury das Prefab und führt automatisch alle notwendigen Controller, Menüs und Parameter zusammen.

---

### Methode 2: Manuelle Installation mit Avatar 3.0 Manager

Wenn du VRCFury nicht verwenden möchtest oder volle Kontrolle benötigst, verwende dieses Tool, um menschliche Fehler beim Kopieren von Parametern und Layern zu vermeiden [4].

1. **VRLabs Avatar 3.0 Manager:** Lade dieses kostenlose Tool herunter und importiere es (verfügbar auf GitHub oder VCC).
2. **Gogo Loco importieren:** Importiere das Paket in Unity.
3. **Avatar 3.0 Manager öffnen:** Gehe zum oberen Menü `VRLabs` -> `Avatar 3.0 Manager`.
4. **Avatar auswählen:** Ziehe deinen Avatar in das „Avatar"-Feld des Tools.
5. **Controller zusammenführen (FX):**
   - Erweitere im „FX"-Bereich die Optionen.
   - Klicke auf **„Add Animator to Merge"**.
   - Wähle den Gogo Loco FX Controller (normalerweise in `GoGo/Loco/Controllers`).
   - Klicke auf **„Merge on Current"**. Dies kombiniert Gogo Locos Layer mit deinen, ohne sie zu überschreiben.
6. **Parameter kopieren:**
   - Gehe zum **„Parameters"**-Tab des Managers.
   - Wähle die Option **„Copy Parameters"**.
   - Wähle die Gogo Loco Parameterliste als Quelle und kopiere sie zu deinem Avatar.
7. **Menü hinzufügen:**
   - Gehe zum **VRChat Avatar Descriptor** deines Avatars im Inspector.
   - Finde den **Expressions Menu**-Bereich.
   - Öffne dein Hauptmenü (Doppelklick auf die Datei).
   - Füge ein neues Steuerelement hinzu (Control -> Add Control).
   - Benenne es „Gogo Loco".
   - Typ: **Sub Menu**.
   - Parameter: Keiner.
   - Sub Menu: Ziehe hier das `GoGo Loco Menu` (oder `GoGo Loco All`) Menü hinein.
8. **Action & Base Layer (Optional):**
   - Wenn du die benutzerdefinierten Sitz- und „AFK"-Animationen willst, wiederhole den Zusammenführungsschritt für die **Action**- und **Base**-Layer im Avatar Descriptor.

> [!WARNING]
> Warnung: Write Defaults
> Gogo Loco funktioniert normalerweise am besten mit **Write Defaults OFF** [1]. Wenn dein Avatar „Mixed Write Defaults" verwendet (eine Mischung aus AN und AUS), könntest du seltsames Verhalten erleben. VRCFury behebt dies normalerweise automatisch, aber bei der manuellen Methode musst du vorsichtig sein.

---

## Referenzen

- Franada. (n.d.). Gogo Loco. GitHub. https://github.com/Franada/goloco
- Franada. (n.d.). Gogo Loco. Gumroad. https://franadavrc.gumroad.com/l/gogoloco
- VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
- VRLabs. (n.d.). Avatar 3.0 Manager. GitHub. https://github.com/VRLabs/Avatars-3-0-Manager
