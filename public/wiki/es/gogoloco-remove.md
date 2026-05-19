# Eliminar GoGo Loco de un Proyecto de Unity

<span class="badge badge-blue">Logic</span>

## ¿Qué es?

GoGo Loco es un prefab de locomoción creado por Franada que reemplaza o modifica varias de las Playable Layers del Avatar Descriptor (Base/Locomotion, Additive, Gesture) e inyecta sus propios parámetros y entradas en el Expression Menu del avatar. Debido a que toca tantas partes interconectadas de un proyecto de avatar, eliminarlo por completo requiere trabajar a través de varias capas — desde objetos de la escena hasta assets a nivel de proyecto y, cuando corresponda, el manifiesto VPM.

> [!WARNING]
> Siempre haz una copia de seguridad de tu proyecto de Unity (o confirma en el control de versiones) antes de comenzar este proceso. Muchos de estos pasos eliminan o sobrescriben Animator Controllers y assets de Expression que pueden ser compartidos con otras partes de tu avatar.

## ¿Para qué sirve?

- Reemplazar GoGo Loco con un sistema de locomoción diferente (ej., locomoción de Modular Avatar, Locomotion Fix de WetCat, o los controladores predeterminados de VRChat).
- Limpiar un avatar comprado que venía con GoGo Loco preinstalado y no lo deseas.
- Resolver conflictos con NSFW Locomotion u otros paquetes que comparten las capas y nombres de parámetros de GoGo Loco.
- Reducir el uso de memoria de parámetros (GoGo Loco consume de 16 a 17 bits de memoria sincronizada por defecto).

## Paso 1: Eliminar el Prefab de la Escena

GoGo Loco puede estar instalado como un GameObject hijo en la raíz del avatar, especialmente cuando se configura a través de VRCFury o Modular Avatar.

1. Abre la escena que contiene tu avatar en la ventana **Hierarchy**.
2. Expande el GameObject raíz del avatar.
3. Busca cualquier objeto hijo llamado `GoGo Loco`, `GGL`, `GoGoLoco` o similar. Selecciónalo y presiona **Delete**.
4. Si GoGo Loco fue instalado a través de [VRCFury](/wiki?topic=vrcfury), busca un objeto hijo con un componente `VRCFury` que referencie un prefab de GoGo Loco — elimina ese objeto también.
5. Si fue instalado a través de [Modular Avatar](/wiki?topic=modular-avatar), busca un objeto hijo con un componente `MA Merge Animator` o `MA Menu Installer` apuntando a assets de GoGo Loco y elimínalo.

> [!NOTE]
> Si el avatar fue comprado y GoGo Loco venía integrado (es decir, no existe un GameObject hijo separado), omite este paso y procede directamente al Paso 2.

## Paso 2: Restaurar las Playable Layers del Avatar Descriptor

GoGo Loco reemplaza hasta tres de las cinco Playable Layers en el componente `VRCAvatarDescriptor`. Necesitas reasignar cada una de ellas a los controladores predeterminados de VRChat o a tus propios controladores personalizados.

1. Selecciona la raíz del avatar en Hierarchy y localiza el componente **VRC Avatar Descriptor** en el Inspector.
2. Expande la sección **Playable Layers**.
3. Para cada una de las siguientes capas, verifica si actualmente tiene asignado un controlador de GoGo Loco (los nombres de archivo comenzarán con `go_` o contendrán `GoGoLoco/GGL`):

| Capa | Nombre del archivo de GoGo Loco (aproximado) | Reemplazo predeterminado |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (de ejemplos del VRCSDK) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (de ejemplos del VRCSDK) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (de ejemplos del VRCSDK) |

