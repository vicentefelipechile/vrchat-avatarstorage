# Guia Passo a Passo: Preparando Unity com VCC
Siga estes passos ANTES de importar seu avatar baixado

> [!NOTE]
> Nota
> Você não precisa instalar, manipular ou gerenciar o Unity diretamente por conta própria. Todo o processo de preparação do projeto e instalação de dependências é feito dentro do VCC. Você só abrirá o Unity no final para importar e enviar seu avatar.

### Passo 1: Instalar VRChat Creator Companion (VCC)
Baixe o **VRChat Creator Companion** em [vrchat.com/home/download](https://vrchat.com/home/download). O **VCC** é a ferramenta oficial que gerencia automaticamente o Unity, o VRChat SDK e todos os pacotes necessários.

### Passo 2: Instalar Unity Hub e Unity através do VCC
Ao abrir o VCC pela primeira vez, ele detectará se você tem o Unity instalado. Siga o assistente de configuração para que ele instale o **Unity Hub** e depois baixe a versão correta do **Unity** necessária pelo VRChat (atualmente a série 2022.3). Permita que o VCC instale ambos os programas automaticamente.

### Passo 3: Criar um Novo Projeto de Avatar
Abra o VCC → **Projects** → **Create New Project**. Selecione o modelo **"Avatars"**. Dê um nome (ex: "Meus Avatares VRChat"). O VCC preparará seu projeto automaticamente com o **VRChat SDK**.

### Passo 4: Adicionar Repositório do Poiyomi
No VCC, vá para **Settings** → **Packages** → **Add Repository**. Cole este URL: [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) e clique em "Add". Isso permitirá que você instale o **Poiyomi** facilmente, o qual é vital para que as texturas dos avatares pareçam corretas. Você pode encontrar mais detalhes em nosso [guia sobre Poiyomi](/wiki?topic=poiyomi).

### Passo 5: Adicionar Repositório do VRCFury (Opcional)
Se o seu avatar precisar, em **Settings** → **Packages** → **Add Repository**, cole: [https://vcc.vrcfury.com](https://vcc.vrcfury.com) e clique em "Add". O **VRCFury** facilita a instalação de roupas e acessórios por meio de arrastar e soltar. Recomendamos verificar o [guia sobre VRCFury](/wiki?topic=vrcfury) para mais informações.

### Passo 6: Instalar Pacotes no seu Projeto
No VCC, selecione seu projeto recém-criado → **Manage Project**. Procure por **"Poiyomi Toon Shader"** e clique no botão **"+"** para adicioná-lo. Se precisar do VRCFury, adicione-o também usando o mesmo botão. Clique em **"Apply"** ou simplesmente espere carregar.

### Passo 7: Abrir Projeto e Importar Avatar
No menu do seu projeto do VCC, clique em **"Open Project"** para abrir o Unity pela primeira vez (pode demorar um pouco). Uma vez aberto, importe seu avatar: arraste o arquivo **.unitypackage** para a janela do Unity (na aba `Project` ou `Assets`) ou use **Assets → Import Package → Custom Package**.

### Passo 8: Verificar e Configurar
Arraste o **prefab do avatar** para a cena. Se tudo estiver correto e o Poiyomi estiver instalado, você **NÃO verá materiais magenta (rosa)**. Configure o avatar usando **VRChat SDK → Show Control Panel → Builder**. Resolva erros com **"Auto Fix"** e faça o upload com **"Build & Publish"**.

> [!TIP]
> Dica Importante
> O VCC simplifica TUDO. Você não precisa mais procurar a versão correta do Unity na internet ou lidar com incompatibilidades. Sempre use o VCC como ponto central para gerenciar seus projetos do VRChat.

---

## Referências

[1] VRChat Inc. (s.d.). *VRChat Creator Companion*. VRChat. https://vrchat.com/home/download

[2] Unity Technologies. (s.d.). *Unity Hub*. Unity. https://unity.com/download

[3] Poiyomi. (s.d.). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader

[4] VRCFury. (s.d.). *VRCFury Documentation*. https://vrcfury.com
