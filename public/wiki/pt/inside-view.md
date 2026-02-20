# Inside View

<span class="badge badge-blue">Visual</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## O que é?
**Inside View**, criado por **Liindy** [1], é um asset para avatares do VRChat que permite ver o interior de uma malha (como um orifício SPS), adicionando profundidade visual simulada.

Ao contrário de simplesmente remover a parte traseira das faces da malha (backface culling), Inside View usa um "Screen Shader" que projeta uma textura de profundidade no orifício, criando uma ilusão realista sem precisar modelar uma geometria interna complexa. É comumente usado em conjunto com provedores de [SPS](/wiki?topic=sps) para melhorar a visualização ao fazer ERP.

## Principais Características
- **Profundidade Simulada:** Cria a ilusão de um túnel ou interior detalhado.
- **Otimizado:** Utiliza shaders para evitar o peso de geometria extra.
- **Integração SPS:** Projetado para funcionar com penetrações SPS [3].
- **Fácil Instalação:** Compatível com **VRCFury** para instalação "drag-and-drop".

## Pré-requisitos
- **Unity:** Versão recomendada para VRChat (atualmente 2022.3.22f1 ou similar) [1].
- **VRChat SDK 3.0:** (Avatares) Baixado via VCC [1].
- **VRCFury:** Necessário para instalação automática.
- **Poiyomi Toon Shader:** (Opcional, mas recomendado) Versão 8.1 ou superior para suporte a materiais [2].

## Guia de Instalação

> [!NOTE]
> Este guia pressupõe o uso de **VRCFury**, que é o método oficial recomendado pelo criador.

### Passo 1: Importar
Adquirido o pacote (gratuito ou pago) no Jinxxy ou Gumroad:
1. Abra seu projeto Unity com SDK e VRCFury já instalados.
2. Importe o pacote `.unitypackage` de **Inside View**.

### Passo 2: Colocação (VRCFury)
1. Procure o prefab do Inside View na pasta dos assets (normalmente `Assets/Liindy/Inside View`).
2. Arraste e solte o prefab na hierarquia do seu avatar.
   - **Importante:** Coloque-o como "filho" do osso ou objeto onde o orifício (ou o SPS Socket) está localizado.
3. Certifique-se de que o objeto "Socket" do SPS e o "Inside View" estejam alinhados na mesma posição e rotação.

### Passo 3: Configuração de Profundidade
O asset funciona através de uma animação de profundidade (Depth Animation).
1. Selecione o componente VRCFury no prefab Inside View.
2. Verifique se aponta para o **Renderer** (malha) correto do seu orifício.
3. Ao enviar o avatar para o vrchat, o VRCFury mesclará automaticamente os menus lógicos necessários.

### Notas Adicionais
- **Parameter Cost:** A versão "Full" pode usar até 35 bits de memória de parâmetro, enquanto a versão "Standard" usa cerca de 17. Tenha isso em mente se seu avatar já tiver muitos parâmetros [1].
- **Backface Culling:** Certifique-se de que o material de seu orifício tenha "Cull" definido em "Off" ou "Back", de acordo com as instruções daquele shader, para que o efeito seja visível do ângulo correto.

---

## Referências

[1] Liindy. (s.d.). *Inside View (VRCFury)*. Jinxxy. https://jinxxy.com/Liindy/InsideView

[2] Liindy. (s.d.). *Inside View*. Jinxxy. https://jinxxy.com/Liindy/InsideView
