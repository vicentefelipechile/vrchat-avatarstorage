# Gogo Loco

<span class="badge">RACCOMANDATO</span>

## Cos'è?
Gogo Loco è un sistema di locomozione avanzato per avatar VRChat, creato da **franada** [1]. Permette agli utenti desktop e VR senza "Full Body Tracking" di accedere a funzionalità di pose, volo e personalizzazione dell'avatar normalmente non disponibili.

## A cosa serve?
- **Pose Statiche:** Permette di sedersi, sdraiarsi ed eseguire varie pose artistiche ovunque.
- **Simulazione Full Body:** Include animazioni che simulano i tracker delle gambe.
- **Volo:** Permette di volare in mondi con collisioni o restrizioni di salto.
- **Regolazione Altezza:** Permette di ridimensionare la dimensione dell'avatar nel gioco.
- **Modalità Stazionaria:** Permette di muovere visivamente il tuo avatar senza muoverti fisicamente (utile per foto).

> [!NOTE]
> Sebbene possa essere installato manualmente, è altamente raccomandato usare **VRCFury** per facilitare l'installazione ed evitare conflitti con altri menu.

## Dove trovarlo?
- [GitHub - Gogo Loco (Gratuito)](https://github.com/Franada/goloco)
- [Gumroad - Gogo Loco (Supporta il creatore)](https://franadavrc.gumroad.com/l/gogoloco)

## Prerequisiti
- **Unity:** La versione raccomandata per VRChat.
- **VRChat SDK:** Installato nel tuo progetto (VCC).
- **Gogo Loco:** Il file `.unitypackage` scaricato.
- **VRCFury (Opzionale ma raccomandato):** Per installazione facile.

## Guida all'Installazione

### Metodo 1: Con VRCFury (Raccomandato e Facile)
Questo è il metodo più semplice e automatizzato [3].

1. **Installa VRCFury:** Assicurati che **VRCFury** sia installato nel tuo progetto tramite VCC.
2. **Importa Gogo Loco:** Trascina il file `.unitypackage` di Gogo Loco nella cartella `Assets` o fai doppio clic per importare.
3. **Trova il Prefab:**
   - Nella finestra `Project` di Unity, naviga alla cartella: `Assets/GoGo/Loco/Prefabs`.
   - Cerca il prefab chiamato **GoGo Loco Beyond**.
4. **Installa sull'Avatar:**
   - Trascina il prefab **GoGo Loco Beyond** e **posizionalo direttamente sul tuo avatar** nella Gerarchia. Il prefab dovrebbe diventare un "figlio" del tuo avatar.
   - Fatto! Non serve configurare altro.
5. **Carica:** Quando carichi il tuo avatar su VRChat, VRCFury riconosce il prefab e unisce automaticamente tutti i controller, menu e parametri necessari.

---

### Metodo 2: Installazione Manuale con Avatar 3.0 Manager
Se non vuoi usare VRCFury o hai bisogno di controllo completo [4].

1. **VRLabs Avatar 3.0 Manager:** Scarica e importa questo strumento gratuito.
2. **Importa Gogo Loco:** Importa il pacchetto in Unity.
3. **Apri Avatar 3.0 Manager:** Vai al menu superiore `VRLabs` -> `Avatar 3.0 Manager`.
4. **Seleziona Avatar:** Trascina il tuo avatar nel campo "Avatar".
5. **Unisci Controller (FX):**
   - Nell'area "FX", espandi le opzioni.
   - Clicca su **"Add Animator to Merge"**.
   - Seleziona il Controller FX di Gogo Loco.
   - Clicca su **"Merge on Current"**.
6. **Copia Parametri:**
   - Vai al tab **"Parameters"** del Manager.
   - Seleziona **"Copy Parameters"** dalla lista parametri di Gogo Loco.
7. **Aggiungi Menu:**
   - Vai al **VRChat Avatar Descriptor** del tuo avatar nell'Inspector.
   - Aggiungi un sotto-menu che punta al menu di GoGo Loco.

> [!WARNING]
> Attenzione: Write Defaults
> Gogo Loco funziona normalmente meglio con **Write Defaults OFF** [1]. Se il tuo avatar usa "Mixed Write Defaults", potresti sperimentare comportamenti strani.

---

## Riferimenti

* Franada. (n.d.). Gogo Loco. GitHub. https://github.com/Franada/goloco
* Franada. (n.d.). Gogo Loco. Gumroad. https://franadavrc.gumroad.com/l/gogoloco
* VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
* VRLabs. (n.d.). Avatar 3.0 Manager. GitHub. https://github.com/VRLabs/Avatars-3-0-Manager
