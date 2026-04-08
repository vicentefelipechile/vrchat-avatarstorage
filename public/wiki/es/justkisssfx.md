# JustKissSFX

<span class="badge">SFX</span> <span class="badge badge-purple">INTERACCIÓN</span> <span class="badge badge-red">ERP</span>

## ¿Qué es?

JustKissSFX es un asset de efectos de sonido (SFX) para VRChat desarrollado por **NEVER STOP DREAMING** (@vrc_eun). Permite añadir sonidos de besos a tu avatar, desde besos normales hasta besos profundos (deep kisses), creando una experiencia más inmersiva en interacciones sociales y ERP.

## ¿Para qué sirve?

- Añadir sonidos de besos a tu avatar de VRChat
- Detectar besos continuos y reproducir automáticamente sonidos de beso profundo
- Mayor inmersión en interacciones sociales y contenido para adultos
- Alternativa silenciosa para usuarios que no quieren usar micrófono

## Características principales

| Característica        | Descripción                                  |
| --------------------- | -------------------------------------------- |
| **Sonidos incluidos** | 32 efectos de sonido de besos                |
| **Besos normales**    | 20 tipos diferentes                          |
| **Deep kisses**       | 12 tipos diferentes                          |
| **Voz**               | No incluida (solo efectos de sonido)         |
| **Compatibilidad**    | [Modular Avatar](/wiki?topic=modular-avatar) |

### Especificaciones técnicas

- **Sistema utilizado:** Contact Receiver
- **Parámetros Sync:** 4 parámetros (consume 18 de memoria)
- **Audio clips:** 32 clips comprimidos con pérdida
- **Menú:** 1 menú para control bool
- **Constraint:** 1 constraint

> [!NOTE]
> Requiere [Modular Avatar](/wiki?topic=modular-avatar) para la configuración de parámetros. No es necesario para instalación manual.

> [!WARNING]
> Los efectos de sonido no se reproducirán si:
>
> - El avatar contrario tiene el head collider desactivado
> - Los Contact están configurados para deshabilitar interacciones
> - La configuración de seguridad de VRChat limita la reproducción de audio

## Requisitos

- **[Modular Avatar](/wiki?topic=modular-avatar):** 1.11 o superior
- **VRCSDK:** 3.7.5 o superior

## ¿Dónde obtenerlo?

- **BOOTH:** [JustKissSFX](https://booth.pm/ja/items/5534236)

## ¿Cómo instalarlo?

1. Añade el prefab **KissSFX** a la jerarquía de tu avatar
2. Posiciona el objeto **CenterOfHead**:
   - El gizmo (centro) debe colocarse en la **punta de la nariz** o entre la nariz y la boca
3. En la configuración de [Modular Avatar](/wiki?topic=modular-avatar), puedes cambiar la ubicación donde se instalará el menú toggle

> [!TIP]
> Si usas un avatar con WD (World Disabled) off, hay un paquete específico disponible en BOOTH que incluye prefabs para instalación manual.

---

## Referencias

Never Stop Dreaming. (2024). _チュパサウンド JustKissSFX_. BOOTH. https://booth.pm/ja/items/5534236
