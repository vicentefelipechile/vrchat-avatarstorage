# PhysBones

<span class="badge badge-blue">ABHÄNGIGKEIT</span>

## Was ist das?

PhysBones ist eine Sammlung von Komponenten, die in das VRChat SDK integriert sind und sekundäre Bewegung (Physik) zu Objekten in Avataren und Welten hinzufügen. Mit PhysBones kannst du Bewegung zu Haaren, Schwänzen, Ohren, Kleidung, Kabeln, Pflanzen und mehr hinzufügen. Die korrekte Verwendung macht deine Avatare dynamischer und realistischer.

> [!NOTE]
> PhysBones ist der **offizielle Ersatz** für Dynamic Bones in VRChat. Obwohl Dynamic Bones bei bestehenden Avataren noch funktioniert (es wird automatisch konvertiert), sollten alle Ersteller PhysBones für neue Avatare verwenden.

## Wofür ist es?

- Physik zu Haaren, Schwänzen, Ohren und Kleidung hinzufügen
- Anderen Spielern erlauben, mit Elementen deines Avatars zu interagieren (greifen, posieren)
- Dynamische und realistische sekundäre Bewegung erstellen
- Ersatz für Unitys Cloth-Komponente bei einfachen Stoffen

## Hauptkomponenten

PhysBones besteht aus drei Komponenten, die zusammenarbeiten:

| Komponente              | Beschreibung                                                                       |
| ----------------------- | ---------------------------------------------------------------------------------- |
| **VRCPhysBone**         | Hauptkomponente, die die Kette von Bones definiert, die mit Physik animiert werden |
| **VRCPhysBoneCollider** | Definiert Collider, die PhysBones beeinflussen (Kopf, Torso, Hände, etc.)          |
| **VRCPhysBoneRoot**     | Optional. Definiert die Bewegungswurzel für mehrere PhysBones (nur Worlds)         |

## Detaillierte Konfiguration

### Versionen

Du kannst die Version der VRCPhysBone-Komponente direkt im Inspector auswählen. Standardmäßig wird die neueste verfügbare Version verwendet.

**Version 1.0:**

- Basisversion der PhysBone-Komponente

**Version 1.1 (Squishy Bones):**

- Ermöglicht das Komprimieren und Strecken von Bones
- Schwerkraft wirkt nun als Anteil, um wie viel Bones in Ruhestellung rotieren
- Ein positiver Pull ist erforderlich, damit sich Bones in Richtung der Schwerkraft bewegen

### Transforms

| Einstellung                 | Beschreibung                                                                                |
| --------------------------- | ------------------------------------------------------------------------------------------- |
| **Root Transform**          | Der Transform, bei dem die Komponente beginnt. Wenn leer, startet sie bei diesem GameObject |
| **Ignore Transforms**       | Liste von Transforms, die nicht von der Komponente beeinflusst werden sollen                |
| **Ignore Other Phys Bones** | Wenn aktiviert, ignoriert der PhysBone andere PhysBones in der Hierarchie                   |
| **Endpoint Position**       | Vektor zum Erstellen zusätzlicher Bones am Endpunkt der Kette                               |
| **Multi-Child Type**        | Verhalten des Root-Bones bei mehreren Ketten                                                |

> [!CAUTION]
> Wenn du einen einzelnen Root-Bone oder einen Root mit mehreren Kindern (keine Enkel) verwendest, MUSST du eine Endpoint Position definieren! Dies unterscheidet sich von Dynamic Bones.

### Kräfte

**Integration Type:**

- **Simplified**: Stabiler, einfacher zu konfigurieren, weniger reaktiv auf externe Kräfte
- **Advanced**: Weniger stabil, ermöglicht komplexere Konfigurationen, reaktiver auf externe Kräfte

Verfügbare Parameter:

- **Pull**: Kraft, um Bones in ihre Ruheposition zurückzubringen
- **Spring** (Simplified) / **Momentum** (Advanced): Ausmaß der Schwingung beim Versuch, die Ruheposition zu erreichen
- **Stiffness** (nur Advanced): Ausmaß des Widerstands, in der Ruheposition zu bleiben
- **Gravity**: Ausmaß der angewendeten Schwerkraft. Positiver Wert zieht nach unten, negativer nach oben
- **Gravity Falloff**: Steuert, wie viel Schwerkraft in der Ruheposition entfernt wird (1.0 = keine Schwerkraft in Ruhe)

