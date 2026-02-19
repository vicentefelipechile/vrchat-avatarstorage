# Parametros del Avatar (Expression Parameters)

<span class="badge badge-blue">Logic</span> <span class="badge badge-yellow">Optimization</span>

## ¿Qué son?
Los **Expression Parameters** (o simplemente parámetros) son variables que sirven como "memoria" para tu avatar de VRChat [1]. Actúan de puente entre el **Menú de Expresiones** (el menú radial en juego) y el **Animator Controller** (la lógica que hace que las animaciones se reproduzcan).

Cuando seleccionas una opción en tu menú (ej. "Quitar camisa"), el menú cambia el valor de un parámetro (ej. `Camisa = 0`), y el Animator lee ese cambio para ejecutar la animación correspondiente.

## Tipos de Parámetros
Existen tres tipos principales de datos que puedes usar, cada uno con un costo de memoria diferente [2]:

| Tipo | Descripción | Costo de Memoria | Uso Común |
| :--- | :--- | :--- | :--- |
| **Bool** | Verdadero o Falso (On/Off). | 1 bit | Toggles simples (ropa, objetos). |
| **Int** | Números enteros (0 a 255). | 8 bits | Cambios de vestuario con múltiples opciones, sliders por pasos. |
| **Float**| Números decimales (0.0 a 1.0). | 8 bits | Sliders continuos (grosor, tonalidad, radial puppet). |

## Límite de Memoria (Synced Bits)
VRChat impone un límite estricto de **256 bits** de datos sincronizados por avatar [2].
- **Sincronizados (Synced):** Son parámetros cuyo valor se envía a otros jugadores a través de la red. Si te quitas la camisa, quieres que los demás lo vean.
- **No Sincronizados (Local):** Parámetros que solo existen en tu PC. Útiles para lógica interna que no necesita ser vista por otros.

> [!WARNING]
> Si excedes el límite de memoria, no podrás subir el avatar o los parámetros extra dejarán de funcionar. Optimiza usando `Bool` en lugar de `Int` cuando sea posible.

## Usos Avanzados
Además de controlar la ropa desde el menú, los parámetros pueden ser controlados por:
- **PhysBones:** Para detectar si alguien te toca una oreja o el cabello [3].
- **Contacts:** Para detectar colisiones (como en sistemas [SPS](/wiki?topic=sps) o [PCS](/wiki?topic=pcs)).
- **OSC:** Para recibir datos de programas externos (como medidores de ritmo cardíaco, seguimiento facial o Spotify) [3].

## Cómo se Crean
1. En tu proyecto de Unity, haz clic derecho en `Assets`.
2. Ve a `Create` > `VRChat` > `Avatars` > `Expression Parameters`.
3. Añade los parámetros que necesites (ej. "Outfit", "Sword", "HueShift").
4. Asigna este archivo en el componente **VRC Avatar Descriptor** de tu avatar, en la sección "Expressions".

## Limitaciones y Problemas Comunes

### ¿Por qué existe un límite de 256 bits?
VRChat impone este límite principalmente por **optimización de red** [1]. Cada parámetro sincronizado debe enviarse a todos los demás jugadores de la instancia. Si no existiera un límite:
- El ancho de banda necesario para actualizar la posición y estado de 80 jugadores sería insostenible.
- Los usuarios con conexiones lentas sufrirían de lag extremo o desconexiones.
- El rendimiento general (FPS) caería debido al procesamiento excesivo de datos de red.

### Conflictos con Assets Complejos (GoGo Loco, SPS, Bailes)
Al combinar múltiples sistemas "pesados" en un solo avatar, surgen problemas frecuentes:

1.  **Agotamiento de Parámetros (Parameter Exhaustion):**
    Assets como **GoGo Loco** consumen una cantidad considerable de memoria. Si intentas añadir SPS, un sistema de bailes complejos y toggles de ropa, es muy fácil superar los 256 bits sincronizados.
    *   *Consecuencia:* VRChat bloqueará la subida del avatar o los últimos componentes instalados no funcionarán.

2.  **Conflictos de Lógica:**
    *   **GoGo Loco:** Puede causar que el avatar se "hunda" en el suelo o flote si hay conflictos con las capas de locomoción base o versiones antiguas del asset [4].
    *   **SPS (Super Plug Shader):** Combinar SPS con Constraints puede causar "jitter" (temblores rápidos) en los puntos de contacto debido a cómo VRChat maneja las actualizaciones de física y haptics [5].

