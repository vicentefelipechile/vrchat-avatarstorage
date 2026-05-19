# GoGo Loco Verwijderen uit een Unity Project

<span class="badge badge-blue">Logic</span>

## Wat is het?

GoGo Loco is een locomotion prefab gemaakt door Franada die verschillende Playable Layers van de Avatar Descriptor (Base/Locomotion, Additive, Gesture) vervangt of wijzigt en zijn eigen parameters en items in het Expression Menu van de avatar injecteert. Omdat het zoveel met elkaar verbonden delen van een avatar-project raakt, vereist het volledig verwijderen ervan werk op verschillende lagen — van scene-objecten tot project-assets en, indien van toepassing, het VPM-manifest.

> [!WARNING]
> Maak altijd een back-up van je Unity-project (of commit naar versiebeheer) voordat je met dit proces begint. Veel van deze stappen verwijderen of overschrijven Animator Controllers en Expression-assets die mogelijk gedeeld worden met andere delen van je avatar.

## Waar is het voor?

- Het vervangen van GoGo Loco door een ander locomotion-systeem (bijv. Modular Avatar locomotion, WetCat's Locomotion Fix of de standaard VRChat-controllers).
- Het opschonen van een gekochte avatar waarbij GoGo Loco voorgeïnstalleerd is en je het niet wilt.
- Het oplossen van conflicten met NSFW Locomotion of andere pakketten die de layernamen en parameters van GoGo Loco delen.
- Het verminderen van parametergeheugen (GoGo Loco verbruikt standaard 16–17 bits van gesynchroniseerd geheugen).

## Stap 1: Verwijder de Prefab uit de Scene

GoGo Loco kan worden geïnstalleerd als een child GameObject in de root van de avatar, vooral wanneer het is ingesteld via VRCFury of Modular Avatar.

1. Open de scene met je avatar in het **Hierarchy**-venster.
2. Vouw het root GameObject van de avatar uit.
3. Zoek naar een child-object met de naam `GoGo Loco`, `GGL`, `GoGoLoco`, of vergelijkbaar. Selecteer het en druk op **Delete**.
4. Als GoGo Loco via [VRCFury](/wiki?topic=vrcfury) is geïnstalleerd, zoek dan naar een object met een `VRCFury`-component die naar een GoGo Loco-prefab verwijst en verwijder dat object ook.
5. Indien geïnstalleerd via [Modular Avatar](/wiki?topic=modular-avatar), zoek dan naar een child-object met een `MA Merge Animator`- of `MA Menu Installer`-component die verwijst naar GoGo Loco-assets en verwijder deze.

> [!NOTE]
> Als de avatar is gekocht en GoGo Loco was ingebakken (er is geen apart child GameObject), sla deze stap dan over en ga direct naar Stap 2.

## Stap 2: Herstel de Playable Layers van de Avatar Descriptor

GoGo Loco vervangt maximaal drie van de vijf Playable Layers op de `VRCAvatarDescriptor`-component. Je moet deze allemaal opnieuw toewijzen aan de standaard VRChat-controllers of aan je eigen aangepaste controllers.

1. Selecteer de root van de avatar in de Hierarchy en zoek de **VRC Avatar Descriptor**-component in de Inspector.
2. Vouw het gedeelte **Playable Layers** uit.
3. Controleer voor elk van de volgende layers of er momenteel een GoGo Loco-controller aan is toegewezen (bestandsnamen beginnen met `go_` of bevatten `GoGoLoco/GGL`):

| Layer | GoGo Loco bestandsnaam (ongeveer) | Standaard vervanging |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (van VRCSDK samples) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (van VRCSDK samples) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (van VRCSDK samples) |

4. Klik voor elke beïnvloede layer op de kleine cirkel rechts van het veld en wijs de juiste standaard VRChat-controller toe, of wijs je eigen aangepaste controller toe.
5. Als je de standaard VRChat-controllers niet in je project hebt, kun je deze vinden onder `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Als je avatar aangepaste handgebaren had voordat GoGo Loco werd toegevoegd, moet je hier je originele Gesture layer-controller herstellen in plaats van de standaard VRChat-controller — controleer je versiebeheer of back-ups hiervoor.

## Stap 3: Verwijder GoGo Loco Layers uit de FX Controller

Voor de vliegfunctie voegt GoGo Loco twee extra layers toe aan de FX Animator Controller van de avatar. Deze blijven aanwezig, zelfs nadat de prefab is verwijderd, en moeten handmatig worden verwijderd.

1. Zoek de FX Animator Controller van je avatar in het Project-venster en dubbelklik erop om het **Animator**-venster te openen.
2. Zoek in het **Layers**-paneel aan de linkerkant naar layers met de namen `GoGo Fly`, `GoGo Freeze` of een layer waarvan de naam begint met `go_`.
3. Klik met de rechtermuisknop op elke GoGo Loco layer en selecteer **Delete Layer**.
4. Klik in hetzelfde Animator-venster op het tabblad **Parameters**.
5. Verwijder elke parameter die bij GoGo Loco hoort. Veelvoorkomende zijn:

| Parameter naam | Type |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Parameters die beginnen met `go_` of `Go/` zijn GoGo Loco-parameters. Verwijder ze allemaal. Parameters zoals `VelocityY`, `VRCFaceBlendH`, `Grounded`, etc., zijn standaard ingebouwde parameters van VRChat — verwijder deze **niet**.

> [!CAUTION]
> Het verwijderen van een parameter waarnaar nog steeds wordt verwezen door een resterende animatiestatus of overgang zal deze statussen breken. Controleer altijd of er geen niet-GoGo-Loco layers afhankelijk zijn van een parameter voordat je deze verwijdert.

## Stap 4: Schoon de Expression Parameters Asset op

GoGo Loco voegt zijn parameters toe aan de `VRCExpressionParameters`-asset van de avatar en verbruikt gesynchroniseerd geheugen. Elke achtergebleven GoGo Loco-parameter verspilt bits.

1. Zoek in het Project-venster het `.asset`-bestand dat is toegewezen aan **Expression Parameters** in de Avatar Descriptor.
2. Selecteer het en bekijk de parameterlijst in de Inspector.
3. Verwijder elke vermelding die overeenkomt met een GoGo Loco-parameter (dezelfde namen als in Stap 3).
4. Controleer of de **Total Cost** onderaan de Inspector daalt na verwijdering.

## Stap 5: Verwijder het GoGo Loco Menu Item

GoGo Loco installeert een submenu-item in het hoofd Expression Menu van de avatar.

1. Zoek het `.asset`-bestand dat is toegewezen aan **Expressions Menu** in de Avatar Descriptor.
2. Selecteer het en inspecteer de lijst **Controls**.
3. Verwijder elke vermelding met de naam `GoGo Loco`, `GGL`, `Loco`, of soortgelijk die verwijst naar een GoGo Loco-submenu.
4. Open elk overgebleven submenu recursief en verwijder alle geneste GoGo Loco-controle-items.

## Stap 6: Verwijder GoGo Loco Asset-bestanden uit het Project

Nadat je GoGo Loco van de avatar hebt losgekoppeld, verwijder je de bijbehorende bestanden uit het Unity-project om de `Assets/`-map netjes te houden.

1. Zoek in het Project-venster naar `go_` met de zoekbalk (zorg ervoor dat het zoekbereik is ingesteld op **All**).
2. Bekijk de resultaten — bestanden die beginnen met `go_` zijn bijna altijd GoGo Loco-assets (Animation Clips, Animator Controllers, Textures, Materials voor de menu-iconen).
3. Zoek ook naar `GoGoLoco` en `GGL` om bestanden te vinden die de volledige naam gebruiken.
4. Selecteer alle bevestigde GoGo Loco-assets en druk op **Delete** (of klik met de rechtermuisknop → **Delete**).
5. Unity zal je vragen om de verwijdering te bevestigen. Accepteer.

> [!WARNING]
> Verwijder geen assets waarvan de namen beginnen met `go_` als ze tot je eigen project behoren (bijv. een GameObject of animatie die je zo hebt genoemd). Inspecteer elk bestand voordat je het verwijdert.

Veelvoorkomende maplocaties voor GoGo Loco-bestanden:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Overal waar een gekochte avatar de `.unitypackage` mogelijk heeft uitgepakt.

Verwijder de volledige map zodra je hebt bevestigd dat alle bestanden erin van GoGo Loco zijn.

## Stap 7: Verwijder het VPM-pakket (alleen VCC-installatie)

Als GoGo Loco via de VRChat Creator Companion als VPM-pakket is geïnstalleerd, bevinden de pakketbestanden zich in `Packages/` in plaats van `Assets/` en moeten ze via het VCC of het manifest worden verwijderd.

### Optie A — Via de VCC GUI

1. Open de **VRChat Creator Companion**.
2. Navigeer naar je project op het tabblad **Projects** en klik op **Manage Project**.
3. Zoek in de pakkettenlijst naar `GoGoLoco` (pakket-ID `com.franada.gogoloco` of vergelijkbaar).
4. Klik op de **min (−)** knop of zet de versiedropdown op **Remove** en pas toe.
5. Open het project opnieuw in Unity. De Resolver zal de verwijdering detecteren en de `Packages/`-map opschonen.

### Optie B — Via `vpm-manifest.json` (handmatig)

1. Sluit Unity.
2. Open `<JouwProject>/Packages/vpm-manifest.json` in een teksteditor.
3. Verwijder de vermelding voor GoGo Loco uit de `"dependencies"` en `"locked"` objecten.
4. Verwijder de fysieke map `<JouwProject>/Packages/com.franada.gogoloco/` (of gelijkwaardig).
5. Open Unity opnieuw. De Resolver zal opnieuw scannen en bevestigen dat er geen pakketten ontbreken.

> [!NOTE]
> Het verwijderen van het VPM-pakket maakt de layers, parameters, menu's of de tijdens de installatie toegevoegde prefab-objecten niet ongedaan. Stappen 1–6 moeten nog steeds worden voltooid, ongeacht de gebruikte installatiemethode.

## Stap 8: Activeer Force Locomotion opnieuw (indien nodig)

Wanneer GoGo Loco wordt geïnstalleerd, vinkt het meestal **Force Locomotion animations for 6-point tracking** in de Avatar Descriptor uit, omdat zijn aangepaste Locomotion-layer trackingmodi intern beheert. Na verwijdering wil je mogelijk het standaardgedrag herstellen.

1. Selecteer de root van de avatar en open de **VRC Avatar Descriptor** in de Inspector.
2. Scroll naar het gedeelte **IK**.
3. Vink het vakje **Force Locomotion animations for 6 point tracking** opnieuw aan als je de standaard VRChat Locomotion-controller gebruikt.

> [!TIP]
> Als je geen Full-Body Tracking (FBT) gebruikt, heeft dit selectievakje geen zichtbaar effect en kan het in elke staat worden gelaten.

## Controlelijst

Bevestig al het volgende voordat je de avatar uploadt:

| Controle | Hoe te verifiëren |
| :---------------------------------------- | :--------------------------------------------------- |
| Geen GoGo Loco child object in Hierarchy | Inspecteer de avatarhiërarchie in de Unity-scène |
| Playable Layers wijzen naar de juiste controllers | VRC Avatar Descriptor → sectie Playable Layers |
| Geen `go_`-layers in de FX-controller | Open FX Animator Controller → Paneel Layers |
| Geen `go_` / `Go/`-parameters in FX | Open FX Animator Controller → Paneel Parameters |
| Geen GoGo Loco items in Expression Parameters | Inspecteer het `.asset`-bestand in de Inspector |
| Geen GoGo Loco items in Expression Menu | Inspecteer het root menu `.asset`-bestand recursief |
| Geen GoGo Loco-bestanden in `Assets/` | Zoek in het Project-venster naar `go_`, `GoGoLoco`, `GGL` |
| Geen GoGo Loco-pakket in `vpm-manifest.json` | Open het bestand in een teksteditor en zoek naar `gogoloco` |
| Force Locomotion instelling is bewust gekozen | VRC Avatar Descriptor → sectie IK |

## Samenvattende Tabel

| Wat GoGo Loco toevoegt | Waar te verwijderen |
| :---------------------------------------------- | :------------------------------------------------ |
| Child prefab/GameObject op avatar root | Unity Hierarchy → verwijder het child-object |
| Base, Additive, Gesture Playable Layers | VRC Avatar Descriptor → Playable Layers |
| FX layers (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Paneel Layers |
| FX parameters (`Go/*`, `VelocityMagnitude`, etc.) | FX Animator Controller → Paneel Parameters |
| Vermeldingen in Expression Parameters | VRCExpressionParameters `.asset` → Lijst Controls |
| Submenu-item in Expression Menu | VRCExpressionsMenu `.asset` → Lijst Controls |
| Asset-bestanden (`go_*.anim`, controllers, textures) | Project venster → verwijder GoGoLoco map |
| VPM-pakket | VCC GUI of `vpm-manifest.json` |
| Force Locomotion uitgeschakeld | VRC Avatar Descriptor → Sectie IK (herstellen) |

## Referenties

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
