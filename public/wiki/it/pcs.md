# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">Audio</span>

## Cos'è?

**PCS** (Penetration Contact System), creato da **Dismay** [1], è un sistema complementare per avatar VRChat che usa **Contacts** (Contact Sender e Receiver) per aggiungere interattività avanzata alle relazioni sessuali (ERP).

La sua funzione principale è generare **feedback uditivo** (suoni). Opzionalmente, permette di controllare sex toys reali tramite vibrazione (Haptics) [3][4].

### Differenza Chiave

- **Senza OSC (Base):** Il sistema riproduce suoni di "schiaffo", "scivolamento" e fluidi dentro il gioco. Tutti nelle vicinanze possono sentirlo. Funziona autonomamente in VRChat [1].
- **Con OSC (Avanzato/Opzionale):** Invia dati fuori da VRChat per far vibrare sex toys (Lovense, ecc.) sincronizzati con la penetrazione.

## Funzionalità Base (Suono)

Questa è la funzione predefinita di PCS e **non richiede software esterno**.

1. **Rilevamento:** I "Receiver" (orifizi) rilevano quando un "Sender" (pene/penetratore) entra in essi.
2. **Suono Dinamico:**
   - Sfregando l'ingresso: Suoni di sfregamento o "schiaffo".
   - Alla penetrazione: Suoni di attrito/liquido ("squelch") che variano in intensità secondo velocità e profondità.
3. **Plug & Play:** Una volta installato sull'avatar, funziona automaticamente con qualsiasi altro utente che ha i suoi "Sender" configurati.

## Integrazione OSC e Haptics (Opzionale)

**OSC** (Open Sound Control) è un protocollo che permette a VRChat di "parlare" con programmi esterni [3]. PCS lo usa per convertire l'azione in gioco in vibrazioni reali.

### Requisiti per Haptics

- **Giocattolo Compatibile:** (ad es. Lovense Hush, Lush, Max, ecc.).
- **Software Bridge:** Un programma che riceve il segnale da VRChat e controlla il giocattolo.
  - _OscGoesBrrr_ (Gratuito, popolare) [3].
  - _VibeGoesBrrr_.
  - _Intiface Central_ (Motore di connessione) [4].

---

## Guida all'Installazione in Unity

### Prerequisiti

- **Unity** e **VRChat SDK 3.0**.
- **PCS Asset** (Pacchetto di Dismay) [1].
- **VRCFury** (Altamente raccomandato) [2].

### Passo 1: Importare

Trascina il `.unitypackage` PCS nel tuo progetto.

### Passo 2: Configurare i Componenti

Il sistema usa due tipi di prefab:

**A. Il Receiver (Orifizi)**

1. Cerca il prefab `PCS_Orifice`.
2. Posizionalo nel bone corrispondente (Hips, Head, ecc.).
3. Allinealo con l'ingresso dell'orifizio del tuo mesh.

**B. Il Penetratore**

1. Cerca il prefab `PCS_Penetrator`.
2. Posizionalo nel bone del pene.
3. Allinealo in modo che copra la lunghezza del pene.

### Passo 3: Finalizzare

Se usi VRCFury, il sistema si unirà automaticamente al caricamento dell'avatar.
In caso contrario, usa **Avatars 3.0 Manager** per unire l'FX Controller e i Parametri PCS con quelli del tuo avatar.

---

## Riferimenti

- Dismay. (n.d.). Penetration Contact System. Gumroad. https://dismay.booth.pm/items/5001027
- VRCFury. (n.d.). VRCFury Documentation. https://vrcfury.com
- OscGoesBrrr. (n.d.). OscGoesBrrr. https://osc.toys
- Intiface. (n.d.). Intiface Central. https://intiface.com/desktop/
