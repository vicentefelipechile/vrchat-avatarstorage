# VRCFury

<span class="badge badge-blue">DIPENDENZA</span>

## Cos'è?

**VRCFury** è un toolkit gratuito e open source che semplifica e automatizza le attività più tediose dello sviluppo di avatar VRChat [1]. Funziona come "middleware" che, al momento del caricamento, unisce tutte le configurazioni (controller, menu, parametri) nel tuo avatar senza modificare i file originali — questo è noto come **Flusso di lavoro non distruttivo**.

## A cosa serve?

- **Installazione facile di prefab:** Trascina un prefab (ad es. Gogo Loco, SPS) come figlio del tuo avatar e VRCFury unisce tutto automaticamente.
- **Gestione dei Toggle:** Crea toggle di abbigliamento senza toccare l'Animator Controller.
- **Armature Link:** Collega l'armatura di accessori o vestiti extra all'armatura principale dell'avatar con un click.
- **SPS (Super Plug Shader):** VRCFury include e gestisce il sistema SPS per l'interazione fisica dell'avatar.
- **Risoluzione dei conflitti:** Unifica automaticamente menu, parametri e layer, evitando collisioni tra diverse risorse.

## Come installarlo?

Il modo migliore è tramite il **VRChat Creator Companion (VCC)**, garantendo aggiornamenti rapidi.

1. Apri il **VCC**.
2. Vai su **Settings** -> **Packages** -> **Add Repository**.
3. Incolla l'URL del repository di VRCFury: `https://vrcfury.com/vcc` e clicca **Add**.
4. Vai al tuo progetto e in **Manage Packages**, cerca **VRCFury** e clicca **Install** [2].

> [!IMPORTANT]
> Importante
> **Non installare VRCFury tramite `.unitypackage`.** Il team di VRCFury sconsiglia fortemente questo metodo perché può causare problemi di aggiornamento e conflitti. Usa sempre VCC.

## Funzionalità principali

| Funzionalità         | Descrizione                                                                     |
| -------------------- | ------------------------------------------------------------------------------- |
| **Full Controller**  | Unisce un intero Animator Controller nel tuo avatar.                            |
| **Toggle**           | Crea un pulsante nel menu per mostrare/nascondere oggetti (vestiti, accessori). |
| **Armature Link**    | Collega l'armatura di oggetti (ad es. una giacca) a quella del tuo avatar.      |
| **SPS Plug/Socket**  | Configura i componenti di interazione fisica per ERP.                           |
| **Blendshape Link**  | Vincola i blendshape di vestiti extra ai blendshape del corpo.                  |
| **Blink Controller** | Gestisce il battito delle palpebre dell'avatar.                                 |
| **Worldfix**         | Blocca un oggetto nello spazio del mondo.                                       |

## Quando usare VRCFury?

- **Sempre** che una risorsa (.unitypackage) includa un prefab con componenti VRCFury.
- **Per evitare conflitti** quando installi più risorse che toccano i menu o i parametri dell'avatar.
- **Per risparmiare tempo** automatizzando compiti manuali su Controller/Parametri/Menu.

---

## Riferimenti

- VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
- VRCFury. (n.d.). Download & Install. VRCFury Documentation. https://vrcfury.com/download
