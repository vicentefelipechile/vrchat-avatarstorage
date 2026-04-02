# Modular Avatar

<span class="badge badge-blue">AFHANKELIJKHEID</span>

## Wat is het?
**Modular Avatar** (MA) is een gratis en open-source Unity-toolkit waarmee je extra componenten kunt maken en installeren op VRChat-avatars op een **niet-destructieve** manier [1].

Zie het als een systeem waarmee je kleding, accessoires, animaties en menu's als onafhankelijke modules aan je avatar kunt "koppelen". Bij het uploaden voegt MA alles automatisch samen.

## Waarvoor dient het?
- **Kleding en accessoires installeren:** Sleep een prefab als kind van je avatar en MA regelt het samenvoegen van het skelet, menu's en parameters.
- **Herbruikbare componenten maken:** Voor makers van bronnen.
- **Automatisch samenvoegen:** MA beheert het samenvoegen van Animator Controllers, BlendTrees, radiaalmenuen en parameters.

## Verschil met VRCFury

| Kenmerk | Modular Avatar | VRCFury |
| :--- | :--- | :--- |
| **Aanpak** | Modulaire componenten voor Unity | "Alles-in-één" toolkit |
| **Focus** | Samenvoegen van skeletten en controllers | Samenvoegen + extra functies (SPS, Toggle, enz.) |
| **Compatibiliteit** | Standaard in de Japanse community | Zeer populair in de westerse community |

> [!NOTE]
> In de meeste gevallen kun je **beide tools in hetzelfde project zonder problemen** gebruiken.

## Hoe installeren?
### VRChat Creator Companion (Aanbevolen)
1. Open **VCC**.
2. Ga naar **Settings** -> **Packages** -> **Add Repository**.
3. Voeg de Modular Avatar-repository toe ([modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)).
4. Installeer **Modular Avatar** vanuit de pakkettenlijst.

## Hoe werkt het?
1. Download een MA-compatibele bron.
2. Importeer in Unity.
3. Sleep de prefab als kind van je avatar in de `Hierarchy`.
4. Upload je avatar. MA voegt alles automatisch samen [2].

### Belangrijke componenten (voor makers)
- **MA Merge Armature:** Voegt automatisch skeletten samen.
- **MA Menu Installer:** Voegt menu's in het radiaalmenuw.
- **MA Parameters:** Definieert parameters om toe te voegen.
- **MA Merge Animator:** Voegt Animator Controllers samen.
- **MA Bone Proxy:** Koppelt een object aan een specifiek bot.

---

## Referenties

* bd_. (n.d.). Modular Avatar. https://modular-avatar.nadena.dev/
* bd_. (n.d.). Modular Avatar Documentation. https://modular-avatar.nadena.dev/docs/intro
