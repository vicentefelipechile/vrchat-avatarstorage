# Usuwanie GoGo Loco z projektu Unity

<span class="badge badge-blue">Logic</span>

## Co to jest?

GoGo Loco to prefabrykacja lokomocji stworzona przez Franadę, która zastępuje lub modyfikuje kilka Playable Layers z Avatar Descriptor (Base/Locomotion, Additive, Gesture) i wstrzykuje własne parametry i pozycje w Expression Menu avatara. Ponieważ wpływa na tak wiele powiązanych ze sobą części projektu avatara, jego całkowite usunięcie wymaga pracy na wielu poziomach — od obiektów w scenie po assety na poziomie projektu, a czasami także manifest VPM.

> [!WARNING]
> Zawsze twórz kopię zapasową projektu Unity (lub zatwierdzaj w systemie kontroli wersji) przed rozpoczęciem tego procesu. Wiele z tych kroków usuwa lub nadpisuje Animator Controllers i assety Expression, które mogą być udostępniane innym częściom Twojego awatara.

## Po co to usuwać?

- Zastąpienie GoGo Loco innym systemem lokomocji (np. Modular Avatar locomotion, WetCat's Locomotion Fix lub domyślnymi kontrolerami VRChat).
- Czyszczenie zakupionego avatara, który miał fabrycznie zainstalowane GoGo Loco, a go nie chcesz.
- Rozwiązywanie konfliktów z NSFW Locomotion lub innymi pakietami, które współdzielą nazwy warstw i parametrów z GoGo Loco.
- Zmniejszenie zużycia pamięci parametrów (GoGo Loco domyślnie zużywa 16–17 bitów synchronizowanej pamięci).

## Krok 1: Usuń prefabrykat ze sceny

GoGo Loco może być zainstalowany jako podrzędny obiekt (child GameObject) w głównym folderze awatara, zwłaszcza gdy jest skonfigurowany za pomocą VRCFury lub Modular Avatar.

1. Otwórz scenę zawierającą Twojego avatara w oknie **Hierarchy**.
2. Rozwiń główny GameObject avatara.
3. Poszukaj dowolnego obiektu potomnego o nazwie `GoGo Loco`, `GGL`, `GoGoLoco` lub podobnej. Wybierz go i naciśnij **Delete**.
4. Jeśli GoGo Loco zostało zainstalowane przez [VRCFury](/wiki?topic=vrcfury), poszukaj obiektu potomnego z komponentem `VRCFury`, który odwołuje się do prefabrykatu GoGo Loco — również go usuń.
5. Jeśli zostało zainstalowane przez [Modular Avatar](/wiki?topic=modular-avatar), poszukaj obiektu potomnego z komponentem `MA Merge Animator` lub `MA Menu Installer` wskazującym na assety GoGo Loco i usuń go.

> [!NOTE]
> Jeśli avatar został zakupiony, a GoGo Loco było jego częścią (tj. nie ma osobnego obiektu potomnego), pomiń ten krok i przejdź bezpośrednio do Kroku 2.

## Krok 2: Przywróć Playable Layers z Avatar Descriptor

GoGo Loco zastępuje maksymalnie trzy z pięciu Playable Layers na komponencie `VRCAvatarDescriptor`. Musisz ponownie przypisać je do domyślnych kontrolerów VRChat lub do własnych, niestandardowych kontrolerów.

1. Wybierz główny obiekt avatara w hierarchii i znajdź komponent **VRC Avatar Descriptor** w Inspektorze.
2. Rozwiń sekcję **Playable Layers**.
3. W przypadku każdej z poniższych warstw sprawdź, czy ma przypisany kontroler GoGo Loco (nazwy plików zaczynają się na `go_` lub zawierają `GoGoLoco/GGL`):

| Warstwa | Nazwa pliku GoGo Loco (przybliżona) | Domyślny zamiennik |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (z przykładów VRCSDK) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (z przykładów VRCSDK) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (z przykładów VRCSDK) |

4. Dla każdej z takich warstw kliknij małe kółko po prawej stronie pola i przypisz odpowiedni domyślny kontroler VRChat lub własny.
5. Jeśli w projekcie nie masz domyślnych kontrolerów VRChat, znajdziesz je w sekcji `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Jeśli Twój awatar miał niestandardowe gesty dłoni przed dodaniem GoGo Loco, powinieneś przywrócić oryginalny kontroler warstwy Gesture zamiast domyślnego VRChat — sprawdź w tym celu system kontroli wersji lub kopie zapasowe.

## Krok 3: Usuń warstwy GoGo Loco z kontrolera FX

Do funkcji latania GoGo Loco łączy dwie dodatkowe warstwy z FX Animator Controller avatara. Pozostają one nawet po usunięciu prefabrykatu i trzeba je usunąć ręcznie.

1. Zlokaluj FX Animator Controller swojego avatara w oknie Project i kliknij dwukrotnie, aby otworzyć okno **Animator**.
2. W panelu **Layers** po lewej stronie poszukaj warstw nazwanych `GoGo Fly`, `GoGo Freeze` lub jakiejkolwiek warstwy, której nazwa zaczyna się na `go_`.
3. Kliknij prawym przyciskiem myszy na każdej warstwie GoGo Loco i wybierz **Delete Layer**.
4. W tym samym oknie Animator kliknij zakładkę **Parameters**.
5. Usuń każdy parametr należący do GoGo Loco. Typowe parametry to m.in:

| Nazwa parametru | Typ |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Parametry, które zaczynają się od `go_` lub `Go/`, są parametrami GoGo Loco. Usuń je wszystkie. Parametry takie jak `VelocityY`, `VRCFaceBlendH`, `Grounded` itp. to standardowe wbudowane parametry VRChat — **nie** usuwaj ich.

> [!CAUTION]
> Usunięcie parametru, do którego wciąż odwołuje się jakiś stan animacji lub przejście (transition), spowoduje ich zepsucie. Zawsze weryfikuj przed usunięciem parametru, czy nie opierają się na nim warstwy spoza GoGo Loco.

## Krok 4: Wyczyść Asset z Expression Parameters

GoGo Loco dodaje swoje parametry do pliku `VRCExpressionParameters` avatara, zużywając synchronizowaną pamięć. Każdy pozostawiony parametr GoGo Loco to marnotrawstwo miejsca.

1. W oknie Project odszukaj plik `.asset` przypisany do **Expression Parameters** w Avatar Descriptor.
2. Wybierz go i spójrz na listę parametrów w Inspektorze.
3. Usuń każdą pozycję odpowiadającą parametrowi GoGo Loco (te same nazwy, co w Kroku 3).
4. Potwierdź, że **Total Cost** wyświetlany na dole Inspektora zmniejsza się po ich usunięciu.

## Krok 5: Usuń wpis menu GoGo Loco

GoGo Loco instaluje wpis podmenu w głównym Expression Menu avatara.

1. Znajdź plik `.asset` przypisany do **Expressions Menu** w Avatar Descriptor.
2. Wybierz go i sprawdź listę **Controls**.
3. Usuń wszystkie pozycje z nazwą `GoGo Loco`, `GGL`, `Loco` lub podobną, która linkuje do podmenu GoGo Loco.
4. Otwórz każde z pozostałych podmenu rekursywnie i usuń z nich wszelkie zagnieżdżone kontrolki GoGo Loco.

## Krok 6: Usuń pliki assetów GoGo Loco z projektu

Po odłączeniu GoGo Loco od awatara usuń pliki projektu w Unity, aby zachować porządek w folderze `Assets/`.

1. W oknie Project wpisz `go_` używając paska wyszukiwania (upewnij się, że zasięg to **All**).
2. Przejrzyj wyniki — pliki zaczynające się na `go_` to niemal zawsze assety GoGo Loco (Animation Clips, Animator Controllers, Textures, Materials dla ikon w menu).
3. Poszukaj też fraz `GoGoLoco` oraz `GGL`, aby upewnić się, że znalazłeś pliki z pełną nazwą.
4. Zaznacz wszystkie pliki, które są potwierdzonymi assetami GoGo Loco i naciśnij **Delete** (lub kliknij prawym przyciskiem myszy → **Delete**).
5. Unity poprosi Cię o potwierdzenie usunięcia. Zaakceptuj to.

> [!WARNING]
> Nie usuwaj assetów, których nazwa zaczyna się na `go_`, jeśli należą do twojego autorskiego projektu (np. GameObject lub animacja, którą nazwałeś w ten sposób). Zawsze weryfikuj każdy plik przed jego usunięciem.

Najczęstsze lokalizacje plików GoGo Loco to:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Oraz dowolne miejsce, gdzie zakupiony avatar mógł wypakować `.unitypackage`.

Usuń cały folder, gdy tylko upewnisz się, że zawiera wyłącznie pliki należące do GoGo Loco.

## Krok 7: Usuń pakiet VPM (Tylko przy instalacji z VCC)

Jeśli GoGo Loco zostało zainstalowane jako paczka VPM przy użyciu VRChat Creator Companion, pliki pakietu znajdują się w folderze `Packages/` a nie w folderze `Assets/` i muszą zostać usunięte z poziomu VCC lub pliku manifest.

### Opcja A — Za pomocą GUI w VCC

1. Otwórz **VRChat Creator Companion**.
2. Otwórz dany projekt w karcie **Projects** i kliknij **Manage Project**.
3. Na liście paczek znajdź `GoGoLoco` (ID paczki `com.franada.gogoloco` lub podobne).
4. Kliknij przycisk **minus (−)** lub zmień menu z wersją na **Remove** i zaakceptuj.
5. Otwórz projekt ponownie w Unity. Program Resolver znajdzie zmianę i wyczyści folder `Packages/`.

### Opcja B — Przez plik `vpm-manifest.json` (ręcznie)

1. Wyłącz program Unity.
2. Otwórz plik `<TwójProjekt>/Packages/vpm-manifest.json` w edytorze tekstowym.
3. Usuń obiekt odwołujący się do GoGo Loco z listy `"dependencies"` i z listy `"locked"`.
4. Usuń fizyczny folder pod adresem `<TwójProjekt>/Packages/com.franada.gogoloco/` (lub podobnym).
5. Ponownie włącz Unity. Resolver zaktualizuje dane i zweryfikuje, że w paczkach nie występują błędy.

> [!NOTE]
> Zwykłe usunięcie pliku paczki VPM automatycznie nie usuwa przypisanych warstw, parametrów, wpisów w menu czy podrzędnych modeli i animacji. Zawsze musisz się upewnić o kompletnej dezinstalacji wykonując Kroki 1–6, niezależnie od użytej metody.

## Krok 8: Włącz ponownie opcję Force Locomotion (jeśli to konieczne)

Instalacja GoGo Loco zazwyczaj wyłącza **Force Locomotion animations for 6-point tracking** w ustawieniach Avatar Descriptor, gdyż własny sposób lokomocji odpowiada w nim za tryby śledzenia. Po jego usunięciu powinieneś spróbować przywrócić go do standardowych wartości.

1. Zaznacz obiekt avatara i przejdź do ustawień w **VRC Avatar Descriptor** z menu Inspektor.
2. Zjedź w dół okna, do pozycji opcji **IK**.
3. Ponownie zaznacz pole opcji **Force Locomotion animations for 6 point tracking**, jeśli chcesz używać domyślnych wartości kontrolera lokomocji z VRChat.

> [!TIP]
> Jeżeli nie używasz śledzenia Full-Body (FBT), to ustawienie nie ma żadnego wpływu na poruszanie w locie i może pozostać wyłączone bądź włączone w danym stanie.

## Lista kontrolna weryfikacji awatara

Zanim prześlesz ten avatar dalej upewnij się, że spełnione są wszystkie poniższe wytyczne:

| Weryfikacja | Jak sprawdzić |
| :---------------------------------------- | :--------------------------------------------------- |
| Brak obiektów podrzędnych w oknie Hierarchy dotyczących GoGo Loco | Sprawdź widoczną hierarchię podczas przebywania w panelu Sceny |
| Opcje z Playable Layers wskazują do uwarunkowanych sterowników lokomocji | Ustawienia VRC Avatar Descriptor → Sprawdź na liscie w panelu opcji Playable Layers |
| W opcjach kontrolera FX brak widocznych warstw nazwy `go_` | Okienko ze zmiennymi Panelu FX Animator Controller → Sprawdź na karcie w opcjach kontrolerów Layers |
| W opcjach kontrolera FX brak jest dodatkowych ustawień z `go_` lub z `Go/` | Okienko z opcjami od panelu FX Animator Controller → Sprawdź menu parametru |
| Do elementu Expression Parameters nie jest zapisana pozycja o GoGo Loco | Upewnij się poprzez menu Inspektor dotyczącego ustawień w plikach `.asset` |
| Ustawienie to samo dotyczy również elementu Expression Menu | Przeszukaj rekurencyjnie pliki w panelu Inspektor `.asset` w sekcjach Expression Menu |
| We wszystkich zasobach w głównym oknie elementu `Assets/` nie są obecne puste pozycje przypisujące `go_` | Menu do wyszukiwania okna Project z adresem szukanych `go_` czy też fraz `GoGoLoco`, a także same ich akronimy `GGL` |
| Ten sam element jest też niedostępny do otwarcia dla programu `vpm-manifest.json` po usunięciu z VPM  | Odśwież menu oprogramowania, wyszukuj w programie tekstowym `gogoloco` po ponownym wejściu do menadżera zasobów  |
| Kontroler w Force Locomotion musi działać na optymalnych parametrach z włączoną kontrolą śledzenia i ruchów | VRC Avatar Descriptor → weryfikacja menu opcji pod opcją menu w sekcji u góry nad paskiem stanu dla IK |

## Podsumowanie i wytyczne usuwanych pakietów

| Usprawnienia, za które odpowiada paczka instalacyjna GoGo Loco i co zostaje dodane | Wskazania umiejscowień skąd mają ulec całkowitej likwidacji |
| :---------------------------------------------- | :------------------------------------------------ |
| Okno przypisane na opcji głównej z elementem obiektu Prefab / z opcją na obiekcie GameObject na zakładce Root od twojego avatara | Menu w liście nawigacyjnej z poziomu programu Unity w okienku zakładki Hierarchy → przejdź by skasować do elementu docelowego, zaznaczając podrzędnie plik podlegający kasacji |
| Pozostałe warstwy gry powiązane pod kątem ustawień Playable Layers odnośnie parametru Base czy też Additive i elementarnych opcji z grupy kontrolera podrzędnego ruchu – tzw. wskaźnika Gesture | Zobacz pod lupę główny komponent pod listą narzędzi przy pliku VRC Avatar Descriptor → skasuj element przy użyciu panelu widocznego od opcji menu w Playable Layers |
| Moduły obsługujące stany modyfikacyjne, tj. zmienne od weryfikacji stanu ruchu w FX Layer (do których należą przede wszystkim podane m.in.: `GoGo Fly`, obok innej skasowanej `GoGo Freeze` lub każdej z rozszerzeniem `go_*`) | Należy przenieść do kosza elementy na ścieżce wyjściowego programu z pozycji odnośników otwartego zasobnika powiązanych pod listę o nazwach opcjonalnie z panelem w zakładce do edycji parametrów we wskazanym docelowo katalogu na FX Animator Controller → Włącz panel zakładki w Layers i następnie wybierz likwidację i przywróć plik |
| Narzędzie parametrów z paska pod listę widoczną nad panelem kontrolera FX Parameters (ze ścieżką w ustawieniach opcji o wyznaczonych znacznikach parametrów `Go/*` razem na pasku ze znacznikiem na liście w sekcji o `VelocityMagnitude` oraz innych pobocznych parametrów na ścieżce o nazwie FX Parameter) | Kontroler ze wspomnianego modułu z dodatkiem zmiennej pod opcjonalnym adresem w pasku i włącz kontroler FX Animator Controller na menu → Na podgląd w menu do wejścia poprzez Panel kliknij na sekcje w Parametrach żeby usunąć z bazy modyfikacji do kasacji element z ustawień. |
| Zaznaczone wpisy powiązane bezpośrednio pod kątem parametru przy sekcji opcji dla pliku z powiązanymi zmianami w oknie dotyczącym kontrolki pod adresem Expression Parameters | Adres ścieżki i lokalizacji widoczny pod spodem nad adresem pliku `.asset` w elemencie dla wskazanego folderu na kontrolce VRCExpressionParameters w liście widocznej po włączeniu pod opcją wyszczególnienia List of the Controls. |
| Poszczególna grupa narzędzi związana jako podkategoria wyjściowa do ustawień nad paskiem wpisu na głównym katalogu po menu nawigacji z pliku Expression Menu i do obsługi opcji z elementem opcjonalnym Submenu Entry | Menu wyświetlające kontrolki opcjonalne podlegające zarządzaniu z poziomu głównej obsługi plików o formacie przypisanym dla włączanego paska do elementu `.asset` od podgrupy ze wspieraną nawigacją z wpisami opartymi o listę z kontrolkami w opcji VRCExpressionsMenu po wybraniu List element w sekcji pod Controls. |
| Wypunktowane assety do pliku docelowego z poziomu zapisanego w pasku jako plik o odpowiednim formacie dla plików w grach oraz powiązanych zasobów ze struktury projektu czyli o nazwach pod menu (`go_*.anim`, a także wszystkie podobne kontrolery od animacji, czy też nawet tekstury) | Do znalezienia i ręcznej kasacji do odnalezienia za wskazaniem opcji pod wybranym katalogiem i adresem ze ścieżki do folderu powiązanego ze standardami z menu w widoku głównego wyświetlanego okienka Project → aby ostatecznie bezwzględnie usunąć wszystkie wypisane pliki w zakładce menu GoGoLoco poprzez kliknięcie myszką na wskazane menu. |
| Punkt odpowiedzialny od wprowadzania opcjonalnych danych o powiązaniach nad listą w menu aplikacji obsługujących menadżera dla parametru nazwanego na VPM Packaged | Skasuj widoczny zasób przez wskazanie graficznego wyboru pod opcją z obsługą klienta VCC oraz ręczne edycje powiązań z usunięciem odniesień z list kontrolnych nad poleceniem dotyczącym zawartości obsługi pliku JSON w vpm-manifest.json dla VCC GUI |
| Dodatkowy z parametrów do ustawień śledzenia, czyli element dotyczący Force Locomotion przy zmienianiu ze stanu wyłączonego do aktywacji tej konkretnej opcji nad resztą z nich. | Panel z powiązaniami przy kontrolkach z menu z oknem opcji w VRC Avatar Descriptor → Zlokalizuj element dla zaktualizowanej i wymaganej zakładki obsługującej funkcje śledzenia wraz z modułem modyfikacji ustawień dotyczących sekcji powiązanej w panelu od opcji sterowania parametrem ruszania pod adresem do włączenia parametru dla funkcji w oknie ze znacznikami parametrów IK (po wyborze zmień opcje żeby ponownie ten panel do odblokowania uległ zmianie). |

## Odniesienia do zewnętrznej bibliografii na potrzeby przewodnika ze skryptami modyfikacyjnymi w tej wiki.

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
