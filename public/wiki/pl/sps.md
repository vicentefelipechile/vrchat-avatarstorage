# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Co to jest?
**SPS** (Super Plug Shader) to darmowy i nowoczesny system deformacji siatki dla VRChat zaprojektowany przez zespół **VRCFury**. Pozwala częściom awatara realistycznie się deformować podczas interakcji [1].

## Do czego służy?
- **Realistyczna Deformacja:** Symuluje penetrację i kontakt fizyczny.
- **Optymalizacja:** Lżejszy i wydajniejszy niż starsze systemy.
- **Darmowy:** W przeciwieństwie do DPS, SPS jest całkowicie darmowy i open source.
- **Kompatybilność:** Działa z większością nowoczesnych shaderów (Poiyomi, LilToon, itp.).

## Przewodnik Instalacji

### Krok 1: Zainstaluj VRCFury
Zainstaluj VRCFury przez VCC.

### Krok 2: Utwórz Socket (Otwór)
1. W Unity przejdź do `Tools` > `VRCFury` > `SPS` > `Create Socket`.
2. Przeciągnij obiekt do hierarchii awatara jako dziecko odpowiedniego bone'a.
3. Ustaw socket na wejściu otworu w siatce.

> [!TIP]
> **Wskazówka (ERP)**
> Nie umieszczaj socketów zbyt głęboko w awatarze. Zaleca się umieszczanie ich przy wejściu lub lekko na zewnątrz.

### Krok 3: Utwórz Plug (Penetrator)
1. Upewnij się, że siatka penetratora jest "prosta" i "rozciągnięta" w pozycji spoczynkowej.
2. Przejdź do `Tools` > `VRCFury` > `SPS` > `Create Plug`.
3. Ustaw jako dziecko bazowego bone'a.

### Krok 4: Testuj w Unity
1. Zainstaluj **Gesture Manager** z VCC.
2. Wejdź w **Play Mode**.
3. VRCFury automatycznie generuje menu testowe.

> [!WARNING]
> Unikaj Unity Constraints na tych samych bone'ach, które SPS deformuje — mogą powodować jitter [4].

---

## Odniesienia

* VRCFury. (n.d.). SPS (Super Plug Shader). VRCFury Documentation. https://vrcfury.com/sps
* VRCFury. (n.d.). Download & Install. VRCFury Documentation. https://vrcfury.com/download
