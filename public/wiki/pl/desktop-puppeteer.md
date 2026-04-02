# Esska Desktop Puppeteer

<span class="badge">NARZĘDZIE</span>

## Co to jest?
**Esska Desktop Puppeteer** to zaawansowane narzędzie dla użytkowników desktopowych VRChat stworzone przez **Esska**. Składa się z dwuczęściowego systemu (aplikacji desktopowej i pakietu awatara), który pozwala kontrolować określone części ciała awatara za pomocą myszy komputerowej.

## Do czego służy?
- **Kontrola kończyn:** Pozwala poruszać ramionami i dłońmi awatara niezależnie i precyzyjnie bezpośrednio myszą.
- **Niestandardowe części:** Ułatwia kontrolę dodatkowych części awatara, takich jak uszy, ogony lub akcesoria.
- **Symulacja VR na Desktopie:** Głównym celem jest danie użytkownikom desktopowym swobody ruchu, która sprawia, że wyglądają jakby grali w VR.
- **Head Tracking:** Obsługuje urządzenia TrackIR.

> [!NOTE]
> To narzędzie używa **OSC (Open Sound Control)** do wysyłania parametrów z aplikacji desktopowej do klienta VRChat. Upewnij się, że masz włączoną opcję OSC w Menu Radialnym VRChat.

## Gdzie to zdobyć?
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Wymagania wstępne
- **System Operacyjny:** Windows 10 lub Windows 11.
- **Oprogramowanie:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0)
- **Sprzęt:** Mysz ze środkowym przyciskiem (kółko przewijania).
- **VRChat SDK:** Zainstalowane w projekcie Unity (przez VCC).
- **Awatar:** Kompatybilny awatar humanoidalny.

## Przewodnik Instalacji Krok po Kroku

### Część 1: Instalacja na Awatarze (Unity)
1. **Zaimportuj Pakiet:** Pobierz "Base Package" z oficjalnej strony i przeciągnij plik `.unitypackage` do folderu `Assets`.
2. **Dodaj do Awatara:** Znajdź prefab zawarty w pakiecie i przeciągnij go na awatar w `Hierarchy`.
3. **Konfiguracja Parametrów:** System używa parametrów OSC. Upewnij się, że awatar ma wystarczającą pamięć parametrów.
4. **Prześlij Awatar:** Gdy prefab jest poprawnie ustawiony, prześlij awatar do VRChat jak zwykle.

### Część 2: Konfiguracja Aplikacji Desktopowej
1. **Pobierz Aplikację:** Pobierz aplikację "Esska Desktop Puppeteer App".
2. **Uruchom:** Otwórz aplikację na PC przed lub podczas sesji VRChat.
3. **Włącz OSC w VRChat:** W VRChat otwórz menu radialne, przejdź do `Options` -> `OSC` i upewnij się, że jest ustawione na **Enabled**.
4. **Użytkowanie:** Używaj przycisków myszy i klawiatury zgodnie z instrukcjami aplikacji.

> [!WARNING]
> Ostrzeżenie: Prywatność i Kontrola
> Aplikacja musi "nasłuchiwać" wprowadzanych danych z klawiatury i myszy (globalne hooki), aby działać gdy okno VRChat jest aktywne. Twórca oświadcza, że nie zbiera danych osobowych.

---

## Odniesienia

* Esska. (n.d.). Esska Desktop Puppeteer. BOOTH. https://esska.booth.pm/items/6366670
