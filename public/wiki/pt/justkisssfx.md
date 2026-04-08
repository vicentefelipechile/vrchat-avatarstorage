# JustKissSFX

<span class="badge">SFX</span> <span class="badge badge-purple">INTERAÇÃO</span> <span class="badge badge-red">ERP</span>

## O que é?

JustKissSFX é um asset de efeitos sonoros (SFX) para VRChat desenvolvido por **NEVER STOP DREAMING** (@vrc_eun). Permite adicionar sons de beijos ao seu avatar, desde beijos normais até beijos profundos (deep kisses), criando uma experiência mais imersiva em interações sociais e ERP.

## Para que serve?

- Adicionar sons de beijos ao seu avatar de VRChat
- Detectar beijos contínuos e reproduzir automaticamente sons de beijo profundo
- Maior imersão em interações sociais e conteúdo para adultos
- Alternativa silenciosa para usuários que não querem usar microfone

## Características principais

| Característica      | Descrição                                    |
| ------------------- | -------------------------------------------- |
| **Sons incluídos**  | 32 efeitos sonoros de beijos                 |
| **Beijos normais**  | 20 tipos diferentes                          |
| **Deep kisses**     | 12 tipos diferentes                          |
| **Voz**             | Não incluída (apenas efeitos sonoros)        |
| **Compatibilidade** | [Modular Avatar](/wiki?topic=modular-avatar) |

### Especificações técnicas

- **Sistema utilizado:** Contact Receiver
- **Parâmetros Sync:** 4 parâmetros (consome 18 de memória)
- **Audio clips:** 32 clips comprimidos com perda
- **Menu:** 1 menu para controle bool
- **Constraint:** 1 constraint

> [!NOTE]
> Requer [Modular Avatar](/wiki?topic=modular-avatar) para a configuração de parâmetros. Não é necessário para instalação manual.

> [!WARNING]
> Os efeitos sonoros não serão reproduzidos se:
>
> - O avatar oposto tiver o head collider desativado
> - Os Contacts estiverem configurados para desabilitar interações
> - A configuração de segurança do VRChat limitar a reprodução de áudio

## Requisitos

- **[Modular Avatar](/wiki?topic=modular-avatar):** 1.11 ou superior
- **VRCSDK:** 3.7.5 ou superior

## Onde obter?

- **BOOTH:** [JustKissSFX](https://booth.pm/ja/items/5534236)

## Como instalar?

1. Adicione o prefab **KissSFX** à hierarquia do seu avatar
2. Posicione o objeto **CenterOfHead**:
   - O gizmo (centro) deve ser colocado na **ponta do nariz** ou entre o nariz e a boca
3. Na configuração do [Modular Avatar](/wiki?topic=modular-avatar), você pode alterar o local onde o menu toggle será instalado

> [!TIP]
> Se você usa um avatar com WD (World Disabled) off, há um pacote específico disponível no BOOTH que inclui prefabs para instalação manual.

---

## Referências

Never Stop Dreaming. (2024). _チュパサウンド JustKissSFX_. BOOTH. Recuperado de https://booth.pm/ja/items/5534236
