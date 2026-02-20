# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## O que é?
**SPS** (Super Plug Shader) é um sistema de deformação de malha gratuito e moderno para o VRChat projetado pela equipe do **VRCFury**. Permite que as partes do avatar se deformem de forma realista ao interagir com outros avatares ou objetos, substituindo sistemas antigos e pagos como o **DPS** (Dynamic Penetration System) e o **TPS** [1].

## Para que serve?
- **Deformação realista:** Simula penetração e contato físico deformando a malha do avatar.
- **Otimização:** É muito mais leve e eficiente que os sistemas antigos.
- **Gratuito:** Ao contrário do DPS, o SPS é totalmente gratuito e de código aberto.
- **Compatibilidade:** Funciona com a maioria dos shaders modernos (Poiyomi, LilToon, etc.) e tem compatibilidade com avatares que usam DPS ou TPS.

## Pré-requisitos
Antes de começar, certifique-se de ter o seguinte:
- **Unity:** A versão recomendada para o VRChat.
- **VRChat SDK:** Instalado no seu projeto (VCC).
- **VRCFury:** Instalado e atualizado para a versão mais recente [2].
- **Modelo 3D:** Um avatar com as malhas que você deseja animar (orifícios ou penetradores).

## Guia de Instalação Passo a Passo

O SPS é totalmente gerenciado através das ferramentas VRCFury no Unity. Você não precisa importar pacotes de shaders estranhos ou fazer configurações manuais de animação complexas.

### Passo 1: Instalar VRCFury
Se ainda não o fez, instale o VRCFury a partir do VRChat Creator Companion (VCC).
1. Abra o VCC.
2. Vá para "Manage Project".
3. Procure por "VRCFury" na lista de pacotes e instale (ou adicione o repositório caso não apareça).

### Passo 2: Criar um Socket (Orifício)
Um "Socket" é o receptor da interação (boca, etc.).

1. **Ferramentas:** Na barra superior do Unity, vá para `Tools` > `VRCFury` > `SPS` > `Create Socket` [1].
2. **Colocação:** Um novo objeto aparecerá em sua cena.
   - Arraste esse objeto para dentro da hierarquia do seu avatar e **torne-o filho do osso** correspondente (ex: `Hip` ou `Head`).
3. **Ajuste:** Mova e gire o objeto Socket para que ele corresponda à entrada do orifício em sua malha.
   - A seta do gizmo deve apontar **para dentro** do orifício.
   - Certifique-se de que o tipo de Socket (no inspector) corresponda ao que você deseja (ex: Vagina, Anal, Oral).
4. **Luzes:** Você não precisa configurar luzes de ID manualmente; o VRCFury faz isso por você.

> [!TIP]
> **Nota de Colocação (ERP)**
> Não coloque os pontos (Sockets) muito fundo no avatar. Se o "buraco" for muito profundo, será difícil fazer ERP confortavelmente. Recomenda-se colocá-los bem na entrada ou um pouco para fora.
>
> **Cuidado com Proporções Grandes:** Se o seu avatar tem quadris muito largos ou um traseiro grande ("bunda enorme"), **puxe o Socket ainda mais para fora**. Caso contrário, a outra pessoa vai esbarrar na malha do corpo antes de conseguir "alcançar" o ponto de interação.

### Passo 3: Criar um Plug (Penetrador)
Um "Plug" é o objeto que penetra e se deforma.

1. **Preparação da Malha:**
   - Certifique-se de que sua malha de penetrador esteja "reta" e "estendida" na posição de descanso no Unity. O SPS precisa saber o comprimento total.
   - Se você vem do DPS/TPS, remova scripts antigos ou materiais especiais. Use um shader normal (Poiyomi) [1].
2. **Ferramentas:** Vá para `Tools` > `VRCFury` > `SPS` > `Create Plug` [1].
3. **Colocação:**
   - **Opção A (Com ossos):** Se o seu pênis tem ossos, arraste o objeto Plug e torne-o filho do **osso base** do pênis.
   - **Opção B (Sem ossos):** Se for apenas uma malha (mesh renderer), arraste o objeto Plug e solte-o diretamente sobre o objeto com o **Mesh Renderer**.
4. **Configuração:**
   - No inspector do componente `VRCFury | SPS Plug`, certifique-se de que o **Renderer** é a malha do seu pênis.
   - Ajuste a orientação: A parte curva do gizmo deve estar na ponta e a reta na base.
   - Configure o **Type** adequado.

### Passo 4: Testar no Unity
Você não precisa fazer o upload do avatar para testar se funciona.
1. Instale o **Gesture Manager** pelo VCC [1].
2. Entre no **Play Mode** do Unity.
3. Selecione o Gesture Manager.
4. No menu de expressões emulado, vá para as opções de SPS.
   - O VRCFury gera automaticamente um menu de teste com opções para ativar/desativar e testar a deformação.
   - Você pode criar um "Test Socket" a partir do menu de ferramentas para testar a interação em tempo real.

> [!WARNING]
> Aviso: Constraints
> Evite usar Constraints do Unity nos mesmos ossos que o SPS deforma, pois eles podem causar conflitos de movimento (jitter) [4].

---

## Referências

[1] VRCFury. (s.d.). *SPS (Super Plug Shader)*. VRCFury Documentation. https://vrcfury.com/sps

[2] VRCFury. (s.d.). *Download & Install*. VRCFury Documentation. https://vrcfury.com/download

[3] VRCD. (s.d.). *SPS Tutorial*. VRCD. https://vrcd.org.cn

[4] VRCFury. (s.d.). *SPS Troubleshooting*. VRCFury Documentation. https://vrcfury.com/sps
