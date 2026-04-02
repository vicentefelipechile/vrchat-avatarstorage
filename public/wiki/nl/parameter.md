# Avatar Parameters (Expression Parameters)

<span class="badge badge-blue">Logica</span> <span class="badge badge-yellow">Optimalisatie</span>

## Wat zijn ze?
**Expression Parameters** zijn variabelen die dienen als "geheugen" van je VRChat-avatar [1]. Ze fungeren als brug tussen het **Expressions Menu** en de **Animator Controller**.

## Parametertypen

| Type | Beschrijving | Geheugenkosten | Veelgebruikt voor |
| :--- | :--- | :--- | :--- |
| **Bool** | Waar of Onwaar (Aan/Uit). | 1 bit | Eenvoudige toggles (kleding, props). |
| **Int** | Gehele getallen (0 tot 255). | 8 bits | Outfit-wisselaar met meerdere opties. |
| **Float** | Decimale getallen (0.0 tot 1.0). | 8 bits | Continue sliders (dikte, tint). |

## Geheugenlimiet (Synced Bits)
VRChat legt een strikte limiet van **256 bits** gesynchroniseerde data per avatar op [2].
- **Gesynchroniseerd:** Parameters waarvan de waarde naar andere spelers wordt gestuurd.
- **Niet-gesynchroniseerd (Lokaal):** Parameters die alleen op jouw PC bestaan.

> [!WARNING]
> Als je de geheugenlimiet overschrijdt, kun je de avatar niet uploaden of stoppen extra parameters met werken.

## Optimalisatie

#### De "Enkele Int" Truc
Stel je voor dat je 10 verschillende shirts hebt.
*   **Inefficiënt (Bool):** 10 `Bool`-parameters. *Kosten:* 10 bits.
*   **Efficiënt (Int):** 1 `Int`-parameter genaamd `Top_Clothing`. *Kosten:* 8 bits — en je kunt tot **255 shirts** hebben!

> [!NOTE]
> **Gulden Regel:** Als je meer dan 8 wederzijds exclusieve opties hebt, gebruik een `Int`. Als het er minder dan 8 zijn, gebruik individuele `Bool`.

## Overzichtstabel

| Gebruiksgeval | Aanbevolen Type | Waarom? |
| :--- | :--- | :--- |
| **Toggle van 1 object** (Bril, pet) | `Bool` | Eenvoudig. Kost 1 bit. |
| **Kledingselector** (Shirt A, B, C...) | `Int` | Honderden opties voor 8 bits. |
| **Geleidelijke Veranderingen** (Dikte, Kleur) | `Float` | Nodig voor decimale waarden. |
| **Complexe Staten** (Dansen, AFK) | `Int` | Ideaal voor state machines. |

---

## Referenties

* VRChat. (n.d.). Expression Parameters. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset
* VRChat. (n.d.). Avatar Parameter Driver. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver
