# GoGo Loco aus einem Unity-Projekt entfernen

<span class="badge badge-blue">Logic</span>

## Was ist das?

GoGo Loco ist ein von Franada erstelltes Locomotion-Prefab, das mehrere der Playable Layers des Avatar Descriptors (Base/Locomotion, Additive, Gesture) ersetzt oder modifiziert und eigene Parameter und Einträge in das Expression Menu des Avatars einfügt. Da es so viele miteinander verbundene Teile eines Avatar-Projekts betrifft, erfordert das vollständige Entfernen die Arbeit auf mehreren Ebenen – von Szene-Objekten bis hin zu Projekt-Assets und gegebenenfalls dem VPM-Manifest.

> [!WARNING]
> Erstellen Sie immer ein Backup Ihres Unity-Projekts (oder einen Commit in der Versionskontrolle), bevor Sie mit diesem Prozess beginnen. Viele dieser Schritte löschen oder überschreiben Animator-Controller und Expression-Assets, die möglicherweise von anderen Teilen Ihres Avatars verwendet werden.

## Wofür ist es?

- Ersetzen von GoGo Loco durch ein anderes Locomotion-System (z. B. Modular Avatar Locomotion, WetCat's Locomotion Fix oder die Standard-VRChat-Controller).
- Bereinigen eines gekauften Avatars, bei dem GoGo Loco vorinstalliert war und Sie es nicht möchten.
- Beheben von Konflikten mit NSFW Locomotion oder anderen Paketen, die sich Layer und Parameternamen mit GoGo Loco teilen.
- Reduzierung der Parameternutzung (GoGo Loco verbraucht standardmäßig 16–17 Bit an synchronisiertem Speicher).

## Schritt 1: Das Prefab aus der Szene entfernen

GoGo Loco kann als untergeordnetes GameObject auf dem Root des Avatars installiert werden, insbesondere wenn es über VRCFury oder Modular Avatar eingerichtet wurde.

1. Öffnen Sie die Szene mit Ihrem Avatar im **Hierarchy**-Fenster.
2. Erweitern Sie das Root-GameObject des Avatars.
3. Suchen Sie nach untergeordneten Objekten mit den Namen `GoGo Loco`, `GGL`, `GoGoLoco` oder ähnlich. Wählen Sie es aus und drücken Sie **Delete**.
4. Wenn GoGo Loco über [VRCFury](/wiki?topic=vrcfury) installiert wurde, suchen Sie nach einem untergeordneten Objekt mit einer `VRCFury`-Komponente, die auf ein GoGo Loco-Prefab verweist – löschen Sie dieses Objekt ebenfalls.
5. Wenn es über [Modular Avatar](/wiki?topic=modular-avatar) installiert wurde, suchen Sie nach einem Objekt mit einer `MA Merge Animator`- oder `MA Menu Installer`-Komponente, die auf GoGo Loco-Assets verweist, und löschen Sie es.

> [!NOTE]
> Wenn der Avatar gekauft wurde und GoGo Loco fest integriert war (d. h. es existiert kein separates untergeordnetes GameObject), überspringen Sie diesen Schritt und fahren direkt mit Schritt 2 fort.

## Schritt 2: Die Playable Layers des Avatar Descriptors wiederherstellen

GoGo Loco ersetzt bis zu drei der fünf Playable Layers in der Komponente `VRCAvatarDescriptor`. Sie müssen jede dieser Ebenen entweder den Standard-VRChat-Controllern oder Ihren eigenen Controllern neu zuweisen.

1. Wählen Sie den Avatar in der Hierarchy aus und suchen Sie die Komponente **VRC Avatar Descriptor** im Inspector.
2. Erweitern Sie den Bereich **Playable Layers**.
3. Prüfen Sie bei jedem der folgenden Layer, ob ihm derzeit ein GoGo Loco-Controller zugewiesen ist (Dateinamen beginnen mit `go_` oder enthalten `GoGoLoco/GGL`):

| Layer | GoGo Loco Dateiname (ungefähr) | Standard-Ersatz |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (aus VRCSDK-Beispielen) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (aus VRCSDK-Beispielen) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (aus VRCSDK-Beispielen) |

4. Klicken Sie für jeden betroffenen Layer auf den kleinen Kreis rechts neben dem Feld und weisen Sie den entsprechenden Standard-VRChat-Controller zu, oder weisen Sie Ihren eigenen benutzerdefinierten Controller zu.
5. Wenn Sie die Standard-VRChat-Controller nicht in Ihrem Projekt haben, finden Sie diese unter `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Wenn Ihr Avatar benutzerdefinierte Handgesten hatte, bevor GoGo Loco hinzugefügt wurde, sollten Sie hier anstelle des VRChat-Standards Ihren ursprünglichen Gesture-Layer-Controller wiederherstellen – überprüfen Sie Ihre Versionskontrolle oder Backups.

## Schritt 3: GoGo Loco-Layer aus dem FX-Controller entfernen

Für die Flugfunktion fügt GoGo Loco zwei zusätzliche Layer in den FX Animator Controller des Avatars ein. Diese bleiben auch nach dem Löschen des Prefabs erhalten und müssen manuell entfernt werden.

1. Suchen Sie den FX Animator Controller Ihres Avatars im Project-Fenster und doppelklicken Sie darauf, um das **Animator**-Fenster zu öffnen.
2. Suchen Sie im Bereich **Layers** auf der linken Seite nach Layern mit den Namen `GoGo Fly`, `GoGo Freeze` oder nach Layern, deren Name mit `go_` beginnt.
3. Klicken Sie mit der rechten Maustaste auf jeden GoGo Loco-Layer und wählen Sie **Delete Layer**.
4. Klicken Sie im selben Animator-Fenster auf die Registerkarte **Parameters**.
5. Entfernen Sie jeden Parameter, der zu GoGo Loco gehört. Häufige Parameter sind:

| Parametername | Typ |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Parameter, die mit `go_` oder `Go/` beginnen, sind GoGo Loco-Parameter. Entfernen Sie alle. Parameter wie `VelocityY`, `VRCFaceBlendH`, `Grounded` usw. sind Standard-VRChat-Parameter – entfernen Sie diese **nicht**.

> [!CAUTION]
> Das Löschen eines Parameters, der noch von einem verbleibenden Animationsstatus oder Übergang referenziert wird, bricht diese Status. Überprüfen Sie immer, dass kein Nicht-GoGo-Loco-Layer von einem Parameter abhängt, bevor Sie ihn entfernen.

## Schritt 4: Das Expression Parameters Asset bereinigen

GoGo Loco fügt seine Parameter dem `VRCExpressionParameters`-Asset des Avatars hinzu und verbraucht synchronisierten Speicher. Jeder verbleibende GoGo Loco-Parameter verschwendet Bits.

1. Suchen Sie im Project-Fenster die `.asset`-Datei, die den **Expression Parameters** im Avatar Descriptor zugewiesen ist.
2. Wählen Sie es aus und betrachten Sie die Parameterliste im Inspector.
3. Löschen Sie jeden Eintrag, der einem GoGo Loco-Parameter entspricht (dieselben Namen wie in Schritt 3 aufgeführt).
4. Bestätigen Sie, dass die unten im Inspector angezeigten **Total Cost** nach dem Entfernen sinken.

## Schritt 5: Den GoGo Loco Menüeintrag entfernen

GoGo Loco installiert einen Untermenü-Eintrag im Expression Menu des Avatars.

1. Suchen Sie die `.asset`-Datei, die dem **Expressions Menu** im Avatar Descriptor zugewiesen ist.
2. Wählen Sie es aus und überprüfen Sie die Liste **Controls**.
3. Löschen Sie jeden Eintrag namens `GoGo Loco`, `GGL`, `Loco` oder ähnlich, der mit einem GoGo Loco-Untermenü-Asset verknüpft ist.
4. Öffnen Sie jedes verbleibende Untermenü rekursiv und entfernen Sie alle darin verschachtelten GoGo Loco-Kontrolleinträge.

## Schritt 6: GoGo Loco Asset-Dateien aus dem Projekt löschen

Nachdem Sie GoGo Loco vom Avatar getrennt haben, entfernen Sie die Dateien aus dem Unity-Projekt, um den Ordner `Assets/` sauber zu halten.

1. Suchen Sie im Project-Fenster über die Suchleiste nach `go_` (stellen Sie sicher, dass der Suchbereich auf **All** eingestellt ist).
2. Überprüfen Sie die Ergebnisse – Dateien, die mit `go_` beginnen, sind fast immer GoGo Loco-Assets (Animation Clips, Animator Controllers, Texturen, Materialien für die Menüsymbole).
3. Suchen Sie auch nach `GoGoLoco` und `GGL`, um Dateien mit dem vollständigen Namen zu finden.
4. Wählen Sie alle bestätigten GoGo Loco-Assets aus und drücken Sie **Delete** (oder Rechtsklick → **Delete**).
5. Unity fordert Sie auf, das Löschen zu bestätigen. Akzeptieren Sie.

> [!WARNING]
> Löschen Sie keine Assets, deren Namen mit `go_` beginnen, wenn sie zu Ihrem eigenen Projekt gehören (z. B. ein GameObject oder eine Animation, die Sie so benannt haben). Überprüfen Sie jede Datei vor dem Löschen.

Häufige Ordner für GoGo Loco-Dateien:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Überall dort, wo ein gekaufter Avatar die `.unitypackage` entpackt haben könnte.

Löschen Sie den gesamten Ordner, sobald bestätigt wurde, dass alle enthaltenen Dateien zu GoGo Loco gehören.

## Schritt 7: Das VPM-Paket entfernen (nur bei VCC-Installation)

Wenn GoGo Loco als VPM-Paket über den VRChat Creator Companion installiert wurde, befinden sich die Paketdateien in `Packages/` und nicht in `Assets/` und müssen über VCC oder das Manifest entfernt werden.

### Option A — Über VCC-GUI

1. Öffnen Sie den **VRChat Creator Companion**.
2. Navigieren Sie auf der Registerkarte **Projects** zu Ihrem Projekt und klicken Sie auf **Manage Project**.
3. Suchen Sie in der Paketliste `GoGoLoco` (Paket-ID `com.franada.gogoloco` oder ähnlich).
4. Klicken Sie auf die **Minus (−)**-Schaltfläche oder setzen Sie das Versions-Dropdown auf **Remove** und wenden Sie es an.
5. Öffnen Sie das Projekt erneut in Unity. Der Resolver erkennt das Entfernen und bereinigt den Ordner `Packages/`.

### Option B — Über `vpm-manifest.json` (manuell)

1. Schließen Sie Unity.
2. Öffnen Sie `<IhrProjekt>/Packages/vpm-manifest.json` in einem Texteditor.
3. Löschen Sie den Eintrag für GoGo Loco aus den Objekten `"dependencies"` und `"locked"`.
4. Löschen Sie den physischen Ordner `<IhrProjekt>/Packages/com.franada.gogoloco/` (oder ähnlich).
5. Öffnen Sie Unity erneut. Der Resolver führt einen erneuten Scan durch und bestätigt, dass keine fehlenden Pakete vorhanden sind.

> [!NOTE]
> Durch das Entfernen des VPM-Pakets werden Layer, Parameter, Menüs oder während der Installation hinzugefügte Prefab-Objekte nicht automatisch rückgängig gemacht. Die Schritte 1–6 müssen unabhängig von der verwendeten Installationsmethode dennoch ausgeführt werden.

## Schritt 8: Force Locomotion wieder aktivieren (falls erforderlich)

Wenn GoGo Loco installiert ist, deaktiviert es normalerweise **Force Locomotion animations for 6-point tracking** im Avatar Descriptor, da sein benutzerdefinierter Locomotion-Layer Tracking-Modi intern verwaltet. Nach der Entfernung möchten Sie möglicherweise das Standardverhalten wiederherstellen.

1. Wählen Sie den Avatar aus und öffnen Sie den **VRC Avatar Descriptor** im Inspector.
2. Scrollen Sie nach unten zum Bereich **IK**.
3. Aktivieren Sie das Kontrollkästchen **Force Locomotion animations for 6 point tracking** wieder, wenn Sie den Standard-VRChat Locomotion-Controller verwenden.

> [!TIP]
> Wenn Sie kein Full-Body Tracking (FBT) verwenden, hat dieses Kontrollkästchen keine sichtbaren Auswirkungen und kann in jedem Zustand belassen werden.

## Checkliste zur Überprüfung

Bestätigen Sie alle folgenden Punkte, bevor Sie den Avatar hochladen:

| Prüfung | Wie zu überprüfen |
| :---------------------------------------- | :--------------------------------------------------- |
| Kein GoGo Loco untergeordnetes Objekt in Hierarchy | Überprüfen Sie die Avatar-Hierarchie in der Unity-Szene |
| Playable Layers zeigen auf korrekte Controller | VRC Avatar Descriptor → Bereich Playable Layers |
| Keine `go_`-Layer im FX-Controller | Öffnen Sie FX Animator Controller → Bereich Layers |
| Keine `go_` / `Go/`-Parameter in FX | Öffnen Sie FX Animator Controller → Bereich Parameters |
| Keine GoGo Loco-Einträge in Expression Parameters | Überprüfen Sie die `.asset`-Datei im Inspector |
| Keine GoGo Loco-Einträge im Expression Menu | Überprüfen Sie rekursiv die Root-Menü `.asset`-Datei |
| Keine GoGo Loco-Dateien in `Assets/` | Suchen Sie im Project-Fenster nach `go_`, `GoGoLoco`, `GGL` |
| Kein GoGo Loco-Paket in `vpm-manifest.json` | Öffnen Sie die Datei im Texteditor und suchen Sie nach `gogoloco` |
| Einstellung für Force Locomotion ist beabsichtigt | VRC Avatar Descriptor → Bereich IK |

## Übersichtstabelle

| Was GoGo Loco hinzufügt | Wo zu entfernen |
| :---------------------------------------------- | :------------------------------------------------ |
| Prefab/GameObject auf Avatar Root | Unity Hierarchy → löschen Sie das untergeordnete Objekt |
| Playable Layers Base, Additive, Gesture | VRC Avatar Descriptor → Playable Layers |
| FX Layer (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Bereich Layers |
| FX Parameter (`Go/*`, `VelocityMagnitude`, usw.) | FX Animator Controller → Bereich Parameters |
| Einträge in Expression Parameters | VRCExpressionParameters `.asset` → Liste Controls |
| Untermenü-Eintrag im Expression Menu | VRCExpressionsMenu `.asset` → Liste Controls |
| Asset-Dateien (`go_*.anim`, Controller, Texturen) | Project-Fenster → löschen Sie den GoGoLoco-Ordner |
| VPM-Paketeintrag | VCC GUI oder `vpm-manifest.json` |
| Force Locomotion deaktiviert | VRC Avatar Descriptor → Bereich IK (wiederherstellen) |

## Referenzen

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
