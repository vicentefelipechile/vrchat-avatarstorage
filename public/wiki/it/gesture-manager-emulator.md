# Gesture Manager Emulator

<span class="badge badge-purple">Strumento</span> <span class="badge badge-blue">Workflow</span>

## Cos'è il Gesture Manager?
Il **Gesture Manager**, sviluppato da **BlackStartx**, è uno strumento essenziale per i creatori di avatar VRChat. Ti permette di visualizzare in anteprima e modificare animazioni, gesti e menu di un avatar direttamente in Unity, eliminando la necessità di caricare l'avatar nel gioco per testare ogni modifica [1].

Simula quasi completamente il sistema di animazione di VRChat, incluso il **Menu Radiale (Expressions Menu)**, che ti permette di verificare che i tuoi toggle e slider funzionino correttamente all'istante.

---

## Installazione

Ci sono due metodi principali per installare questo strumento nel tuo progetto.

### Metodo 1: VRChat Creator Companion (Raccomandato)
Questo è il modo più facile e assicura di avere sempre l'ultima versione compatibile con il tuo progetto [2].
1. Apri il **VRChat Creator Companion (VCC)**.
2. Seleziona il tuo progetto.
3. Assicurati che i pacchetti "Curated" non siano filtrati.
4. Cerca **"Gesture Manager"** e clicca il pulsante **"Add"**.
5. Apri il tuo progetto Unity.

### Metodo 2: Manuale (Unity Package)
Se non usi VCC o hai bisogno di una versione specifica:
1. Scarica il file `.unitypackage` dalla sezione *Releases* sul GitHub di BlackStartx o dalla sua pagina BOOTH [3].
2. Importa il pacchetto nel tuo progetto Unity (`Assets > Import Package > Custom Package`).

---

## Funzionalità Principali

*   **Radial Menu 3.0:** Ricrea fedelmente il menu delle espressioni di VRChat.
*   **Emulazione Gesti:** Permette di testare i gesti della mano sinistra e destra usando pulsanti nell'inspector.
*   **Camera Scena Attiva:** Sincronizza la camera di gioco con la camera della scena per facilitare i test di PhysBones e Contacts.
*   **Test Contacts:** Permette di attivare i *VRCContacts* cliccandoci sopra con il mouse.
*   **Debug Parametri:** Mostra una lista di tutti i parametri dell'avatar e i loro valori attuali.

---

## Come usarlo

1.  Una volta installato, vai alla barra superiore e seleziona `Tools > Gesture Manager Emulator`.
2.  Questo aggiungerà un oggetto chiamato `GestureManager` alla tua gerarchia.
3.  Entra in **Play Mode** in Unity.
4.  Seleziona l'oggetto `GestureManager` nella gerarchia.
5.  Nella finestra **Inspector**, vedrai il menu radiale e tutti i controlli per testare il tuo avatar.

> [!IMPORTANT]
> Devi avere l'oggetto `GestureManager` selezionato per vedere i controlli nell'inspector mentre Unity è in esecuzione.

---

## Riferimenti

* BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
* VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
* VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
* BlackStartx. (n.d.). Gesture Manager. Booth. https://blackstartx.booth.pm/items/3922472