> [!TIP]
> Wenn dein Haar in der Position modelliert ist, die du beim normalen Stehen willst, verwende Gravity Falloff auf 1.0. So wirkt die Schwerkraft nicht auf dich, wenn du still stehst.

### Limits

Limits ermöglichen die Einschränkung, wie weit sich eine PhysBone-Kette bewegen kann. Sie sind sehr nützlich, um zu verhindern, dass Haare durch den Kopf clippen, und sind **deutlich performanter** als Collider.

| Typ       | Beschreibung                                                                |
| --------- | --------------------------------------------------------------------------- |
| **None**  | Keine Limits                                                                |
| **Angle** | Begrenzt auf einen maximalen Winkel von einer Achse. Visualisiert als Kegel |
| **Hinge** | Begrenzt entlang einer Ebene. Ähnlich einem Pizzastück                      |
| **Polar** | Kombiniert Hinge mit Yaw. Komplexer, mit Maß verwenden                      |

> [!WARNING]
> Übertreibe es nicht mit Polar-Limits. Die Verwendung von mehr als 64 kann Performance-Probleme verursachen.

### Collision

| Einstellung         | Beschreibung                                                                        |
| ------------------- | ----------------------------------------------------------------------------------- |
| **Radius**          | Kollisionsradius um jeden Bone (in Metern)                                          |
| **Allow Collision** | Ermöglicht Kollision mit globalen Collidern (Hände anderer Spieler, World-Collider) |
| **Colliders**       | Liste spezifischer Collider, mit denen dieser PhysBone kollidiert                   |

**Allow Collision Optionen:**

- **True**: Kollidiert mit globalen Collidern
- **False**: Kollidiert nur mit aufgelisteten Collidern
- **Other**: Erweiterte Optionen zum Filtern nach Typ (Avatar, World, Item)

### Stretch & Squish (nur v1.1)

| Einstellung        | Beschreibung                                                             |
| ------------------ | ------------------------------------------------------------------------ |
| **Stretch Motion** | Ausmaß der Bewegung, die das Strecken/Komprimieren der Bones beeinflusst |
| **Max Stretch**    | Maximale erlaubte Streckung (Vielfaches der Originallänge)               |
| **Max Squish**     | Maximale erlaubte Komprimierung (Vielfaches der Originallänge)           |

### Grab & Pose

| Einstellung        | Beschreibung                                                                         |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Allow Grabbing** | Ermöglicht Spielern, die Bones zu greifen                                            |
| **Allow Posing**   | Ermöglicht Spielern, nach dem Greifen zu posieren                                    |
| **Grab Movement**  | Steuert, wie sich Bones beim Greifen bewegen (0 = verwendet Pull/Spring, 1 = sofort) |
| **Snap To Hand**   | Bone passt sich automatisch an die greifende Hand an                                 |

## Praktische Anwendungsfälle

### Beispiel 1: Langes Haar

1. Wähle den Root-Bone des Haares (normalerweise am Nacken oder Kopf)
2. Füge die **VRCPhysBone**-Komponente hinzu
3. Konfiguriere:
   - **Root Transform**: Haar-Root-Bone
   - **Ignore Transforms**: Augen und alle Bones, die sich nicht bewegen sollen
   - **Multi-Child Type**: Ignore (damit alle Haar-Bones mit einer Komponente beeinflusst werden)
   - **Pull**: 0.3 - 0.5
   - **Gravity**: 0.5 - 1.0
   - **Gravity Falloff**: 0.5 - 0.8 (je nachdem, wie es in Ruhe fallen soll)
   - **Radius**: 0.05 - 0.1
4. Füge **Limits** vom Typ Angle hinzu, um zu verhindern, dass Haare durch den Kopf clippen

> [!TIP]
> Bei sehr langem Haar erwäge, es in mehrere PhysBone-Komponenten aufzuteilen (eine pro Abschnitt) für bessere Performance.

### Beispiel 2: Tierschwanz

