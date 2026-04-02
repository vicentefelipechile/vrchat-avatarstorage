# SyncDances

<span class="badge">TOOL</span>

## Was ist das?
SyncDances ist ein Unity-Prefab für VRChat, das Avataren ermöglicht, in perfekter Synchronisation zu tanzen. Wenn ein Spieler einen Tanz startet, tanzen alle, die das System installiert haben, gleichzeitig mit.

> [!NOTE]
> SyncDances wurde vom [CuteDancer](https://github.com/Krysiek/CuteDancer)-Prefab inspiriert.

## Wofür ist es?
- Synchronisierte Tänze zwischen mehreren Spielern in VRChat
- Sender-Empfänger-System, bei dem einer steuert und die anderen folgen
- Tanzgeschwindigkeitssteuerung (synchronisiert)
- 24 Slots für benutzerdefinierte Tänze

## Hauptfunktionen

| Funktion | Beschreibung |
|----------|-------------|
| **Synchronisation** | Alle Spieler mit dem System tanzen gleichzeitig |
| **Geschwindigkeitssteuerung** | Du kannst Tänze beschleunigen, verlangsamen oder einfrieren |
| **Benutzerdefinierte Slots** | 24 Plätze für eigene Tänze |
| **Quest-Kompatibilität** | Funktioniert auf Quest (aber nicht empfohlen) |
| **Mehrere Versionen** | Verfügbar für VRCFury und Modular Avatar |

## Verfügbare Versionen

| Version | Preis | Beschreibung |
|---------|-------|-------------|
| **Original** | 600 JPY | Originaldateien |
| **Mit Support** | 1000 JPY | Dateien + Ersteller-Support |
| **DLC** | 350 JPY~ | Zusätzlicher Inhalt |

## Voraussetzungen

- **VRCFury** im Projekt installiert (empfohlen)
- Optional: **Modular Avatar** für automatische Installation

## Installation

### Methode mit VRCFury (Empfohlen)

1. Lade die Datei `SyncDancesPrefab PC (VRCFURY)` aus dem Paket herunter
2. Ziehe das Prefab per Drag-and-Drop auf deinen Avatar in Unity
3. Fertig! Der Avatar ist bereit zum Hochladen

> [!IMPORTANT]
> Installiere nicht die einzelnen Item-Dateien — nur das Haupt-Prefab.

### Modular Avatar Version

Wenn du Modular Avatar statt VRCFury bevorzugst:
- Finde die spezifische Version unter: [SyncDances Modular Avatar](https://booth.pm/en/items/6311129)

## Wie benutzt man es

1. Installiere das Prefab auf deinem Avatar
2. Verwende das VRChat-Menü, um einen Tanz auszuwählen
3. Wenn du der „Sender" bist, tanzen die anderen („Empfänger") synchronisiert

### Sender-Empfänger-System

- **Ein Spieler fungiert als Antenne (Sender)** — steuert, welcher Tanz abgespielt wird
- **Andere sind Empfänger** — empfangen das Signal und tanzen synchron

> [!TIP]
> Um die Übertragungsreichweite zu erhöhen, bringe alle Sender und Empfänger zusammen. Aber Vorsicht! Dies kann aufgrund eines VRChat-Bugs zu Abstürzen führen.

## Enthaltene Tänze

SyncDances enthält mehrere vorkonfigurierte Tänze. Einige der bekannten Ersteller sind:

| Tanz | Ersteller |
|------|----------|
| El bicho | THEDAO77 |
| Chainsaw | THEDAO77 |
| Ankha | THEDAO77 |
| Sad Cat | Evendora |
| Crisscross | (Ratten-Meme) |
| PUBG | Toca Toca |

> [!NOTE]
> Mehr als die Hälfte der Tänze wurde zufällig im Internet gefunden. Wenn du einen der enthaltenen Tänze erstellt hast, kontaktiere den Ersteller, um Credit zu erhalten.

## Geschwindigkeitssteuerung

Ab Version 4.0 enthält SyncDances eine Geschwindigkeitssteuerung:
- **0%**: Eingefroren
- **100%**: Normalgeschwindigkeit
- **Über 100%**: Beschleunigter Tanz

> [!WARNING]
> Die Geschwindigkeitssteuerung funktioniert NICHT mit Personen, die SyncDances 3.1 oder älter verwenden. Sie werden die Tänze stattdessen mit Standardgeschwindigkeit ausführen.

## Parameter und Performance

| Aspekt | PC | Quest |
|--------|-----|-------|
| **Contacts** | 16 | 12 |
| **Audio Sources** | 1 | 0 (Lite) |
| **Parameter Bits (Geschwindigkeit)** | 18 Bits | N/A |
| **Parameter Bits (Standard)** | 10 Bits | N/A |

## Updates

### Version 4.5
- Verbesserte Rückwärtskompatibilität (2.x und 3.x synchronisieren korrekt)
- Custom Emote 2 und Custom Emote 21 behoben
- 16 neue Slots für benutzerdefinierte Emotes (jetzt 24 insgesamt)

### Version 4.2
- Benutzerdefinierte Menüs behoben
- Modular Avatar-Kompatibilität behoben
- Menüs für Custom 9-17 und 18-24 hinzugefügt

### Version 3.1
- Contacts von 114 auf nur 16 reduziert
- Audio Sources von 32 auf 1 reduziert
- 15 neue Tänze und 8 Slots für benutzerdefinierte hinzugefügt

## Häufige Fehler

### Spieler synchronisieren nicht
- Überprüfe, ob alle die gleiche Version von SyncDances haben
- Stelle sicher, dass der Sender in Reichweite ist
- Spieler mit 3.1 können die Geschwindigkeit nicht steuern

### Avatar friert ein
- Kann an Versionsinkompatibilität liegen
- Überprüfe, ob das Prefab korrekt installiert ist

### Benutzerdefinierte Emotes funktionieren nicht
- Überprüfe, ob du den richtigen Slot verwendest
- Einige Emotes erfordern installiertes VRCFury

## Unterschied zu OpenSyncDance

| Funktion | SyncDances | OpenSyncDance |
|----------|------------|---------------|
| **Preis** | Kostenpflichtig (600-1000 JPY) | Kostenlos |
| **Code** | Geschlossen | Open Source |
| **Geschwindigkeitssteuerung** | Ja | Nein |
| **Entwicklung** | Aktiv | Aktiv |
| **Support** | Discord des Erstellers | Community |

## Zusätzliche Ressourcen

- **Kauf:** [BOOTH - SyncDances 4.5](https://booth.pm/en/items/4881102)
- **SyncDances Modular Avatar:** [BOOTH](https://booth.pm/en/items/6311129)
- **DLC:** [BOOTH](https://booth.pm/en/items/7423127)
- **Discord:** Kinimara (Ersteller)

---

## Referenzen

Kinimara. (2025). *SyncDances 4.5*. BOOTH. https://booth.pm/en/items/4881102

Krysiek. (2022). *CuteDancer*. GitHub. https://github.com/Krysiek/CuteDancer
