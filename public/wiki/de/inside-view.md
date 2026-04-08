# Inside View

<span class="badge badge-blue">Visuell</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## Was ist das?

**Inside View**, erstellt von **Liindy** [1], ist ein Asset für VRChat-Avatare, das ermöglicht, das Innere eines Meshes (wie eine SPS-Öffnung) zu sehen, indem simulierte visuelle Tiefe hinzugefügt wird.

Im Gegensatz zum einfachen Löschen der Rückseiten des Meshes (Backface Culling) verwendet Inside View einen „Screen Shader", der eine Tiefentextur in die Öffnung projiziert und so eine realistische Innere-Illusion erzeugt, ohne komplexe interne Geometrie modellieren zu müssen. Es wird häufig zusammen mit Systemen wie [SPS](/wiki?topic=sps) verwendet, um die Visualisierung während ERP zu verbessern.

## Hauptfunktionen

- **Simulierte Tiefe:** Erzeugt die Illusion eines Tunnels oder detaillierten Inneren.
- **Optimiert:** Verwendet Shader, um schwere zusätzliche Geometrie zu vermeiden.
- **SPS-Integration:** Entwickelt für die Zusammenarbeit mit SPS-Penetrationen [3].
- **Einfache Installation:** Kompatibel mit **VRCFury** für eine „Drag-and-Drop"-Einrichtung.

## Voraussetzungen

- **Unity:** Empfohlene Version für VRChat (derzeit 2022.3.22f1 oder ähnlich) [1].
- **VRChat SDK 3.0:** (Avatars) Über VCC heruntergeladen [1].
- **VRCFury:** Notwendig für die automatische Installation.
- **Poiyomi Toon Shader:** (Optional aber empfohlen) Version 8.1 oder höher für Materialkompatibilität [2].

## Installationsanleitung

> [!NOTE]
> Diese Anleitung geht von der Verwendung von **VRCFury** aus, was die vom Ersteller offiziell empfohlene Methode ist.

### Schritt 1: Importieren

Sobald du das Paket (kostenlos oder kostenpflichtig) von Jinxxy oder Gumroad erworben hast:

1. Öffne dein Unity-Projekt mit dem SDK und bereits installiertem VRCFury.
2. Importiere das **Inside View** `.unitypackage`.

### Schritt 2: Platzierung (VRCFury)

1. Suche das Inside View Prefab im Asset-Ordner (normalerweise `Assets/Liindy/Inside View`).
2. Ziehe das Prefab und lege es in die Hierarchie deines Avatars.
   - **Wichtig:** Platziere es als „Kind" des Bones oder Objekts, wo sich die Öffnung (oder der SPS Socket) befindet.
3. Stelle sicher, dass das SPS-„Socket"-Objekt und „Inside View" an der gleichen Position und Rotation ausgerichtet sind.

### Schritt 3: Tiefenkonfiguration

Das Asset funktioniert über eine Tiefenanimation.

1. Wähle die VRCFury-Komponente auf dem Inside View Prefab.
2. Überprüfe, dass es auf den korrekten **Renderer** (Mesh) deiner Öffnung zeigt.
3. Beim Hochladen des Avatars wird VRCFury automatisch die notwendigen Menüs und Logik zusammenführen.

### Zusätzliche Hinweise

- **Parameterkosten:** Die „Full"-Version kann bis zu 35 Bits Parameterspeicher verwenden, während die „Standard"-Version circa 17 verwendet. Berücksichtige dies, wenn dein Avatar bereits viele Parameter hat [1].
- **Backface Culling:** Stelle sicher, dass dein Öffnungsmaterial „Cull" auf „Off" oder „Back" gemäß den Shader-Anweisungen gesetzt hat, damit der Effekt aus dem korrekten Winkel sichtbar ist.

---

## Referenzen

- Liindy. (n.d.). Inside View (VRCFury). Jinxxy. https://jinxxy.com/Liindy/InsideView
- Liindy. (n.d.). Inside View. Gumroad. https://jinxxy.com/Liindy/InsideView
