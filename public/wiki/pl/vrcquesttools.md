# VRCQuestTools

<span class="badge">NARZĘDZIE</span>

## Co to jest?
VRCQuestTools to rozszerzenie Unity, stworzone przez **kurotu**, które pozwala konwertować awatary VRChat zaprojektowane na PC na platformę Android (Meta Quest/PICO).

> [!NOTE]
> VRCQuestTools w najnowszych wersjach działa poprzez system **Non-Destructive Modular Framework (NDMF)**.

## Gdzie to zdobyć?
- **Oficjalna strona:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)

## Jak konwertować awatar na Android?

1. Kliknij prawym przyciskiem na awatar w Hierarchii Unity
2. Wybierz **VRCQuestTools** → **Convert Avatar For Android**
3. Kliknij **Begin Converter Settings** i potem **Convert**
4. Przejdź do **File** → **Build Settings**
5. Wybierz platformę **Android** i kliknij **Switch Platform**
6. Prześlij skonwertowany awatar do VRChat

> [!WARNING]
> WAŻNE: Awatary VRoid Studio nie są kompatybilne z Androidem z powodu intensywnego użycia przezroczystych materiałów.

## Limity Wydajności Quest

| Metryka | Doskonała | Dobra | Średnia | Słaba | Bardzo Słaba |
|---------|-----------|------|--------|--------|---------------|
| **Trójkąty** | 7.500 | 10.000 | 15.000 | 20.000 | >20.000 |
| **Sloty Materiałów** | 1 | 1 | 1 | 2 | >2 |
| **PhysBones** | 2 | 4 | 6 | 8 | >8 |

---

## Odniesienia

kurotu. (n.d.). *VRCQuestTools*. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/
