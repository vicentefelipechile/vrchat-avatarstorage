# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">Áudio</span>

## O que é?
**PCS** (Penetration Contact System), criado por **Dismay** [1], é um sistema complementar para avatares do VRChat que usa **Contatos** (Contact Senders e Receivers) para adicionar interatividade avançada às relações sexuais (ERP).

Sua função principal é gerar **feedback auditivo** (sons). Opcionalmente, permite controlar brinquedos sexuais reais via vibração (Hápticos) [3][4].

### Diferença Chave
- **Sem OSC (Básico):** O sistema reproduz sons de tapa, deslize ("slide") e fluidos dentro do jogo. Todos por perto podem ouvir. Funciona de forma autônoma no VRChat [1].
- **Com OSC (Avançado/Opcional):** Envia dados para fora do VRChat para fazer vibrar brinquedos sexuais (Lovense, etc.) sincronizados com a penetração.

## Funcionalidade Básica (Som)
Essa é a função padrão do PCS e **não requer software externo**.

1. **Detecção:** Os "Receivers" (orifícios) detectam quando um "Sender" (pênis/penetrador) entra neles.
2. **Som Dinâmico:**
   - Ao raspar na entrada: Sons de fricção ou "slap".
   - Ao penetrar: Sons de fricção/líquidos ("squelch") cuja intensidade varia com a velocidade e profundidade.
3. **Plug & Play:** Depois de instalado no avatar, ele funcionará automaticamente com qualquer outro usuário que tenha seus "Senders" configurados (ou se você tiver os "Receivers").

## Integração OSC e Hápticos (Opcional)
**OSC** (Open Sound Control) é um protocolo que permite que o VRChat "converse" com programas externos [3]. O PCS usa isso para traduzir a ação do jogo em vibrações reais.

### Por que essa integração existe?
Para aumentar a imersão. Se você tiver um sex toy compatível, o PCS "diz" ao brinquedo quando e quão intensamente vibrar com base em quão profundo o penetrador está no jogo.

### Requisitos para Hápticos
- **Brinquedo Compatível:** (Ex. Lovense Hush, Lush, Max, etc.).
- **Software Ponte:** Um programa que recebe o sinal do VRChat e controla o brinquedo.
  - *OscGoesBrrr* (Gratuito, popular) [3].
  - *VibeGoesBrrr*.
  - *Intiface Central* (Mecanismo de conexão) [4].

### Configuração do OSC
Você só precisa ativar isso se for usar os brinquedos:
1. No VRChat, abra o **Action Menu**.
2. Vá em `Options` > `OSC` > **Enabled**.
3. Abra seu software ponte e conecte seu brinquedo.

---

## Guia de Instalação no Unity
Isso instala tanto o sistema de som quanto os parâmetros para o OSC (mesmo que você não o use, os parâmetros estarão lá por padrão).

### Requisitos
- **Unity** e **VRChat SDK 3.0**.
- **Asset PCS** (Pacote Dismay) [1].
- **VRCFury** (Altamente recomendado para facilitar a instalação) [2].

### Passo 1: Importar
Arraste o `.unitypackage` do PCS para o seu projeto.

### Passo 2: Configurar Componentes
O sistema usa dois tipos de prefabs:

**A. Os que recebem (Orifícios)**
1. Procure o prefab `PCS_Orifice`.
2. Coloque-o dentro do osso correspondente (Quadris, Cabeça, etc.).
3. Alinhe-o com a entrada do orifício em sua malha.

**B. Os que penetram (Penetradores)**
1. Procure o prefab `PCS_Penetrator`.
2. Coloque-o dentro do osso do pênis.
3. Alinhe-o para cobrir o comprimento do pênis.

### Passo 3: Concluir
Se você estiver usando o VRCFury, o sistema será mesclado automaticamente ao enviar o avatar.
Se não, use o **Avatars 3.0 Manager** para mesclar o Controlador FX e os Parâmetros do PCS com os do seu avatar.

---

## Referências

[1] Dismay. (s.d.). *Penetration Contact System*. Booth. https://dismay.booth.pm/items/5001027

[2] VRCFury. (s.d.). *VRCFury Documentation*. https://vrcfury.com

[3] OscGoesBrrr. (s.d.). *OscGoesBrrr*. https://osc.toys

[4] Intiface. (s.d.). *Intiface Central*. https://intiface.com/desktop/
