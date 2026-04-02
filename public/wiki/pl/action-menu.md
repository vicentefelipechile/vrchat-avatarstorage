# Menu Akcji

<span class="badge badge-blue">Logika</span> <span class="badge badge-purple">Workflow</span>

## Wprowadzenie
**Menu Akcji** (znane również jako Expression Menu) to menu radialne używane w VRChat do aktywowania animacji, zmiany ubrań lub modyfikowania parametrów awatara [1].

Tradycyjnie twórcy przesyłają awatar do VRChat za każdym razem, gdy chcą przetestować małą zmianę, co jest bardzo czasochłonne. Na szczęście istnieją narzędzia symulujące to menu **bezpośrednio w Unity**.

---

## Narzędzia Symulacji

### 1. Gesture Manager (od BlackStartx)
Najpopularniejsze narzędzie do wizualizacji menu radialnego. Pozwala testować gesty, contacts i parametry intuicyjnie.

> [!NOTE]
> Szczegółowy przewodnik po instalacji i wszystkich funkcjach znajdziesz w naszym dedykowanym artykule: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (od Lyuma)
Bardziej techniczne i potężne narzędzie, idealne do debugowania złożonej logiki awatara.

*   **Instalacja:** Dostępny w VCC lub przez GitHub. Często instalowany automatycznie z narzędziami jak [VRCFury](/wiki?topic=vrcfury) [3].
*   **Jak używać:**
    1.  Przejdź do `Tools` > `Avatar 3.0 Emulator`.
    2.  Po wejściu w **Play Mode** zostanie wygenerowany panel sterowania.
    3.  Pozwala wymuszać wartości [parametrów](/wiki?topic=parameter) i widzieć w czasie rzeczywistym, która warstwa Animatora jest odtwarzana.

---

## Które wybrać?

| Funkcja | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Interfejs Wizualny** | Doskonały (Radialny) | Podstawowy (Przyciski/Slidery) |
| **Testowanie Menu** | Tak | Ograniczone |
| **Debugowanie Logiki** | Podstawowe | Zaawansowane |
| **Testowanie Gestów** | Łatwe (Przyciski) | Ręczne (Animator) |

**Zalecenie:** Używaj **Gesture Manager** do większości testów. Używaj **Av3 Emulatora** gdy animacje nie działają i musisz zobaczyć co się dzieje "pod maską".

---

## Build & Test (Oficjalna alternatywa)
Jeśli musisz testować coś wymagającego sieci lub interakcji z innymi (jak [PhysBones](/wiki?topic=parameter)), użyj funkcji **Build & Test** z oficjalnego SDK [1]:
1.  Otwórz `VRChat SDK Control Panel`.
2.  W zakładce `Builder` znajdź sekcję "Offline Testing".
3.  Kliknij `Build & Test`.
4.  Unity skompiluje awatar i otworzy lokalną instancję VRChat.

---

## Odniesienia

* VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* Lyuma. (n.d.). Av3Emulator. GitHub. https://github.com/lyuma/Av3Emulator
