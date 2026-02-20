# Menu de Ações (Action Menu)

<span class="badge badge-blue">Logic</span> <span class="badge badge-purple">Workflow</span>

## Introdução
O **Menu de Ações** (também conhecido como Expression Menu) é o menu radial que você utiliza dentro do VRChat para ativar animações, trocar de roupa ou modificar parâmetros do seu avatar [1].

Tradicionalmente, os criadores fazem o upload do avatar para o VRChat cada vez que desejam testar uma pequena mudança, o que consome muito tempo. Felizmente, existem ferramentas que permitem simular este menu **diretamente no Unity**, permitindo que você veja como seus toggles e sliders funcionam instantaneamente.

---

## Ferramentas de Simulação

Existem duas ferramentas principais recomendadas pela comunidade e compatíveis com o **VRChat Creator Companion (VCC)**.

### 1. Gesture Manager (por BlackStartx)
É a ferramenta mais popular para visualizar o menu radial tal como ele é visto no jogo. Permite testar gestos, contactos e parâmetros de forma intuitiva.

> [!NOTE]
> Para um guia detalhado sobre como instalá-lo e todas as suas funções, consulte o nosso artigo dedicado: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (por Lyuma)
Esta ferramenta é mais técnica e potente, ideal para depurar a lógica complexa por trás do avatar.

*   **Instalção:** Disponível no VCC ou via GitHub. Frequentemente é instalado automaticamente com ferramentas como [VRCFury](/wiki?topic=vrcfury) [3].
*   **Como usar:**
    1.  Vá em `Tools` > `Avatar 3.0 Emulator`.
    2.  Ao entrar em **Play Mode**, será gerado um painel de controle.
    3.  Permite forçar valores de [parâmetros](/wiki?topic=parameter) e ver em tempo real qual camada do Animator está sendo reproduzida.

---

## Qual devo usar?

| Característica | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Interface Visual** | Excelente (Radial) | Básica (Botones/Sliders) |
| **Teste de Menus** | Sim | Limitado |
| **Debug de Lógica** | Básico | Avançado |
| **Teste de Gestos** | Fácil (Botões) | Manual (Animator) |

**Recomendação:** Use o **Gesture Manager** para a maioria dos seus testes de toggles e roupas. Use o **Av3 Emulator** se as suas animações não estiverem sendo ativadas quando deveriam e você precisar ver o que está acontecendo "por baixo do capô".

---

## Build & Test (A alternativa oficial)
Se você precisar testar algo que requer a rede ou interações com outros (como [PhysBones](/wiki?topic=parameter)), use la función **Build & Test** do SDK oficial [1]:
1.  Abra o `VRChat SDK Control Panel`.
2.  Na aba `Builder`, procure a seção "Offline Testing".
3.  Clique em `Build & Test`.
4.  O Unity compilará o avatar e abrirá uma instância local do VRChat onde apenas você poderá vê-lo sem o ter enviado para os servidores.

---

## Referências

[1] VRChat. (s.f.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[2] BlackStartx. (s.f.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[3] Lyuma. (s.f.). *Av3Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
