# Modular Avatar

<span class="badge">TOOL</span>

## Was ist das?

Modular Avatar ist eine Sammlung von **nicht-destruktiven** Werkzeugen zur Modularisierung deiner VRChat-Avatare und Verteilung von Avatar-Komponenten. Mit Modular Avatar ist das Hinzufügen eines neuen Outfits oder Gimmicks zu deinem Avatar so einfach wie Drag-and-Drop.

> [!NOTE]
> Modular Avatar arbeitet über das **Non-Destructive Modular Framework (NDMF)**-System, das den Avatar zur Build-Zeit verarbeitet, ohne deine Originaldateien zu verändern.

## Wofür ist es?

- Ein-Klick-Installation von Kleidung und Accessoires per **Drag-and-Drop**
- Animator-Organisation: teilt den FX-Animator in mehrere Sub-Animatoren auf und führt sie zur Laufzeit zusammen
- Automatische VRChat-Menükonfiguration
- **Toggle**-System zum Aktivieren/Deaktivieren von Objekten und Blendshapes
- Reaktive Komponenten, die auf Änderungen im Avatar reagieren
- Prefab-Verteilung mit automatischer Installation

## Hauptfunktionen

| Funktion                       | Modular Avatar       | VRCFury        |
| ------------------------------ | -------------------- | -------------- |
| **Outfit-Installation**        | Ja (Drag-and-Drop)   | Ja (Ein-Klick) |
| **Toggle-System**              | Ja (erweitert)       | Ja (einfach)   |
| **Animator-Organisation**      | Ja (Zusammenführung) | Nein           |
| **Automatische Menüs**         | Ja (komplett)        | Ja (einfach)   |
| **Nicht-destruktiver Prozess** | Ja (NDMF)            | Ja             |
| **Blendshape-Sync**            | Ja                   | Nein           |
| **Bone Proxy**                 | Ja                   | Nein           |

### Komponentenbeschreibungen

| Komponente          | Beschreibung                                                                                                                                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Merge Armature**  | Führt Prefab-Armaturen in den übergeordneten Avatar zusammen, üblich beim Hinzufügen von Kleidung. MA minimiert die Anzahl erstellter Bones und verwendet bestehende wieder, wenn möglich. |
| **Merge Animator**  | Führt Sub-Animatoren in den übergeordneten Avatar zusammen, nützlich für verschiedene Arten von Avatar-Gimmicks.                                                                           |
| **Object Toggle**   | Erstellt Menüeinträge zum Aktivieren oder Deaktivieren von Objekten. Kann auch Blendshapes beim Umschalten aktualisieren.                                                                  |
| **Blendshape Sync** | Synchronisiert die Blendshapes von Kleidung oder Accessoires mit dem Basis-Avatar, wenn du die Körperform anpasst.                                                                         |
| **Bone Proxy**      | Ermöglicht das Hinzufügen einzigartiger Props wie Waffen oder Spezialeffekte, die direkt an Avatar-Bones befestigt werden.                                                                 |
| **Menu System**     | Komplettes Menüsystem zur Bearbeitung deines Avatars aus dem VRChat-Menü.                                                                                                                  |

> [!TIP]
> Modular Avatar ist besonders nützlich, wenn du Kleidung oder Accessoires als Prefabs verteilen möchtest. Benutzer müssen das Prefab nur auf ihren Avatar ziehen und MA erledigt alles automatisch.

## Wo bekommt man es?

- **Offizielle Seite:** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **Dokumentation:** [Modular Avatar Dokumentation](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub:** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord:** [Discord Community](https://discord.gg/dV4cVpewmM)

## Wie installieren?

### Installation über VCC (VRChat Creator Companion)

1. Repository zu VCC hinzufügen:
   - Klicke: [Modular Avatar zu VCC hinzufügen](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - Oder gehe zu **Settings** → **Packages** → **Add Repository**, füge die URL `https://vpm.nadena.dev/vpm.json` ein und klicke **Add**
2. Gehe zu **Manage Project** für dein Projekt
3. Suche in der Paketliste nach **Modular Avatar** und klicke **[+]**, um es hinzuzufügen
4. Klicke in VCC auf **Open Project**

## Wie benutzt man es?

### Einen einfachen Toggle erstellen

1. Rechtsklicke auf deinen Avatar in Unity
2. Wähle **Modular Avatar → Create Toggle**
3. Ein neues GameObject wird erstellt mit den Komponenten **Menu Item**, **Menu Installer** und **Object Toggle**
4. Klicke in der **Object Toggle**-Komponente auf den **+**-Button, um einen Eintrag hinzuzufügen
5. Ziehe das Objekt, das du umschalten möchtest, in das leere Feld
6. Fertig! Der Toggle erscheint automatisch im Menü deines Avatars

### Ein Outfit installieren

1. Ziehe das Outfit-Prefab auf deinen Avatar
2. Rechtsklicke auf das Outfit und wähle **ModularAvatar → Setup Outfit**
3. MA konfiguriert automatisch die Armatur und Animationen

> [!TIP]
> Du kannst das offizielle Tutorial in der [Modular Avatar Dokumentation](https://modular-avatar.nadena.dev/docs/tutorials) ansehen.

## Beziehung zu anderen Tools

> [!TIP]
> Siehe die Vergleichstabelle oben für die Unterschiede zwischen Modular Avatar und VRCFury.

Modular Avatar und VRCFury sind **komplementäre Tools**. Viele moderne Outfits bieten Unterstützung für beide. Prüfe die Outfit-Dokumentation, um zu sehen, welche Methode der Ersteller empfiehlt.

- **[VRCFury](/wiki?topic=vrcfury)**: Fokussiert sich auf Animations- und Gesteninstallation.
- **NDMF (Non-Destructive Modular Framework)**: Basis-Framework, das nicht-destruktive Verarbeitung ermöglicht. Wird automatisch mit Modular Avatar installiert.

---

## Referenzen

Modular Avatar. (n.d.). _Modular Avatar_. Nadena Dev. Retrieved from https://modular-avatar.nadena.dev/

Modular Avatar. (n.d.). _Tutorials_. Nadena Dev. Retrieved from https://modular-avatar.nadena.dev/docs/tutorials

bd\_. (2026). _bdunderscore/modular-avatar_ [Software]. GitHub. Retrieved from https://github.com/bdunderscore/modular-avatar
