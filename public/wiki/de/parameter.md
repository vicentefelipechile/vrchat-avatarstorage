# Avatar-Parameter (Expression Parameters)

<span class="badge badge-blue">Logik</span> <span class="badge badge-yellow">Optimierung</span>

## Was sind sie?

**Expression Parameters** (oder einfach Parameter) sind Variablen, die als „Speicher" für deinen VRChat-Avatar dienen [1]. Sie fungieren als Brücke zwischen dem **Expressions Menu** (dem radialen Menü im Spiel) und dem **Animator Controller** (der Logik, die Animationen abspielt).

Wenn du eine Option in deinem Menü auswählst (z.B. „Hemd entfernen"), ändert das Menü den Wert eines Parameters (z.B. `Shirt = 0`), und der Animator liest diese Änderung, um die entsprechende Animation auszuführen.

## Parameter-Typen

Es gibt drei Hauptdatentypen, die du verwenden kannst, jeweils mit unterschiedlichem Speicherbedarf [2]:

| Typ       | Beschreibung                 | Speicherbedarf | Übliche Verwendung                                      |
| :-------- | :--------------------------- | :------------- | :------------------------------------------------------ |
| **Bool**  | Wahr oder Falsch (An/Aus).   | 1 Bit          | Einfache Toggles (Kleidung, Props).                     |
| **Int**   | Ganzzahlen (0 bis 255).      | 8 Bits         | Outfit-Wechsel mit mehreren Optionen, Stufen-Slider.    |
| **Float** | Dezimalzahlen (0.0 bis 1.0). | 8 Bits         | Kontinuierliche Slider (Dicke, Farbton, Radial Puppet). |

## Speicherlimit (Synced Bits)

VRChat legt ein striktes Limit von **256 Bits** synchronisierter Daten pro Avatar fest [2].

- **Synchronisiert:** Parameter, deren Wert über das Netzwerk an andere Spieler gesendet wird. Wenn du dein Shirt ausziehst, willst du, dass andere es sehen.
- **Nicht synchronisiert (Lokal):** Parameter, die nur auf deinem PC existieren. Nützlich für interne Logik, die von anderen nicht gesehen werden muss.

> [!WARNING]
> Wenn du das Speicherlimit überschreitest, kannst du den Avatar nicht hochladen oder die zusätzlichen Parameter werden nicht mehr funktionieren. Optimiere, indem du `Bool` anstelle von `Int` verwendest, wann immer möglich.

## Erweiterte Verwendung

Neben der Kleidungssteuerung über das Menü können Parameter auch gesteuert werden durch:

- **PhysBones:** Um zu erkennen, ob jemand dein Ohr oder deine Haare berührt [3].
- **Contacts:** Um Kollisionen zu erkennen (wie bei [SPS](/wiki?topic=sps) oder [PCS](/wiki?topic=pcs) Systemen).
- **OSC:** Um Daten von externen Programmen zu empfangen (wie Herzfrequenzmesser, Face Tracking oder Spotify) [3].

## Wie erstellt man sie

1. Rechtsklicke in deinem Unity-Projekt in `Assets`.
2. Gehe zu `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Füge die benötigten Parameter hinzu (z.B. „Outfit", „Schwert", „HueShift").
4. Weise diese Datei im **VRC Avatar Descriptor**-Komponent deines Avatars zu, im Abschnitt „Expressions".

## Einschränkungen und häufige Probleme

### Warum gibt es ein 256-Bit-Limit?

VRChat legt dieses Limit hauptsächlich zur **Netzwerkoptimierung** fest [1]. Jeder synchronisierte Parameter muss an alle anderen Spieler in der Instanz gesendet werden. Ohne Limit:

- Wäre die benötigte Bandbreite zum Aktualisieren von Position und Zustand von 80 Spielern nicht tragbar.
- Würden Nutzer mit langsamen Verbindungen unter extremem Lag oder Verbindungsabbrüchen leiden.
- Würde die FPS-Leistung durch übermäßige Netzwerkdatenverarbeitung sinken.

### Konflikte mit komplexen Assets (GoGo Loco, SPS, Tänze)

Beim Kombinieren mehrerer „schwerer" Systeme auf einem einzelnen Avatar treten häufig Probleme auf:

1.  **Parameter-Erschöpfung:**
    Assets wie **GoGo Loco** verbrauchen eine beträchtliche Menge Speicher. Wenn du versuchst, SPS, ein komplexes Tanzsystem und Kleidungs-Toggles hinzuzufügen, ist es sehr einfach, 256 synchronisierte Bits zu überschreiten.
    - _Konsequenz:_ VRChat blockiert den Avatar-Upload oder die zuletzt installierten Komponenten funktionieren nicht.

2.  **Logik-Konflikte:**
    - **GoGo Loco:** Kann dazu führen, dass der Avatar im Boden „versinkt" oder schwebt, wenn es Konflikte mit Basis-Locomotion-Layern oder alten Asset-Versionen gibt [4].
    - **SPS (Super Plug Shader):** Die Kombination von SPS mit Constraints kann „Jitter" (schnelles Zittern) an Kontaktpunkten verursachen, weil VRChat Physik- und Haptik-Updates unterschiedlich handhabt [5].

3.  **Performance Rank:**
    - **SPS:** Benötigt oft zusätzliche Lights oder Renderer, die den Performance-Rang des Avatars sofort auf „Very Poor" verschlechtern können.
    - **GoGo Loco:** Fügt mehrere Layer zum Animator Controller hinzu. Obwohl es die Grafik nicht so stark beeinflusst, erhöht es die CPU-Nutzung für die Verarbeitung der Animationslogik [4].

> [!TIP]
> Tools wie **VRCFury** sind essentiell für das Management dieser Konflikte. VRCFury automatisiert das Zusammenführen von Controllern und Parametern („Non-Destructive Workflow"), reduziert menschliche Fehler und optimiert die Speichernutzung wo möglich.

## Optimierung und Tricks: Wie man Bit-Verbrauch reduziert

Um das 256-Bit-Limit nicht zu erreichen, ohne Funktionen zu opfern, verwenden Ersteller verschiedene clevere Techniken. Die häufigste ist das **Kombinieren sich gegenseitig ausschließender Zustände**.

#### Der „Single Int"-Trick

Stell dir vor, du hast 10 verschiedene Hemden für deinen Avatar.

- **Ineffizienter Weg (Bools):** Du erstellst 10 `Bool` Parameter (Shirt1, Shirt2... Shirt10).
  - _Kosten:_ 10 Bits.
  - _Nachteil:_ Du verbrauchst 1 Bit für jedes zusätzliche Kleidungsstück.
- **Effizienter Weg (Int):** Du erstellst **1** einzelnen `Int` Parameter namens `Top_Clothing`.
  - _Kosten:_ 8 Bits (immer, da es ein Int ist).
  - _Vorteil:_ Du kannst bis zu **255 Hemden** mit denselben 8 Bits haben!
  - _Wie es funktioniert:_ Im Animator stellst du ein, dass wenn der Wert 1 ist, Hemd A aktiviert wird; wenn 2, Hemd B, etc.

> [!NOTE]
> **Goldene Regel:** Wenn du mehr als 8 Optionen hast, die nicht gleichzeitig verwendet werden können (z.B. Kleidungstypen, Augenfarben), verwende ein `Int`. Wenn weniger als 8, verwende individuelle `Bool`s.

#### Grundlegendes Konfigurationsbeispiel

Wenn du einen Farbwähler für deine Kleidung erstellen möchtest:

1.  Erstelle einen **Int** Parameter namens `ColorBoots`.
2.  Erstelle in deinem **Expression Menu** ein Untermenü oder ein „Radial Puppet"-Steuerelement (obwohl für exakte Änderungen Buttons mit exakten Werten besser sind).
3.  Konfiguriere die Menü-Buttons:
    - „Rot"-Button -> Setzt `ColorBoots` auf 1.
    - „Blau"-Button -> Setzt `ColorBoots` auf 2.
    - „Schwarz"-Button -> Setzt `ColorBoots` auf 3.
4.  Im **Animator (FX Layer)**:
    - Erstelle Übergänge von `Any State` zu den Farbzuständen.
    - Bedingung für Rot: `ColorBoots` gleich 1.
    - Bedingung für Blau: `ColorBoots` gleich 2.

So steuerst du mehrere Optionen und verbrauchst nur 8 Bits deines Gesamtbudgets!

## Übersichtstabelle: Welchen Typ verwenden?

| Anwendungsfall                                      | Empfohlener Typ | Warum?                                                                       |
| :-------------------------------------------------- | :-------------- | :--------------------------------------------------------------------------- |
| **1 Objekt umschalten** (Brille, Hut)               | `Bool`          | Einfach und direkt. Kostet 1 Bit.                                            |
| **Kleidungswähler** (Hemd A, B, C...)               | `Int`           | Ermöglicht Hunderte Optionen mit nur 8 Bits.                                 |
| **Graduelle Änderungen** (Dicke, Farbe, Helligkeit) | `Float`         | Notwendig für Dezimalwerte (0.0 bis 1.0).                                    |
| **Komplexe Zustände** (Tänze, AFK, Emotes)          | `Int`           | Ideal für State Machines mit mehreren Bedingungen.                           |
| **Unabhängige Toggles** (< 8 Objekte)               | `Bool`          | Wenn wenige und sie sich nicht gegenseitig aufheben, einfacher einzurichten. |

---

## Referenzen

- VRChat. (n.d.). Expression Parameters. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset
- VRChat. (n.d.). Avatar Parameter Driver. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver
- VRChat. (n.d.). OSC Overview. VRChat Documentation. https://creators.vrchat.com/avatars/osc/
- Franada. (n.d.). GoGo Loco Documentation. https://github.com/Franada/goloco
- VRCFury. (n.d.). SPS - Super Plug Shader. VRCFury Documentation. https://vrcfury.com/sps
