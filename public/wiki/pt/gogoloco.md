# Gogo Loco

<span class="badge">RECOMENDADO</span>

## O que é?
Gogo Loco é um sistema avançado de locomoção para avatares do VRChat criado por **franada** [1]. Ele permite que usuários de desktop e VR sem "full body tracking" (rastreamento de corpo inteiro) acessem recursos de pose, voo e ajustes de avatar que normalmente não estariam disponíveis.

## Para que serve?
- **Poses estáticas:** Permite sentar, deitar e realizar várias poses artísticas em qualquer lugar.
- **Simulação de Full Body:** Inclui animações que simulam ter rastreadores nas pernas.
- **Voo:** Permite voar em mundos que têm colisões ou restrições de pulo.
- **Ajuste de altura:** Permite escalar o tamanho do seu avatar dentro do jogo.
- **Modo Estacionário:** Permite mover seu avatar visualmente sem se deslocar fisicamente (útil para fotos).

> [!NOTE]
> Nota
> Embora possa ser instalado manualmente, é altamente recomendável usar o **VRCFury** para facilitar a instalação e evitar conflitos com outros menus.

## Onde obter?
- [GitHub - Gogo Loco (Grátis)](https://github.com/Franada/goloco)
- [Gumroad - Gogo Loco (Apoie o criador)](https://franadavrc.gumroad.com/l/gogoloco)

## Pode ser colocado em modelos que não o possuem?
Sim, **Gogo Loco** pode ser adicionado a praticamente qualquer avatar, desde que cumpra um requisito principal:
- **Deve ser um avatar humanoide** (ou ter o esqueleto configurado como humanoide no Unity).

Avatares "genéricos" ou não humanoides (como objetos flutuantes, aranhas complexas sem esqueleto humano, etc.) podem ter problemas ou não funcionar corretamente, pois o Gogo Loco manipula ossos humanos específicos (quadris, pernas, costas).

## Pré-requisitos
Antes de começar, certifique-se de ter o seguinte:
- **Unity:** A versão recomendada para o VRChat (atualmente a série 2022.3.22f1).
- **VRChat SDK:** Instalado no seu projeto (VCC).
- **Gogo Loco:** O pacote `.unitypackage` baixado (versão gratuita ou paga).
- **VRCFury (Opcional, mas recomendado):** Para facilitar a instalação.
- **Avatar 3.0 Manager (Opcional):** Para instalação manual.

## Guia de Instalação Passo a Passo

Existem dois métodos principais para instalar o Gogo Loco no seu avatar. Escolha o que melhor se adapta às suas necessidades.

---

### Método 1: Usando VRCFury (Recomendado e Fácil)
Este é o método mais simples, automatizado e menos propenso a erros [3].

1. **Instalar VRCFury:** Certifique-se de ter o **VRCFury** instalado em seu projeto através do VRChat Creator Companion (VCC).
2. **Importar Gogo Loco:** Arraste o arquivo `.unitypackage` do Gogo Loco para a pasta `Assets` do seu projeto ou clique duas vezes nele para importá-lo.
3. **Localizar o Prefab:**
   - Na janela `Project` do Unity, navegue até a pasta: `Assets/GoGo/Loco/Prefabs`.
   - Procure o prefab chamado **GoGo Loco Beyond**.
     - *Nota:* "Beyond" inclui os recursos de voo, escala e poses. Se você quiser apenas alguns recursos, explore as outras pastas.
4. **Instalar no Avatar:**
   - Arraste o prefab **GoGo Loco Beyond** e **solte-o diretamente no seu avatar** na hierarquia (`Hierarchy`). O prefab deve ficar como um "filho" (child) do seu avatar.
   - Pronto! Você não precisa configurar mais nada.
5. **Enviar (Upload):** Ao enviar seu avatar para o VRChat, o VRCFury detectará o prefab e mesclará automaticamente todos os controladores, menus e parâmetros necessários.

---

### Método 2: Instalação Manual com Avatar 3.0 Manager
Se você prefere não usar o VRCFury ou precisa de controle total, use esta ferramenta para evitar erros humanos ao copiar parâmetros e camadas [4].

1. **VRLabs Avatar 3.0 Manager:** Baixe e importe esta ferramenta gratuita (disponível no GitHub ou VCC).
2. **Importar Gogo Loco:** Importe o pacote para o Unity.
3. **Abrir Avatar 3.0 Manager:** Vá para o menu superior `VRLabs` -> `Avatar 3.0 Manager`.
4. **Selecionar Avatar:** Arraste seu avatar para o campo "Avatar" da ferramenta.
5. **Mesclar Controladores (FX):**
   - Na seção "FX", expanda as opções.
   - Clique em **"Add Animator to Merge"**.
   - Selecione o controlador FX do Gogo Loco (geralmente localizado em `GoGo/Loco/Controllers`).
   - Clique em **"Merge on Current"**. Isso combinará as camadas do Gogo Loco com as suas sem substituir.
6. **Copiar Parâmetros:**
   - Vá para a aba **"Parameters"** do Manager.
   - Selecione a opção **"Copy Parameters"**.
   - Selecione a lista de parâmetros do Gogo Loco como origem e copie-os para o seu avatar.
7. **Adicionar o Menu:**
   - Vá para o **VRChat Avatar Descriptor** do seu avatar no Inspector.
   - Procure a seção **Expressions Menu**.
   - Abra o seu menu principal (clique duas vezes no arquivo).
   - Adicione um novo controle (Control -> Add Control).
   - Nomeie-o "Gogo Loco".
   - Type: **Sub Menu**.
   - Parameter: None.
   - Sub Menu: Arraste aqui o menu `GoGo Loco Menu` (ou `GoGo Loco All`).
8. **Action & Base Layers (Opcional):**
   - Se você deseja as animações personalizadas de sentar ou entrar em AFK, repita a etapa de mesclagem para as camadas **Action** e **Base** no Avatar Descriptor.

> [!WARNING]
> Aviso: Write Defaults
> O Gogo Loco geralmente funciona melhor com **Write Defaults OFF** [1]. Se o seu avatar usa "Mixed Write Defaults" (mistura de ON e OFF), você pode experimentar comportamentos estranhos. O VRCFury geralmente corrige isso automaticamente, mas você deve ter cuidado na instalação manual.

---

## Referências

[1] Franada. (s.d.). *Gogo Loco*. GitHub. https://github.com/Franada/goloco

[2] Franada. (s.d.). *Gogo Loco*. Gumroad. https://franadavrc.gumroad.com/l/gogoloco

[3] VRCFury. (s.d.). *VRCFury Documentation*. https://vrcfury.com

[4] VRLabs. (s.d.). *Avatar 3.0 Manager*. GitHub. https://github.com/VRLabs/Avatars-3.0-Manager
