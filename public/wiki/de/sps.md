# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Was ist das?
**SPS** (Super Plug Shader), manchmal umgangssprachlich als „SSP" bezeichnet, ist ein kostenloses und modernes Mesh-Verformungssystem für VRChat, das vom **VRCFury**-Team entwickelt wurde. Es ermöglicht Avatar-Teilen, sich bei der Interaktion mit anderen Avataren oder Objekten realistisch zu verformen und ersetzt ältere und kostenpflichtige Systeme wie **DPS** (Dynamic Penetration System) und **TPS** [1].

## Wofür ist es?
- **Realistische Verformung:** Simuliert Penetration und physischen Kontakt durch Verformung des Avatar-Meshes.
- **Optimierung:** Es ist deutlich leichter und effizienter als ältere Systeme.
- **Kostenlos:** Im Gegensatz zu DPS ist SPS komplett kostenlos und Open Source.
- **Kompatibilität:** Funktioniert mit den meisten modernen Shadern (Poiyomi, LilToon, etc.) und ist rückwärtskompatibel mit Avataren, die DPS oder TPS verwenden.

## Voraussetzungen
Stelle vor dem Start sicher, dass du Folgendes hast:
- **Unity:** Die empfohlene Version für VRChat.
- **VRChat SDK:** In deinem Projekt installiert (VCC).
- **VRCFury:** Installiert und auf die neueste Version aktualisiert [2].
- **3D-Modell:** Ein Avatar mit den Meshes, die du animieren möchtest (Sockets oder Plugs).

## Schritt-für-Schritt-Installationsanleitung

SPS wird vollständig über VRCFury-Tools in Unity verwaltet. Du musst keine seltsamen Shader-Pakete importieren oder komplexe manuelle Animationskonfigurationen vornehmen.

### Schritt 1: VRCFury installieren
Falls du es noch nicht hast, installiere VRCFury über den VRChat Creator Companion (VCC).
1. Öffne VCC.
2. Gehe zu „Manage Project".
3. Suche in der Paketliste nach „VRCFury" und klicke installieren (oder füge das Repository hinzu, falls es nicht erscheint).

### Schritt 2: Socket (Öffnung) erstellen
Ein „Socket" ist der Empfänger der Interaktion (Mund, etc.).

1. **Tools:** Gehe in der oberen Leiste von Unity zu `Tools` > `VRCFury` > `SPS` > `Create Socket` [1].
2. **Platzierung:** Ein neues Objekt erscheint in deiner Szene.
   - Ziehe dieses Objekt in die Hierarchie deines Avatars und **mache es zu einem Kind des entsprechenden Bones** (z.B. `Hip` oder `Head`).
3. **Anpassung:** Bewege und rotiere das Socket-Objekt, damit es zum Eingang der Öffnung auf deinem Mesh passt.
   - Der Gizmo-Pfeil muss **nach innen** in die Öffnung zeigen.
   - Stelle sicher, dass der Socket-Typ (im Inspector) dem entspricht, was du willst (z.B. Vagina, Anal, Oral).
4. **Lights:** Du musst ID-Lights nicht manuell konfigurieren; VRCFury erledigt das für dich.

> [!TIP]
> **Platzierungshinweis (ERP)**
> Platziere die Punkte (Sockets) nicht zu tief im Avatar. Wenn das „Loch" zu tief ist, wird ERP unbequem. Es wird empfohlen, sie direkt am Eingang oder leicht nach außen zu platzieren.
>
> **Achtung bei großen Proportionen:** Wenn dein Avatar sehr breite Hüften oder einen sehr großen Hintern hat, **bewege den Socket noch weiter nach außen**. Andernfalls kollidiert die andere Person mit dem Körper-Mesh, bevor sie den Interaktionspunkt „erreichen" kann.

### Schritt 3: Plug (Penetrator) erstellen
Ein „Plug" ist das Objekt, das penetriert und verformt.

1. **Mesh-Vorbereitung:**
   - Stelle sicher, dass dein Penetrator-Mesh in der Ruheposition in Unity „gerade" und „ausgestreckt" ist. SPS muss die Gesamtlänge kennen.
   - Bei Umstellung von DPS/TPS stelle sicher, alte Scripts oder spezielle Materialien zu entfernen. Verwende einen normalen Shader (Poiyomi) [1].
2. **Tools:** Gehe zu `Tools` > `VRCFury` > `SPS` > `Create Plug` [1].
3. **Platzierung:**
   - **Option A (Mit Bones):** Wenn dein Penis Bones hat, ziehe das Plug-Objekt und mache es zu einem Kind des **Basis-Bones** des Penis.
   - **Option B (Ohne Bones):** Wenn es nur ein Mesh (Mesh Renderer) ist, ziehe das Plug-Objekt und lege es direkt auf das Objekt mit dem **Mesh Renderer**.
4. **Konfiguration:**
   - Stelle im Inspector der `VRCFury | SPS Plug`-Komponente sicher, dass der **Renderer** dein Penis-Mesh ist.
   - Passe die Orientierung an: Der gebogene Teil des Gizmos sollte an der Spitze und die Basis an der Basis sein.
   - Konfiguriere den entsprechenden **Typ**.

### Schritt 4: In Unity testen
Du musst den Avatar nicht hochladen, um zu testen, ob es funktioniert.
1. Installiere den **Gesture Manager** über VCC [1].
2. Wechsle in den **Play Mode** in Unity.
3. Wähle den Gesture Manager aus.
4. Gehe im emulierten Expressions-Menü zu den SPS-Optionen.
   - VRCFury generiert automatisch ein Testmenü mit Optionen zum Aktivieren/Deaktivieren und Testen der Verformung.
   - Du kannst einen „Test Socket" über das Tools-Menü erstellen, um die Interaktion in Echtzeit zu testen.

> [!WARNING]
> Warnung: Constraints
> Vermeide die Verwendung von Unity Constraints auf denselben Bones, die SPS verformt, da sie Bewegungskonflikte (Jitter) verursachen können [4].

---

## Referenzen

* VRCFury. (n.d.). SPS (Super Plug Shader). VRCFury Documentation. https://vrcfury.com/sps
* VRCFury. (n.d.). Download & Install. VRCFury Documentation. https://vrcfury.com/download
* VRCD. (n.d.). SPS Tutorial. VRCD. https://vrcd.org.cn
* VRCFury. (n.d.). SPS Troubleshooting. VRCFury Documentation. https://vrcfury.com/sps
