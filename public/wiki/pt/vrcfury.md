# VRCFury

<span class="badge">OPCIONAL</span>

## O que é?
VRCFury é um plugin gratuito do Unity que simplifica enormemente a configuração de avatares do VRChat. Facilita a instalação de roupas, props, gestos e animações sem a necessidade de editar manualmente os controladores de animação.

## Para que serve?
- Instalação de roupas e acessórios com um único clique
- Configuração automática de gestos e animações
- Geração automática de menus do VRChat
- Não destrutivo: não modifica seus arquivos originais
- Otimizador de blendshapes (remove os não usados)

> [!NOTE]
> Nota
> VRCFury é uma ferramenta OPCIONAL, mas altamente recomendada. Alguns avatares a requerem para funcionar corretamente. Se um avatar precisar, isso será indicado na descrição dele.

## Onde obter?
- **Site Oficial (Downloads):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## Como instalar?

Assim como muitas ferramentas modernas do VRChat, existem dois métodos para instalar o VRCFury. O método recomendado oficialmente é usar o **VCC (VRChat Creator Companion)**.

### Método 1: Instalação via VCC (Recomendado)

Usar o VCC garante que o VRCFury permaneça sempre atualizado e não cause problemas de compatibilidade ao usar vários projetos.

1. **Adicionar o repositório ao VCC:**
   - Vá para a página oficial de downloads: [vrcfury.com/download](https://vrcfury.com/download/).
   - No passo 1 ("Install VRChat Creator Companion"), se você já tiver o VCC instalado, pode ignorá-lo. No passo 2, clique no botão **"Click Here to add VRCFury to VCC"**.
   - Seu navegador pedirá permissão para abrir o VCC. Aceite e, uma vez dentro do VCC, clique em **"I Understand, Add Repository"**.
   - *(Alternativa manual)*: Abra o VCC, vá para **Settings** -> aba **Packages** -> **Add Repository**, cole a URL `https://vcc.vrcfury.com` no espaço correspondente e clique em **Add**.
2. **Adicionar VRCFury ao seu projeto:**
   - No VCC, vá para a lista de seus projetos e clique em **Manage Project** sobre o projeto que você está usando.
   - Na lista de repositórios à esquerda (ou no canto superior direito), certifique-se de que **"VRCFury Repo"** esteja marcado.
   - Na lista de pacotes disponíveis para o seu projeto, procure por **"VRCFury"** e clique no ícone **[+]** à direita para adicioná-lo ao seu projeto.
3. **Pronto!** Clique em **Open Project** no VCC e os prefabs com VRCFury serão instalados ou configurados automaticamente ao fazer o upload do seu avatar ou ao adicioná-los à cena.

> [!NOTE]
> Se, no momento da instalação pelo VCC, você vir que a janela se fecha inesperadamente, é normal. Para corrigir, basta fechar o VCC, abri-lo novamente e repetir o processo; você verá que agora funciona corretamente.

### Método 2: Instalação manual via .unitypackage (Legacy)

Este método não é mais recomendado e é considerado obsoleto (Legacy), mas ainda é possível de usar se você tiver problemas com o VCC.

1. Baixe o arquivo do instalador do VRCFury no formato `.unitypackage` da seção de downloads no [GitHub](https://github.com/VRCFury/VRCFury/releases).
2. Abra o projeto Unity onde você planeja trabalhar em seu avatar.
3. No menu superior do Unity, vá para **Assets** → **Import Package** → **Custom Package...**
4. Selecione o arquivo `.unitypackage` do VRCFury que você acabou de baixar.
5. Certifique-se de que todos os arquivos estejam selecionados na janela pop-up e clique em **Import**.
6. VRCFury será instalado e um novo menu aparecerá na barra superior chamado **Tools > VRCFury**. (A partir daí, você pode atualizá-lo se usar este método manual).

---

## Referências

VRCFury. (s. d.). *Download*. VRCFury. Recuperado de https://vrcfury.com/download/

VRCFury. (s. d.). *VRCFury*. GitHub. Recuperado de https://github.com/VRCFury/VRCFury
