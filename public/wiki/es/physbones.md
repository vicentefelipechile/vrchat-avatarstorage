# PhysBones

<span class="badge badge-blue">DEPENDENCIA</span>

## ¿Qué es?

PhysBones es un conjunto de componentes integrados en el SDK de VRChat que permite agregar movimiento secundario (física) a objetos en avatares y mundos. Con PhysBones puedes añadir movimiento a cabello, colas, orejas, ropa, cables, plantas y más. Usarlos correctamente hace que tus avatares se vean más dinámicos y realistas.

> [!NOTE]
> PhysBones es el **reemplazo oficial** de Dynamic Bones en VRChat. Aunque Dynamic Bones todavía funciona en avatares existentes (se convierte automáticamente), todos los creadores deberían usar PhysBones para avatares nuevos.

## ¿Para qué sirve?

- Agregar física a cabello, colas, orejas y ropa
- Permitir que otros jugadores interactúen con elementos de tu avatar (agarrar, posar)
- Crear movimiento secundario dinámico y realista
- Sustituto del componente Cloth de Unity para telas simples

## Componentes principales

PhysBones está formado por tres componentes que trabajan juntos:

| Componente              | Descripción                                                                     |
| ----------------------- | ------------------------------------------------------------------------------- |
| **VRCPhysBone**         | Componente principal que define la cadena de huesos que será animada con física |
| **VRCPhysBoneCollider** | Define colliders que afectan a los PhysBones (cabeza, torso, manos, etc.)       |
| **VRCPhysBoneRoot**     | Opcional. Define el movimiento raíz para múltiples PhysBones (solo mundos)      |

## Configuración detallada

### Versiones

Puedes seleccionar la versión del componente VRCPhysBone directamente en el inspector. Por defecto se usa la última versión disponible.

**Versión 1.0:**

- Versión base del componente PhysBone

**Versión 1.1 (Squishy Bones):**

- Permite que los huesos se compriman y estiren
- La gravedad ahora actúa como una proporción de cuánto rotarán los huesos en reposo
- Se requiere un Pull positivo para que los huesos se muevan en dirección de la gravedad

### Transforms

| Configuración               | Descripción                                                                           |
| --------------------------- | ------------------------------------------------------------------------------------- |
| **Root Transform**          | El transform donde comienza el componente. Si está vacío, comienza en este GameObject |
| **Ignore Transforms**       | Lista de transforms que no deben ser afectados por el componente                      |
| **Ignore Other Phys Bones** | Si está activado, el PhysBone ignora otros PhysBones en la jerarquía                  |
| **Endpoint Position**       | Vector para crear huesos adicionales en el endpoint de la cadena                      |
| **Multi-Child Type**        | Comportamiento del hueso raíz cuando existen múltiples cadenas                        |

> [!CAUTION]
> Si usas un solo hueso raíz o un raíz con varios hijos (sin nietos), ¡DEBES definir un Endpoint Position! Esto es diferente a Dynamic Bones.

### Forces (Fuerzas)

**Integration Type (Tipo de Integración):**

- **Simplified**: Más estable, más fácil de configurar, menos reactivo a fuerzas externas
- **Advanced**: Menos estable, permite configuraciones más complejas, más reactivo a fuerzas

Parámetros disponibles:

- **Pull**: Fuerza para volver los huesos a su posición de descanso
- **Spring** (Simplified) / **Momentum** (Advanced): Cantidad de oscilación al intentar alcanzar la posición de descanso
- **Stiffness** (Solo Advanced): Cantidad de esfuerzo para mantenerse en la posición de descanso
- **Gravity**: Cantidad de gravedad aplicada. Valor positivo tira hacia abajo, negativo hacia arriba
- **Gravity Falloff**: Controla cuánta gravedad se remueve en la posición de descanso (1.0 = sin gravedad en reposo)

> [!TIP]
> Si tu cabello está modelado en la posición que quieres cuando está de pie normalmente, usa Gravity Falloff en 1.0. Así la gravedad no afectará cuando estés quieto.

