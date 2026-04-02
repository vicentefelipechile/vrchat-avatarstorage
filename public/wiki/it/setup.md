# Guida alla Configurazione

<span class="badge badge-blue">Guida</span>

## Prerequisiti
Prima di iniziare a configurare il tuo ambiente per lo sviluppo di avatar VRChat, assicurati di avere:

1. **Unity Hub** installato sul tuo computer
2. **VRChat Creator Companion (VCC)** scaricato dal sito ufficiale di VRChat
3. Un **account VRChat** con almeno il rango "New User"

## Passo 1: Installare Unity Hub
1. Vai al [sito ufficiale di Unity](https://unity.com/download) e scarica Unity Hub
2. Installa ed esegui Unity Hub
3. Crea un account Unity se non ne hai già uno

> [!NOTE]
> Se riscontri problemi con Unity Hub, consulta la nostra [guida alla risoluzione degli errori di Unity Hub](/wiki?topic=unityhub-error).

## Passo 2: Installare VRChat Creator Companion
1. Scarica il VCC dal [sito di VRChat](https://vrchat.com/home/download)
2. Installa e apri il VCC
3. Il VCC installerà automaticamente la versione corretta di Unity necessaria per VRChat

## Passo 3: Creare un Nuovo Progetto
1. Apri il VCC
2. Clicca su "New Project"
3. Seleziona il template "Avatar"
4. Scegli una posizione per il tuo progetto e dagli un nome
5. Clicca su "Create Project"

## Passo 4: Importare un Avatar
1. Scarica il tuo file `.unitypackage` dell'avatar
2. In Unity, vai su `Assets > Import Package > Custom Package`
3. Seleziona il file scaricato
4. Clicca su "Import" nella finestra di dialogo di importazione

## Passo 5: Caricare su VRChat
1. Nel tuo progetto Unity, trova il prefab del tuo avatar
2. Trascinalo nella scena
3. Seleziona l'avatar e assicurati che il componente `VRC Avatar Descriptor` sia configurato
4. Vai su `VRChat SDK > Show Control Panel`
5. Accedi con le tue credenziali VRChat
6. Clicca su "Build & Publish"
