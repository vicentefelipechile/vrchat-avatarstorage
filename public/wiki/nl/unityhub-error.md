# Unity Hub Fout Oplossen

Als Unity Hub niet opent, vastloopt op een oneindig laadscherm of inlogfouten geeft, is de meeste effectieve oplossing een **schone herinstallatie**.

## Methode 1: Schone Herinstallatie

### 1. Unity Hub Verwijderen
> [!WARNING]
> Gebruik voor deze stap de **officiële Windows-verwijderaar** (via *Instellingen -> Apps* of *Configuratiescherm*). **Gebruik GEEN programma's van derden** zoals IObit Uninstaller, Revo Uninstaller, enz.

- Ga naar **Windows Instellingen** -> **Apps**.
- Zoek "Unity Hub" in de lijst en klik op **Verwijderen**.

### 2. Resterende Mappen Verwijderen
Open Windows Verkenner, kopieer elk van de volgende adressen naar de bovenste balk en druk op Enter. **Als de map bestaat, verwijder deze volledig:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

### 3. Unity Hub Herinstalleren
1. Ga naar de [officiële Unity-website](https://unity.com/download) en download de nieuwste versie van Unity Hub.
2. Voer het installatieprogramma uit en volg de normale stappen.
3. Wacht tot alles correct is geïnstalleerd, log opnieuw in en bevestig dat de fout is opgelost.
