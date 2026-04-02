# Parametry Awatara (Expression Parameters)

<span class="badge badge-blue">Logika</span> <span class="badge badge-yellow">Optymalizacja</span>

## Czym są?
**Expression Parameters** (lub po prostu parametry) to zmienne służące jako "pamięć" twojego awatara VRChat [1]. Działają jako most między **Expressions Menu** (menu radialnym w grze) a **Animator Controllerem** (logiką odtwarzającą animacje).

## Typy Parametrów

| Typ | Opis | Koszt Pamięci | Typowe Użycie |
| :--- | :--- | :--- | :--- |
| **Bool** | Prawda lub Fałsz (Wł/Wył). | 1 bit | Proste przełączniki (ubrania, rekwizyty). |
| **Int** | Liczby całkowite (0 do 255). | 8 bitów | Zmiana strojów z wieloma opcjami. |
| **Float** | Liczby dziesiętne (0.0 do 1.0). | 8 bitów | Ciągłe slidery (grubość, odcień). |

## Limit Pamięci (Synced Bits)
VRChat narzuca ścisły limit **256 bitów** zsynchronizowanych danych na awatar [2].
- **Zsynchronizowane:** Parametry wysyłane do innych graczy przez sieć.
- **Niezsynchronizowane (Lokalne):** Parametry istniejące tylko na twoim PC.

> [!WARNING]
> Jeśli przekroczysz limit pamięci, nie będziesz mógł przesłać awatara lub dodatkowe parametry przestaną działać.

## Zaawansowane Użycie
Parametry mogą być kontrolowane przez:
- **PhysBones:** Do wykrywania dotyku na uszach lub włosach [3].
- **Contacts:** Do wykrywania kolizji (jak w systemach [SPS](/wiki?topic=sps) lub [PCS](/wiki?topic=pcs)).
- **OSC:** Do odbierania danych z zewnętrznych programów [3].

## Jak je Utworzyć
1. W projekcie Unity kliknij prawym przyciskiem w `Assets`.
2. Przejdź do `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Dodaj potrzebne parametry.
4. Przypisz ten plik w komponencie **VRC Avatar Descriptor** awatara.

## Optymalizacja i Sztuczki

#### Sztuczka "Pojedynczego Int"
Wyobraź sobie, że masz 10 różnych koszulek.
*   **Nieefektywny Sposób (Bool):** Tworzysz 10 parametrów `Bool`. *Koszt:* 10 bitów.
*   **Efektywny Sposób (Int):** Tworzysz **1** parametr `Int` o nazwie `Top_Clothing`. *Koszt:* 8 bitów — i możesz mieć do **255 koszulek**!

> [!NOTE]
> **Złota Zasada:** Jeśli masz więcej niż 8 wzajemnie wykluczających się opcji, użyj `Int`. Jeśli mniej niż 8, użyj indywidualnych `Bool`.

## Tabela Podsumowująca

| Przypadek Użycia | Zalecany Typ | Dlaczego? |
| :--- | :--- | :--- |
| **Przełącznik 1 obiektu** (Okulary, czapka) | `Bool` | Prosty. Kosztuje 1 bit. |
| **Selektor Ubrań** (Koszulka A, B, C...) | `Int` | Setki opcji za 8 bitów. |
| **Stopniowe Zmiany** (Grubość, Kolor) | `Float` | Konieczny dla wartości dziesiętnych. |
| **Złożone Stany** (Tańce, AFK, Emotes) | `Int` | Idealny dla maszyn stanów. |

---

## Odniesienia

* VRChat. (n.d.). Expression Parameters. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset
* VRChat. (n.d.). Avatar Parameter Driver. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver
* VRChat. (n.d.). OSC Overview. VRChat Documentation. https://creators.vrchat.com/avatars/osc/
