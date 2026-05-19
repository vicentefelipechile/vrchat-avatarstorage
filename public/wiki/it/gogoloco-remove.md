# Rimuovere GoGo Loco da un Progetto Unity

<span class="badge badge-blue">Logic</span>

## Cos'è?

GoGo Loco è un prefab di locomozione creato da Franada che sostituisce o modifica diversi Playable Layers dell'Avatar Descriptor (Base/Locomotion, Additive, Gesture) e inietta i propri parametri e le proprie voci nel Expression Menu dell'avatar. Poiché tocca così tante parti interconnesse di un progetto avatar, la sua rimozione completa richiede di intervenire su vari livelli — dagli oggetti della scena fino agli asset di progetto e, ove applicabile, al manifesto VPM.

> [!WARNING]
> Esegui sempre un backup del tuo progetto Unity (o esegui un commit nel controllo di versione) prima di iniziare questa procedura. Molti di questi passaggi eliminano o sovrascrivono Animator Controllers e asset Expression che potrebbero essere condivisi con altre parti del tuo avatar.

## A cosa serve rimuoverlo?

- Sostituire GoGo Loco con un diverso sistema di locomozione (es. la locomozione di Modular Avatar, Locomotion Fix di WetCat, o i controller predefiniti di VRChat).
- Ripulire un avatar acquistato che è stato fornito con GoGo Loco preinstallato, se non lo si desidera.
- Risolvere conflitti con NSFW Locomotion o altri pacchetti che condividono i livelli e i nomi dei parametri di GoGo Loco.
- Ridurre l'utilizzo della memoria dei parametri (GoGo Loco consuma 16–17 bit di memoria sincronizzata per impostazione predefinita).

## Passo 1: Rimuovere il Prefab dalla Scena

GoGo Loco può essere installato come GameObject figlio nella radice dell'avatar, specialmente se configurato tramite VRCFury o Modular Avatar.

1. Apri la scena contenente il tuo avatar nella finestra **Hierarchy**.
2. Espandi il GameObject radice dell'avatar.
3. Cerca qualsiasi oggetto figlio denominato `GoGo Loco`, `GGL`, `GoGoLoco`, o simili. Selezionalo e premi **Delete**.
4. Se GoGo Loco è stato installato tramite [VRCFury](/wiki?topic=vrcfury), cerca un oggetto figlio con un componente `VRCFury` che fa riferimento a un prefab GoGo Loco — elimina anche questo oggetto.
5. Se installato tramite [Modular Avatar](/wiki?topic=modular-avatar), cerca un oggetto figlio con un componente `MA Merge Animator` o `MA Menu Installer` che punta ad asset di GoGo Loco ed eliminalo.

> [!NOTE]
> Se l'avatar è stato acquistato e GoGo Loco era integrato (ovvero, non esiste un GameObject figlio separato), salta questo passaggio e vai direttamente al Passo 2.

## Passo 2: Ripristinare i Playable Layers dell'Avatar Descriptor

GoGo Loco sostituisce fino a tre dei cinque Playable Layers sul componente `VRCAvatarDescriptor`. È necessario riassegnare ciascuno di essi ai controller predefiniti di VRChat o ai propri controller personalizzati.

1. Seleziona la radice dell'avatar nella Hierarchy e individua il componente **VRC Avatar Descriptor** nell'Inspector.
2. Espandi la sezione **Playable Layers**.
3. Per ciascuno dei seguenti layer, verifica se è attualmente assegnato un controller GoGo Loco (i nomi dei file inizieranno con `go_` o conterranno `GoGoLoco/GGL`):

| Layer | Nome file GoGo Loco (approssimativo) | Sostituzione predefinita |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (dagli esempi VRCSDK) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (dagli esempi VRCSDK) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (dagli esempi VRCSDK) |

