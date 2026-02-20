# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## O que é?
**NSFW Locomotion** é uma versão personalizada e explícita do sistema **GoGo Loco** (criado originalmente por franada). Foi projetado especificamente para avatares com tema adulto ou ERP, expandindo as funcionalidades de locomoção para incluir poses e animações sugestivas ou explícitas.

Ele mantém todos os recursos do GoGo Loco original, mas adiciona conteúdo específico para interações íntimas.

> [!WARNING]
> Importante
> **NÃO instale o NSFW Locomotion e o GoGo Loco normal no mesmo projeto.** Eles compartilham nomes de menus e camadas, o que causará conflitos e erros. Escolha apenas um.

## Características
- **Base do GoGo Loco:** Inclui todos os recursos padrão de voo, escala e pose.
- **Versão "Poses Only":** Leve, adiciona apenas poses estáticas adicionais.
- **Versão "Emotes + Poses":** Inclui emotes completos, movimentos dinâmicos e animações personalizadas para roleplay.
- **Instalação fácil:** Integração com **VRCFury** e um script de instalação com um clique.

## Onde obter?
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (Para VCC)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## O que fazer se o avatar já tem GoGo Loco?
Como mencionado no aviso, **você não pode ter os dois sistemas ao mesmo tempo**. Se o seu avatar já veio com GoGo Loco ou você o instalou anteriormente, você deve removê-lo completamente antes de colocar o NSFW Locomotion para evitar erros do Unity ou menus quebrados.

### Passos para desinstalar o GoGo Loco original:
1. **Se foi instalado com VRCFury (Método fácil):**
   - No Unity, encontre o prefab GoGo Loco dentro da hierarquia (`Hierarchy`) como filho do seu avatar e exclua-o (Clique direito -> `Delete`).
2. **Se veio integrado manualmente no avatar:**
   - **Playable Layers:** Selecione o seu avatar, vá para o componente `VRC Avatar Descriptor` e desça até "Playable Layers". Remova ou substitua os controladores do GoGo Loco (Base, Action, FX) pelos originais que vieram com o avatar.
   - **Parameters e Menu:** No mesmo componente, abra a sua lista de parâmetros (`Expressions Parameters`) e exclua todos os que pertencem ao GoGo Loco (geralmente começam com `Go/`). Em seguida, abra o seu menu (`Expressions Menu`) e exclua o botão que abre o submenu do GoGo Loco.
   - *(Opcional)* Se você não tiver outros avatares usando o GoGo Loco normal naquele projeto, exclua a pasta `GoGo` de seus `Assets`.

Depois que o avatar estiver completamente limpo do sistema antigo, você poderá prosseguir com a instalação do NSFW Locomotion normalmente.

## Como instalar? (Recomendado via VCC)
A maneira mais fácil é usar o **VRChat Creator Companion (VCC)**.

1. Adicione o repositório **Lastation Package Listing (LPL)** ao seu VCC.
2. Encontre e instale o pacote **NSFW Locomotion**.
3. Certifique-se de ter o **VRCFury** instalado também no projeto via VCC.
4. Abra seu projeto Unity.
5. Na barra de menu superior, navegue para: `LastationVRChat` -> `NSFW Locomotion`.
6. Selecione seu avatar e escolha a versão desejada:
   - **Full Version:** (Emotes + Poses)
   - **Poses Version:** (Apenas poses, mais leve)

## Instalação Manual
Se você prefere não usar o VCC (não recomendado):
1. Faça o download da versão mais recente ("Release") no GitHub.
2. Importe o pacote para o Unity.
3. Arraste o prefab correspondente para o seu avatar (aquele que indica `(VRCFury)`).
- Use `WD` se você tem "Write Defaults" ativado, ou a versão normal se não.

---

## Referências

LastationVRChat. (s.d.). *NSFW Locomotion*. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Usuário do Reddit. (s.d.). *Help! How do i remove gogoloco from my avatar?*. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
