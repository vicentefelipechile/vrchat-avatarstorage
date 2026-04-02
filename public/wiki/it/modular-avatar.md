# Modular Avatar

<span class="badge badge-blue">DIPENDENZA</span>

## Cos'è?
**Modular Avatar** (MA) è un toolkit gratuito e open source per Unity che consente di creare e installare componenti aggiuntivi su avatar VRChat in modo **non distruttivo** [1], ovvero senza modificare direttamente i file originali del tuo avatar.

Pensalo come un sistema che ti permette di "allegare" vestiti, accessori, animazioni e menu al tuo avatar come moduli indipendenti. Quando carichi l'avatar, MA unisce tutto automaticamente.

## A cosa serve?
- **Installazione di vestiti e accessori:** Trascina un prefab (preparato per MA) come figlio del tuo avatar nella gerarchia e MA si occupa di unire l'armatura, i menu e i parametri.
- **Creazione di componenti riutilizzabili:** Se sei un creatore di risorse, puoi preparare i tuoi prodotti perché vengano installati dall'utente senza dover modificare manualmente il loro Controller FX o gli Expression Parameters.
- **Fusione automatica:** MA gestisce la fusione dell'Animator Controller, dei BlendTree, dei menu radicali e dei parametri nell'avatar di destinazione.

## Differenza con VRCFury
Sia Modular Avatar che VRCFury condividono l'obiettivo del "flusso di lavoro non distruttivo", ma differiscono nell'implementazione:

| Caratteristica | Modular Avatar | VRCFury |
| :--- | :--- | :--- |
| **Approccio** | Componenti modulari per Unity | Toolkit "tutto in uno" |
| **Messa a fuoco** | Merge di armature e controller | Merge + funzionalità extra (SPS, Toggle, ecc.) |
| **Compatibilità** | Standard della comunità giapponese | Molto popolare nella comunità occidentale |
| **NDMF** | Base di NDMF | Si esegue all'interno di NDMF |

> [!NOTE]
> Nota
> Nella maggior parte dei casi, puoi usare **entrambi gli strumenti nello stesso progetto senza problemi**. VRCFury è compatibile con MA e viceversa.

## Come installarlo?
### Metodo 1: VRChat Creator Companion (Raccomandato)
1. Apri il **VCC**.
2. Vai su **Settings** -> **Packages** -> **Add Repository**.
3. Aggiungi il repository di Modular Avatar (controlla l'URL ufficiale su [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)).
4. Vai al tuo progetto e installa **Modular Avatar** dall'elenco dei pacchetti.

### Metodo 2: Manuale (Unity Package)
1. Scarica il file `.unitypackage` dalla pagina ufficiale.
2. Importalo in Unity (`Assets > Import Package > Custom Package`).

## Come funziona? (Utente)
1. Scarica un asset preparato per MA (di solito un `.unitypackage` o tramite VCC).
2. Importa l'asset nel tuo progetto Unity.
3. Trova il prefab nel pannello `Project`.
4. Trascinalo come figlio del tuo avatar nella `Hierarchy`.
5. Carica il tuo avatar. MA unisce tutto automaticamente [2].

### Componenti chiave (per creatori)
Se vuoi preparare la tua risorsa perché sia installata con MA, i componenti principali sono:
- **MA Merge Armature:** Unisce automaticamente l'armatura dell'accessorio con quella dell'avatar.
- **MA Menu Installer:** Inserisce i menu dell'accessorio nel menu radicale dell'avatar.
- **MA Parameters:** Definisce i parametri da aggiungere all'avatar.
- **MA Merge Animator:** Unisce un Animator Controller aggiuntivo con quello dell'avatar (FX, Gesture, ecc.).
- **MA Bone Proxy:** Collega un oggetto a un bone specifico dell'avatar senza modificare la gerarchia.

> [!TIP]
> Suggerimento
> Se sei un creatore di risorse, puoi cercare il menu `Tools > Modular Avatar` in Unity per accedere a utilità come la convalida dell'avatar e gli strumenti di debug.

---

## Riferimenti

* bd_. (n.d.). Modular Avatar. https://modular-avatar.nadena.dev/
* bd_. (n.d.). Modular Avatar Documentation. https://modular-avatar.nadena.dev/docs/intro
