# Como Remover o GoGo Loco de um Projeto Unity

<span class="badge badge-blue">Logic</span>

## O que é?

GoGo Loco é um prefab de locomoção criado por Franada que substitui ou modifica várias das Playable Layers do Avatar Descriptor (Base/Locomotion, Additive, Gesture) e injeta seus próprios parâmetros e entradas no Expression Menu do avatar. Como ele afeta tantas partes interconectadas de um projeto de avatar, removê-lo completamente exige trabalho em várias camadas — de objetos de cena a assets do projeto e, quando aplicável, o manifesto VPM.

> [!WARNING]
> Sempre faça um backup do seu projeto Unity (ou comite no controle de versão) antes de iniciar este processo. Muitas dessas etapas excluem ou substituem Animator Controllers e assets de Expression que podem ser compartilhados com outras partes do seu avatar.

## Para que serve?

- Substituir o GoGo Loco por um sistema de locomoção diferente (ex: locomoção do Modular Avatar, Locomotion Fix do WetCat, ou os controladores padrão do VRChat).
- Limpar um avatar comprado que veio com o GoGo Loco pré-instalado e você não o deseja.
- Resolver conflitos com o NSFW Locomotion ou outros pacotes que compartilham as camadas e nomes de parâmetros do GoGo Loco.
- Reduzir o uso da memória de parâmetros (o GoGo Loco consome 16–17 bits de memória sincronizada por padrão).

## Passo 1: Remover o Prefab da Cena

O GoGo Loco pode estar instalado como um GameObject filho na raiz do avatar, especialmente quando configurado via VRCFury ou Modular Avatar.

1. Abra a cena contendo seu avatar na janela **Hierarchy**.
2. Expanda o GameObject raiz do avatar.
3. Procure qualquer objeto filho nomeado `GoGo Loco`, `GGL`, `GoGoLoco`, ou similar. Selecione-o e pressione **Delete**.
4. Se o GoGo Loco foi instalado via [VRCFury](/wiki?topic=vrcfury), procure um objeto filho com um componente `VRCFury` que faça referência a um prefab do GoGo Loco — exclua esse objeto também.
5. Se instalado via [Modular Avatar](/wiki?topic=modular-avatar), procure um objeto filho com um componente `MA Merge Animator` ou `MA Menu Installer` apontando para assets do GoGo Loco e exclua-o.

> [!NOTE]
> Se o avatar foi comprado e o GoGo Loco já veio embutido (ou seja, não existe um GameObject filho separado), pule esta etapa e vá direto para o Passo 2.

## Passo 2: Restaurar as Playable Layers do Avatar Descriptor

O GoGo Loco substitui até três das cinco Playable Layers no componente `VRCAvatarDescriptor`. Você precisa reatribuir cada uma delas aos controladores padrão do VRChat ou aos seus próprios controladores personalizados.

1. Selecione a raiz do avatar na Hierarchy e localize o componente **VRC Avatar Descriptor** no Inspector.
2. Expanda a seção **Playable Layers**.
3. Para cada uma das seguintes camadas, verifique se há atualmente um controlador do GoGo Loco atribuído (os nomes dos arquivos começarão com `go_` ou conterão `GoGoLoco/GGL`):

| Camada | Nome do arquivo do GoGo Loco (aproximado) | Substituição padrão |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (dos exemplos do VRCSDK) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (dos exemplos do VRCSDK) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (dos exemplos do VRCSDK) |

