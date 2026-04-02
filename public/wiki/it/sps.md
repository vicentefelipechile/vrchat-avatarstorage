# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## Cos'è?
**SPS** (Super Plug Shader), a volte denominato colloquialmente "SSP", è un sistema gratuito e moderno di deformazione mesh per VRChat progettato dal team **VRCFury**. Permette a parti dell'avatar di deformarsi realisticamente quando interagiscono con altri avatar o oggetti, sostituendo sistemi più vecchi e a pagamento come **DPS** (Dynamic Penetration System) e **TPS** [1].

## A cosa serve?
- **Deformazione Realistica:** Simula penetrazione e contatto fisico deformando il mesh dell'avatar.
- **Ottimizzazione:** È molto più leggero ed efficiente dei sistemi più vecchi.
- **Gratuito:** A differenza di DPS, SPS è completamente gratuito e open source.
- **Compatibilità:** Funziona con la maggior parte degli shader moderni (Poiyomi, LilToon, ecc.) ed è retrocompatibile con avatar che usano DPS o TPS.

## Prerequisiti
Prima di iniziare, assicurati di avere:
- **Unity:** La versione raccomandata per VRChat.
- **VRChat SDK:** Installato nel tuo progetto (VCC).
- **VRCFury:** Installato e aggiornato all'ultima versione [2].
- **Modello 3D:** Un avatar con i mesh che vuoi animare (socket o plug).

## Guida all'Installazione Passo per Passo

SPS è completamente gestito tramite gli strumenti VRCFury in Unity. Non è necessario importare pacchetti shader bizzarri o fare configurazioni manuali complesse delle animazioni.

### Passo 1: Installare VRCFury
Se non lo hai ancora, installa VRCFury dal VRChat Creator Companion (VCC).
1. Apri VCC.
2. Vai su "Manage Project".
3. Cerca "VRCFury" nell'elenco pacchetti e clicca installa.

### Passo 2: Creare un Socket (Orifizio)
Un "Socket" è il ricevitore dell'interazione (bocca, ecc.).

1. **Strumenti:** Nella barra superiore di Unity, vai su `Tools` > `VRCFury` > `SPS` > `Create Socket` [1].
2. **Posizionamento:** Un nuovo oggetto apparirà nella tua scena.
   - Trascina questo oggetto nella gerarchia del tuo avatar, e **rendilo figlio del bone corrispondente** (ad es. `Hip` o `Head`).
3. **Regolazione:** Muovi e ruota l'oggetto Socket per farlo corrispondere all'entrata dell'orifizio sul tuo mesh.
   - La freccia del gizmo deve puntare **verso l'interno** dell'orifizio.
   - Assicurati che il tipo di Socket (nell'inspector) corrisponda a quello che vuoi.
4. **Luci:** Non è necessario configurare manualmente le luci ID; VRCFury lo fa per te.

> [!TIP]
> **Nota sul Posizionamento (ERP)**
> Non posizionare i punti (Socket) troppo in profondità nell'avatar. Se il "buco" è troppo profondo, diventa difficile fare ERP comodamente. Si raccomanda di posizionarli proprio all'ingresso o leggermente all'esterno.
>
> **Attenzione alle Grandi Proporzioni:** Se il tuo avatar ha fianchi molto larghi o un sedere molto grande, **sposta il Socket ancora più all'esterno**. Altrimenti, l'altra persona colliderà con il mesh del corpo prima di poter "raggiungere" il punto di interazione.

### Passo 3: Creare un Plug (Penetratore)
Un "Plug" è l'oggetto che penetra e deforma.

1. **Preparazione Mesh:**
   - Assicurati che il mesh del penetratore sia "dritto" ed "esteso" nella posizione di riposo in Unity. SPS deve conoscere la lunghezza totale.
   - Se provieni da DPS/TPS, assicurati di rimuovere vecchi script o materiali speciali. Usa uno shader normale (Poiyomi) [1].
2. **Strumenti:** Vai su `Tools` > `VRCFury` > `SPS` > `Create Plug` [1].
3. **Posizionamento:**
   - **Opzione A (Con bones):** Se il tuo pene ha bones, trascina l'oggetto Plug e rendilo figlio del **bone base** del pene.
   - **Opzione B (Senza bones):** Se è solo un mesh (mesh renderer), trascina l'oggetto Plug e posizionalo direttamente sull'oggetto con il **Mesh Renderer**.
4. **Configurazione:**
   - Nell'inspector del componente `VRCFury | SPS Plug`, assicurati che il **Renderer** sia il mesh del tuo pene.
   - Regola l'orientamento: La parte curva del gizmo dovrebbe essere alla punta e la base alla base.

### Passo 4: Testare in Unity
Non è necessario caricare l'avatar per testare se funziona.
1. Installa il **Gesture Manager** dal VCC [1].
2. Entra nel **Play Mode** in Unity.
3. Seleziona il Gesture Manager.
4. Nel menu espressioni emulato, vai alle opzioni SPS.
   - VRCFury genera automaticamente un menu di prova con opzioni per abilitare/disabilitare e testare la deformazione.

> [!WARNING]
> Attenzione: Constraints
> Evita di usare Unity Constraints sugli stessi bones che SPS deforma, in quanto possono causare conflitti di movimento (jitter) [4].

---

## Riferimenti

* VRCFury. (n.d.). SPS (Super Plug Shader). VRCFury Documentation. https://vrcfury.com/sps
* VRCFury. (n.d.). Download & Install. VRCFury Documentation. https://vrcfury.com/download
* VRCD. (n.d.). SPS Tutorial. VRCD. https://vrcd.org.cn
* VRCFury. (n.d.). SPS Troubleshooting. VRCFury Documentation. https://vrcfury.com/sps
