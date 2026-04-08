# Przewodnik Konfiguracji

<span class="badge badge-blue">Przewodnik</span>

## Wymagania wstępne

Przed rozpoczęciem konfiguracji środowiska do tworzenia awatarów VRChat upewnij się, że masz:

1. **Unity Hub** zainstalowany na komputerze
2. **VRChat Creator Companion (VCC)** pobrany z oficjalnej strony VRChat
3. **Konto VRChat** z co najmniej rangą "New User"

## Krok 1: Instalacja Unity Hub

1. Przejdź na [oficjalną stronę Unity](https://unity.com/download) i pobierz Unity Hub
2. Zainstaluj i uruchom Unity Hub
3. Utwórz konto Unity, jeśli jeszcze go nie masz

> [!NOTE]
> Jeśli masz problemy z Unity Hub, sprawdź nasz [przewodnik rozwiązywania błędów Unity Hub](/wiki?topic=unityhub-error).

## Krok 2: Instalacja VRChat Creator Companion

1. Pobierz VCC ze [strony VRChat](https://vrchat.com/home/download)
2. Zainstaluj i otwórz VCC
3. VCC automatycznie zainstaluje odpowiednią wersję Unity wymaganą dla VRChat

## Krok 3: Tworzenie Nowego Projektu

1. Otwórz VCC
2. Kliknij "New Project"
3. Wybierz szablon "Avatar"
4. Wybierz lokalizację projektu i nadaj mu nazwę
5. Kliknij "Create Project"

## Krok 4: Importowanie Awatara

1. Pobierz plik `.unitypackage` swojego awatara
2. W Unity przejdź do `Assets > Import Package > Custom Package`
3. Wybierz pobrany plik
4. Kliknij "Import" w oknie dialogowym importu

## Krok 5: Przesyłanie do VRChat

1. W projekcie Unity znajdź prefab swojego awatara
2. Przeciągnij go na scenę
3. Wybierz awatar i upewnij się, że komponent `VRC Avatar Descriptor` jest skonfigurowany
4. Przejdź do `VRChat SDK > Show Control Panel`
5. Zaloguj się danymi VRChat
6. Kliknij "Build & Publish"
