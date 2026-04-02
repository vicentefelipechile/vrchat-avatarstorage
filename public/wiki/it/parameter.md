# Parametri Avatar (Expression Parameters)

<span class="badge badge-blue">Logica</span> <span class="badge badge-yellow">Ottimizzazione</span>

## Cosa sono?
Gli **Expression Parameters** (o semplicemente parametri) sono variabili che servono come "memoria" per il tuo avatar VRChat [1]. Fungono da ponte tra l'**Expressions Menu** (il menu radiale nel gioco) e l'**Animator Controller** (la logica che fa riprodurre le animazioni).

Quando selezioni un'opzione nel menu (ad es. "Rimuovi Maglietta"), il menu cambia il valore di un parametro (ad es. `Shirt = 0`), e l'Animator legge quel cambiamento per eseguire l'animazione corrispondente.

## Tipi di Parametri
Ci sono tre tipi principali di dati che puoi usare, ciascuno con un diverso costo di memoria [2]:

| Tipo | Descrizione | Costo Memoria | Uso Comune |
| :--- | :--- | :--- | :--- |
| **Bool** | Vero o Falso (On/Off). | 1 bit | Toggle semplici (vestiti, props). |
| **Int** | Numeri interi (0 a 255). | 8 bit | Cambio outfit con opzioni multiple, slider a step. |
| **Float** | Numeri decimali (0.0 a 1.0). | 8 bit | Slider continui (spessore, tonalità, radial puppet). |

## Limite di Memoria (Synced Bits)
VRChat impone un limite rigoroso di **256 bit** di dati sincronizzati per avatar [2].
- **Sincronizzati:** Parametri il cui valore viene inviato ad altri giocatori sulla rete. Se ti togli la maglietta, vuoi che gli altri lo vedano.
- **Non Sincronizzati (Locali):** Parametri che esistono solo sul tuo PC. Utili per logica interna che non ha bisogno di essere vista da altri.

> [!WARNING]
> Se superi il limite di memoria, non potrai caricare l'avatar o i parametri extra smetteranno di funzionare. Ottimizza usando `Bool` invece di `Int` quando possibile.

## Usi Avanzati
Oltre al controllo dei vestiti dal menu, i parametri possono essere controllati da:
- **PhysBones:** Per rilevare se qualcuno tocca il tuo orecchio o i tuoi capelli [3].
- **Contacts:** Per rilevare collisioni (come nei sistemi [SPS](/wiki?topic=sps) o [PCS](/wiki?topic=pcs)).
- **OSC:** Per ricevere dati da programmi esterni (come cardiofrequenzimetri, face tracking o Spotify) [3].

