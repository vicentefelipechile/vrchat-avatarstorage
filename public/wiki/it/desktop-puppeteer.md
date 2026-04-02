# Esska Desktop Puppeteer

<span class="badge">UTILITÀ</span>

## Cos'è?
**Esska Desktop Puppeteer** è uno strumento avanzato per gli utenti desktop di VRChat creato da **Esska**. Consiste in un sistema a due parti (un'app desktop e un pacchetto avatar) che ti permette di controllare parti specifiche del corpo del tuo avatar usando il mouse del computer, offrendo un livello di precisione ed espressività normalmente disponibile solo per gli utenti di Realtà Virtuale (VR).

## A cosa serve?
- **Controllo degli arti:** Permette di muovere le braccia e le mani del tuo avatar in modo indipendente e preciso direttamente con il mouse.
- **Parti personalizzate:** Facilita il controllo di parti aggiuntive dell'avatar, come orecchie, code o accessori.
- **Simulazione VR su Desktop:** L'obiettivo principale è dare agli utenti desktop una libertà di movimento che li faccia sembrare come se giocassero in VR.
- **Head Tracking:** Supporta dispositivi TrackIR, permettendo alla testa del tuo avatar di muoversi in base ai tuoi movimenti reali.

> [!NOTE]
> Nota
> Questo strumento utilizza **OSC (Open Sound Control)** per inviare parametri dall'applicazione desktop al tuo client VRChat. Assicurati di avere l'opzione OSC abilitata nel Menu Radiale di VRChat.

## Dove trovarlo?
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Prerequisiti
Prima di iniziare, assicurati di soddisfare i seguenti requisiti:
- **Sistema Operativo:** Windows 10 o Windows 11.
- **Software:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/download/dotnet/9.0) installato sul tuo PC.
  - *Come scaricarlo:* Quando clicchi il link, cerca la sezione "**.NET Desktop Runtime**". Nella piccola tabella sotto, nella riga "Windows", clicca sul link **x64** per scaricare il programma di installazione.
- **Hardware:** Un mouse con pulsante centrale (rotella di scorrimento).
- **VRChat SDK:** Installato nel tuo progetto Unity (tramite VCC).
- **Avatar:** Un avatar umanoide compatibile (funziona meglio con proporzioni umane standard).

## Guida all'Installazione Passo per Passo

Il processo di installazione è diviso in due parti principali: preparazione dell'avatar in Unity e configurazione dell'applicazione desktop.

### Parte 1: Installazione sull'Avatar (Unity)
1. **Importa il Pacchetto:** Scarica il "Base Package" dalla pagina ufficiale e trascina il file `.unitypackage` nella cartella `Assets` del tuo progetto Unity.
2. **Aggiungi all'Avatar:** Trova il prefab incluso nel pacchetto Esska Desktop Puppeteer e trascinalo sul tuo avatar nella `Hierarchy`.
3. **Configurazione Parametri:** Il sistema usa parametri OSC. Assicurati che il tuo avatar abbia sufficiente memoria parametri (Parameters Memory) per ospitare i nuovi controlli.
4. **Carica l'Avatar:** Una volta che il prefab è correttamente posizionato e configurato, carica il tuo avatar su VRChat come faresti normalmente.

### Parte 2: Configurazione dell'Applicazione Desktop
1. **Scarica l'App:** Scarica l'applicazione "Esska Desktop Puppeteer App".
2. **Esegui:** Apri l'applicazione sul tuo PC prima o durante la tua sessione VRChat.
3. **Abilita OSC in VRChat:** All'interno di VRChat, apri il menu radiale, vai su `Options` -> `OSC` e assicurati che sia impostato su **Enabled**.
4. **Utilizzo:** Usa i pulsanti del mouse (specialmente il pulsante centrale) e la tastiera secondo le istruzioni dell'applicazione per iniziare a muovere gli arti del tuo avatar.

> [!WARNING]
> Attenzione: Privacy e Controlli
> L'applicazione deve "ascoltare" gli input della tastiera e del mouse (hook globali) per funzionare mentre la finestra VRChat è attiva. Il creatore dichiara che non raccoglie dati personali, ma è importante sapere come funziona il programma per evitare interferenze con altre applicazioni.

---

## Riferimenti

* Esska. (n.d.). Esska Desktop Puppeteer. BOOTH. https://esska.booth.pm/items/6366670