4. Per ogni layer interessato, clicca sul piccolo cerchio a destra del campo e assegna il controller predefinito di VRChat appropriato, oppure assegna il tuo controller personalizzato.
5. Se non disponi dei controller predefiniti di VRChat nel tuo progetto, questi si trovano in `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Se il tuo avatar aveva gesture manuali personalizzate prima dell'aggiunta di GoGo Loco, dovresti ripristinare qui il controller originale del livello Gesture invece di quello predefinito di VRChat — controlla il tuo controllo di versione o i backup per trovarlo.

## Passo 3: Rimuovere i Layer di GoGo Loco dal Controller FX

Per la funzionalità di volo, GoGo Loco unisce due layer aggiuntivi nel FX Animator Controller dell'avatar. Questi rimangono anche dopo che il prefab è stato eliminato e devono essere rimossi manualmente.

1. Individua l'FX Animator Controller del tuo avatar nella finestra Project e fai doppio clic per aprirlo nella finestra **Animator**.
2. Nel pannello **Layers** a sinistra, cerca i layer denominati `GoGo Fly`, `GoGo Freeze`, o qualsiasi layer il cui nome inizi con `go_`.
3. Fai clic col tasto destro su ogni layer di GoGo Loco e seleziona **Delete Layer**.
4. Nella stessa finestra Animator, fai clic sulla scheda **Parameters**.
5. Rimuovi ogni parametro appartenente a GoGo Loco. Quelli comuni includono:

| Nome Parametro | Tipo |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

I parametri che iniziano con `go_` o `Go/` sono parametri di GoGo Loco. Rimuovili tutti. Parametri come `VelocityY`, `VRCFaceBlendH`, `Grounded`, ecc., sono parametri integrati standard di VRChat — **non** rimuoverli.

> [!CAUTION]
> L'eliminazione di un parametro ancora referenziato da uno stato di animazione o transizione rimanente interromperà quegli stati. Verifica sempre che nessun layer non-GoGo-Loco dipenda da un parametro prima di rimuoverlo.

## Passo 4: Pulire l'Asset degli Expression Parameters

GoGo Loco aggiunge i suoi parametri all'asset `VRCExpressionParameters` dell'avatar, consumando memoria sincronizzata. Ogni parametro GoGo Loco lasciato intatto spreca bit.

1. Nella finestra Project, trova il file `.asset` assegnato agli **Expression Parameters** nell'Avatar Descriptor.
2. Selezionalo e osserva l'elenco dei parametri nell'Inspector.
3. Elimina ogni voce corrispondente a un parametro GoGo Loco (stessi nomi elencati nel Passo 3).
4. Conferma che il **Total Cost** mostrato in fondo all'Inspector diminuisca dopo la rimozione.

## Passo 5: Rimuovere la Voce del Menu GoGo Loco

GoGo Loco installa una voce di sottomenu nell'Expression Menu principale dell'avatar.

1. Trova il file `.asset` assegnato al **Expressions Menu** nell'Avatar Descriptor.
2. Selezionalo e ispeziona l'elenco **Controls**.
3. Elimina qualsiasi voce denominata `GoGo Loco`, `GGL`, `Loco`, o simili che punta a un asset sottomenu di GoGo Loco.
4. Apri ricorsivamente ogni sottomenu rimanente e rimuovi qualsiasi voce di controllo di GoGo Loco annidata al loro interno.

## Passo 6: Eliminare i File Asset di GoGo Loco dal Progetto

Dopo aver disconnesso GoGo Loco dall'avatar, rimuovi i suoi file dal progetto Unity per mantenere pulita la cartella `Assets/`.

1. Nella finestra Project, cerca `go_` utilizzando la barra di ricerca (assicurati che l'ambito di ricerca sia impostato su **All**).
2. Esamina i risultati: i file che iniziano con `go_` sono quasi sempre asset di GoGo Loco (Animation Clips, Animator Controllers, Textures, Materials per le icone del menu).
3. Cerca anche `GoGoLoco` e `GGL` per catturare eventuali file che utilizzano il nome completo.
4. Seleziona tutti gli asset GoGo Loco confermati e premi **Delete** (o tasto destro → **Delete**).
5. Unity ti chiederà di confermare l'eliminazione. Accetta.

> [!WARNING]
> Non eliminare gli asset i cui nomi iniziano con `go_` se appartengono al tuo progetto (ad es., un GameObject o un'animazione che hai nominato in quel modo). Ispeziona ogni file prima di eliminarlo.

Percorsi comuni delle cartelle per i file di GoGo Loco:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Ovunque un avatar acquistato possa aver estratto il `.unitypackage`.

Elimina l'intera cartella una volta confermato che tutti i file contenuti appartengono a GoGo Loco.

## Passo 7: Rimuovere il Pacchetto VPM (Solo per Installazione tramite VCC)

Se GoGo Loco è stato installato come pacchetto VPM tramite il VRChat Creator Companion, i file del pacchetto si trovano in `Packages/` anziché in `Assets/` e devono essere rimossi tramite il VCC o il manifesto.

### Opzione A — Tramite la GUI di VCC

1. Apri il **VRChat Creator Companion**.
2. Naviga al tuo progetto nella scheda **Projects** e clicca su **Manage Project**.
3. Nell'elenco dei pacchetti, trova `GoGoLoco` (ID del pacchetto `com.franada.gogoloco` o simile).
4. Clicca sul pulsante **meno (−)** o imposta il menu a discesa della versione su **Remove** e applica.
5. Riapri il progetto in Unity. Il Resolver rileverà la rimozione e ripulirà la cartella `Packages/`.

### Opzione B — Tramite `vpm-manifest.json` (manuale)

1. Chiudi Unity.
2. Apri `<IlTuoProgetto>/Packages/vpm-manifest.json` in un editor di testo.
3. Elimina la voce per GoGo Loco sia dagli oggetti `"dependencies"` che da `"locked"`.
4. Elimina la cartella fisica `<IlTuoProgetto>/Packages/com.franada.gogoloco/` (o equivalente).
5. Riapri Unity. Il Resolver eseguirà nuovamente la scansione confermando l'assenza di pacchetti mancanti.

> [!NOTE]
> La rimozione del pacchetto VPM non annulla automaticamente i layer, i parametri, i menu o gli oggetti figlio prefab aggiunti durante l'installazione. I Passi 1–6 devono comunque essere completati indipendentemente dal metodo di installazione utilizzato.

## Passo 8: Riabilitare Force Locomotion (se necessario)

Quando GoGo Loco è installato in genere deseleziona **Force Locomotion animations for 6-point tracking** sull'Avatar Descriptor, poiché il suo livello Locomotion personalizzato gestisce internamente le modalità di tracking. Dopo la rimozione, potresti voler ripristinare il comportamento predefinito.

1. Seleziona la radice dell'avatar e apri il **VRC Avatar Descriptor** nell'Inspector.
2. Scorri fino alla sezione **IK**.
3. Riabilita la casella di controllo **Force Locomotion animations for 6 point tracking** se stai utilizzando il controller Locomotion predefinito di VRChat.

> [!TIP]
> Se non stai utilizzando il full-body tracking (FBT), questa casella di controllo non ha alcun effetto visibile e può essere lasciata in qualsiasi stato.

## Checklist di Verifica

Prima di caricare l'avatar, conferma tutti i seguenti punti:

| Verifica | Come verificare |
| :---------------------------------------- | :--------------------------------------------------- |
| Nessun oggetto figlio GoGo Loco nella Hierarchy | Ispeziona la gerarchia dell'avatar nella scena Unity |
| I Playable Layers puntano ai controller corretti | VRC Avatar Descriptor → Sezione Playable Layers |
| Nessun layer `go_` nel controller FX | Apri FX Animator Controller → Pannello Layers |
| Nessun parametro `go_` / `Go/` in FX | Apri FX Animator Controller → Pannello Parameters |
| Nessuna voce di GoGo Loco negli Expression Parameters | Ispeziona il file `.asset` nell'Inspector |
| Nessuna voce di GoGo Loco nell'Expression Menu | Ispeziona ricorsivamente il file `.asset` del menu root |
| Nessun file GoGo Loco in `Assets/` | Ricerca nella finestra Project per `go_`, `GoGoLoco`, `GGL` |
| Nessun pacchetto GoGo Loco in `vpm-manifest.json` | Apri il file in un editor di testo e cerca `gogoloco` |
| L'impostazione Force Locomotion è intenzionale | VRC Avatar Descriptor → Sezione IK |

## Tabella Riepilogativa

| Cosa aggiunge GoGo Loco | Dove rimuoverlo |
| :---------------------------------------------- | :------------------------------------------------ |
| Prefab/GameObject figlio sulla root dell'avatar | Unity Hierarchy → elimina l'oggetto figlio |
| Playable Layers Base, Additive, Gesture | VRC Avatar Descriptor → Playable Layers |
| Layer FX (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Pannello Layers |
| Parametri FX (`Go/*`, `VelocityMagnitude`, ecc.) | FX Animator Controller → Pannello Parameters |
| Voci in Expression Parameters | VRCExpressionParameters `.asset` → Elenco Controls |
| Voce di sottomenu in Expression Menu | VRCExpressionsMenu `.asset` → Elenco Controls |
| File Asset (`go_*.anim`, controller, texture) | Finestra Project → elimina cartella `GoGoLoco` |
| Voce pacchetto VPM | GUI VCC o `vpm-manifest.json` |
| Force Locomotion deselezionato | VRC Avatar Descriptor → Sezione IK (ripristina) |

## Riferimenti

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
