# Esska Desktop Puppeteer

<span class="badge">UTILIDADE</span>

## O que é?
**Esska Desktop Puppeteer** é uma ferramenta avançada para usuários de desktop no VRChat criada por **Esska**. Consiste em um sistema de duas partes (um aplicativo de desktop e um pacote para o avatar) que permite controlar partes específicas do corpo de seu avatar usando o mouse de seu computador, oferecendo um nível de precisão e expressividade que normalmente só está disponível para usuários de Realidade Virtual (VR).

## Para que serve?
- **Controle de membros:** Permite mover os braços e as mãos de seu avatar de forma independente e precisa diretamente com o mouse.
- **Partes personalizadas:** Facilita o controle de partes adicionais do avatar, como orelhas, caudas ou acessórios.
- **Simulação de VR em Desktop:** Seu principal objetivo é dar aos usuários de desktop uma liberdade de movimento que faz com que pareçam estar jogando em VR.
- **Head Tracking (Rastreamento de cabeça):** Possui suporte para dispositivos TrackIR, permitindo que a cabeça do seu avatar se mova de acordo com seus movimentos reais.

> [!NOTE]
> Nota
> Esta ferramenta usa **OSC (Open Sound Control)** para enviar os parâmetros do aplicativo de desktop para o seu cliente VRChat. Certifique-se de ter a opção OSC ativada no menu radial do VRChat.

## Onde obter?
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Pré-requisitos
Antes de começar, certifique-se de cumprir com o seguinte:
- **Sistema Operacional:** Windows 10 ou Windows 11.
- **Software:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/es-es/download/dotnet/9.0) instalado no seu PC.
  - *Como baixar:* Ao entrar no link, procure a seção que diz "**Runtime de Desktop do .NET**" (ou ".NET Desktop Runtime" se estiver em inglês). Na pequena tabela abaixo, na linha do "Windows", clique no link que diz "**x64**" para baixar o instalador.
- **Hardware:** Um mouse que tenha botão central (roda de rolagem / scroll wheel).
- **VRChat SDK:** Instalado em seu projeto Unity (via VCC).
- **Avatar:** Um avatar humanoide compatível (funciona melhor com proporções humanas padrão).

## Guia de Instalação Passo a Passo

O processo de instalação se divide em duas partes fundamentais: a preparação do avatar no Unity e a configuração do aplicativo de desktop.

### Parte 1: Instalação no Avatar (Unity)
1. **Importar o Pacote:** Baixe o "Base Package" da página oficial e arraste o arquivo `.unitypackage` para a pasta `Assets` do seu projeto Unity.
2. **Adicionar ao Avatar:** Procure o prefab incluído no pacote do Esska Desktop Puppeteer e arraste-o sobre seu avatar na hierarquia (`Hierarchy`).
3. **Configuração de Parâmetros:** O sistema usa parâmetros OSC. Certifique-se de que seu avatar tenha espaço suficiente na memória de parâmetros (Parameters Memory) para acomodar os novos controles.
4. **Enviar o Avatar:** Depois que o prefab estiver corretamente posicionado e configurado, faça o upload de seu avatar para o VRChat como faria normalmente.

### Parte 2: Configuração do Aplicativo de Desktop
1. **Baixar o App:** Baixe o aplicativo "Esska Desktop Puppeteer App".
2. **Executar:** Abra o aplicativo em seu PC antes ou durante a sua sessão no VRChat.
3. **Ativar OSC no VRChat:** Dentro do VRChat, abra o menu radial, vá para `Options` -> `OSC` e certifique-se de que esteja em **Enabled**.
4. **Uso:** Use os botões do mouse (especialmente o botão central) e o teclado conforme as instruções do aplicativo para começar a mover os membros de seu avatar.

> [!WARNING]
> Aviso: Privacidade e Controles
> O aplicativo precisa "ouvir" seus pressionamentos de teclado e mouse (global hooks) para poder funcionar enquanto você estiver com a janela do VRChat ativa. O criador afirma que não coleta dados pessoais, mas é importante saber como o programa funciona para evitar interferências com outros aplicativos.

---

## Referências

[1] Esska. (s.d.). *Esska Desktop Puppeteer*. BOOTH. https://esska.booth.pm/items/6366670