### Limits (Límites)

Los límites permiten restringir cuánto puede moverse una cadena de PhysBones. Son muy útiles para evitar que el cabello haga clip con la cabeza, y son **mucho más performantes** que los colliders.

| Tipo      | Descripción                                                       |
| --------- | ----------------------------------------------------------------- |
| **None**  | Sin límites                                                       |
| **Angle** | Limita a un ángulo máximo desde un eje. Se visualiza como un cono |
| **Hinge** | Limita a lo largo de un plano. Similar a una tajada de pizza      |
| **Polar** | Combina Hinge con Yaw. Más complejo, usar con moderación          |

> [!WARNING]
> No abuses de los límites Polar. Usar más de 64 puede causar problemas de rendimiento.

### Collision (Colisiones)

| Configuración       | Descripción                                                                             |
| ------------------- | --------------------------------------------------------------------------------------- |
| **Radius**          | Radio de colisión alrededor de cada hueso (en metros)                                   |
| **Allow Collision** | Permite colisión con colliders globales (manos de otros jugadores, colliders del mundo) |
| **Colliders**       | Lista de colliders específicos con los que collide este PhysBone                        |

**Opciones de Allow Collision:**

- **True**: Colisiona con colliders globales
- **False**: Solo collide con los colliders listados
- **Other**: Opciones avanzadas para filtrar por tipo (avatar, mundo, item)

### Stretch & Squish (Solo v1.1)

| Configuración      | Descripción                                                                |
| ------------------ | -------------------------------------------------------------------------- |
| **Stretch Motion** | Cantidad de movimiento que afecta el estiramiento/compresión de los huesos |
| **Max Stretch**    | Máximo estiramiento permitido (múltiplo de la longitud original)           |
| **Max Squish**     | Máximo encogimiento permitido (múltiplo de la longitud original)           |

### Grab & Pose (Agarre y Pose)

| Configuración      | Descripción                                                                              |
| ------------------ | ---------------------------------------------------------------------------------------- |
| **Allow Grabbing** | Permite que los jugadores agarren los huesos                                             |
| **Allow Posing**   | Permite que los jugadores hagan pose después de agarrar                                  |
| **Grab Movement**  | Controla cómo se mueven los huesos al ser agarrados (0 = usa pull/spring, 1 = inmediato) |
| **Snap To Hand**   | El hueso se ajusta automáticamente a la mano que lo agarra                               |

## Casos de uso prácticos

### Ejemplo 1: Cabello largo

1. Selecciona el hueso raíz del cabello (normalmente en el cuello o cabeza)
2. Añade el componente **VRCPhysBone**
3. Configura:
   - **Root Transform**: Hueso raíz del cabello
   - **Ignore Transforms**: Ojos y cualquier hueso que no deba moverse
   - **Multi-Child Type**: Ignore (así todos los huesos del cabello se afectan con un solo componente)
   - **Pull**: 0.3 - 0.5
   - **Gravity**: 0.5 - 1.0
   - **Gravity Falloff**: 0.5 - 0.8 (ajusta según cómo quieras que caiga en reposo)
   - **Radius**: 0.05 - 0.1
4. Añade **Limits** tipo Angle para evitar que el cabello haga clip con la cabeza

> [!TIP]
> Para cabello muy largo, considera dividirlo en múltiples componentes PhysBone (uno para cada sección) para mejor rendimiento.

### Ejemplo 2: Cola de animal

1. Selecciona el hueso base de la cola
2. Añade el componente **VRCPhysBone**
3. Configura:
   - **Root Transform**: Hueso base de la cola
   - **Integration Type**: Advanced
   - **Pull**: 0.2 - 0.4
   - **Spring/Momentum**: 0.5 - 0.7
   - **Stiffness**: 0.1 - 0.3
   - **Gravity**: 0.3 - 0.6
4. Usa límites **Hinge** para limitar el movimiento lateral

### Ejemplo 3: Falda o capa

