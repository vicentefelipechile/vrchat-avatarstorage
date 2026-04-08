# Menu Azioni

<span class="badge badge-blue">Logica</span> <span class="badge badge-purple">Workflow</span>

## Introduzione

Il **Menu Azioni** (noto anche come Expression Menu) è il menu radiale che usi dentro VRChat per attivare animazioni, cambiare vestiti o modificare i parametri del tuo avatar [1].

Tradizionalmente, i creatori caricano il proprio avatar su VRChat ogni volta che vogliono testare una piccola modifica, il che richiede molto tempo. Fortunatamente, ci sono strumenti che permettono di simulare questo menu **direttamente in Unity**, permettendoti di vedere come funzionano i tuoi toggle e slider all'istante.

---

## Strumenti di Simulazione

Ci sono due strumenti principali raccomandati dalla comunità e compatibili con il **VRChat Creator Companion (VCC)**.

### 1. Gesture Manager (di BlackStartx)

È lo strumento più popolare per visualizzare il menu radiale così come appare nel gioco. Permette di testare gesti, contacts e parametri in modo intuitivo.

> [!NOTE]
> Per una guida dettagliata su come installarlo e tutte le sue funzionalità, consulta il nostro articolo dedicato: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (di Lyuma)

Questo strumento è più tecnico e potente, ideale per il debug della logica complessa dietro l'avatar.

- **Installazione:** Disponibile in VCC o tramite GitHub. Viene spesso installato automaticamente con strumenti come [VRCFury](/wiki?topic=vrcfury) [3].
- **Come usarlo:**
  1.  Vai su `Tools` > `Avatar 3.0 Emulator`.
  2.  Entrando nel **Play Mode**, verrà generato un pannello di controllo.
  3.  Ti permette di forzare i valori dei [parametri](/wiki?topic=parameter) e vedere in tempo reale quale layer dell'Animator è in riproduzione.

---

## Quale dovrei usare?

| Funzionalità           | Gesture Manager      | Av3 Emulator               |
| :--------------------- | :------------------- | :------------------------- |
| **Interfaccia Visiva** | Eccellente (Radiale) | Basilare (Pulsanti/Slider) |
| **Test Menu**          | Sì                   | Limitato                   |
| **Debug Logica**       | Base                 | Avanzato                   |
| **Test Gesti**         | Facile (Pulsanti)    | Manuale (Animator)         |

**Raccomandazione:** Usa il **Gesture Manager** per la maggior parte dei test di toggle e abbigliamento. Usa l'**Av3 Emulator** se le tue animazioni non si attivano quando dovrebbero e hai bisogno di vedere cosa succede "sotto il cofano".

---

## Build & Test (L'alternativa ufficiale)

Se hai bisogno di testare qualcosa che richiede networking o interazioni con altri (come i [PhysBones](/wiki?topic=parameter)), usa la funzione **Build & Test** dell'SDK ufficiale [1]:

1.  Apri il `VRChat SDK Control Panel`.
2.  Nel tab `Builder`, cerca la sezione "Offline Testing".
3.  Clicca `Build & Test`.
4.  Unity compilerà l'avatar e aprirà un'istanza locale di VRChat dove solo tu puoi vederlo senza averlo caricato sui server.

---

## Riferimenti

- VRChat. (n.d.). Expression Menu and Controls. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls
- BlackStartx. (n.d.). VRC-Gesture-Manager. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager
- Lyuma. (n.d.). Av3Emulator. GitHub. https://github.com/lyuma/Av3Emulator
