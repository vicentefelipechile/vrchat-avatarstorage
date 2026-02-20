# Solução de Erros do Unity Hub

Se o Unity Hub não abrir, ficar carregando infinitamente ou você tiver erros de login que não o deixam usar o programa, a solução mais eficaz é fazer uma **reinstalação limpa**.

Veja abaixo como excluir todos os arquivos temporários e configurações corrompidas.

## Método 1: Reinstalação Limpa (Excluir todos os rastros)

Siga estes passos cuidadosamente para garantir que o Unity Hub volte a funcionar:

### 1. Desinstalar Unity Hub
> [!WARNING]
> Aviso
> Para este passo, você deve usar o **desinstalador oficial do Windows** (em *Configurações -> Aplicativos* ou no *Painel de Controle*). **NÃO use programas de terceiros** como IObit Uninstaller, Revo Uninstaller, etc., pois eles podem apagar chaves de registro necessárias e piorar o problema.

- Vá em **Configurações do Windows** -> **Aplicativos**.
- Encontre "Unity Hub" na lista e clique em **Desinstalar**.

### 2. Excluir diretórios residuais
Mesmo após a desinstalação, o Unity deixa pastas de configuração (cache) ocultas em seu sistema. Você deve procurá-las e excluí-las manualmente.

Abra o Explorador de Arquivos do Windows, copie cada um dos seguintes caminhos na barra superior e pressione Enter. **Se a pasta existir, exclua-a completamente:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*(Nota: Você pode copiar e colar o caminho `%USERPROFILE%` diretamente na barra do explorador, da mesma maneira que usaria `%appdata%` para instalar mods no Minecraft, e ele o levará automaticamente à sua pasta de usuário atual).*

### 3. Reinstalar Unity Hub
Quando o sistema estiver completamente limpo de arquivos do Unity:
1. Vá para a [página oficial do Unity](https://unity.com/download) e baixe a versão mais recente do Unity Hub.
2. Execute o instalador e siga as etapas normalmente.
3. Aguarde tudo instalar corretamente, faça o login novamente e confirme se o erro foi corrigido.