1. Asegúrate de que la ropa tenga su propio armature separado del avatar
2. Selecciona el hueso raíz de la falda/capa
3. Añade el componente **VRCPhysBone**
4. Configura:
   - **Pull**: 0.1 - 0.3 (más suave para telas)
   - **Gravity**: 0.8 - 1.0
   - **Gravity Falloff**: 0.3 - 0.5
   - **Radius**: 0.05
5. Añade **VRCPhysBoneCollider** en el torso del avatar
6. En el componente PhysBone, en **Colliders**, añade el collider del torso

> [!NOTE]
> Para faldas muy largas o capas completas, considera usar el componente Cloth de Unity en lugar de PhysBones, ya que está optimizado para este tipo de tela.

### Ejemplo 4: Pechos/Senos (Easter egg)

En la comunidad, PhysBones también se usa comúnmente para agregar movimiento a pechos.

Configuración típica:

- **Root Transform**: Hueso en el pecho (Chest o UpperChest)
- **Pull**: 0.3 - 0.5
- **Gravity**: 0.8 - 1.2
- **Radius**: 0.1 - 0.15
- **Ignore Transforms**: Neck, Shoulders

## Dynamic Bones vs PhysBones

VRChat convierte automáticamente los componentes Dynamic Bones a PhysBones al cargar el avatar. Sin embargo, esta conversión no es perfecta.

**Diferencias principales:**

- Dynamic Bones usa el modo Advanced por defecto en la conversión
- Algunas configuraciones de Dynamic Bones no tienen equivalente en PhysBones
- La conversión automática usa "Ignore" para Multi-Child Type

**Conversión manual:**
Puedes convertir manualmente tus avatares usando VRChat SDK → Utilities → Convert DynamicBones to PhysBones.

> [!WARNING]
> Haz una copia de seguridad de tu avatar antes de convertir, ya que el proceso no es reversible.

## Límites y rendimiento

| Plataforma     | Límite                                                           |
| -------------- | ---------------------------------------------------------------- |
| **PC**         | ~256 transforms por componente                                   |
| **Meta Quest** | Límite más bajo (consultar documentación de Performance Ranking) |

**Consejos de optimización:**

- No tengas más de 256 transforms por componente PhysBone
- Si tienes más de 128 transforms, considera dividir en múltiples componentes
- Usa **Limits** en lugar de colliders cuando sea posible
- No uses huesos humanoides (Hip, Spine, Chest, Neck, Head) como raíz de PhysBones

> [!IMPORTANT]
> PhysBones tiene un límite hard en Meta Quest. Consulta los límites de "Very Poor" en el sistema de Performance Ranking.

## Errores comunes

### El PhysBone no se mueve

- Verifica que el Root Transform esté correctamente asignado
- Asegúrate de que no esté en "Ignore" en Multi-Child Type
- Verifica que el valor de Pull no sea 0

### El PhysBone hace clip con el cuerpo

- Añade límites (Limits) al componente
- Añade colliders al avatar y configúralos en el PhysBone
- Aumenta el valor de Pull

### Los huesos no alcanzan la posición de reposo

- Aumenta el valor de Pull
- Ajusta Spring/Momentum según el tipo de integración

### Los huesos atraviesan el cuerpo

- Añade VRCPhysBoneCollider al avatar
- Configura el collider en la lista de Colliders del PhysBone
- Verifica que el Radius sea apropiado

## ¿Dónde aprender más?

- **Documentación oficial:** [VRChat PhysBones](https://creators.vrchat.com/common-components/physbones/)
- **SDK de ejemplo:** VRChat SDK → Samples → Avatar Dynamics Robot Avatar
- **Comunidad:** [VRChat Discord](https://discord.gg/vrchat) - Ask Forum

---

## Referencias

VRChat. (2025). _PhysBones_. VRChat Creators. https://creators.vrchat.com/common-components/physbones/

VRChat. (2025). _VRCPhysBoneCollider_. VRChat Creators. https://creators.vrchat.com/common-components/physbones/#vrcphysbonecollider