1. Wähle den Basis-Bone des Schwanzes
2. Füge die **VRCPhysBone**-Komponente hinzu
3. Konfiguriere:
   - **Root Transform**: Schwanz-Basis-Bone
   - **Integration Type**: Advanced
   - **Pull**: 0.2 - 0.4
   - **Spring/Momentum**: 0.5 - 0.7
   - **Stiffness**: 0.1 - 0.3
   - **Gravity**: 0.3 - 0.6
4. Verwende **Hinge**-Limits, um seitliche Bewegung zu begrenzen

### Beispiel 3: Rock oder Umhang

1. Stelle sicher, dass die Kleidung eine eigene separate Armatur vom Avatar hat
2. Wähle den Root-Bone des Rocks/Umhangs
3. Füge die **VRCPhysBone**-Komponente hinzu
4. Konfiguriere:
   - **Pull**: 0.1 - 0.3 (weicher für Stoffe)
   - **Gravity**: 0.8 - 1.0
   - **Gravity Falloff**: 0.3 - 0.5
   - **Radius**: 0.05
5. Füge **VRCPhysBoneCollider** zum Torso des Avatars hinzu
6. Füge in der PhysBone-Komponente unter **Colliders** den Torso-Collider hinzu

> [!NOTE]
> Bei sehr langen Röcken oder vollen Umhängen erwäge, Unitys Cloth-Komponente anstelle von PhysBones zu verwenden, da diese für diese Art von Stoff optimiert ist.

## Dynamic Bones vs PhysBones

VRChat konvertiert Dynamic Bones-Komponenten beim Laden des Avatars automatisch zu PhysBones. Diese Konvertierung ist jedoch nicht perfekt.

**Hauptunterschiede:**

- Dynamic Bones verwendet bei der Konvertierung standardmäßig den Advanced-Modus
- Einige Dynamic Bones-Einstellungen haben kein Äquivalent in PhysBones
- Die automatische Konvertierung verwendet „Ignore" für Multi-Child Type

**Manuelle Konvertierung:**
Du kannst deine Avatare manuell konvertieren über VRChat SDK → Utilities → Convert DynamicBones to PhysBones.

> [!WARNING]
> Mache vor der Konvertierung eine Sicherungskopie deines Avatars, da der Vorgang nicht umkehrbar ist.

## Limits und Performance

| Plattform      | Limit                                                       |
| -------------- | ----------------------------------------------------------- |
| **PC**         | ~256 Transforms pro Komponente                              |
| **Meta Quest** | Niedrigeres Limit (siehe Performance Ranking Dokumentation) |

**Optimierungstipps:**

- Nicht mehr als 256 Transforms pro PhysBone-Komponente
- Bei mehr als 128 Transforms erwäge, in mehrere Komponenten aufzuteilen
- Verwende **Limits** anstelle von Collidern, wenn möglich
- Verwende keine humanoiden Bones (Hip, Spine, Chest, Neck, Head) als PhysBone-Roots

> [!IMPORTANT]
> PhysBones hat ein festes Limit auf Meta Quest. Konsultiere die „Very Poor"-Limits im Performance Ranking System.

## Häufige Fehler

### Der PhysBone bewegt sich nicht

- Überprüfe, ob Root Transform korrekt zugewiesen ist
- Stelle sicher, dass es nicht auf „Ignore" in Multi-Child Type gesetzt ist
- Überprüfe, dass der Pull-Wert nicht 0 ist

### Der PhysBone clippt mit dem Körper

- Füge Limits zur Komponente hinzu
- Füge Collider zum Avatar hinzu und konfiguriere sie im PhysBone
- Erhöhe den Pull-Wert

### Bones erreichen die Ruheposition nicht

- Erhöhe den Pull-Wert
- Passe Spring/Momentum je nach Integration Type an

### Bones gehen durch den Körper

- Füge VRCPhysBoneCollider zum Avatar hinzu
- Konfiguriere den Collider in der Colliders-Liste des PhysBone
- Überprüfe, ob Radius angemessen ist

## Wo mehr erfahren?

- **Offizielle Dokumentation:** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **SDK-Beispiel:** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **Community:** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## Referenzen

VRChat. (2025). _PhysBones_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). _VRCPhysBoneCollider_. VRChat Creators. Retrieved from https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
