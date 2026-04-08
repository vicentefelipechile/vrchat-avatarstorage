# PhysBones

<span class="badge badge-blue">DEPENDÊNCIA</span>

## O que é?

PhysBones é um conjunto de componentes integrados no SDK do VRChat que permite adicionar movimento secundário (física) a objetos em avatares e mundos. Com PhysBones você pode adicionar movimento a cabelos, rabos, orelhas, roupas, fios, plantas e muito mais. Usá-los corretamente faz seus avatares parecerem mais dinâmicos e realistas.

> [!NOTE]
> PhysBones é o **substituto oficial** do Dynamic Bones no VRChat. Embora o Dynamic Bones ainda funcione em avatares existentes (ele converte automaticamente), todos os criadores devem usar PhysBones para novos avatares.

## Para que serve?

- Adicionar física a cabelos, rabos, orelhas e roupas
- Permitir que outros jogadores interajam com elementos do seu avatar (agarrar, poser)
- Criar movimento secundário dinâmico e realista
- Substituto do componente Cloth do Unity para tecidos simples

## Componentes principais

PhysBones é composto por três componentes que trabalham juntos:

| Componente              | Descrição                                                                     |
| ----------------------- | ----------------------------------------------------------------------------- |
| **VRCPhysBone**         | Componente principal que define a cadeia de ossos que será animada com física |
| **VRCPhysBoneCollider** | Define colliders que afetam PhysBones (cabeça, torso, mãos, etc.)             |
| **VRCPhysBoneRoot**     | Opcional. Define a raiz de movimento para múltiplos PhysBones (apenas mundos) |

## Configuração detalhada

### Versões

Você pode selecionar a versão do componente VRCPhysBone diretamente no inspetor. Por padrão, a versão mais recente disponível é usada.

**Versão 1.0:**

- Versão base do componente PhysBone

**Versão 1.1 (Squishy Bones):**

- Permite que os ossos se comprimam e alonguem
- A gravidade agora age como uma proporção de quanto os ossos girarão em repouso
- Um Pull positivo é necessário para os ossos se moverem na direção da gravidade

### Transforms

| Configuração                | Descrição                                                               |
| --------------------------- | ----------------------------------------------------------------------- |
| **Root Transform**          | O transform onde o componente começa. Se vazio, começa neste GameObject |
| **Ignore Transforms**       | Lista de transforms que não devem ser afetados pelo componente          |
| **Ignore Other Phys Bones** | Se ativado, o PhysBone ignora outros PhysBones na hierarquia            |
| **Endpoint Position**       | Vetor para criar ossos adicionais em cada endpoint da cadeia            |
| **Multi-Child Type**        | Comportamento do osso raiz quando existem múltiplas cadeias             |

> [!CAUTION]
> Se você usa um único osso raiz, ou uma raiz com vários filhos (sem netos), você DEVE definir um Endpoint Position! Isso é diferente do Dynamic Bones.

### Forces (Forças)

**Tipo de Integração:**

- **Simplified**: Mais estável, mais fácil de configurar, menos reativo a forças externas
- **Advanced**: Menos estável, permite configurações mais complicadas, mais reativo a forças externas

Parâmetros disponíveis:

- **Pull**: Força usada para retornar os ossos à posição de repouso
- **Spring** (Simplified) / **Momentum** (Advanced): Quantidade de oscilação ao tentar atingir a posição de repouso
- **Stiffness** (Apenas Advanced): Quantidade de esforço para ficar na posição de repouso
- **Gravity**: Quantidade de gravidade aplicada. Valor positivo puxa para baixo, negativo para cima
- **Gravity Falloff**: Controla quanta gravidade é removida em repouso (1.0 = sem gravidade em repouso)

> [!TIP]
> Se seu cabelo está modelado na posição que você quer quando está em pé normalmente, use Gravity Falloff em 1.0. Assim a gravidade não afetará quando você estiver parado.

### Limits (Limites)

Limites permitem restringir o quanto uma cadeia de PhysBones pode se mover. São muito úteis para evitar que cabelo entre na cabeça, e são **muito mais performáticos** que colliders.

| Tipo      | Descrição                                                                 |
| --------- | ------------------------------------------------------------------------- |
| **None**  | Sem limites                                                               |
| **Angle** | Limitado a um ângulo máximo a partir de um eixo. Visualizado como um cone |
| **Hinge** | Limitado ao longo de um plano. Similar a uma fatia de pizza               |
| **Polar** | Combina Hinge com Yaw. Mais complexo, usar com moderação                  |

> [!WARNING]
> Não abuse dos limites Polar. Usar mais de 64 pode causar problemas de performance.

### Collision (Colisão)

| Configuração        | Descrição                                                                            |
| ------------------- | ------------------------------------------------------------------------------------ |
| **Radius**          | Raio de colisão ao redor de cada osso (em metros)                                    |
| **Allow Collision** | Permite colisão com colliders globais (mãos de outros jogadores, colliders do mundo) |
| **Colliders**       | Lista de colliders específicos com os quais este PhysBone colide                     |

**Opções de Allow Collision:**

- **True**: Colide com colliders globais
- **False**: Colide apenas com os colliders listados
- **Other**: Opções avançadas para filtrar por tipo (avatar, mundo, item)

### Stretch & Squish (apenas v1.1)

