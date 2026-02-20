# Gesture Manager Emulator

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## O que é o Gesture Manager?
O **Gesture Manager**, desenvolvido por **BlackStartx**, é uma ferramenta essencial para criadores de avatares do VRChat. Permite pré-visualizar e editar as animações, gestos e menus de um avatar diretamente dentro do Unity, eliminando a necessidade de fazer o upload do avatar para o jogo para testar cada mudança [1].

Simula quase por completo o sistema de animação do VRChat, incluindo o **Menu Radial (Expressions Menu)**, o que permite verificar que os seus toggles e sliders funcionam corretamente de forma instantânea.

---

## Instalação

Existem dois métodos principais para instalar esta ferramenta no seu projeto.

### Método 1: VRChat Creator Companion (Recomendado)
É a forma mais simples e garante que você tenha sempre a versão mais recente compatível com o seu projeto [2].
1. Abra o **VRChat Creator Companion (VCC)**.
2. Selecione o seu projeto.
3. Certifique-se de que os pacotes "Curated" não estão filtrados.
4. Procure por **"Gesture Manager"** e clique no botão **"Add"**.
5. Abra o seu projeto de Unity.

### Método 2: Manual (Unity Package)
Se você não usa o VCC ou precisa de uma versão específica:
1. Descarregue o arquivo `.unitypackage` a partir da seção de *Releases* no GitHub de BlackStartx ou da sua página no BOOTH [3].
2. Importe o pacote para o seu projeto de Unity (`Assets > Import Package > Custom Package`).

---

## Características Principais

*   **Menu Radial 3.0:** Recria fielmente o menu de expressões do VRChat.
*   **Emulação de Gestos:** Permite testar os gestos de mão esquerda e direita através de botões no inspector.
*   **Câmara de Cena Ativa:** Sincroniza a câmara do jogo com a da cena para facilitar os testes de PhysBones e Contactos.
*   **Teste de Contactos:** Permite ativar *VRCContacts* clicando sobre eles com o rato.
*   **Depuração de Parâmetros:** Mostra uma lista de todos os parâmetros do avatar e os seus valores atuais.

---

## Como utilizá-lo

1.  Uma vez instalado, vá à barra superior e selecione `Tools > Gesture Manager Emulator`.
2.  Isto adicionará um objeto chamado `GestureManager` à sua hierarquia.
3.  Entre em **Play Mode** no Unity.
4.  Selecione o objeto `GestureManager` na hierarquia.
5.  Na janela do **Inspector**, você verá o menu radial e todos os controles para testar o seu avatar.

> [!IMPORTANT]
> Deve ter selecionado o objeto `GestureManager` para ver os controles no inspector enquanto o Unity está em execução.

---

## Referências

[1] BlackStartx. (s.f.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[2] VRChat. (s.f.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[3] VRChat. (s.f.). *VCC Documentation*. VRChat Creator Companion. https://vcc.docs.vrchat.com

[4] BlackStartx. (s.f.). *Gesture Manager*. Booth. https://blackstartx.booth.pm/items/3922472
