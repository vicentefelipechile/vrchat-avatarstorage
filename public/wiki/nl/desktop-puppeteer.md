# Esska Desktop Puppeteer

<span class="badge">HULPMIDDEL</span>

## Wat is het?

**Esska Desktop Puppeteer** is een geavanceerde tool voor desktop-gebruikers van VRChat, gemaakt door **Esska**. Het stelt je in staat om specifieke lichaamsdelen van je avatar te besturen met je computermuis.

## Waarvoor dient het?

- **Ledemaatbesturing:** Beweeg de armen en handen van je avatar precies met de muis.
- **Aangepaste delen:** Besturing van extra avatar-onderdelen zoals oren, staarten of accessoires.
- **VR-simulatie op Desktop:** Geeft desktop-gebruikers vrijheid van beweging.
- **Head Tracking:** Ondersteunt TrackIR-apparaten.

> [!NOTE]
> Deze tool gebruikt **OSC (Open Sound Control)** om parameters te verzenden. Zorg ervoor dat OSC is ingeschakeld in het VRChat-radiaalmenuw.

## Waar te vinden?

- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Vereisten

- **OS:** Windows 10 of Windows 11.
- **Software:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Hardware:** Muis met middenknop (scrollwiel).
- **VRChat SDK:** Geïnstalleerd in je Unity-project (via VCC).

## Installatie

### Deel 1: Op de Avatar (Unity)

1. Importeer het `.unitypackage` in je Unity-project.
2. Sleep de prefab op je avatar in de `Hierarchy`.
3. Configureer parameters (OSC) en zorg voor voldoende parametergeheugen.
4. Upload je avatar.

### Deel 2: Desktop Applicatie

1. Download en open de "Esska Desktop Puppeteer App".
2. Schakel OSC in VRChat in (`Options` -> `OSC` -> **Enabled**).
3. Gebruik muis en toetsenbord om je avatar te besturen.

> [!WARNING]
> De applicatie luistert naar toetsenbord- en muisinvoer (globale hooks) om te functioneren.

---

## Referenties

- Esska. (n.d.). Esska Desktop Puppeteer. BOOTH. https://esska.booth.pm/items/6366670
