# Modular Avatar

<span class="badge">FERRAMENTA</span>

## O que é?
Modular Avatar é um conjunto de ferramentas **não destrutivas** para modularizar seus avatares VRChat e distribuir componentes de avatar. Com o Modular Avatar, adicionar uma nova outfit ou gimmick ao seu avatar é tão fácil quanto arrastar e soltar.

> [!NOTE]
> O Modular Avatar funciona através do sistema **Non-Destructive Modular Framework (NDMF)**, que processa o avatar no momento da construção sem modificar seus arquivos originais.

## Para que serve?
- Instalação de roupas e acessórios com um clique via **drag-and-drop**
- Organização de animators: divide o FX animator em múltiplos sub-animators e mescla em tempo de execução
- Configuração automática de menus do VRChat
- Sistema de **toggles** para ativar/desativar objetos e blenshapes
- Componentes reativos que respondem a mudanças no avatar
- Distribuição de prefabs com instalação automática

## Principais recursos

| Recurso | Modular Avatar | VRCFury |
|---------|----------------|---------|
| **Instalação de outfits** | Sim (drag-and-drop) | Sim (um clique) |
| **Sistema de toggles** | Sim (avançado) | Sim (basico) |
| **Organização de animators** | Sim (merge) | Não |
| **Menus automáticos** | Sim (completo) | Sim (basico) |
| **Processo não destrutivo** | Sim (NDMF) | Sim |
| **Blenshape sync** | Sim | Não |
| **Bone proxy** | Sim | Não |

### Descrição dos componentes

| Componente | Descrição |
|------------|-------------|
| **Merge Armature** | Mescla armatures de prefabs no avatar pai, comum para adicionar roupas. MA minimiza o número de ossos criados, reutilizando ossos existentes quando possível. |
| **Merge Animator** | Mescla sub-animators no avatar pai, útil para vários tipos de gimmicks de avatar. |
| **Object Toggle** | Cria itens de menu para ativar ou desativar objetos. Também pode atualizar blenshapes ao togglear. |
| **Blendshape Sync** | Sincroniza os blenshapes das roupas ou acessórios com o avatar base quando você ajusta a forma do corpo. |
| **Bone Proxy** | Permite adicionar props únicos como armas ou efeitos especiais diretamente conectados aos ossos do avatar. |
| **Menu System** | Sistema completo de menus para editar seu avatar a partir do menu do VRChat. |

> [!TIP]
> O Modular Avatar é especialmente útil quando você deseja distribuir roupas ou acessórios como prefabs. Os usuários só precisam arrastar o prefab para o avatar e o MA cuida de tudo automaticamente.

## Onde obter?
- **Página Oficial:** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **Documentação:** [Documentação Modular Avatar](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub:** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord:** [Comunidade Discord](https://discord.gg/dV4cVpewmM)

## Como instalar?

### Instalação via VCC (VRChat Creator Companion)

1. Adicione o repositório ao VCC:
   - Clique: [Add Modular Avatar to VCC](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - Ou vá para **Settings** → **Packages** → **Add Repository**, cole a URL `https://vpm.nadena.dev/vpm.json` e clique em **Add**
2. Vá para **Manage Project** do seu projeto
3. Na lista de pacotes, procure por **Modular Avatar** e clique no **[+]** para adicioná-lo
4. Clique em **Open Project** no VCC

## Como usar?

### Criar um toggle básico

1. Clique com o botão direito no seu avatar no Unity
2. Selecione **Modular Avatar → Create Toggle**
3. Um novo GameObject será criado com os componentes **Menu Item**, **Menu Installer** e **Object Toggle**
4. No componente **Object Toggle**, clique no botão **+** para adicionar uma entrada
5. Arraste o objeto que você quer togglear para o campo vazio
6. Pronto! O toggle aparecerá automaticamente no menu do seu avatar

### Instalar uma outfit

1. Arraste o prefab da outfit para o seu avatar
2. Clique com o botão direito na outfit e selecione **ModularAvatar → Setup Outfit**
3. O MA configurará automaticamente a armature e as animações

> [!TIP]
> Você pode ver o tutorial oficial na [documentação do Modular Avatar](https://modular-avatar.nadena.dev/docs/tutorials).

## Relação com outras ferramentas

> [!TIP]
> Consulte a tabela comparativa acima para ver as diferenças entre o Modular Avatar e o VRCFury.

O Modular Avatar e o VRCFury são **ferramentas complementares**. Muitas outfits modernas incluem suporte para ambas. Consulte a documentação da outfit para ver qual método o criador recomenda.

- **[VRCFury](/wiki?topic=vrcfury)**: Foca na instalação de animações e gestos.
- **NDMF (Non-Destructive Modular Framework)**: Framework base que permite o processamento não destrutivo. É instalado automaticamente com o Modular Avatar.

---

## Referências

Modular Avatar. (s. f.). *Modular Avatar*. Nadena Dev. Recuperado de https://modular-avatar.nadena.dev/

Modular Avatar. (s. f.). *Tutorials*. Nadena Dev. Recuperado de https://modular-avatar.nadena.dev/docs/tutorials

bd_. (2026). *bdunderscore/modular-avatar* [Software]. GitHub. Recuperado de https://github.com/bdunderscore/modular-avatar
