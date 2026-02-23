# SyncDances

<span class="badge">FERRAMENTA</span>

## O que é?
SyncDances é um prefab de Unity para VRChat que permite aos avatares dançarem em perfeita sincronização. Quando um jogador inicia uma dança, todos os que têm o sistema instalado começam a dançar ao mesmo tempo.

> [!NOTE]
> SyncDances foi inspirado no prefab [CuteDancer](https://github.com/Krysiek/CuteDancer).

## Para que serve?
- Danças sincronizadas entre múltiplos jogadores no VRChat
- Sistema transmissor-receptor onde um controla e os outros seguem
- Controle de velocidade das danças (sincronizado)
- 24 slots para danças personalizadas

## Principais Características

| Característica | Descrição |
|----------------|-----------|
| **Sincronização** | Todos os jogadores com o sistema dançam ao mesmo tempo |
| **Controle de velocidade** | Você pode acelerar, desacelerar ou congelar as danças |
| **Slots personalizados** | 24 espaços para adicionar suas próprias danças |
| **Compatibilidade com Quest** | Funciona no Quest (mas não recomendado) |
| **Múltiplas versões** | Disponível para VRCFury e Modular Avatar |

## Versões Disponíveis

| Versão | Preço | Descrição |
|--------|-------|-----------|
| **Original** | 600 JPY | Arquivos originais |
| **Com suporte** | 1000 JPY | Arquivos + suporte do criador |
| **DLC** | 350 JPY~ | Conteúdo adicional |

## Requisitos

- **VRCFury** instalado no projeto (recomendado)
- Opcional: **Modular Avatar** para instalação automática

## Instalação

### Método com VRCFury (Recomendado)

1. Baixe o arquivo `SyncDancesPrefab PC (VRCFURY)` do pacote
2. Arraste e solte o prefab sobre seu avatar no Unity
3. Pronto! O avatar estará pronto para o upload

> [!IMPORTANT]
> Não instale os arquivos de itens individualmente - apenas o prefab principal.

### Versão Modular Avatar

Se você preferir usar Modular Avatar em vez de VRCFury:
- Procure a versão específica em: [SyncDances Modular Avatar](https://booth.pm/en/items/6311129)

## Como usar

1. Instale o prefab no seu avatar
2. Use o menu do VRChat para selecionar uma dança
3. Se você for o "transmissor", os outros ("receptores") dançarão sincronizados

### Sistema transmissor-receptor

- **Um jogador atua como antena (transmissor)** - controla qual dança é reproduzida
- **Os outros são receptores** - recebem o sinal e dançam sincronizados

> [!TIP]
> Para aumentar o alcance da transmissão, junte todos os transmissores e receptores. Mas cuidado! Isso pode causar crashes devido a um bug do VRChat.

## Danças Incluídas

SyncDances inclui múltiplas danças pré-configuradas. Alguns dos criadores reconhecidos incluem:

| Dança | Criador |
|-------|---------|
| El bicho | THEDAO77 |
| Chainsaw | THEDAO77 |
| Ankha | THEDAO77 |
| Sad Cat | Evendora |
| Crisscross | (Rat meme) |
| PUBG | Toca Toca |

> [!NOTE]
> Mais da metade das danças foram encontradas aleatoriamente na internet. Se você criou alguma das danças incluídas, entre em contato com o criador para receber os créditos.

## Controle de Velocidade

A partir da versão 4.0, SyncDances inclui controle de velocidade:
- **0%**: Congelado
- **100%**: Velocidade normal
- **Mais de 100%**: Dança acelerada

> [!WARNING]
> O controle de velocidade NÃO funciona com pessoas usando SyncDances 3.1 ou anterior. Elas dançarão na velocidade padrão.

## Parâmetros e Desempenho

| Aspecto | PC | Quest |
|---------|-----|-------|
| **Contatos** | 16 | 12 |
| **Fontes de áudio** | 1 | 0 (lite) |
| **Bits de parâmetros (speed)** | 18 bits | N/A |
| **Bits de parâmetros (default)** | 10 bits | N/A |

## Atualizações

### Versão 4.5
- Compatibilidade reversa melhorada (2.x e 3.x sincronizam corretamente)
- Corrigido custom emote 2 e custom emote 21
- 16 novos slots para emotes personalizados (agora 24 no total)

### Versão 4.2
- Menus personalizados corrigidos
- Compatibilidade com Modular Avatar corrigida
- Menus para Custom 9-17 e 18-24 adicionados

### Versão 3.1
- Contatos reduzidos de 114 para apenas 16
- Fontes de áudio reduzidas de 32 para 1
- Adicionadas 15 novas danças e 8 slots para personalizados

## Erros Comuns

### Os jogadores não sincronizam
- Verifique se todos têm a mesma versão do SyncDances
- Certifique-se de que o transmissor está dentro do alcance
- Jogadores usando 3.1 não podem controlar a velocidade

### O avatar congela
- Pode ser por incompatibilidade de versões
- Verifique se o prefab está corretamente instalado

### Os emotes personalizados não funcionam
- Verifique se você está usando o slot correto
- Alguns emotes exigem VRCFury instalado

## Diferença com OpenSyncDance

| Característica | SyncDances | OpenSyncDance |
|----------------|------------|---------------|
| **Preço** | Pago (600-1000 JPY) | Grátis |
| **Código** | Fechado | Open Source |
| **Controle de velocidade** | Sim | Não |
| **Desenvolvimento** | Ativo | Ativo |
| **Suporte** | Discord do criador | Comunidade |

## Recursos Adicionais

- **Compra:** [BOOTH - SyncDances 4.5](https://booth.pm/en/items/4881102)
- **SyncDances Modular Avatar:** [BOOTH](https://booth.pm/en/items/6311129)
- **DLC:** [BOOTH](https://booth.pm/en/items/7423127)
- **Discord:** Kinimara (criador)

---

## Referências

Kinimara. (2025). *SyncDances 4.5*. BOOTH. https://booth.pm/en/items/4881102

Krysiek. (2022). *CuteDancer*. GitHub. https://github.com/Krysiek/CuteDancer
