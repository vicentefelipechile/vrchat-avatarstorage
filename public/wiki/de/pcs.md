# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">Audio</span>

## Was ist das?

**PCS** (Penetration Contact System), erstellt von **Dismay** [1], ist ein ergänzendes System für VRChat-Avatare, das **Contacts** (Contact Sender und Receiver) verwendet, um erweiterte Interaktivität bei sexuellen Beziehungen (ERP) hinzuzufügen.

Seine Hauptfunktion ist die Erzeugung von **auditivem Feedback** (Sounds). Optional ermöglicht es die Steuerung realer Sexspielzeuge über Vibration (Haptik) [3][4].

### Hauptunterschied

- **Ohne OSC (Basis):** Das System spielt „Klaps"-, „Gleit"- und Flüssigkeitsgeräusche im Spiel ab. Alle in der Nähe können es hören. Es funktioniert autonom in VRChat [1].
- **Mit OSC (Erweitert/Optional):** Sendet Daten außerhalb von VRChat, um Sexspielzeuge (Lovense, etc.) synchron mit der Penetration vibrieren zu lassen.

## Grundfunktionalität (Sound)

Dies ist die Standardfunktion von PCS und **erfordert keine externe Software**.

1. **Erkennung:** Die „Receiver" (Öffnungen) erkennen, wenn ein „Sender" (Penis/Penetrator) in sie eindringt.
2. **Dynamischer Sound:**
   - Beim Reiben am Eingang: Reibe- oder „Klaps"-Geräusche.
   - Bei Penetration: Reibungs-/Flüssigkeitsgeräusche („Squelch"), die in Intensität je nach Geschwindigkeit und Tiefe variieren.
3. **Plug & Play:** Einmal auf dem Avatar installiert, funktioniert es automatisch mit jedem anderen Nutzer, der seine „Sender" konfiguriert hat (oder wenn du die „Receiver" hast).

## OSC- und Haptik-Integration (Optional)

**OSC** (Open Sound Control) ist ein Protokoll, das VRChat ermöglicht, mit externen Programmen zu „sprechen" [3]. PCS nutzt dies, um Spielaktionen in reale Vibrationen umzuwandeln.

### Warum gibt es diese Integration?

Um die Immersion zu erhöhen. Wenn du ein kompatibles Sexspielzeug hast, „sagt" PCS dem Spielzeug, wann und mit welcher Intensität es vibrieren soll, basierend darauf, wie tief der Penetrator im Spiel ist.

### Voraussetzungen für Haptik

- **Kompatibles Spielzeug:** (z.B. Lovense Hush, Lush, Max, etc.).
- **Bridge-Software:** Ein Programm, das das Signal von VRChat empfängt und das Spielzeug steuert.
  - _OscGoesBrrr_ (Kostenlos, beliebt) [3].
  - _VibeGoesBrrr_.
  - _Intiface Central_ (Verbindungs-Engine) [4].

### OSC-Einrichtung

Du musst dies nur aktivieren, wenn du Spielzeuge verwenden willst:

1. Öffne in VRChat das **Aktionsmenü**.
2. Gehe zu `Options` > `OSC` > **Enabled**.
3. Öffne deine Bridge-Software und verbinde dein Spielzeug.

---

## Unity-Installationsanleitung

Dies installiert sowohl das Soundsystem als auch die Parameter für OSC (auch wenn du es nicht verwendest, sind die Parameter standardmäßig vorhanden).

### Voraussetzungen

- **Unity** und **VRChat SDK 3.0**.
- **PCS Asset** (Dismay's Package) [1].
- **VRCFury** (Sehr empfohlen für einfachere Installation) [2].

### Schritt 1: Importieren

Ziehe das PCS `.unitypackage` in dein Projekt.

### Schritt 2: Komponenten konfigurieren

Das System verwendet zwei Arten von Prefabs:

**A. Der Receiver (Öffnungen)**

1. Suche das `PCS_Orifice` Prefab.
2. Platziere es im entsprechenden Bone (Hips, Head, etc.).
3. Richte es am Eingang der Öffnung deines Meshes aus.

**B. Der Penetrator**

1. Suche das `PCS_Penetrator` Prefab.
2. Platziere es im Penis-Bone.
3. Richte es so aus, dass es die Länge des Penis abdeckt.

### Schritt 3: Abschluss

Wenn du VRCFury verwendest, wird das System beim Hochladen des Avatars automatisch zusammengeführt.
Falls nicht, verwende den **Avatars 3.0 Manager**, um den FX Controller und die PCS-Parameter mit denen deines Avatars zusammenzuführen.

---

## Referenzen

- Dismay. (n.d.). Penetration Contact System. Gumroad. https://dismay.booth.pm/items/5001027
- VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
- OscGoesBrrr. (n.d.). OscGoesBrrr. https://osc.toys
- Intiface. (n.d.). Intiface Central. https://intiface.com/desktop/
