# Guia Essencial NSFW

<span class="badge badge-red">NSFW</span> <span class="badge">TOS</span> <span class="badge">OTIMIZAÇÃO</span>

## Introdução
O VRChat permite grande liberdade criativa, incluindo conteúdo adulto (NSFW) e erótico (ERP). Porém, é **CRUCIAL** entender as regras e as ferramentas adequadas para desfrutar desse conteúdo sem arriscar sua conta ou o desempenho de outras pessoas.

## Regras do VRChat (TOS)
O VRChat tem uma política de tolerância zero com determinado conteúdo em espaços públicos.

- **Mundos Públicos:** É **estritamente proibido** exibir conteúdo sexualmente explícito, nudez ou comportamento erótico em instâncias públicas. Fazer isso pode resultar em um **banimento permanente**.
- **Mundos Privados:** Conteúdo NSFW e ERP são tolerados em instâncias privadas (Friends+, Invite, etc.) onde todos os participantes são adultos e consentiram.
- **Avatares:** Você pode fazer o upload de avatares NSFW, mas **NÃO** deve usar os recursos explícitos deles em público. Use o sistema "Toggles" para manter tudo oculto por padrão.

## Ferramentas Essenciais
Para ter uma experiência completa, estas são as ferramentas padrão que a maioria da comunidade usa:

1.  **VRCFury:** A ferramenta "canivete suíço". Essencial para adicionar Toggles, roupas e sistemas complexos sem quebrar seu avatar.
    *   [Ver guia do VRCFury](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader):** O sistema padrão para interação física (penetração e deformação). É gratuito e muito melhor que o antigo DPS.
    *   [Ver guia do SPS](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB):** O padrão ouro para conectar brinquedos sexuais (Lovense) ao VRChat via vibração háptica.
    *   [Ver guia de Hápticos](/wiki?topic=haptics)

## Otimização e Memória de Texturas
Os avatares NSFW tendem a ser "pesados" devido à grande quantidade de roupas e texturas de pele de alta qualidade.

- **VRAM (Memória de Vídeo):** É o recurso mais escasso. Se o seu avatar usar mais de 150 MB de memória de textura, você fará as pessoas "crasharem" (o jogo delas fechará).
- **Compressão:** Certifique-se sempre de comprimir suas texturas no Unity. Uma textura 4K descompactada ocupa muito espaço.

## Contatos e PhysBones
A interação no VRChat é baseada em **Contatos** (VRCContactReceiver e VRCContactSender).
- **Headpat (Fazer carinho):** Feito pela detecção da mão na cabeça.
- **Interação Sexual:** SPS e OGB usam contatos para detectar quando um objeto entra no outro, acionando animações, sons ou vibrações em seu brinquedo real.
