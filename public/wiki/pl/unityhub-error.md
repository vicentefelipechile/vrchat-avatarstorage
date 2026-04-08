# Naprawa Błędu Unity Hub

Jeśli Unity Hub się nie otwiera, utknął na nieskończonym ekranie ładowania lub występują błędy logowania uniemożliwiające korzystanie z programu, najskuteczniejszym rozwiązaniem jest wykonanie **czystej reinstalacji**.

Oto jak usunąć wszystkie pliki tymczasowe i uszkodzone ustawienia.

## Metoda 1: Czysta Reinstalacja (Usuń wszystkie ślady)

Postępuj uważnie według tych kroków, aby Unity Hub ponownie działał:

### 1. Odinstaluj Unity Hub

> [!WARNING]
> Ostrzeżenie
> W tym kroku musisz użyć **oficjalnego deinstalatora Windows** (z _Ustawienia -> Aplikacje_ lub _Panel sterowania_). **NIE używaj programów firm trzecich** jak IObit Uninstaller, Revo Uninstaller itp.

- Przejdź do **Ustawienia Windows** -> **Aplikacje**.
- Znajdź "Unity Hub" na liście i kliknij **Odinstaluj**.

### 2. Usuń pozostałe katalogi

Nawet po odinstalowaniu Unity pozostawia ukryte foldery konfiguracyjne (cache) w systemie. Musisz je ręcznie znaleźć i usunąć.

Otwórz Eksplorator plików Windows, skopiuj każdy z poniższych adresów do górnego paska i naciśnij Enter. **Jeśli folder istnieje, usuń go całkowicie:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

### 3. Reinstaluj Unity Hub

Gdy system jest całkowicie oczyszczony z plików Unity:

1. Przejdź na [oficjalną stronę Unity](https://unity.com/download) i pobierz najnowszą wersję Unity Hub.
2. Uruchom instalator i postępuj zgodnie z normalnymi krokami.
3. Poczekaj, aż wszystko się poprawnie zainstaluje, zaloguj się ponownie i potwierdź, że błąd został naprawiony.
