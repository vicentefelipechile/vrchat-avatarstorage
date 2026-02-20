# NSFW Locomotion

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## ¿Qué es?
**NSFW Locomotion** es una versión personalizada y explícita del sistema **GoGo Loco** (creado originalmente por franada). Está diseñado específicamente para avatares "adult-themed" o de ERP, ampliando las funcionalidades de locomoción para incluir poses y animaciones sugerentes o explícitas.

Mantiene todas las funciones del GoGo Loco original pero añade contenido específico para interacciones íntimas.

> [!WARNING]
> Importante
> **NO instales NSFW Locomotion y Gogo Loco normal en el mismo proyecto.** Comparten nombres de menús y capas, lo que causará conflictos y errores. Elige solo uno.

## Características
- **Base de GoGo Loco:** Incluye todas las funciones de vuelo, escala y poses estándar.
- **Versión "Poses Only":** Ligera, solo añade poses estáticas adicionales.
- **Versión "Emotes + Poses":** Incluye emotes completos, movimientos dinámicos y animaciones personalizadas para roleplay.
- **Instalación fácil:** Integración con **VRCFury** y un script de instalación de un clic.

## ¿Dónde obtenerlo?
- [GitHub - NSFW Locomotion](https://github.com/LastationVRChat/NSFW-Locomotion)
- [Lastation Package Listing (Para VCC)](https://lastationvrchat.github.io/Lastation-Package-Listing/)

## ¿Qué hacer si el avatar ya tiene GoGo Loco?
Como se mencionó en la advertencia, **no puedes tener ambos sistemas al mismo tiempo**. Si tu avatar ya vino con GoGo Loco o lo instalaste previamente, debes eliminarlo por completo antes de poner NSFW Locomotion para evitar errores de Unity o menús rotos.

### Pasos para desinstalar el GoGo Loco original:
1. **Si se instaló con VRCFury (Método fácil):**
   - En Unity, busca el prefab de GoGo Loco dentro de la jerarquía (`Hierarchy`) como hijo de tu avatar y elimínalo (Clic derecho -> `Delete`).
2. **Si venía integrado manualmente en el avatar:**
   - **Playable Layers:** Selecciona tu avatar, ve al componente `VRC Avatar Descriptor` y baja a "Playable Layers". Quita o reemplaza los controladores de GoGo Loco (Base, Action, FX) por los originales que traía el avatar.
   - **Parameters y Menu:** En el mismo componente, abre tu lista de parámetros (`Expressions Parameters`) y borra todos los que pertenezcan a GoGo Loco (suelen empezar por `Go/`). Luego abre tu menú (`Expressions Menu`) y borra el botón que abre el submenú de GoGo.
   - *(Opcional)* Si no tienes otros avatares usando el GoGo Loco normal en ese proyecto, elimina la carpeta `GoGo` de tus `Assets`.

Una vez que el avatar esté completamente limpio del antiguo sistema, puedes proceder a instalar NSFW Locomotion con normalidad.

## ¿Cómo instalarlo? (Recomendado con VCC)
La forma más sencilla es usar el **VRChat Creator Companion (VCC)**.

1. Añade el repositorio **Lastation Package Listing (LPL)** a tu VCC.
2. Busca e instala el paquete **NSFW Locomotion**.
3. Asegúrate de tener **VRCFury** instalado también en el proyecto via VCC.
4. Abre tu proyecto de Unity.
5. En la barra de menú superior, ve a: `LastationVRChat` -> `NSFW Locomotion`.
6. Selecciona tu avatar y elige la versión que deseas:
   - **Full Version:** (Emotes + Poses)
   - **Poses Version:** (Solo poses, más ligero)

## Instalación Manual
Si prefieres no usar VCC (no recomendado):
1. Descarga la última "Release" desde GitHub.
2. Importa el paquete a Unity.
3. Arrastra el prefab correspondiente a tu avatar (el que indica `(VRCFury)`).
- Usa `WD` si tienes "Write Defaults" activado, o la versión normal si no.

---

## Referencias

LastationVRChat. (s.f.). *NSFW Locomotion*. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion

Usuario de Reddit. (s.f.). *Help! How do i remove gogoloco from my avatar?*. Reddit. https://www.reddit.com/r/VRchat/comments/17b1n2e/help_how_do_i_remove_gogoloco_from_my_avatar/
