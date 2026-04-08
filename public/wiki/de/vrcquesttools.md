# VRCQuestTools

<span class="badge">TOOL</span>

## Was ist das?

VRCQuestTools ist eine Unity-Erweiterung, entwickelt von **kurotu**, die es ermöglicht, für PC designte VRChat-Avatare auf die Android-Plattform (Meta Quest/PICO) zu konvertieren. Dieses Tool automatisiert den Prozess, einen Avatar mit den strikten Performance-Einschränkungen mobiler Geräte kompatibel zu machen.

> [!NOTE]
> VRCQuestTools arbeitet in seinen neuesten Versionen über das **Non-Destructive Modular Framework (NDMF)**-System, das den Avatar verarbeitet, ohne die Originaldateien zu verändern.

## Wofür ist es?

- Konvertierung von PC-Avataren zu Android mit wenigen Klicks
- Automatische Reduzierung von Polygonen und Materialien
- Entfernung von nicht Quest-kompatiblen Komponenten (Lights, Cloth, etc.)
- Anpassung von Texturen und Materialien zur Performance-Optimierung
- Verschiedene Hilfsmittel zum Hochladen von Avataren auf Quest

> [!WARNING]
> WICHTIG: VRoid Studio-Avatare sind aufgrund ihrer starken Nutzung transparenter Materialien nicht mit Android kompatibel. VRCQuestTools kann dir bei diesen Avataren nicht helfen; du musst sie manuell modifizieren.

## Systemanforderungen

| Anforderung                 | Mindestversion                           |
| --------------------------- | ---------------------------------------- |
| Unity                       | 2019.4.31f1, 2022.3.6f1 oder 2022.3.22f1 |
| VRChat SDK                  | Avatars 3.3.0 oder neuer                 |
| Android Build Support Modul | In Unity installiert                     |

## Wo bekommt man es?

- **Offizielle Seite:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **Dokumentation:** [VRCQuestTools Dokumentation](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth (Spende):** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## Wie installieren?

### Installation über VCC (VRChat Creator Companion)

1. Repository zu VCC hinzufügen:
   - Klicke: [VRCQuestTools zu VCC hinzufügen](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - Oder gehe zu **Settings** → **Packages** → **Add Repository**, füge die URL `https://kurotu.github.io/vpm-repos/vpm.json` ein und klicke **Add**
2. Gehe zu **Manage Project** für dein Projekt
3. Suche in der Paketliste nach **VRCQuestTools** und klicke **[+]**, um es hinzuzufügen
4. Klicke in VCC auf **Open Project**

## Wie konvertiert man einen Avatar für Android?

### Schnellmethode (Nicht-destruktiv mit NDMF)

1. Rechtsklicke auf deinen Avatar in der Unity-Hierarchie
2. Wähle **VRCQuestTools** → **Convert Avatar For Android**
3. Klicke im sich öffnenden Fenster auf **Begin Converter Settings** und dann **Convert**
4. Warte, bis die Konvertierung abgeschlossen ist
5. Gehe zu **File** → **Build Settings**
6. Wähle die **Android**-Plattform und klicke auf **Switch Platform**
7. Warte, bis Unity die Plattform gewechselt hat
8. Lade den konvertierten Avatar zu VRChat hoch

> [!TIP]
> Der Original-Avatar wird nach der Konvertierung deaktiviert. Du kannst ihn bei Bedarf wieder über den Inspector aktivieren.

> [!NOTE]
> Der konvertierte Avatar **optimiert die Performance nicht automatisch**. In den meisten Fällen hat der konvertierte Avatar ein **Very Poor**-Ranking für Android. Verwende die Avatar Display-Einstellung (Show Avatar), um ihn trotzdem anzuzeigen.

## Quest Performance-Limits

| Metrik             | Exzellent | Gut    | Mittel | Schlecht | Sehr Schlecht |
| ------------------ | --------- | ------ | ------ | -------- | ------------- |
| **Dreiecke**       | 7.500     | 10.000 | 15.000 | 20.000   | >20.000       |
| **Material Slots** | 1         | 1      | 1      | 2        | >2            |
| **Skinned Meshes** | 1         | 1      | 1      | 2        | >2            |
| **PhysBones**      | 2         | 4      | 6      | 8        | >8            |

> [!NOTE]
> Standardmäßig ist das **Minimum Displayed Performance Rank**-Level auf mobilen Geräten auf **Medium** gesetzt. Das bedeutet, dass Avatare mit Poor oder Very Poor für andere Nutzer nicht sichtbar sind, es sei denn, sie wählen manuell, deinen Avatar anzuzeigen.

Für weitere Informationen über das Performance-Ranking-System, schaue in die [offizielle VRChat-Dokumentation](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/).

## Beziehung zu anderen Tools

- **[Modular Avatar](/wiki?topic=modular-avatar)**: Wenn du Modular Avatar oder andere NDMF-Tools verwendest, ist die Konvertierung komplett nicht-destruktiv.
- **[VRCFury](/wiki?topic=vrcfury)**: VRCFury kann dir helfen, Animationen und Gesten vor der Konvertierung vorzubereiten.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**: Stelle sicher, dass die Shader nach der Konvertierung Android-kompatibel sind.

---

## Referenzen

kurotu. (n.d.). _VRCQuestTools - Avatar Converter and Utilities for Android_. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/

kurotu. (n.d.). _Introduction_. VRCQuestTools Docs. Retrieved from https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). _kurotu/VRCQuestTools_ [Software]. GitHub. Retrieved from https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). _Performance Ranks_. VRChat Creator Documentation. Retrieved from https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
