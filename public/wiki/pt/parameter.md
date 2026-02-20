# Parâmetros do Avatar (Expression Parameters)

<span class="badge badge-blue">Logic</span> <span class="badge badge-yellow">Optimization</span>

## O que são?
Os **Expression Parameters** (ou simplesmente parâmetros) são variáveis que servem de "memória" para o seu avatar do VRChat [1]. Eles atuam como uma ponte entre o **Expressions Menu** (o menu radial no jogo) e o **Animator Controller** (a lógica que faz as animações serem reproduzidas).

Quando você seleciona uma opção no menu (por exemplo, "Tirar a camisa"), o menu altera o valor de um parâmetro (por exemplo, `Camisa = 0`), e o Animator lê essa mudança para executar a animação correspondente.

## Tipos de Parâmetros
Existem três tipos principais de dados que você pode usar, cada um com um custo de memória diferente [2]:

| Tipo | Descrição | Custo de Memória | Uso Comum |
| :--- | :--- | :--- | :--- |
| **Bool** | Verdadeiro ou Falso (On/Off). | 1 bit | Toggles simples (roupas, objetos). |
| **Int** | Números inteiros (0 a 255). | 8 bits | Mudanças de guarda-roupa com múltiplas opções, sliders por passos. |
| **Float**| Números decimais (0.0 a 1.0). | 8 bits | Sliders contínuos (espessura, tonalidade, puppet radial). |

## Limite de Memória (Synced Bits)
O VRChat impõe um limite rígido de **256 bits** de dados sincronizados por avatar [2].
- **Sincronizados (Synced):** São parâmetros cujos valores são enviados a outros jogadores pela rede. Se você tirar a camisa, você quer que os outros vejam.
- **Não Sincronizados (Local):** Parâmetros que existem apenas no seu PC. Úteis para a lógica interna que não precisa ser vista pelos outros.

> [!WARNING]
> Se você exceder o limite de memória, não conseguirá enviar o avatar ou os parâmetros extras pararão de funcionar. Otimize usando `Bool` em vez de `Int` sempre que possível.

## Usos Avançados
Além de controlar as roupas através do menu, os parâmetros podem ser controlados por:
- **PhysBones:** Para detectar se alguém toca sua orelha ou cabelo [3].
- **Contacts:** Para detectar colisões (como em sistemas [SPS](/wiki?topic=sps) ou [PCS](/wiki?topic=pcs)).
- **OSC:** Para receber dados de programas externos (medidores de frequência cardíaca, rastreamento facial ou Spotify) [3].

