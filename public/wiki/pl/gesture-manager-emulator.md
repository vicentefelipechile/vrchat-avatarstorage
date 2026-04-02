# Gesture Manager Emulator

<span class="badge badge-purple">Narzędzie</span> <span class="badge badge-blue">Workflow</span>

## Czym jest Gesture Manager?
**Gesture Manager**, opracowany przez **BlackStartx**, to niezbędne narzędzie dla twórców awatarów VRChat. Pozwala podglądać i edytować animacje, gesty i menu awatara bezpośrednio w Unity, eliminując potrzebę przesyłania awatara do gry w celu testowania każdej zmiany [1].

Niemal w pełni symuluje system animacji VRChat, w tym **Menu Radialne (Expressions Menu)**.

---

## Instalacja

### Metoda 1: VRChat Creator Companion (Zalecana)
1. Otwórz **VRChat Creator Companion (VCC)**.
2. Wybierz swój projekt.
3. Wyszukaj **"Gesture Manager"** i kliknij **"Add"**.
4. Otwórz swój projekt Unity.

### Metoda 2: Ręczna (Unity Package)
1. Pobierz plik `.unitypackage` z sekcji *Releases* na GitHubie BlackStartx [3].
2. Zaimportuj pakiet do projektu Unity (`Assets > Import Package > Custom Package`).

---

## Główne Funkcje

*   **Radial Menu 3.0:** Wiernie odtwarza menu wyrażeń VRChat.
*   **Emulacja Gestów:** Pozwala testować gesty lewej i prawej ręki za pomocą przycisków w inspektorze.
*   **Aktywna Kamera Sceny:** Synchronizuje kamerę gry z kamerą sceny.
*   **Testowanie Contacts:** Pozwala aktywować *VRCContacts* kliknięciem myszy.
*   **Debugowanie Parametrów:** Wyświetla listę wszystkich parametrów awatara i ich aktualnych wartości.

---

## Jak używać

1.  Po zainstalowaniu przejdź do górnego paska i wybierz `Tools > Gesture Manager Emulator`.
2.  To doda obiekt o nazwie `GestureManager` do hierarchii.
3.  Wejdź w **Play Mode** w Unity.
4.  Wybierz obiekt `GestureManager` w hierarchii.
5.  W oknie **Inspector** zobaczysz menu radialne i wszystkie kontrolki do testowania awatara.

> [!IMPORTANT]
> Musisz mieć wybrany obiekt `GestureManager`, aby widzieć kontrolki w inspektorze podczas działania Unity.

---

## Odniesienia

* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
* VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
* BlackStartx. (n.d.). Gesture Manager. Booth. https://blackstartx.booth.pm/items/3922472
