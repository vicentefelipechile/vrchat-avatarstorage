# Esska Desktop Puppeteer

<span class="badge">HILFSMITTEL</span>

## Was ist das?

**Esska Desktop Puppeteer** ist ein fortschrittliches Tool für Desktop-Nutzer in VRChat, erstellt von **Esska**. Es besteht aus einem zweiteiligen System (einer Desktop-App und einem Avatar-Paket), das dir ermöglicht, bestimmte Körperteile deines Avatars mit der Computermaus zu steuern und damit ein Maß an Präzision und Ausdruckskraft bietet, das normalerweise nur VR-Nutzern (Virtual Reality) zur Verfügung steht.

## Wofür ist es?

- **Gliedmaßensteuerung:** Ermöglicht es, Arme und Hände deines Avatars unabhängig und präzise direkt mit der Maus zu bewegen.
- **Benutzerdefinierte Teile:** Erleichtert die Steuerung zusätzlicher Avatar-Teile wie Ohren, Schwänze oder Accessoires.
- **VR-Simulation am Desktop:** Das Hauptziel ist es, Desktop-Nutzern eine Bewegungsfreiheit zu geben, die sie so aussehen lässt, als würden sie in VR spielen.
- **Head Tracking:** Es bietet Unterstützung für TrackIR-Geräte, sodass der Kopf deines Avatars sich entsprechend deiner realen Bewegungen bewegt.

> [!NOTE]
> Hinweis
> Dieses Tool verwendet **OSC (Open Sound Control)**, um Parameter von der Desktop-Anwendung an deinen VRChat-Client zu senden. Stelle sicher, dass du die OSC-Option im VRChat-Radialmenü aktiviert hast.

## Wo bekommt man es?

- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Voraussetzungen

Bevor du beginnst, stelle sicher, dass Folgendes erfüllt ist:

- **Betriebssystem:** Windows 10 oder Windows 11.
- **Software:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0) auf deinem PC installiert.
  - _Download-Anleitung:_ Wenn du auf den Link klickst, suche den Abschnitt „**.NET Desktop Runtime**". In der kleinen Tabelle darunter, in der Zeile „Windows", klicke auf den **x64**-Link, um den Installer herunterzuladen.
- **Hardware:** Eine Maus mit mittlerer Taste (Scrollrad).
- **VRChat SDK:** In deinem Unity-Projekt installiert (über VCC).
- **Avatar:** Ein kompatibler humanoider Avatar (funktioniert am besten mit Standard-Menschenproportionen).

## Schritt-für-Schritt-Installationsanleitung

Der Installationsprozess ist in zwei Hauptteile unterteilt: die Vorbereitung des Avatars in Unity und die Einrichtung der Desktop-Anwendung.

### Teil 1: Installation auf dem Avatar (Unity)

1. **Paket importieren:** Lade das „Base Package" von der offiziellen Seite herunter und ziehe die `.unitypackage`-Datei in den `Assets`-Ordner deines Unity-Projekts.
2. **Zum Avatar hinzufügen:** Finde das im Esska Desktop Puppeteer-Paket enthaltene Prefab und ziehe es in der `Hierarchy` auf deinen Avatar.
3. **Parameter-Konfiguration:** Das System verwendet OSC-Parameter. Stelle sicher, dass dein Avatar genügend Parameter-Speicher (Parameters Memory) hat, um die neuen Steuerungselemente aufzunehmen.
4. **Avatar hochladen:** Sobald das Prefab korrekt positioniert und konfiguriert ist, lade deinen Avatar wie gewohnt zu VRChat hoch.

### Teil 2: Desktop-Anwendung einrichten

1. **App herunterladen:** Lade die „Esska Desktop Puppeteer App"-Anwendung herunter.
2. **Ausführen:** Öffne die Anwendung auf deinem PC vor oder während deiner VRChat-Sitzung.
3. **OSC in VRChat aktivieren:** Öffne in VRChat dein Radialmenü, gehe zu `Options` -> `OSC` und stelle sicher, dass es auf **Enabled** gesetzt ist.
4. **Verwendung:** Verwende deine Maustasten (besonders die mittlere Taste) und die Tastatur gemäß den Anweisungen der Anwendung, um die Gliedmaßen deines Avatars zu bewegen.

> [!WARNING]
> Warnung: Datenschutz und Steuerung
> Die Anwendung muss deine Tastatur- und Mauseingaben „abhören" (globale Hooks), um funktionieren zu können, während das VRChat-Fenster aktiv ist. Der Ersteller erklärt, dass keine persönlichen Daten gesammelt werden, aber es ist wichtig zu wissen, wie das Programm funktioniert, um Störungen mit anderen Anwendungen zu vermeiden.

---

## Referenzen

- Esska. (n.d.). Esska Desktop Puppeteer. BOOTH. https://esska.booth.pm/items/6366670
