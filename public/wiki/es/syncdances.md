# SyncDances

<span class="badge">HERRAMIENTA</span>

## ¿Qué es?

SyncDances es un prefab de Unity para VRChat que permite a los avatares bailando en perfecta sincronización. Cuando un jugador inicia un baile, todos los que tienen el sistema instalado comienzan a bailar al mismo tiempo.

> [!NOTE]
> SyncDances fue inspirado en el prefab [CuteDancer](https://github.com/Krysiek/CuteDancer).

## ¿Para qué sirve?

- Bailes sincronizados entre múltiples jugadores en VRChat
- Sistema emisor-receptor donde uno controla y los demás siguen
- Control de velocidad de los bailes (sincronizado)
- 24 slots para bailes personalizados

## Características principales

| Característica               | Descripción                                               |
| ---------------------------- | --------------------------------------------------------- |
| **Sincronización**           | Todos los jugadores con el sistema bailan al mismo tiempo |
| **Control de velocidad**     | Puedes acelerar, ralentizar o congelar los bailes         |
| **Slots personalizados**     | 24 espacios para añadir tus propios bailes                |
| **Compatibilidad con Quest** | Funciona en Quest (pero no recomendado)                   |
| **Múltiples versiones**      | Disponible para VRCFury y Modular Avatar                  |

## Versiones disponibles

| Versión         | Precio   | Descripción                    |
| --------------- | -------- | ------------------------------ |
| **Original**    | 600 JPY  | Archivos originales            |
| **Con soporte** | 1000 JPY | Archivos + soporte del creador |
| **DLC**         | 350 JPY~ | Contenido adicional            |

## Requisitos

- **VRCFury** instalado en el proyecto (recomendado)
- Opcional: **Modular Avatar** para instalación automática

## Instalación

### Método con VRCFury (Recomendado)

1. Descarga el archivo `SyncDancesPrefab PC (VRCFURY)` del paquete
2. Arrastra y suelta el prefab sobre tu avatar en Unity
3. ¡Listo! El avatar estará listo para subir

> [!IMPORTANT]
> No instales los archivos deitems individualmente - solo el prefab principal.

### Versión Modular Avatar

Si prefieres usar Modular Avatar en lugar de VRCFury:

- Busca la versión específica en: [SyncDances Modular Avatar](https://booth.pm/en/items/6311129)

## Cómo usar

1. Instala el prefab en tu avatar
2. Usa el menú de VRChat para seleccionar un baile
3. Si eres el "emisor", los demás ("receptores") bailarán sincronizados

### Sistema emisor-receptor

- **Un jugador actúa como antena (emisor)** - controla qué baile se reproduce
- **Los demás son receptores** - reciben la señal y bailan sincronizados

> [!TIP]
> Para aumentar el rango de transmisión, une todos los emisores y receptores. ¡Pero cuidado! Esto puede causar crashes debido a un bug de VRChat.

## Bailes incluidos

SyncDances incluye múltiples bailes preconfigurados. Algunos de los creadores reconocidos incluyen:

| Baile      | Creador    |
| ---------- | ---------- |
| El bicho   | THEDAO77   |
| Chainsaw   | THEDAO77   |
| Ankha      | THEDAO77   |
| Sad Cat    | Evendora   |
| Crisscross | (Rat meme) |
| PUBG       | Toca Toca  |

> [!NOTE]
> Más de la mitad de los bailes fueron encontrados aleatoriamente en internet. Si creaste alguno de los bailes incluidos, contacta al creador para darte crédito.

## Control de velocidad

A partir de la versión 4.0, SyncDances incluye control de velocidad:

- **0%**: Congelado
- **100%**: Velocidad normal
- **Más de 100%**: Baile acelerado

> [!WARNING]
> El control de velocidad NO funciona con personas usando SyncDances 3.1 o anterior. They will do the dances at default speed instead.

## Parámetros y rendimiento

| Aspecto                          | PC      | Quest    |
| -------------------------------- | ------- | -------- |
| **Contactos**                    | 16      | 12       |
| **Audio sources**                | 1       | 0 (lite) |
| **Bits de parámetros (speed)**   | 18 bits | N/A      |
| **Bits de parámetros (default)** | 10 bits | N/A      |

## Actualizaciones

### Versión 4.5

- Compatibilidad hacia atrás mejorada (2.x y 3.x sincronizan correctamente)
- Fixed custom emote 2 y custom emote 21
- 16 nuevos slots para emotes personalizados (ahora 24 en total)

### Versión 4.2

- Menús personalizados corregidos
- Compatibilidad con Modular Avatar corregida
- Menus para Custom 9-17 y 18-24 añadidos

### Versión 3.1

- Contactos reducidos de 114 a solo 16
- Audio sources reducidos de 32 a 1
- Añadidos 15 nuevos bailes y 8 slots para personalizados

## Errores comunes

### Los jugadores no se sincronizan

- Verifica que todos tengan la misma versión de SyncDances
- Asegúrate de que el emisor esté dentro del rango
- Players usando 3.1 no pueden controlar la velocidad

### El avatar se congela

- Puede ser por incompatibilidad de versiones
- Verifica que el prefab esté correctamente instalado

### Los emotes personalizados no funcionan

- Verifica que estés usando el slot correcto
- Algunos emotes requieren VRCFury instalado

## Diferencia con OpenSyncDance

| Característica           | SyncDances            | OpenSyncDance |
| ------------------------ | --------------------- | ------------- |
| **Precio**               | Pagado (600-1000 JPY) | Gratis        |
| **Código**               | Cerrado               | Open Source   |
| **Control de velocidad** | Si                    | No            |
| **Desarrollo**           | Activo                | Activo        |
| **Soporte**              | Discord del creador   | Comunidad     |

## Recursos adicionales

- **Compra:** [BOOTH - SyncDances 4.5](https://booth.pm/en/items/4881102)
- **SyncDances Modular Avatar:** [BOOTH](https://booth.pm/en/items/6311129)
- **DLC:** [BOOTH](https://booth.pm/en/items/7423127)
- **Discord:** Kinimara (creador)

---

## Referencias

Kinimara. (2025). _SyncDances 4.5_. BOOTH. https://booth.pm/en/items/4881102

Krysiek. (2022). _CuteDancer_. GitHub. https://github.com/Krysiek/CuteDancer