## Como são Criados
1. No seu projeto Unity, clique com o botão direito em `Assets`.
2. Vá para `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Adicione os parâmetros de que você precisa (ex: "Outfit", "Sword", "HueShift").
4. Atribua este arquivo no componente **VRC Avatar Descriptor** do seu avatar, na seção "Expressions".

## Limitações e Problemas Comuns

### Por que existe um limite de 256 bits?
O VRChat impõe esse limite principalmente para **otimização de rede** [1]. Cada parâmetro sincronizado deve ser enviado a todos os outros jogadores na instância. Se não houvesse limite:
- A largura de banda necessária para atualizar a posição e o estado de 80 jogadores seria insustentável.
- Usuários com conexões lentas sofreriam lag extremo ou desconexões.
- O desempenho geral (FPS) cairia devido ao processamento excessivo de dados de rede.

### Conflitos com Assets Complexos (GoGo Loco, SPS, Danças)
A combinação de vários sistemas "pesados" num único avatar levanta problemas comuns:

1.  **Esgotamento de Parâmetros (Parameter Exhaustion):**
    Assets como o **GoGo Loco** consomem uma quantidade considerável de memória. Se você tentar adicionar SPS, um sistema complexo de dança e toggles de roupas, é muito fácil exceder os 256 bits sincronizados.
    *   *Consequência:* O VRChat impedirá o upload do avatar ou os últimos componentes instalados deixarão de funcionar.

2.  **Conflitos de Lógica:**
    *   **GoGo Loco:** Pode fazer com que o avatar "afunde" no chão ou flutue devido a conflitos com as camadas base de locomoção ou com versões antigas do asset [4].
    *   **SPS (Super Plug Shader):** Combinar SPS com Constraints pode causar jitter (tremores rápidos) nos pontos de contato devido à forma como o VRChat lida com atualizações física e hápticas [5].

3.  **Desempenho (Performance Rank):**
    *   **SPS:** Muitas vezes requer luzes extras ou renderizadores que podem degradar o nível de desempenho do seu avatar a "Very Poor" imediatamente.
    *   **GoGo Loco:** Adiciona várias camadas ao Animator Controller. Embora não afete os gráficos tanto quanto outros itens, aumenta a utilização da CPU no processamento lógico das animações [4].

> [!TIP]
> Ferramentas como o **VRCFury** são essenciais para lidar com a gestão desses conflitos. O VRCFury automatiza de forma inteligente a mesclagem de controladores e parâmetros ("Non-Destructive Workflow"), reduzindo o erro humano e otimizando o consumo de memória sempre que exequível.

## Otimização e Dicas: Como reduzir o uso de bits

Para evitar atingir o limite de 256 bits sem abrir mão de funcionalidades, os criadores integram várias técnicas inteligentes. A mais fundamental é **combinar estados mutuamente exclusivos**.

#### O Truque do "Int Único" (Single Int)
Imagine que você tem 10 camisas exclusivas para o seu avatar.
*   **Forma Ineficiente (Bools):** Você implanta 10 parâmetros `Bool` distintos (Ex: Camisa1, Camisa2... Camisa10).
    *   *Custo:* 10 Bits.
    *   *Desvantagem:* Você sacrifica 1 bit inteiro para cada roupa consecutivamente ativada.
*   **Forma Eficiente (Int):** Você constrói o equivalente lógico combinando **1** único parâmetro `Int` e batizando-o de `Ropa_Superior`.
    *   *Custo:* 8 Bits (invariavelmente, visto que é um armazenamento de tipologia Int).
    *   *Vantagem:* É perfeitamente executável acomodar logicamente e ter disponíveis até **255 camisas distintas** enquanto custa estagnados 8 bits da sua alocação total.
    *   *Como funciona:* No Animator, você dita que o delineador atue onde se a camisa ostentar o número de identificação 1, a Camisa A se ative, já 2 ativa inexoravelmente a Camisa B, reproduzindo-se estruturalmente sucessivo para a Camisa 3.. a n...

> [!NOTE]
> **Regra de ouro inabalável:** Se houver preeminentemente mais do que 8 escolhas logicamente mutuamente exclusivas e incapacitadas por sua natureza própria de coexistirem num avatar ativas simultaneamente no mesmo exato espécime de uso sem restrições ou conflitos diretos de visuais na camada sobreposta (conjunto de vestimentas / palhetas completas para íris dos olhos de um avatar), reaja implementando integralmente num parâmetro de uso da alocação de dados de modelagem Int o seu limite condicional equivalente de 8 Bits - caso a variação limitante de ativação de suas referidas escolhas de componentes individuais seja um mero limitante de contagem estrutural puramente irrestrita para coexistirem visualmente de contagem igual ou menor simultaneamente (Acessório óculos, e Chapéu, Pulseira num pulso oposto) a marca unitária da restrição da quantidade do algarismo Oito isolada: você estara isento integralmente com 8 utilizações separadas através inteiramente da conversão manual exclusiva via variações do padrão alocativo Bools..

#### Exemplo Básico de Configuração
Se você quiser criar um seletor de palheta de colorização base para as roupas de um avatar da seguinte forma delineada:
1.  Declare categoricamente no menu Expressions estrutural Parameter a confecção um novo parâmetro com as tipológicas **Int** que seja titulado `ColorBoots` e não preenchido com seu valor padrão de forma imediata
2.  Desloque-se integramente para **Expression Menu**, projete do zero um diretório como formato "Sub-menu" e embutido crie controles formatados na natureza como modelo diretos ativáveis do tipo Buttons configurados num molde que se preencha diretamente ao acionarem definidos (para definir de forma purística e irrevogável com setagens inabaladas e exatas sempre que instigados, ao invés da modelagem Radial Puppet que exige variações na flutuação interina deslizante em escalas para selecionar, logo não é um set inabalado puro) para determinar a utilidade delineada para cada escolha alocada da seguinte maneira a baixo:.
3.  Programe cada Botões que você acaba se instanciar dessa forma para cada uma das cores com essas instruções listadas correspondente com cada número setado internamente. Ex:,
    *   No seletor de botões de Cor "Vermelho"  faça seu respectivo funcionamento configurar set e fixar a variável instanciada pre viamente `ColorBoots` contendo com o valor de numero 1 exato.
    *   No seletor botões da Cor "Azul" defina estruturalmente a fixação inabalada que converta com a configuração da `ColorBoots` com número da sua alocação correspondende "Numero Invariável de Tipologia Numérica Dois ex: (2)" , etc, em andamento constante dependendo apenas dá a limitação equivalente as alocações na parametrização em números previamentes instanciados.
    *   Botaão para cor "Preta" sets -> `ColorBoots` pre alocado : > equivalendo exatament ao algarismo 3 invariávelmente inerte..
4.  Como prosseguimento de finalizações dirija se incontestavelmente para a aba central do "Animator Controller", e abra especificamente o Layer ( FX ) onde devera operar:
    *   Crie transições imutáveis de naturezas diretas que tem como sua base inicial a box delimitante chamada "Any State" (Seja Qual estado atual em progresso for e no decorrer de onde partiu). Conecte cada base inicial "Any State" traçando em seu Animator com linha interativa diretas transições unitárias isoladas diretamente a box central emuladora criada contendo das ativações alocadas criadas para a amostragem específica de cada base para a animação das respectivas cores citadas em questão isolada, pre-determinando o modelo exato para a box de animação onde contem exato aquela cor que vc alocou para aquela ativação de numero que pre programou pra ser correspondentes com a ativação dela que foi pré estipulada em número puro alocado.
    *   Vá se deslocando em seu mouse de volta em forma progressiva estruturada setando pra checar isolada cada flecha unitária (seta individual que represente aquela transição criada que sai da box Any State apontada diretamente de frente como a destinação traçada contida o alvo individual pra ativação das cores). Na tabela ao lado na área Condition insira rigorosamente como pré-configuração que deflagra inabaladamente os pré-requisitos lógicos obrigatórios impositivos em que para a Animação vermelha entrar na condição exclusiva de fluízao da Animação a ser rodada tem de estar obedecido com: -> `ColorBoots` equals 1 (a variante correspondente com essa colorização vermelha setata com Valor: Numéro 1 inteiro inalterável)
    *   Condição em que ocorre inalteravelmente exata da mesma forma para que se a sua pre configuração contida como Azul passe ser deflagrada do andamento base da Any State ate chegar a respectiva caixa final em andamento rodar o Azul em exibição: `ColorBoots` equals numeração 2;

Logo e com esse prospecto técnico prático exato você é capaz integramente controlar a gestão da sua imensa panóplia de múltiplas e incontáveis excludentes roupas ao dispor de seu personagem num orçamento da memórias imutável consumindo dos seus dados inteiramente isolados num limite do orçamento do jogo sem compromissos em exatos de 8 módicos bits restritos!

## Tabela Resumo: Que tipo usar?

| Caso de Uso | Tipo Recomendado | Por Quê? |
| :--- | :--- | :--- |
| **Ativar/Desativar 1 objeto** (Óculos, chapéu) | `Bool` | Simples e direto. Gasta 1 bit. |
| **Seletor de Guarda-Roupa** (Camisa A, B, C...) | `Int` | Permite centenas de opções esgotando só 8 bits. |
| **Alterações Graduais** (Espessura, Cor, Intensidade) | `Float` | Mandatório a qualquer tipo de variáveis números com componentes flutuantes decimas de andamento(de 0.0 até 1.0). |
| **Estados de emulações intrincados e compostos** (Danças em loop, Status Inatividade / Sistema de emulação de reações pre-estruturadas das Poses, Emotes etc) | `Int` | Especialmente voltadas em uso central prático inabalado nas formatações primárias em conjuntos emuladores condicionados as lógicas em máquinas de Estados com Múltiplas reações com condições complexas em que pre requisita uma das demais desativas.. |
| **Alternativas totalmente desvinculadas das escolhas Toggles** (< 8 objetos individuais e puramente alocados) | `Bool` | Pelo motivo primário delas contabilizarem a mesma quantidade numericamente menor (ate quantidade oito inabalada) e que sua escolha puramente em utilização isolada exata não afeta anulando/apagando sobrepor inabalavelmente de outra alternativamente independente se estarem ativas ao simultâneo conjuntas. |

---

## Referências

[1] VRChat. (s.d.). *Expression Parameters*. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset

[2] VRChat. (s.d.). *Avatar Parameter Driver*. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver

[3] VRChat. (s.d.). *OSC Overview*. VRChat Documentation. https://creators.vrchat.com/avatars/osc/

[4] Franada. (s.d.). *GoGo Loco Documentation*. https://github.com/Franada/goloco

[5] VRCFury. (s.d.). *SPS - Super Plug Shader*. VRCFury Documentation. https://vrcfury.com/sps