3.  **Rendimiento (Performance Rank):**
    *   **SPS:** A menudo requiere luces adicionales o renderers que pueden degradar el ranking de rendimiento del avatar a "Very Poor" inmediatamente.
    *   **GoGo Loco:** Añade múltiples capas al Animator Controller. Aunque no afecta tanto a los gráficos, incrementa el uso de la CPU para procesar la lógica de animación [4].

> [!TIP]
> Herramientas como **VRCFury** son esenciales para gestionar estos conflictos. VRCFury automatiza la fusión de controladores y parámetros ("Non-Destructive Workflow"), reduciendo errores humanos y optimizando el uso de memoria cuando es posible.

## Optimización y Trucos: Cómo reducir el uso de bits

Para evitar llegar al límite de 256 bits sin sacrificar funciones, los creadores utilizan varias técnicas inteligentes. La más común es **combinar estados mutuamente exclusivos**.

#### El Truco del "Int Único" (Single Int)
Imagina que tienes 10 camisetas diferentes para tu avatar.
*   **Forma Ineficiente (Bools):** Creas 10 parámetros `Bool` (Camisa1, Camisa2... Camisa10).
    *   *Costo:* 10 Bits.
    *   *Desventaja:* Gastas 1 bit por cada prenda extra.
*   **Forma Eficiente (Int):** Creas **1** solo parámetro `Int` llamado `Ropa_Superior`.
    *   *Costo:* 8 Bits (siempre, ya que es un Int).
    *   *Ventaja:* ¡Puedes tener hasta **255 camisetas** usando los mismos 8 bits!
    *   *Cómo funciona:* En el Animator, configuras que si el valor es 1 se active la Camisa A, si es 2 la Camisa B, etc.

> [!NOTE]
> **Regla de oro:** Si tienes más de 8 opciones que no se pueden usar a la vez (ej. tipos de ropa, colores de ojos), usa un `Int`. Si son menos de 8, usa `Bool`s individuales.

#### Ejemplo Básico de Configuración
Si quieres crear un selector de colores para tu ropa:
1.  Crea un parámetro **Int** llamado `ColorBoots`.
2.  En tu **Expression Menu**, crea un sub-menú o un control tipo "Radial Puppet" (aunque para cambios exactos es mejor usar botones que seteen valores exactos).
3.  Configura los botones del menú:
    *   Botón "Rojo" -> Sets `ColorBoots` to 1.
    *   Botón "Azul" -> Sets `ColorBoots` to 2.
    *   Botón "Negro" -> Sets `ColorBoots` to 3.
4.  En el **Animator (FX Layer)**:
    *   Crea transiciones desde `Any State` a los estados de color.
    *   Condición para Rojo: `ColorBoots` equals 1.
    *   Condición para Azul: `ColorBoots` equals 2.

¡Así controlas múltiples opciones gastando solo 8 bits de tu presupuesto total!

## Tabla Resumen: ¿Qué tipo usar?

| Caso de Uso | Tipo Recomendado | ¿Por qué? |
| :--- | :--- | :--- |
| **Activar/Desactivar 1 objeto** (Gafas, sombrero) | `Bool` | Simple y directo. Gastas 1 bit. |
| **Selector de Ropa** (Camisa A, B, C...) | `Int` | Permite cientos de opciones gastando solo 8 bits. |
| **Cambios Graduales** (Grosor, Color, Brillo) | `Float` | Necesario para valores decimales (0.0 a 1.0). |
| **Estados complejos** (Bailes, AFK, Emotes) | `Int` | Ideal para máquinas de estado con múltiples condiciones. |
| **Toggles independientes** (< 8 objetos) | `Bool` | Si son pocos y no se anulan entre sí, es más fácil de configurar. |

---

## Referencias

[1] VRChat. (s.f.). *Expression Parameters*. VRChat Documentation. https://creators.vrchat.com/avatars/animator-parameters/#expression-parameters-asset

[2] VRChat. (s.f.). *Avatar Parameter Driver*. VRChat Documentation. https://creators.vrchat.com/avatars/state-behaviors/#avatar-parameter-driver

[3] VRChat. (s.f.). *OSC Overview*. VRChat Documentation. https://creators.vrchat.com/avatars/osc/

[4] Franada. (s.f.). *GoGo Loco Documentation*. https://github.com/Franada/goloco

[5] VRCFury. (s.f.). *SPS - Super Plug Shader*. VRCFury Documentation. https://vrcfury.com/sps