| Configuração       | Descrição                                                            |
| ------------------ | -------------------------------------------------------------------- |
| **Stretch Motion** | Quantidade de movimento que afeta o alongamento/compressão dos ossos |
| **Max Stretch**    | Alongamento máximo permitido (múltiplo do comprimento original)      |
| **Max Squish**     | Compressão máxima permitida (múltiplo do comprimento original)       |

### Grab & Pose (Agarrar e Posar)

| Configuração       | Descrição                                                                            |
| ------------------ | ------------------------------------------------------------------------------------ |
| **Allow Grabbing** | Permite que jogadores agarrem os ossos                                               |
| **Allow Posing**   | Permite que jogadores posem após agarrar                                             |
| **Grab Movement**  | Controla como os ossos se movem quando agarrados (0 = usa pull/spring, 1 = imediato) |
| **Snap To Hand**   | O osso automaticamente se ajusta à mão que o agarra                                  |

## Casos de uso práticos

### Exemplo 1: Cabelo longo

1. Selecione o osso raiz do cabelo (geralmente no pescoço ou cabeça)
2. Adicione o componente **VRCPhysBone**
3. Configure:
   - **Root Transform**: Osso raiz do cabelo
   - **Ignore Transforms**: Olhos e qualquer osso que não deve se mover
   - **Multi-Child Type**: Ignore (assim todos os ossos do cabelo são afetados com um componente)
   - **Pull**: 0.3 - 0.5
   - **Gravity**: 0.5 - 1.0
   - **Gravity Falloff**: 0.5 - 0.8 (ajuste conforme como quer que caia em repouso)
   - **Radius**: 0.05 - 0.1
4. Adicione **Limits** tipo Angle para evitar que o cabelo entre na cabeça

> [!TIP]
> Para cabelos muito longos, considere dividi-los em múltiplos componentes PhysBone (um para cada seção) para melhor performance.

### Exemplo 2: Rabo de animal

1. Selecione o osso base do rabo
2. Adicione o componente **VRCPhysBone**
3. Configure:
   - **Root Transform**: Osso base do rabo
   - **Integration Type**: Advanced
   - **Pull**: 0.2 - 0.4
   - **Spring/Momentum**: 0.5 - 0.7
   - **Stiffness**: 0.1 - 0.3
   - **Gravity**: 0.3 - 0.6
4. Use limites **Hinge** para limitar o movimento lateral

### Exemplo 3: Saia ou capa

1. Certifique-se de que a roupa tem sua própria armadura separada do avatar
2. Selecione o osso raiz da saia/capa
3. Adicione o componente **VRCPhysBone**
4. Configure:
   - **Pull**: 0.1 - 0.3 (mais suave para tecidos)
   - **Gravity**: 0.8 - 1.0
   - **Gravity Falloff**: 0.3 - 0.5
   - **Radius**: 0.05
5. Adicione **VRCPhysBoneCollider** no torso do avatar
6. No componente PhysBone, em **Colliders**, adicione o collider do torso

> [!NOTE]
> Para saias muito longas ou capas completas, considere usar o componente Cloth do Unity em vez de PhysBones, pois é otimizado para este tipo de tecido.

## Dynamic Bones vs PhysBones

O VRChat converte automaticamente componentes Dynamic Bones para PhysBones ao carregar o avatar. Porém, essa conversão não é perfeita.

**Diferenças principais:**

- Dynamic Bones usa o modo Advanced por padrão na conversão
- Algumas configurações de Dynamic Bones não têm equivalente em PhysBones
- A conversão automática usa "Ignore" para Multi-Child Type

**Conversão manual:**
Você pode converter manualmente seus avatares usando VRChat SDK → Utilities → Convert DynamicBones to PhysBones.

> [!WARNING]
> Faça backup do seu avatar antes de converter, pois o processo não é reversível.

## Limites e performance

| Plataforma     | Limite                                                            |
| -------------- | ----------------------------------------------------------------- |
| **PC**         | ~256 transforms por componente                                    |
| **Meta Quest** | Limite mais baixo (consultar documentação de Performance Ranking) |

**Dicas de otimização:**

- Não tenha mais de 256 transforms por componente PhysBone
- Se tiver mais de 128 transforms, considere dividir em múltiplos componentes
- Use **Limits** em vez de colliders quando possível
- Não use ossos humanoides (Hip, Spine, Chest, Neck, Head) como raiz de PhysBones

> [!IMPORTANT]
> PhysBones tem um limite difícil no Meta Quest. Consulte os limites "Very Poor" no sistema de Performance Ranking.

## Erros comuns

### O PhysBone não se move

- Verifique se o Root Transform está corretamente atribuído
- Certifique-se de que não está em "Ignore" no Multi-Child Type
- Verifique se o valor de Pull não é 0

### O PhysBone entra no corpo

- Adicione limites (Limits) ao componente
- Adicione colliders ao avatar e configure no PhysBone
- Aumente o valor de Pull

### Os ossos não alcançam a posição de repouso

- Aumente o valor de Pull
- Ajuste Spring/Momentum conforme o tipo de integração

### Os ossos atravessam o corpo

- Adicione VRCPhysBoneCollider ao avatar
- Configure o collider na lista Colliders do PhysBone
- Verifique se o Radius é apropriado

## Onde aprender mais?

- **Documentação oficial:** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **Exemplo do SDK:** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **Comunidade:** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## Referências

VRChat. (2025). _PhysBones_. VRChat Creators. Retirado de https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). _VRCPhysBoneCollider_. VRChat Creators. Retirado de https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
