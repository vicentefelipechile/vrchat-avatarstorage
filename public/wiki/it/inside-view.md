# Inside View

<span class="badge badge-blue">Visuale</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## Cos'è?
**Inside View**, creato da **Liindy** [1], è un asset per avatar VRChat che permette di vedere l'interno di un mesh (come un orifizio SPS) aggiungendo profondità visiva simulata.

A differenza della semplice eliminazione delle facce posteriori del mesh (backface culling), Inside View usa uno "Screen Shader" che proietta una texture di profondità all'interno dell'orifizio, creando un'illusione realistica dell'interno senza necessità di modellare geometria interna complessa. È comunemente usato insieme a sistemi come [SPS](/wiki?topic=sps) per migliorare la visualizzazione durante l'ERP.

## Funzionalità Principali
- **Profondità Simulata:** Crea l'illusione di un tunnel o interno dettagliato.
- **Ottimizzato:** Usa shader per evitare geometria extra pesante.
- **Integrazione SPS:** Progettato per lavorare insieme alle penetrazioni SPS [3].
- **Installazione Facile:** Compatibile con **VRCFury** per una configurazione "drag-and-drop".

## Prerequisiti
- **Unity:** Versione raccomandata per VRChat [1].
- **VRChat SDK 3.0:** (Avatars) Scaricato tramite VCC [1].
- **VRCFury:** Necessario per l'installazione automatica.
- **Poiyomi Toon Shader:** (Opzionale ma raccomandato) Versione 8.1 o superiore [2].

## Guida all'Installazione

> [!NOTE]
> Questa guida presume l'uso di **VRCFury**, che è il metodo ufficiale raccomandato dal creatore.

### Passo 1: Importare
Una volta acquisito il pacchetto (gratuito o a pagamento) da Jinxxy o Gumroad:
1. Apri il tuo progetto Unity con SDK e VRCFury già installati.
2. Importa il `.unitypackage` di **Inside View**.

### Passo 2: Posizionamento (VRCFury)
1. Cerca il prefab Inside View nella cartella asset (di solito `Assets/Liindy/Inside View`).
2. Trascina il prefab nella gerarchia del tuo avatar.
   - **Importante:** Posizionalo come "figlio" del bone o oggetto dove si trova l'orifizio (o il Socket SPS).
3. Assicurati che l'oggetto "Socket" SPS e "Inside View" siano allineati nella stessa posizione e rotazione.

### Passo 3: Configurazione Profondità
L'asset funziona tramite un'Animazione di Profondità.
1. Seleziona il componente VRCFury sul prefab Inside View.
2. Verifica che punti al **Renderer** (mesh) corretto del tuo orifizio.
3. Al caricamento dell'avatar, VRCFury unirà automaticamente i menu e la logica necessari.

### Note Aggiuntive
- **Costo Parametri:** La versione "Full" può usare fino a 35 bit di memoria parametri, mentre la versione "Standard" ne usa circa 17 [1].
- **Backface Culling:** Assicurati che il materiale dell'orifizio abbia "Cull" impostato su "Off" o "Back" secondo le istruzioni dello shader.

---

## Riferimenti

* Liindy. (n.d.). Inside View (VRCFury). Jinxxy. https://jinxxy.com/Liindy/InsideView
* Liindy. (n.d.). Inside View. Gumroad. https://jinxxy.com/Liindy/InsideView
