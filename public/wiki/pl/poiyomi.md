# Poiyomi Toon Shader

<span class="badge badge-blue">ZALEŻNOŚĆ</span>

## Co to jest?

Poiyomi Toon Shader to darmowy shader dla Unity zaprojektowany specjalnie dla VRChat. Stał się **standardem de facto** dla awatarów VRChat dzięki swojej wszechstronności i łatwości użycia [1].

## Do czego służy?

- **Stylizacja:** Pełna kontrola nad wyglądem awatara (kolory, oświetlenie, cieniowanie).
- **Efekty Specjalne:** Emisja, brokat, kontur (outline), dissolve, dystorsja UV i wiele więcej.
- **Audiolink:** Wizualna reakcja awatara na muzykę w świecie.
- **Renderowanie:** Zaawansowane opcje jak Backface Culling, Stencil, Z-Buffer dla efektów przezroczystości i nakładania.

## Jak zainstalować?

### Metoda 1: VRChat Creator Companion (Zalecana)

1. Otwórz **VCC**.
2. Wybierz swój projekt.
3. Wyszukaj **"Poiyomi Toon Shader"** na liście kuratorowanych pakietów i kliknij **"Add"** [2].
4. Otwórz swój projekt Unity.

### Metoda 2: Ręczna

1. Przejdź na stronę wydań Poiyomi na GitHub lub BOOTH.
2. Pobierz najnowszy `.unitypackage`.
3. W Unity przeciągnij go do folderu `Assets` lub zaimportuj przez `Assets > Import Package > Custom Package`.

> [!WARNING]
> Nie mieszaj **Poiyomi Free** i **Poiyomi Pro** w tym samym projekcie. Wybierz jeden i usuń drugi, aby uniknąć konfliktów.

## Wersje

| Wersja        | Cechy                                                                                  |
| ------------- | -------------------------------------------------------------------------------------- |
| **Free/Toon** | Kompletny zestaw funkcji dla większości użytkowników. Darmowy.                         |
| **Pro**       | Płatna. Dodaje zaawansowane funkcje jak: globalny dissolve, efekty dystorsji i więcej. |

## Jak używać?

1. Wybierz materiał na swoim awatarze (w panelu Inspector).
2. Zmień shader używając menu rozwijanego: `.poiyomi > Poiyomi Toon`.
3. Skonfiguruj sekcje (Main, Lighting, Emission, itp.) według potrzeb.

> [!TIP]
> Jeśli Poiyomi wygląda na "zablokowany" (z kłódką u góry), to dlatego, że materiał jest w trybie zoptymalizowanym. Kliknij kłódkę, aby go odblokować i edytować.

---

## Odniesienia

- Poiyomi. (n.d.). Poiyomi Toon Shader. GitHub. https://github.com/poiyomi/PoiyomiToonShader
- VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