## Come Crearli
1. Nel tuo progetto Unity, fai clic destro in `Assets`.
2. Vai su `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Aggiungi i parametri necessari (ad es. "Outfit", "Sword", "HueShift").
4. Assegna questo file nel componente **VRC Avatar Descriptor** del tuo avatar, nella sezione "Expressions".

## Limitazioni e Problemi Comuni

### Perché esiste un limite di 256 bit?
VRChat impone questo limite principalmente per l'**ottimizzazione della rete** [1]. Ogni parametro sincronizzato deve essere inviato a tutti gli altri giocatori nell'istanza. Senza limite:
- La banda necessaria per aggiornare posizione e stato di 80 giocatori sarebbe insostenibile.
- Gli utenti con connessioni lente soffrirebbero di lag estremo o disconnessioni.
- Le prestazioni FPS generali calerebbero a causa dell'eccessiva elaborazione dei dati di rete.

### Conflitti con Asset Complessi (GoGo Loco, SPS, Danze)
Combinando più sistemi "pesanti" su un singolo avatar, sorgono problemi frequenti:

1.  **Esaurimento Parametri:**
    Asset come **GoGo Loco** consumano una quantità considerevole di memoria. Se provi ad aggiungere SPS, un sistema di danza complesso e toggle di vestiti, è molto facile superare 256 bit sincronizzati.
    *   *Conseguenza:* VRChat bloccherà il caricamento dell'avatar o gli ultimi componenti installati non funzioneranno.

2.  **Conflitti di Logica:**
    *   **GoGo Loco:** Può causare l'"affondamento" dell'avatar nel pavimento o il galleggiamento se ci sono conflitti con i layer di locomotion base o versioni vecchie dell'asset [4].
    *   **SPS (Super Plug Shader):** Combinare SPS con Constraints può causare "jitter" (tremore rapido) ai punti di contatto [5].

3.  **Performance Rank:**
    *   **SPS:** Richiede spesso luci o renderer extra che possono degradare il rank di performance dell'avatar a "Very Poor" immediatamente.
    *   **GoGo Loco:** Aggiunge più layer all'Animator Controller. Non influisce tanto sulla grafica, ma aumenta l'uso della CPU [4].

> [!TIP]
> Strumenti come **VRCFury** sono essenziali per gestire questi conflitti. VRCFury automatizza la fusione di controller e parametri ("Flusso di lavoro non distruttivo"), riducendo errori umani e ottimizzando l'uso della memoria dove possibile.

## Ottimizzazione e Trucchi: Come ridurre l'uso dei bit

Per evitare di raggiungere il limite di 256 bit senza sacrificare funzionalità, i creatori usano diverse tecniche intelligenti. La più comune è **combinare stati mutuamente esclusivi**.

#### Il Trucco del "Singolo Int"
Immagina di avere 10 magliette diverse per il tuo avatar.
*   **Modo Inefficiente (Bool):** Crei 10 parametri `Bool` (Shirt1, Shirt2... Shirt10).
    *   *Costo:* 10 Bit.
    *   *Svantaggio:* Spendi 1 bit per ogni capo aggiuntivo.
*   **Modo Efficiente (Int):** Crei **1** singolo parametro `Int` chiamato `Top_Clothing`.
    *   *Costo:* 8 Bit (sempre, essendo un Int).
    *   *Vantaggio:* Puoi avere fino a **255 magliette** usando gli stessi 8 bit!
    *   *Come funziona:* Nell'Animator, imposti che se il valore è 1, si attiva la Maglietta A; se è 2, la Maglietta B, ecc.

> [!NOTE]
> **Regola d'Oro:** Se hai più di 8 opzioni che non possono essere usate contemporaneamente (ad es. tipi di vestiti, colori degli occhi), usa un `Int`. Se sono meno di 8, usa `Bool` individuali.

#### Esempio di Configurazione Base
Se vuoi creare un selettore di colori per i tuoi vestiti:
1.  Crea un parametro **Int** chiamato `ColorBoots`.
2.  Nel tuo **Expression Menu**, crea un sotto-menu o un controllo "Radial Puppet".
3.  Configura i pulsanti del menu:
    *   Pulsante "Rosso" -> Imposta `ColorBoots` a 1.
    *   Pulsante "Blu" -> Imposta `ColorBoots` a 2.
    *   Pulsante "Nero" -> Imposta `ColorBoots` a 3.
4.  Nell'**Animator (FX Layer)**:
    *   Crea transizioni da `Any State` agli stati colore.
    *   Condizione per Rosso: `ColorBoots` uguale a 1.
    *   Condizione per Blu: `ColorBoots` uguale a 2.

In questo modo controlli più opzioni spendendo solo 8 bit del tuo budget totale!

## Tabella Riepilogativa: Quale tipo usare?

| Caso d'Uso | Tipo Raccomandato | Perché? |
| :--- | :--- | :--- |
| **Toggle di 1 oggetto** (Occhiali, cappello) | `Bool` | Semplice e diretto. Costa 1 bit. |
| **Selettore Vestiti** (Maglietta A, B, C...) | `Int` | Permette centinaia di opzioni spendendo solo 8 bit. |
| **Cambiamenti Graduali** (Spessore, Colore, Luminosità) | `Float` | Necessario per valori decimali (0.0 a 1.0). |
| **Stati Complessi** (Danze, AFK, Emote) | `Int` | Ideale per state machine con condizioni multiple. |
| **Toggle Indipendenti** (< 8 oggetti) | `Bool` | Se pochi e non si annullano a vicenda, più facili da configurare. |

---

## Riferimenti

* VRChat. (n.d.). Expression Parameters. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset
* VRChat. (n.d.). Avatar Parameter Driver. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver
* VRChat. (n.d.). OSC Overview. VRChat Documentation. https://creators.vrchat.com/avatars/osc/
* Franada. (n.d.). GoGo Loco Documentation. https://github.com/Franada/goloco
* VRCFury. (n.d.). SPS - Super Plug Shader. VRCFury Documentation. https://vrcfury.com/sps
