# VRCQuestTools

<span class="badge">STRUMENTO</span>

## Cos'è?
VRCQuestTools è un'estensione Unity, sviluppata da **kurotu**, che permette di convertire avatar VRChat progettati per PC alla piattaforma Android (Meta Quest/PICO). Questo strumento automatizza il processo di rendere un avatar compatibile con le rigide restrizioni di prestazioni dei dispositivi mobili.

> [!NOTE]
> VRCQuestTools nelle sue versioni più recenti funziona tramite il sistema **Non-Destructive Modular Framework (NDMF)**, che elabora l'avatar senza alterare i file originali.

## A cosa serve?
- Convertire avatar PC ad Android con pochi click
- Riduzione automatica di poligoni e materiali
- Rimozione di componenti non compatibili con Quest (Lights, Cloth, ecc.)
- Regolazione di texture e materiali per ottimizzazione prestazioni

> [!WARNING]
> IMPORTANTE: Gli avatar di VRoid Studio non sono compatibili con Android a causa del loro uso intensivo di materiali trasparenti. VRCQuestTools non può aiutarti con questi avatar.

## Dove trovarlo?
- **Sito Ufficiale:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)

## Come installarlo?

### Installazione tramite VCC
1. Aggiungi il repository a VCC:
   - Vai su **Settings** → **Packages** → **Add Repository**, incolla `https://kurotu.github.io/vpm-repos/vpm.json`
2. Vai su **Manage Project** per il tuo progetto
3. Cerca **VRCQuestTools** e clicca **[+]**

## Come convertire un avatar per Android?

### Metodo Rapido (Non distruttivo con NDMF)
1. Fai clic destro sul tuo avatar nella Gerarchia Unity
2. Seleziona **VRCQuestTools** → **Convert Avatar For Android**
3. Nella finestra che si apre clicca **Begin Converter Settings** e poi **Convert**
4. Attendi il completamento della conversione
5. Vai su **File** → **Build Settings**
6. Seleziona la piattaforma **Android** e clicca **Switch Platform**
7. Carica l'avatar convertito su VRChat

> [!TIP]
> L'avatar originale verrà disattivato dopo la conversione. Puoi riattivarlo dall'Inspector se necessario.

## Limiti di Prestazione Quest

| Metrica | Eccellente | Buono | Medio | Scarso | Molto Scarso |
|---------|-----------|------|--------|--------|---------------|
| **Triangoli** | 7.500 | 10.000 | 15.000 | 20.000 | >20.000 |
| **Slot Materiali** | 1 | 1 | 1 | 2 | >2 |
| **Skinned Meshes** | 1 | 1 | 1 | 2 | >2 |
| **PhysBones** | 2 | 4 | 6 | 8 | >8 |

## Relazione con altri Strumenti
- **[Modular Avatar](/wiki?topic=modular-avatar)**: Se usi MA o altri strumenti NDMF, la conversione è completamente non distruttiva.
- **[VRCFury](/wiki?topic=vrcfury)**: Può aiutarti a preparare animazioni e gesti prima della conversione.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**: Assicurati che gli shader siano compatibili con Android dopo la conversione.

---

## Riferimenti

kurotu. (n.d.). *VRCQuestTools*. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/

kurotu. (2025). *kurotu/VRCQuestTools* [Software]. GitHub. Retrieved from https://github.com/kurotu/VRCQuestTools
