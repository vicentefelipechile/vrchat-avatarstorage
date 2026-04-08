# Modular Avatar

<span class="badge badge-blue">ZALEŻNOŚĆ</span>

## Co to jest?

**Modular Avatar** (MA) to darmowy i otwartoźródłowy zestaw narzędzi Unity, który pozwala tworzyć i instalować dodatkowe komponenty na awatarach VRChat w sposób **niedestrukcyjny** [1], czyli bez bezpośredniej modyfikacji oryginalnych plików awatara.

Pomyśl o tym jak o systemie, który pozwala "dołączać" ubrania, akcesoria, animacje i menu do awatara jako niezależne moduły. Podczas przesyłania awatara MA automatycznie wszystko scaliera.

## Do czego służy?

- **Instalacja ubrań i akcesoriów:** Przeciągnij prefab (przygotowany dla MA) jako dziecko awatara w hierarchii, a MA zajmie się scaleniem szkieletu, menu i parametrów.
- **Tworzenie komponentów wielokrotnego użytku:** Jeśli jesteś twórcą zasobów, możesz przygotować swoje produkty do instalacji przez użytkownika bez ręcznej modyfikacji jego Controller FX.
- **Automatyczne scalanie:** MA zarządza scalaniem Animator Controllera, BlendTree, menu radialnego i parametrów.

## Różnica z VRCFury

| Cecha              | Modular Avatar                    | VRCFury                                          |
| :----------------- | :-------------------------------- | :----------------------------------------------- |
| **Podejście**      | Modułowe komponenty dla Unity     | Zestaw narzędzi "wszystko w jednym"              |
| **Skupienie**      | Scalanie szkieletów i kontrolerów | Scalanie + dodatkowe funkcje (SPS, Toggle, itp.) |
| **Kompatybilność** | Standard japońskiej społeczności  | Bardzo popularny w zachodniej społeczności       |

> [!NOTE]
> W większości przypadków możesz używać **obu narzędzi w tym samym projekcie bez problemów**. VRCFury jest kompatybilny z MA i odwrotnie.

## Jak zainstalować?

### Metoda 1: VRChat Creator Companion (Zalecana)

1. Otwórz **VCC**.
2. Przejdź do **Settings** -> **Packages** -> **Add Repository**.
3. Dodaj repozytorium Modular Avatar (sprawdź oficjalny URL na [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)).
4. Przejdź do projektu i zainstaluj **Modular Avatar** z listy pakietów.

## Jak to działa? (Użytkownik)

1. Pobierz zasób przygotowany dla MA.
2. Zaimportuj zasób do projektu Unity.
3. Znajdź prefab w panelu `Project`.
4. Przeciągnij go jako dziecko awatara w `Hierarchy`.
5. Prześlij awatar. MA automatycznie wszystko scaliu [2].

### Kluczowe komponenty (dla twórców)

- **MA Merge Armature:** Automatycznie scala szkielet akcesorium ze szkieletem awatara.
- **MA Menu Installer:** Wstawia menu akcesorium do menu radialnego awatara.
- **MA Parameters:** Definiuje parametry do dodania do awatara.
- **MA Merge Animator:** Scala dodatkowy Animator Controller z kontrolerem awatara.
- **MA Bone Proxy:** Łączy obiekt z konkretnym bone'em awatara bez modyfikacji hierarchii.

---

## Odniesienia

- bd\_. (n.d.). Modular Avatar. https://modular-avatar.nadena.dev/
- bd\_. (n.d.). Modular Avatar Documentation. https://modular-avatar.nadena.dev/docs/intro
