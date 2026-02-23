# VRCQuestTools

<span class="badge">FERRAMENTA</span>

## O que é?
VRCQuestTools é uma extensão Unity desenvolvida por **kurotu** que permite converter avatares VRChat projetados para PC para a plataforma Android (Meta Quest/PICO). Esta ferramenta automatiza o processo de tornar um avatar compatível com as rigorosas limitações de desempenho dos dispositivos móveis.

> [!NOTE]
> VRCQuestTools funciona através do sistema **Non-Destructive Modular Framework (NDMF)** em suas versões mais recentes, o que permite processar o avatar sem modificar os arquivos originais.

## Para que serve?
- Converter avatares de PC para Android com alguns cliques
- Reduzir polígonos e materiais automaticamente
- Remover componentes não compatíveis com Quest (Lights, Cloth, etc.)
- Ajustar texturas e materiais para otimizar o desempenho
- Vários utilitários para enviar avatares para o Quest

> [!WARNING]
> IMPORTANTE: Os avatares VRoid Studio não são compatíveis com Android devido ao uso intenso de materiais transparentes. VRCQuestTools não pode ajudá-lo com esses avatares; você deve modificá-los manualmente.

## Requisitos do ambiente

| Requisito | Versão mínima |
|-----------|---------------|
| Unity | 2019.4.31f1, 2022.3.6f1 ou 2022.3.22f1 |
| VRChat SDK | Avatars 3.3.0 ou posterior |
| Módulo Android Build Support | Instalado no Unity |

## Onde obter?
- **Página Oficial:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **Documentação:** [Documentação VRCQuestTools](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth (Doação):** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## Como instalar?

### Instalação via VCC (VRChat Creator Companion)

1. Adicione o repositório ao VCC:
   - Clique: [Adicionar VRCQuestTools ao VCC](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - Ou vá para **Settings** → **Packages** → **Add Repository**, cole a URL `https://kurotu.github.io/vpm-repos/vpm.json` e clique em **Add**
2. Vá para **Manage Project** do seu projeto
3. Na lista de pacotes, procure por **VRCQuestTools** e clique em **[+]** para adicionar
4. Clique em **Open Project** no VCC

## Como converter um avatar para Android?

### Método rápido (Não destrutivo com NDMF)

1. Clique com o botão direito no seu avatar na hierarquia do Unity
2. Selecione **VRCQuestTools** → **Convert Avatar For Android**
3. Na janela que abrir, clique em **Begin Converter Settings** e depois em **Convert**
4. Aguarde a conversão terminar
5. Vá para **File** → **Build Settings**
6. Selecione a plataforma **Android** e clique em **Switch Platform**
7. Aguarde o Unity mudar a plataforma
8. Envie o avatar convertido para o VRChat

> [!TIP]
> O avatar original é desativado após a conversão. Você pode ativá-lo novamente no Inspector se necessário.

> [!NOTE]
> O avatar convertido **não otimiza automaticamente o desempenho**. Na maioria dos casos, o avatar convertido terá classificação **Very Poor** para Android. Use a configuração de Avatar Display (Mostrar Avatar) para visualizá-lo mesmo assim.

## Limites de desempenho do Quest

| Métrica | Excellent | Good | Medium | Poor | Very Poor |
|---------|-----------|------|--------|------|-----------|
| **Triângulos** | 7,500 | 10,000 | 15,000 | 20,000 | >20,000 |
| **Material Slots** | 1 | 1 | 1 | 2 | >2 |
| **Skinned Meshes** | 1 | 1 | 1 | 2 | >2 |
| **PhysBones** | 2 | 4 | 6 | 8 | >8 |

> [!NOTE]
> Por padrão, o nível de **Minimum Displayed Performance Rank** em dispositivos móveis está definido como **Medium**. Isso significa que avatares classificados como Poor ou Very Poor não serão visíveis para outros usuários, a menos que escolham mostrar seu avatar manualmente.

Para mais informações sobre o sistema de classificação de desempenho, consulte a [documentação oficial do VRChat](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/).

## Relação com outras ferramentas

- **[Modular Avatar](/wiki?topic=modular-avatar)**: Se você usar Modular Avatar ou outras ferramentas NDMF, a conversão será completamente não destrutiva.
- **[VRCFury](/wiki?topic=vrcfury)**: O VRCFury pode ajudá-lo a preparar animações e gestos antes de converter.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**: Certifique-se de que os shaders são compatíveis com Android após a conversão.

---

## Referências

kurotu. (s. f.). *VRCQuestTools - Avatar Converter and Utilities for Android*. GitHub Pages. Recuperado de https://kurotu.github.io/VRCQuestTools/

kurotu. (s. f.). *Introduction*. VRCQuestTools Docs. Recuperado de https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). *kurotu/VRCQuestTools* [Software]. GitHub. Recuperado de https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). *Performance Ranks*. VRChat Creator Documentation. Recuperado de https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
