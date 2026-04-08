# Poiyomi Toon Shader

<span class="badge badge-blue">DIPENDENZA</span>

## Cos'è?

Poiyomi Toon Shader è uno shader gratuito per Unity progettato specificamente per VRChat. È diventato lo **standard de facto** per gli avatar VRChat grazie alla sua versatilità e facilità d'uso [1].

## A cosa serve?

- **Stilizzazione:** Controllo totale sull'aspetto del tuo avatar (colori, illuminazione, ombreggiatura).
- **Effetti Speciali:** Emissione, glitter, contorno (outline), dissolve, distorsione UV e molto altro.
- **Audiolink:** Reazione visiva del tuo avatar alla musica di un mondo.
- **Rendering:** Opzioni avanzate come Backface Culling, Stencil, Z-Buffer per effetti di trasparenza e layering.

## Come installarlo?

### Metodo 1: VRChat Creator Companion (Raccomandato)

1. Apri il **VCC**.
2. Seleziona il tuo progetto.
3. Cerca **"Poiyomi Toon Shader"** nell'elenco dei pacchetti curati e clicca **"Add"** [2].
4. Apri il tuo progetto Unity.

### Metodo 2: Manuale

1. Vai alla pagina delle release di Poiyomi su GitHub o BOOTH.
2. Scarica l'ultimo `.unitypackage`.
3. In Unity, trascinalo nella cartella `Assets` o importalo tramite `Assets > Import Package > Custom Package`.

> [!WARNING]
> Non mischiare **Poiyomi Free** e **Poiyomi Pro** nello stesso progetto. Scegli uno ed elimina l'altro per evitare conflitti.

## Versioni

| Versione      | Caratteristiche                                                                                   |
| ------------- | ------------------------------------------------------------------------------------------------- |
| **Free/Toon** | Set completo di funzionalità per la maggior parte degli utenti. Gratuito.                         |
| **Pro**       | Pagamento. Aggiunge funzionalità avanzate come: dissolve globale, effetti di distorsione e altro. |

## Come si usa?

1. Seleziona un materiale sul tuo avatar (nel pannello Inspector).
2. Cambia lo shader usando il menu a tendina: `.poiyomi > Poiyomi Toon`.
3. Configura le sezioni (Main, Lighting, Emission, ecc.) secondo le tue necessità.

> [!TIP]
> Se Poiyomi appare "bloccato" (con un lucchetto in alto), è perché il materiale è in modalità ottimizzata. Clicca sul lucchetto per sbloccarlo e modificarlo.

---

## Riferimenti

- Poiyomi. (n.d.). Poiyomi Toon Shader. GitHub. https://github.com/poiyomi/PoiyomiToonShader
- VRChat. (n.d.). VCC Documentation. VRChat Creator Companion. https://vcc.docs.vrchat.com