4. Para cada camada afetada, clique no pequeno círculo à direita do campo e atribua o controlador padrão do VRChat apropriado, ou atribua o seu próprio controlador personalizado.
5. Se você não possui os controladores padrão do VRChat no seu projeto, eles podem ser encontrados em `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Se o seu avatar possuía gestos de mão personalizados antes da adição do GoGo Loco, você deve restaurar o controlador original da camada Gesture aqui em vez do padrão do VRChat — verifique seu controle de versão ou backups.

## Passo 3: Remover as Camadas do GoGo Loco do FX Controller

Para a função de voo, o GoGo Loco mescla duas camadas adicionais no FX Animator Controller do avatar. Elas permanecem mesmo após o prefab ser excluído e devem ser removidas manualmente.

1. Localize o FX Animator Controller do seu avatar na janela Project e clique duas vezes para abri-lo na janela **Animator**.
2. No painel **Layers** à esquerda, procure por camadas nomeadas `GoGo Fly`, `GoGo Freeze`, ou qualquer camada cujo nome comece com `go_`.
3. Clique com o botão direito em cada camada do GoGo Loco e selecione **Delete Layer**.
4. Na mesma janela Animator, clique na guia **Parameters**.
5. Remova cada parâmetro que pertence ao GoGo Loco. Os comuns incluem:

| Nome do parâmetro | Tipo |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Parâmetros que começam com `go_` ou `Go/` são parâmetros do GoGo Loco. Remova todos eles. Parâmetros como `VelocityY`, `VRCFaceBlendH`, `Grounded`, etc., são parâmetros integrados padrão do VRChat — **não** os remova.

> [!CAUTION]
> Excluir um parâmetro que ainda é referenciado por um estado de animação ou transição restante corromperá esses estados. Sempre verifique se nenhuma camada que não seja do GoGo Loco depende de um parâmetro antes de excluí-lo.

## Passo 4: Limpar o Asset de Expression Parameters

O GoGo Loco adiciona seus parâmetros ao asset `VRCExpressionParameters` do avatar, consumindo memória sincronizada. Cada parâmetro do GoGo Loco deixado para trás desperdiça bits.

1. Na janela Project, encontre o arquivo `.asset` atribuído a **Expression Parameters** no Avatar Descriptor.
2. Selecione-o e observe a lista de parâmetros no Inspector.
3. Exclua cada entrada que corresponde a um parâmetro do GoGo Loco (os mesmos nomes listados no Passo 3).
4. Confirme que o **Total Cost** exibido na parte inferior do Inspector diminui após a remoção.

## Passo 5: Remover a Entrada do Menu do GoGo Loco

O GoGo Loco instala uma entrada de submenu no Expression Menu raiz do avatar.

1. Encontre o arquivo `.asset` atribuído a **Expressions Menu** no Avatar Descriptor.
2. Selecione-o e inspecione a lista **Controls**.
3. Exclua qualquer entrada nomeada `GoGo Loco`, `GGL`, `Loco`, ou similar que aponte para um asset de submenu do GoGo Loco.
4. Abra recursivamente cada submenu restante e remova quaisquer entradas de controle do GoGo Loco aninhadas dentro deles.

## Passo 6: Excluir os Arquivos de Asset do GoGo Loco do Projeto

Após desconectar o GoGo Loco do avatar, remova os arquivos dele do projeto Unity para manter a pasta `Assets/` limpa.

1. Na janela Project, pesquise por `go_` usando a barra de pesquisa (garanta que o escopo da pesquisa esteja definido como **All**).
2. Analise os resultados — os arquivos que começam com `go_` são quase sempre assets do GoGo Loco (Animation Clips, Animator Controllers, Textures, Materials para os ícones do menu).
3. Pesquise também por `GoGoLoco` e `GGL` para encontrar qualquer arquivo que use o nome completo.
4. Selecione todos os assets confirmados do GoGo Loco e pressione **Delete** (ou clique com o botão direito → **Delete**).
5. O Unity solicitará que você confirme a exclusão. Aceite.

> [!WARNING]
> Não exclua assets cujos nomes comecem com `go_` se eles pertencerem ao seu próprio projeto (ex: um GameObject ou animação que você nomeou dessa forma). Inspecione cada arquivo antes de excluí-lo.

Locais comuns de pastas para os arquivos do GoGo Loco:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- Em qualquer lugar que um avatar comprado possa ter descompactado o `.unitypackage`.

Exclua a pasta inteira assim que confirmar que todos os arquivos contidos são do GoGo Loco.

## Passo 7: Remover o Pacote VPM (Apenas Instalação VCC)

Se o GoGo Loco foi instalado como um pacote VPM através do VRChat Creator Companion, os arquivos do pacote residem em `Packages/` em vez de `Assets/` e devem ser removidos através do VCC ou do manifesto.

### Opção A — Via Interface do VCC

1. Abra o **VRChat Creator Companion**.
2. Navegue até o seu projeto na guia **Projects** e clique em **Manage Project**.
3. Na lista de pacotes, encontre `GoGoLoco` (ID do pacote `com.franada.gogoloco` ou similar).
4. Clique no botão de **menos (−)** ou altere o menu suspenso de versão para **Remove** e aplique.
5. Reabra o projeto no Unity. O Resolver detectará a remoção e limpará a pasta `Packages/`.

### Opção B — Via `vpm-manifest.json` (manual)

1. Feche o Unity.
2. Abra `<SeuProjeto>/Packages/vpm-manifest.json` num editor de texto.
3. Exclua a entrada do GoGo Loco dos objetos `"dependencies"` e `"locked"`.
4. Exclua a pasta física `<SeuProjeto>/Packages/com.franada.gogoloco/` (ou equivalente).
5. Reabra o Unity. O Resolver verificará novamente e confirmará a ausência de pacotes ausentes.

> [!NOTE]
> Remover o pacote VPM não desfaz automaticamente as camadas, parâmetros, menus ou objetos filhos adicionados durante a instalação. Os Passos 1–6 ainda devem ser concluídos, independentemente do método de instalação usado.

## Passo 8: Reativar Force Locomotion (se necessário)

Quando o GoGo Loco é instalado, ele geralmente desmarca a opção **Force Locomotion animations for 6-point tracking** no Avatar Descriptor, porque sua camada de Locomotion personalizada lida com os modos de rastreamento internamente. Após a remoção, você pode querer restaurar o comportamento padrão.

1. Selecione a raiz do avatar e abra o **VRC Avatar Descriptor** no Inspector.
2. Role até a seção **IK**.
3. Reative a caixa de seleção **Force Locomotion animations for 6 point tracking** se você estiver usando o controlador de Locomotion padrão do VRChat.

> [!TIP]
> Se você não estiver usando rastreamento de corpo inteiro (FBT), esta caixa de seleção não terá nenhum efeito visível e pode ser deixada em qualquer estado.

## Lista de Verificação

Antes de enviar o avatar, confirme todos os itens a seguir:

| Verificação | Como verificar |
| :---------------------------------------- | :--------------------------------------------------- |
| Sem objeto filho GoGo Loco na Hierarchy | Inspecione a hierarquia do avatar na cena do Unity |
| Playable Layers apontam para controladores corretos | VRC Avatar Descriptor → Seção Playable Layers |
| Sem camadas `go_` no controlador FX | Abra FX Animator Controller → Painel Layers |
| Sem parâmetros `go_` / `Go/` em FX | Abra FX Animator Controller → Painel Parameters |
| Sem entradas do GoGo Loco em Expression Parameters | Inspecione o arquivo `.asset` no Inspector |
| Sem entradas do GoGo Loco no Expression Menu | Inspecione recursivamente o arquivo `.asset` do menu raiz |
| Sem arquivos do GoGo Loco em `Assets/` | Pesquise na janela Project por `go_`, `GoGoLoco`, `GGL` |
| Sem pacote do GoGo Loco em `vpm-manifest.json` | Abra o arquivo em um editor de texto e procure por `gogoloco` |
| Configuração do Force Locomotion é intencional | VRC Avatar Descriptor → Seção IK |

## Tabela Resumo

| O que o GoGo Loco adiciona | Onde removê-lo |
| :---------------------------------------------- | :------------------------------------------------ |
| Prefab/GameObject filho na raiz do avatar | Unity Hierarchy → excluir o objeto filho |
| Playable Layers Base, Additive, Gesture | VRC Avatar Descriptor → Playable Layers |
| Camadas FX (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Painel Layers |
| Parâmetros FX (`Go/*`, `VelocityMagnitude`, etc.) | FX Animator Controller → Painel Parameters |
| Entradas em Expression Parameters | VRCExpressionParameters `.asset` → Lista Controls |
| Entrada de submenu no Expression Menu | VRCExpressionsMenu `.asset` → Lista Controls |
| Arquivos de Asset (`go_*.anim`, controladores, texturas) | Janela Project → excluir pasta `GoGoLoco` |
| Entrada do pacote VPM | Interface VCC ou `vpm-manifest.json` |
| Force Locomotion desmarcado | VRC Avatar Descriptor → Seção IK (restaurar) |

## Referências

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
