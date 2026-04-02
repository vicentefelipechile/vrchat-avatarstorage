# Guida NSFW Essenziale

<span class="badge badge-red">NSFW</span> <span class="badge">TOS</span> <span class="badge">OTTIMIZZAZIONE</span>

## Introduzione
VRChat permette grande libertà creativa, inclusi contenuti per adulti (NSFW) e roleplay erotico (ERP). Tuttavia, è **CRUCIALE** comprendere le regole e gli strumenti appropriati per godere di questi contenuti senza rischiare il tuo account o le prestazioni degli altri.

## Regole di VRChat (TOS)
VRChat ha una politica di tolleranza zero riguardo a certi contenuti negli spazi pubblici.

- **Mondi Pubblici:** È **severamente vietato** mostrare contenuti sessualmente espliciti, nudità o comportamenti erotici in istanze pubbliche. Farlo può risultare in un **ban permanente**.
- **Mondi Privati:** I contenuti NSFW e l'ERP sono tollerati in istanze private (Friends+, Invite, ecc.) dove tutti i partecipanti sono adulti e hanno dato il loro consenso.
- **Avatar:** Puoi caricare avatar NSFW, ma **NON** devi usare le loro funzionalità esplicite in pubblico. Usa il sistema "Toggle" per mantenere tutto nascosto di default.

## Strumenti Essenziali
Per un'esperienza completa, questi sono gli strumenti standard usati dalla maggior parte della comunità:

1.  **VRCFury:** Lo strumento "coltellino svizzero". Essenziale per aggiungere Toggle, vestiti e sistemi complessi senza rompere il tuo avatar.
    *   [Vedi guida VRCFury](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader):** Il sistema standard per l'interazione fisica (penetrazione e deformazione). È gratuito e molto migliore del vecchio DPS.
    *   [Vedi guida SPS](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB):** Il gold standard per collegare sex toys (Lovense) a VRChat tramite vibrazione aptica.
    *   [Vedi guida Haptics](/wiki?topic=haptics)

## Ottimizzazione e Memoria Texture
Gli avatar NSFW tendono ad essere "pesanti" a causa della grande quantità di vestiti e texture della pelle ad alta qualità.

- **VRAM (Memoria Video):** Questa è la risorsa più scarsa. Se il tuo avatar usa più di 150MB di memoria texture, causerai crash alle persone.
- **Compressione:** Assicurati sempre di comprimere le texture in Unity. Una texture 4K non compressa occupa molto spazio.

## Contacts e PhysBones
L'interazione in VRChat si basa sui **Contacts** (VRCContactReceiver e VRCContactSender).
- **Headpat:** Avviene rilevando la mano sulla testa.
- **Interazione Sessuale:** SPS e OGB usano contacts per rilevare quando un oggetto entra in un altro, attivando animazioni, suoni o vibrazioni nel tuo giocattolo reale.
