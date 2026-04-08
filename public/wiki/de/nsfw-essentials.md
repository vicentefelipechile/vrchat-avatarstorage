# NSFW Grundlagen-Leitfaden

<span class="badge badge-red">NSFW</span> <span class="badge">TOS</span> <span class="badge">OPTIMIERUNG</span>

## Einführung

VRChat ermöglicht große kreative Freiheit, einschließlich Erwachseneninhalt (NSFW) und erotischem Roleplay (ERP). Es ist jedoch **ENTSCHEIDEND**, die Regeln und geeigneten Tools zu verstehen, um diese Inhalte zu genießen, ohne dein Konto oder die Performance anderer zu gefährden.

## VRChat-Regeln (TOS)

VRChat hat eine Null-Toleranz-Politik bezüglich bestimmter Inhalte in öffentlichen Bereichen.

- **Öffentliche Welten:** Es ist **streng verboten**, sexuell explizite Inhalte, Nacktheit oder erotisches Verhalten in öffentlichen Instanzen zu zeigen. Dies kann zu einem **permanenten Bann** führen.
- **Private Welten:** NSFW-Inhalte und ERP werden in privaten Instanzen (Friends+, Invite, etc.) toleriert, in denen alle Teilnehmer volljährig sind und ihre Zustimmung gegeben haben.
- **Avatare:** Du kannst NSFW-Avatare hochladen, aber du darfst deren explizite Funktionen **NICHT** in der Öffentlichkeit nutzen. Verwende das „Toggles"-System, um standardmäßig alles verborgen zu halten.

## Essenzielle Tools

Für eine vollständige Erfahrung sind dies die Standard-Tools, die der Großteil der Community verwendet:

1.  **VRCFury:** Das „Schweizer Taschenmesser"-Tool. Essentiell zum Hinzufügen von Toggles, Kleidung und komplexen Systemen, ohne deinen Avatar zu beschädigen.
    - [VRCFury-Leitfaden ansehen](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader):** Das Standardsystem für physische Interaktion (Penetration und Verformung). Es ist kostenlos und viel besser als das alte DPS.
    - [SPS-Leitfaden ansehen](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB):** Der Goldstandard für die Verbindung von Sexspielzeug (Lovense) mit VRChat über haptische Vibration.
    - [Haptik-Leitfaden ansehen](/wiki?topic=haptics)

## Optimierung und Texturspeicher

NSFW-Avatare sind tendenziell „schwer" aufgrund der großen Menge an Kleidung und hochwertigen Hauttexturen.

- **VRAM (Videospeicher):** Dies ist die knappste Ressource. Wenn dein Avatar mehr als 150MB Texturspeicher verwendet, wirst du bei Leuten Abstürze verursachen.
- **Komprimierung:** Stelle immer sicher, dass du deine Texturen in Unity komprimierst. Eine unkomprimierte 4K-Textur belegt viel Platz.

## Contacts und PhysBones

Interaktion in VRChat basiert auf **Contacts** (VRCContactReceiver und VRCContactSender).

- **Headpat:** Erfolgt durch Erkennung der Hand auf dem Kopf.
- **Sexuelle Interaktion:** SPS und OGB verwenden Contacts, um zu erkennen, wann ein Objekt in ein anderes eindringt, und lösen Animationen, Sounds oder Vibrationen in deinem realen Spielzeug aus.
