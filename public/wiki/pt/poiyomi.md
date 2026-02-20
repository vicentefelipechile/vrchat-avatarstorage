# Poiyomi Toon Shader

<span class="badge badge-blue">DEPENDÊNCIA</span>

## O que é?
Poiyomi é um shader (sombreador) para Unity projetado especificamente para o VRChat. Ele permite criar aparências estilizadas e tipo cartoon em avatares com efeitos visuais avançados.

## Para que serve?
- Sombreamento estilizado personalizável (toon, realista, plano)
- Efeitos especiais: outlines, decals, glitter, sparkle
- Suporte para AudioLink (efeitos que reagem ao áudio)
- Reflexões e especular fisicamente precisos
- Otimizado para desempenho no VRChat

> [!WARNING]
> MUITO IMPORTANTE
> Poiyomi NÃO vem incluído nos arquivos de avatar que você baixa. Você mesmo deve instalá-lo no Unity ANTES de abrir o avatar.

## Onde obter?
- **Site Oficial (Downloads):** [poiyomi.com/download](https://poiyomi.com/download)
- **Versão Gratuita:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Versão Pro:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## Como instalar?

Atualmente existem dois métodos principais para instalar o Poiyomi em seu projeto. O método recomendado pela comunidade do VRChat é usar o **VCC (VRChat Creator Companion)**, mas você também pode usar a importação clássica do **UnityPackage**.

### Método 1: Instalação via VCC (Recomendado)

Usar o VCC (VRChat Creator Companion) é a maneira mais limpa e recomendada de instalar e gerenciar o Poiyomi, pois permite atualizar o shader facilmente a partir do aplicativo.

1. **Adicionar o repositório ao VCC:**
   - A maneira mais fácil é ir para a página oficial de downloads: [poiyomi.com/download](https://poiyomi.com/download).
   - Role para baixo até onde diz "Method 2", procure a seção do **Creator Companion (VCC)** e clique no botão **"Add to VCC"**.
   - Seu navegador pedirá permissão para abrir o VCC. Aceite-o e, uma vez dentro do VCC, clique em **"I Understand, Add Repository"**.
   - *(Alternativa manual)*: Abra o VCC, vá para **Settings** -> aba **Packages** -> **Add Repository**, cole a URL `https://poiyomi.github.io/vpm/index.json` no espaço correspondente e clique em **Add**.
2. **Adicionar o shader ao seu projeto:**
   - No VCC, navegue até a seção de projetos e clique em **Manage Project** no projeto VRChat onde deseja instalar o shader.
   - Na seção **Selected Repos** (menu lateral ou suspenso superior de repositórios), certifique-se de que **"Poiyomi's VPM Repo"** esteja marcado.
   - Na lista de pacotes disponíveis para o projeto, procure por **"Poiyomi Toon Shader"** e clique no ícone **[+]** à direita para adicioná-lo.
3. **Pronto!** Agora você pode clicar em **Open Project** no VCC e já terá o Poiyomi disponível em seu projeto Unity.

> [!NOTE]
> Se no momento de instalá-lo via VCC você vir que a janela se fecha, é normal, para consertá-lo basta fechar o VCC e abri-lo novamente e depois tentar instalá-lo via VCC, você verá que agora funciona corretamente.

### Método 2: Instalação manual via .unitypackage

Este é o método clássico. Você deve considerar que é mais difícil atualizar no futuro e pode deixar arquivos residuais se tentar mudar para o método VCC mais tarde.

1. Baixe o arquivo `.unitypackage` mais recente da página de lançamentos no [GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases) ou de sua conta no [Patreon](https://www.patreon.com/poiyomi) se usar a versão Pro.
2. Abra o projeto Unity onde você planeja importar seu avatar.
3. Na janela do Unity, importe o pacote acessando o menu superior: **Assets** → **Import Package** → **Custom Package...**
4. Selecione o arquivo `.unitypackage` que você acabou de baixar no seu computador.
5. Uma janela aparecerá mostrando uma lista de todos os arquivos a serem importados. Certifique-se de que tudo esteja selecionado (você pode usar o botão "All") e clique no botão inferior **Import**.
6. Aguarde a barra de progresso terminar, e a instalação estará completa. Poiyomi estará pronto para ser atribuído nos materiais do seu projeto.

---

## Referências

Poiyomi. (s. d.). *Download*. Poiyomi Shaders. Recuperado de https://poiyomi.com/download

Poiyomi. (s. d.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Recuperado de https://github.com/poiyomi/PoiyomiToonShader
