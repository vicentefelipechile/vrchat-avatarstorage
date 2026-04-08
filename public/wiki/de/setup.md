# Schritt-für-Schritt-Anleitung: Unity mit VCC vorbereiten

Befolge diese Schritte BEVOR du deinen heruntergeladenen Avatar importierst

> [!NOTE]
> Hinweis
> Du musst Unity nicht selbst direkt installieren, manipulieren oder verwalten. Die gesamte Projektvorbereitung und Abhängigkeitsinstallation erfolgt innerhalb von VCC. Du öffnest Unity erst am Ende, um deinen Avatar zu importieren und hochzuladen.

### Schritt 1: VRChat Creator Companion (VCC) installieren

Lade den **VRChat Creator Companion** von [vrchat.com/home/download](https://vrchat.com/home/download) herunter. Der **VCC** ist das offizielle Tool, das Unity, das VRChat SDK und alle notwendigen Pakete automatisch verwaltet.

### Schritt 2: Unity Hub und Unity über VCC installieren

Beim ersten Öffnen von VCC wird erkannt, ob Unity installiert ist. Folge dem Einrichtungsassistenten, damit **Unity Hub** installiert wird und dann die korrekte Version von **Unity** heruntergeladen wird, die VRChat benötigt (derzeit die 2022.3-Serie). Lass VCC beide Programme automatisch installieren.

### Schritt 3: Ein neues Avatar-Projekt erstellen

Öffne VCC → **Projects** → **Create New Project**. Wähle die Vorlage **„Avatars"**. Gib ihm einen Namen (z.B. „Meine VRChat Avatare"). VCC bereitet dein Projekt automatisch mit dem **VRChat SDK** vor.

### Schritt 4: Poiyomi Repository hinzufügen

Gehe in VCC zu **Settings** → **Packages** → **Add Repository**. Füge diese URL ein: [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) und klicke „Add". Dies ermöglicht dir die einfache Installation von **Poiyomi**, was wichtig ist, damit Avatar-Texturen richtig aussehen. Weitere Details findest du in unserem [Leitfaden zu Poiyomi](/wiki?topic=poiyomi).

### Schritt 5: VRCFury Repository hinzufügen (Optional)

Falls dein Avatar es benötigt, gehe zu **Settings** → **Packages** → **Add Repository** und füge ein: [https://vcc.vrcfury.com](https://vcc.vrcfury.com), dann klicke „Add". **VRCFury** macht die Installation von Kleidung und Accessoires per Drag-and-Drop einfach. Wir empfehlen den [Leitfaden zu VRCFury](/wiki?topic=vrcfury) für weitere Informationen.

### Schritt 6: Pakete in deinem Projekt installieren

Wähle in VCC dein neu erstelltes Projekt → **Manage Project**. Suche nach **„Poiyomi Toon Shader"** und klicke den **„+"**-Button, um es hinzuzufügen. Falls du VRCFury brauchst, füge es ebenfalls mit dem gleichen Button hinzu. Klicke **„Apply"** oder warte einfach, bis es geladen ist.

### Schritt 7: Projekt öffnen und Avatar importieren

Klicke im VCC-Projektmenü auf **„Open Project"**, um Unity zum ersten Mal zu öffnen (es kann eine Weile dauern). Sobald geöffnet, importiere deinen Avatar: ziehe die **.unitypackage**-Datei in das Unity-Fenster (in den `Project`- oder `Assets`-Tab) oder verwende **Assets → Import Package → Custom Package**.

### Schritt 8: Überprüfen und Konfigurieren

Ziehe den **Avatar-Prefab** in die Szene. Wenn alles korrekt ist und Poiyomi installiert ist, wirst du **KEINE magentafarbenen (pinken) Materialien** sehen. Konfiguriere den Avatar über **VRChat SDK → Show Control Panel → Builder**. Behebe Fehler mit **„Auto Fix"** und lade hoch mit **„Build & Publish"**.

> [!TIP]
> Wichtiger Tipp
> VCC vereinfacht ALLES. Du musst nicht mehr die richtige Unity-Version im Internet suchen oder dich mit Inkompatibilitäten herumschlagen. Verwende VCC immer als zentralen Hub zur Verwaltung deiner VRChat-Projekte.

---

## Referenzen

- VRChat Inc. (n.d.). VRChat Creator Companion. VRChat. https://vrchat.com/home/download
- Unity Technologies. (n.d.). Unity Hub. Unity. https://unity.com/download
- Poiyomi. (n.d.). Poiyomi Toon Shader. GitHub. https://github.com/poiyomi/PoiyomiToonShader
- VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
