# Correzione Errore Unity Hub

Se Unity Hub non si apre, resta bloccato su una schermata di caricamento infinita o si verificano errori di accesso che ti impediscono di utilizzare il programma, la soluzione più efficace è eseguire una **reinstallazione pulita**.

Ecco come eliminare tutti i file temporanei e le impostazioni corrotte.

## Metodo 1: Reinstallazione Pulita (Rimuovi tutte le tracce)

Segui attentamente questi passaggi per assicurarti che Unity Hub funzioni di nuovo:

### 1. Disinstallare Unity Hub
> [!WARNING]
> Attenzione
> Per questo passaggio, devi usare il **disinstallatore ufficiale di Windows** (da *Impostazioni -> App* o *Pannello di Controllo*). **NON usare programmi di terze parti** come IObit Uninstaller, Revo Uninstaller, ecc., poiché possono eliminare chiavi di registro necessarie e peggiorare il problema.

- Vai su **Impostazioni di Windows** -> **App**.
- Trova "Unity Hub" nell'elenco e clicca su **Disinstalla**.

### 2. Eliminare le directory residue
Anche dopo la disinstallazione, Unity lascia cartelle di configurazione (cache) nascoste nel sistema. Devi trovarle ed eliminarle manualmente.

Apri Esplora File di Windows, copia ciascuno dei seguenti indirizzi nella barra superiore e premi Invio. **Se la cartella esiste, eliminala completamente:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*(Nota: puoi copiare e incollare il percorso `%USERPROFILE%` direttamente nella barra dell'explorer, proprio come faresti con `%appdata%` per installare mod di Minecraft, e ti porterà automaticamente alla cartella dell'utente corrente).*

### 3. Reinstallare Unity Hub
Una volta che il sistema è completamente pulito dai file Unity:
1. Vai al [sito ufficiale di Unity](https://unity.com/download) e scarica l'ultima versione di Unity Hub.
2. Esegui il programma di installazione e segui i passaggi normali.
3. Attendi che tutto si installi correttamente, accedi nuovamente e conferma che l'errore sia risolto.
