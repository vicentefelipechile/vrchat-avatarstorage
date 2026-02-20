# Poiyomi Toon Shader

<span class="badge badge-blue">DEPENDENCIA</span>

## ¿Qué es?
Poiyomi es un shader (sombreador) para Unity diseñado específicamente para VRChat. Permite crear apariencias estilizadas y tipo cartoon en avatares con efectos visuales avanzados.

## ¿Para qué sirve?
- Sombreado estilizado personalizable (toon, realista, plano)
- Efectos especiales: outlines, decals, glitter, sparkle
- Soporte para AudioLink (efectos que reaccionan al audio)
- Reflecciones y especular físicamente precisos
- Optimizado para rendimiento en VRChat

> [!WARNING]
> MUY IMPORTANTE
> Poiyomi NO viene incluido en los archivos de avatar que descargas. Debes instalarlo tú mismo en Unity ANTES de abrir el avatar.

## ¿Dónde obtenerlo?
- **Sitio Oficial (Descargas):** [poiyomi.com/download](https://poiyomi.com/download)
- **Versión Gratuita:** [GitHub - Poiyomi Toon Shader](https://github.com/poiyomi/PoiyomiToonShader)
- **Versión Pro:** [Patreon - Poiyomi](https://www.patreon.com/poiyomi)

## ¿Cómo instalarlo?

Actualmente existen dos métodos principales para instalar Poiyomi en tu proyecto. El método recomendado por la comunidad de VRChat es usar **VCC (VRChat Creator Companion)**, pero también puedes usar la importación clásica de **UnityPackage**.

### Método 1: Instalación mediante VCC (Recomendado)

Usar VCC (VRChat Creator Companion) es la forma más limpia y recomendada de instalar y gestionar Poiyomi, ya que permite actualizar el shader fácilmente desde la aplicación.

1. **Añadir el repositorio a VCC:**
   - La forma más fácil es ir a la página oficial de descargas: [poiyomi.com/download](https://poiyomi.com/download).
   - Baja hasta donde dice "Method 2", busca la sección de **Creator Companion (VCC)** y haz clic en el botón **"Add to VCC"**.
   - Tu navegador pedirá permiso para abrir VCC. Acéptalo y, una vez dentro de VCC, haz clic en **"I Understand, Add Repository"**.
   - *(Alternativa manual)*: Abre VCC, ve a **Settings** -> pestaña **Packages** -> **Add Repository**, pega la URL `https://poiyomi.github.io/vpm/index.json` en el espacio correspondiente y haz clic en **Add**.
2. **Añadir el shader a tu proyecto:**
   - En VCC, navega a la sección de proyectos y haz clic en **Manage Project** en el proyecto de VRChat donde deseas instalar el shader.
   - En la sección **Selected Repos** (menú lateral o desplegable superior de repositorios), asegúrate de que **"Poiyomi's VPM Repo"** esté marcado.
   - En la lista de paquetes disponibles para el proyecto, busca **"Poiyomi Toon Shader"** y haz clic en el ícono **[+]** a la derecha para añadirlo.
3. **¡Listo!** Puedes ahora darle clic a **Open Project** en VCC y ya tendrás Poiyomi disponible en tu proyecto de Unity.

> [!NOTE]
> Si al momento de instalarlo mediante VCC ves que la ventana se cierra, es normal, para arreglarlo solo cierra VCC y ábrelo de nuevo y luego intenta instalarlo mediante VCC, verás que ahora funciona correctamente.

### Método 2: Instalación manual mediante .unitypackage

Este es el método clásico. Debes considerar que es más difícil de actualizar en el futuro y puede dejar archivos residuales si intentas cambiarte al método de VCC más adelante.

1. Descarga el archivo `.unitypackage` más reciente desde la página de versiones en [GitHub](https://github.com/poiyomi/PoiyomiToonShader/releases) o desde tu cuenta de [Patreon](https://www.patreon.com/poiyomi) si utilizas la versión Pro.
2. Abre el proyecto de Unity donde planeas importar tu avatar.
3. En la ventana de Unity, importa el paquete dirigiéndote al menú superior: **Assets** → **Import Package** → **Custom Package...**
4. Selecciona el archivo `.unitypackage` que acabas de descargar en tu computadora.
5. Aparecerá una ventana mostrando una lista de todos los archivos a importar. Asegúrate de que todo esté seleccionado (puedes usar el botón "All") y haz clic en el botón inferior **Import**.
6. Espera a que termine la barra de progreso, y la instalación estará completada. Poiyomi estará listo para asignarse en los materiales de tu proyecto.

---

## Referencias

Poiyomi. (s. f.). *Download*. Poiyomi Shaders. Recuperado de https://poiyomi.com/download

Poiyomi. (s. f.). *PoiyomiToonShader: A feature rich toon shader for Unity and VRChat*. GitHub. Recuperado de https://github.com/poiyomi/PoiyomiToonShader
