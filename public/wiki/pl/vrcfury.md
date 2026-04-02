# VRCFury

<span class="badge badge-blue">ZALEŻNOŚĆ</span>

## Co to jest?
**VRCFury** to darmowy i otwartoźródłowy zestaw narzędzi, który upraszcza i automatyzuje najbardziej żmudne zadania związane z tworzeniem awatarów VRChat [1]. Działa jak "middleware", który w momencie przesyłania łączy wszystkie konfiguracje (kontrolery, menu, parametry) w twoim awatarze bez modyfikowania oryginalnych plików — jest to znane jako **Niedestrukcyjny przepływ pracy**.

## Do czego służy?
- **Łatwa instalacja prefabów:** Przeciągnij prefab (np. Gogo Loco, SPS) jako dziecko awatara, a VRCFury automatycznie wszystko połączy.
- **Zarządzanie Toggle:** Tworzenie przełączników ubrań bez dotykania Animator Controllera.
- **Armature Link:** Łączenie szkieletu akcesoriów lub dodatkowych ubrań ze szkieletem awatara jednym kliknięciem.
- **SPS (Super Plug Shader):** VRCFury zawiera i zarządza systemem SPS do fizycznej interakcji awatara.
- **Rozwiązywanie konfliktów:** Automatycznie łączy menu, parametry i warstwy, unikając kolizji między różnymi zasobami.

## Jak zainstalować?
Najlepszym sposobem jest przez **VRChat Creator Companion (VCC)**.

1. Otwórz **VCC**.
2. Przejdź do **Settings** -> **Packages** -> **Add Repository**.
3. Wklej URL repozytorium VRCFury: `https://vrcfury.com/vcc` i kliknij **Add**.
4. Przejdź do projektu i w **Manage Packages** wyszukaj **VRCFury** i kliknij **Install** [2].

> [!IMPORTANT]
> Ważne
> **Nie instaluj VRCFury przez `.unitypackage`.** Zespół VRCFury zdecydowanie odradza tę metodę. Zawsze używaj VCC.

## Główne funkcje

| Funkcja | Opis |
|------|------|
| **Full Controller** | Łączy cały Animator Controller w twoim awatarze. |
| **Toggle** | Tworzy przycisk w menu do pokazywania/ukrywania obiektów. |
| **Armature Link** | Łączy szkielet obiektów z szkieletem awatara. |
| **SPS Plug/Socket** | Konfiguruje komponenty interakcji fizycznej dla ERP. |
| **Blendshape Link** | Wiąże blendshape dodatkowych ubrań z blendshape ciała. |

---

## Odniesienia

* VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
* VRCFury. (n.d.). Download & Install. VRCFury Documentation. https://vrcfury.com/download
