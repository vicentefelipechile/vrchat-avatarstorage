# Modular Avatar

<span class="badge">HERRAMIENTA</span>

## ¿Qué es?

Modular Avatar es una suite de herramientas **no destructivas** para modularizar tus avatares de VRChat y distribuir componentes de avatar. Con Modular Avatar, añadir una nueva outfit o gimmick a tu avatar es tan fácil como arrastrar y soltar.

> [!NOTE]
> Modular Avatar funciona mediante el sistema **Non-Destructive Modular Framework (NDMF)**, que procesa el avatar en el momento de la construcción sin modificar tus archivos originales.

## ¿Para qué sirve?

- Instalación de ropa y accesorios con un solo clic mediante **drag-and-drop**
- Organización de animadores: divide el FX animator en múltiples sub-animadores y fusiónalos en tiempo de ejecución
- Configuración automática de menús de VRChat
- Sistema de **toggles** para activar/desactivar objetos y blenshapes
- Componentes reactivos que responden a cambios en el avatar
- Distribución de prefabs con instalación automática

## Características principales

| Característica                 | Modular Avatar     | VRCFury      |
| ------------------------------ | ------------------ | ------------ |
| **Instalación de outfits**     | Si (drag-and-drop) | Si (un clic) |
| **Sistema de toggles**         | Si (avanzado)      | Si (basico)  |
| **Organización de animadores** | Si (merge)         | No           |
| **Menús automáticos**          | Si (completo)      | Si (basico)  |
| **Proceso no destructivo**     | Si (NDMF)          | Si           |
| **Blenshape sync**             | Si                 | No           |
| **Bone proxy**                 | Si                 | No           |

### Descripción de componentes

| Componente          | Descripción                                                                                                                                      |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| **Merge Armature**  | Fusiona armature de prefabs en el avatar padre, común para añadir ropa. MA minimiza el número de huesos creados, reutilizando huesos existentes. |
| **Merge Animator**  | Fusiona sub-animadores en el avatar padre, útil para varios tipos de gimmicks de avatar.                                                         |
| **Object Toggle**   | Crea elementos de menú para activar o desactivar objetos. También puede actualizar blenshapes al togglear.                                       |
| **Blendshape Sync** | Sincroniza los blenshapes de la ropa o accesorios con los del avatar base cuando ajustas la forma del cuerpo.                                    |
| **Bone Proxy**      | Permite añadir props únicos como armas o efectos especiales directamente unidos a huesos del avatar.                                             |
| **Menu System**     | Sistema completo de menús para editar tu avatar desde el menú de VRChat.                                                                         |

> [!TIP]
> Modular Avatar es especialmente útil cuando quieres distribuir ropa o accesorios como prefabs. Los usuarios solo necesitan arrastrar el prefab a su avatar y MA se encarga de todo automáticamente.

## ¿Dónde obtenerlo?

- **Página Oficial:** [modular-avatar.nadena.dev](https://modular-avatar.nadena.dev/)
- **Documentación:** [Documentación Modular Avatar](https://modular-avatar.nadena.dev/docs/intro)
- **GitHub:** [bdunderscore/modular-avatar](https://github.com/bdunderscore/modular-avatar)
- **Discord:** [Comunidad Discord](https://discord.gg/dV4cVpewmM)

## ¿Cómo instalarlo?

### Instalación mediante VCC (VRChat Creator Companion)

1. Añade el repositorio a VCC:
   - Haz clic en: [Add Modular Avatar to VCC](vcc://vpm/addRepo?url=https://vpm.nadena.dev/vpm.json)
   - O ve a **Settings** → **Packages** → **Add Repository**, pega la URL `https://vpm.nadena.dev/vpm.json` y haz clic en **Add**
2. Ve a **Manage Project** para tu proyecto
3. En la lista de paquetes, busca **Modular Avatar** y haz clic en el **[+]** para añadirlo
4. Haz clic en **Open Project** en VCC

## ¿Cómo usarlo?

### Crear un Toggle básico

1. Haz clic derecho sobre tu avatar en Unity
2. Selecciona **Modular Avatar → Create Toggle**
3. Se creará un nuevo GameObject con los componentes **Menu Item**, **Menu Installer** y **Object Toggle**
4. En el componente **Object Toggle**, haz clic en el botón **+** para añadir una entrada
5. Arrastra el objeto que quieres togglear al campo vacío
6. ¡Listo! El toggle aparecerá automáticamente en el menú de tu avatar

### Instalar una outfit

1. Arrastra el prefab de la outfit sobre tu avatar
2. Haz clic derecho sobre la outfit y selecciona **ModularAvatar → Setup Outfit**
3. MA configurará automáticamente el armature y las animaciones

> [!TIP]
> Puedes ver el tutorial oficial en la [documentación de Modular Avatar](https://modular-avatar.nadena.dev/docs/tutorials).

## Relación con otras herramientas

> [!TIP]
> Consulta la tabla comparativa anterior para ver las diferencias entre Modular Avatar y VRCFury.

Modular Avatar y VRCFury son **herramientas complementarias**. Muchas outfits modernas incluyen soporte para ambas. Consulta la documentación de la outfit para saber qué método recomienda el creador.

- **[VRCFury](/wiki?topic=vrcfury)**: Se enfoca en la instalación de animaciones y gestos.
- **NDMF (Non-Destructive Modular Framework)**: Framework base que permite el procesamiento no destructivo. Se instala automáticamente con Modular Avatar.

---

## Referencias

Modular Avatar. (s. f.). _Modular Avatar_. Nadena Dev. https://modular-avatar.nadena.dev/

Modular Avatar. (s. f.). _Tutorials_. Nadena Dev. https://modular-avatar.nadena.dev/docs/tutorials

bd\_. (2026). _bdunderscore/modular-avatar_ [Software]. GitHub. https://github.com/bdunderscore/modular-avatar