4. Para cada capa afectada, haz clic en el pequeño círculo a la derecha del campo y asigna el controlador predeterminado de VRChat correspondiente, o asigna tu propio controlador personalizado.
5. Si no tienes los controladores predeterminados de VRChat en tu proyecto, se pueden encontrar en `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Si tu avatar tenía gestos de manos personalizados antes de añadir GoGo Loco, debes restaurar aquí el controlador original de la capa Gesture en lugar del predeterminado de VRChat — revisa tu control de versiones o copias de seguridad.

## Paso 3: Eliminar las Capas de GoGo Loco del FX Controller

Para la función de vuelo, GoGo Loco fusiona dos capas adicionales en el FX Animator Controller del avatar. Estas permanecen incluso después de eliminar el prefab y deben eliminarse manualmente.

1. Localiza el FX Animator Controller de tu avatar en la ventana Project y haz doble clic para abrir la ventana **Animator**.
2. En el panel **Layers** a la izquierda, busca capas llamadas `GoGo Fly`, `GoGo Freeze`, o cualquier capa cuyo nombre comience con `go_`.
3. Haz clic derecho en cada capa de GoGo Loco y selecciona **Delete Layer**.
4. En la misma ventana Animator, haz clic en la pestaña **Parameters**.
5. Elimina cada parámetro que pertenezca a GoGo Loco. Los comunes incluyen:

| Nombre del parámetro | Tipo |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Los parámetros que comienzan con `go_` o `Go/` son parámetros de GoGo Loco. Elimínalos todos. Parámetros como `VelocityY`, `VRCFaceBlendH`, `Grounded`, etc., son parámetros estándar incorporados en VRChat — **no** los elimines.

> [!CAUTION]
> Eliminar un parámetro que todavía es referenciado por un estado de animación o transición restante romperá esos estados. Siempre verifica que ninguna capa que no sea de GoGo Loco dependa de un parámetro antes de eliminarlo.

## Paso 4: Limpiar el Asset de Expression Parameters

GoGo Loco añade sus parámetros al asset `VRCExpressionParameters` del avatar, consumiendo memoria sincronizada. Cada parámetro de GoGo Loco dejado atrás desperdicia bits.

1. En la ventana Project, encuentra el archivo `.asset` asignado a **Expression Parameters** en el Avatar Descriptor.
2. Selecciónalo y mira la lista de parámetros en el Inspector.
3. Elimina cada entrada que corresponda a un parámetro de GoGo Loco (mismos nombres listados en el Paso 3).
4. Confirma que el **Total Cost** mostrado en la parte inferior del Inspector disminuye después de la eliminación.

## Paso 5: Eliminar la Entrada del Menú de GoGo Loco

GoGo Loco instala una entrada de submenú en el Expression Menu raíz del avatar.

1. Encuentra el archivo `.asset` asignado a **Expressions Menu** en el Avatar Descriptor.
2. Selecciónalo e inspecciona la lista **Controls**.
3. Elimina cualquier entrada llamada `GoGo Loco`, `GGL`, `Loco`, o similar que enlace a un asset de submenú de GoGo Loco.
4. Abre cada submenú restante de forma recursiva y elimina cualquier entrada de control de GoGo Loco anidada dentro de ellos.

## Paso 6: Eliminar Archivos de Asset de GoGo Loco del Proyecto

Después de desconectar GoGo Loco del avatar, elimina sus archivos del proyecto de Unity para mantener limpia la carpeta `Assets/`.

1. En la ventana Project, busca `go_` usando la barra de búsqueda (asegúrate de que el alcance de búsqueda esté en **All**).
2. Revisa los resultados — los archivos que comienzan con `go_` son casi siempre assets de GoGo Loco (Animation Clips, Animator Controllers, Textures, Materials para los iconos del menú).
3. También busca `GoGoLoco` y `GGL` para atrapar cualquier archivo que use el nombre completo.
4. Selecciona todos los assets confirmados de GoGo Loco y presiona **Delete** (o clic derecho → **Delete**).
5. Unity te pedirá que confirmes la eliminación. Acepta.

> [!WARNING]
> No elimines assets cuyos nombres comiencen con `go_` si pertenecen a tu propio proyecto (ej., un GameObject o animación que nombraste de esa manera). Inspecciona cada archivo antes de eliminarlo.

Ubicaciones comunes de carpetas para archivos de GoGo Loco:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- En cualquier lugar donde un avatar comprado haya desempaquetado el `.unitypackage`.

Elimina la carpeta completa una vez que se confirme que todos los archivos contenidos pertenecen a GoGo Loco.

## Paso 7: Eliminar el Paquete VPM (Solo Instalación VCC)

Si GoGo Loco fue instalado como un paquete VPM a través del VRChat Creator Companion, los archivos del paquete se encuentran en `Packages/` en lugar de `Assets/` y deben ser eliminados a través de VCC o el manifiesto.

### Opción A — Vía Interfaz de VCC

1. Abre el **VRChat Creator Companion**.
2. Navega a tu proyecto en la pestaña **Projects** y haz clic en **Manage Project**.
3. En la lista de paquetes, encuentra `GoGoLoco` (ID del paquete `com.franada.gogoloco` o similar).
4. Haz clic en el botón **menos (−)** o cambia el menú desplegable de la versión a **Remove** y aplica.
5. Vuelve a abrir el proyecto en Unity. El Resolver detectará la eliminación y limpiará la carpeta `Packages/`.

### Opción B — Vía `vpm-manifest.json` (manual)

1. Cierra Unity.
2. Abre `<TuProyecto>/Packages/vpm-manifest.json` en un editor de texto.
3. Elimina la entrada para GoGo Loco tanto del objeto `"dependencies"` como de `"locked"`.
4. Elimina la carpeta física `<TuProyecto>/Packages/com.franada.gogoloco/` (o equivalente).
5. Vuelve a abrir Unity. El Resolver volverá a escanear y confirmará que no falten paquetes.

> [!NOTE]
> Eliminar el paquete VPM no deshace automáticamente las capas, parámetros, menús u objetos hijos del prefab añadidos durante la instalación. Los Pasos 1–6 todavía deben completarse independientemente del método de instalación que se usó.

## Paso 8: Volver a Activar Force Locomotion (si es necesario)

Cuando GoGo Loco está instalado, generalmente desmarca **Force Locomotion animations for 6-point tracking** en el Avatar Descriptor, porque su capa de Locomotion personalizada maneja los modos de seguimiento internamente. Después de la eliminación, puede que quieras restaurar el comportamiento predeterminado.

1. Selecciona la raíz del avatar y abre el **VRC Avatar Descriptor** en el Inspector.
2. Desplázate hasta la sección **IK**.
3. Vuelve a marcar la casilla **Force Locomotion animations for 6 point tracking** si estás utilizando el controlador de Locomotion predeterminado de VRChat.

> [!TIP]
> Si no estás utilizando el seguimiento de cuerpo completo (FBT), esta casilla no tiene un efecto visible y puede dejarse en cualquier estado.

## Lista de Verificación

Antes de subir el avatar, confirma todo lo siguiente:

| Verificación | Cómo verificar |
| :---------------------------------------- | :--------------------------------------------------- |
| Sin objeto hijo GoGo Loco en Hierarchy | Inspeccionar jerarquía del avatar en la escena de Unity |
| Playable Layers apuntan a controladores correctos | VRC Avatar Descriptor → Sección Playable Layers |
| Sin capas `go_` en el controlador FX | Abrir FX Animator Controller → Panel Layers |
| Sin parámetros `go_` / `Go/` en FX | Abrir FX Animator Controller → Panel Parameters |
| Sin entradas de GoGo Loco en Expression Parameters | Inspeccionar el archivo `.asset` en el Inspector |
| Sin entradas de GoGo Loco en Expression Menu | Inspeccionar recursivamente el menú raíz `.asset` |
| Sin archivos de GoGo Loco en `Assets/` | Búsqueda en Project por `go_`, `GoGoLoco`, `GGL` |
| Sin paquete GoGo Loco en `vpm-manifest.json` | Abrir archivo en editor de texto y buscar `gogoloco` |
| Configuración de Force Locomotion intencional | VRC Avatar Descriptor → Sección IK |

## Tabla Resumen

| Qué añade GoGo Loco | Dónde eliminarlo |
| :---------------------------------------------- | :------------------------------------------------ |
| Prefab/GameObject hijo en raíz del avatar | Unity Hierarchy → eliminar el objeto hijo |
| Playable Layers Base, Additive, Gesture | VRC Avatar Descriptor → Playable Layers |
| Capas FX (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Panel Layers |
| Parámetros FX (`Go/*`, `VelocityMagnitude`, etc.) | FX Animator Controller → Panel Parameters |
| Entradas en Expression Parameters | VRCExpressionParameters `.asset` → Lista Controls |
| Entrada de submenú en Expression Menu | VRCExpressionsMenu `.asset` → Lista Controls |
| Archivos Asset (`go_*.anim`, controladores, texturas) | Project window → eliminar carpeta `GoGoLoco` |
| Entrada en paquete VPM | Interfaz VCC o `vpm-manifest.json` |
| Force Locomotion desmarcado | VRC Avatar Descriptor → Sección IK (restaurar) |

## Referencias

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. VRChat Creator Companion Docs. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
