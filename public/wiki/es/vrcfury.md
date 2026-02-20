# VRCFury

<span class="badge">OPCIONAL</span>

## ¿Qué es?
VRCFury es un plugin gratuito de Unity que simplifica enormemente la configuración de avatares de VRChat. Facilita la instalación de ropa, props, gestos y animaciones sin necesidad de editar manualmente controladores de animación.

## ¿Para qué sirve?
- Instalación de ropa y accesorios con un solo clic
- Configuración automática de gestos y animaciones
- Generación automática de menús de VRChat
- No destructivo: no modifica tus archivos originales
- Optimizador de blendshapes (elimina los no usados)

> [!NOTE]
> Nota
> VRCFury es una herramienta OPCIONAL pero muy recomendada. Algunos avatares la requieren para funcionar correctamente. Si un avatar la necesita, lo indicará en su descripción.

## ¿Dónde obtenerlo?
- **Sitio Oficial (Descargas):** [vrcfury.com/download](https://vrcfury.com/download/)
- **GitHub:** [VRCFury/VRCFury](https://github.com/VRCFury/VRCFury)

## ¿Cómo instalarlo?

Al igual que muchas herramientas modernas de VRChat, existen dos métodos para instalar VRCFury. El método recomendado oficialmente es usar **VCC (VRChat Creator Companion)**.

### Método 1: Instalación mediante VCC (Recomendado)

Usar VCC asegura que VRCFury se mantenga siempre actualizado y no cause problemas de compatibilidad al usar múltiples proyectos.

1. **Añadir el repositorio a VCC:**
   - Ve a la página oficial de descargas: [vrcfury.com/download](https://vrcfury.com/download/).
   - En el paso 1 ("Install VRChat Creator Companion"), si ya tienes VCC instalado, puedes omitirlo. En el paso 2, haz clic en el botón **"Click Here to add VRCFury to VCC"**.
   - Tu navegador pedirá permiso para abrir VCC. Acéptalo y, una vez dentro de VCC, haz clic en **"I Understand, Add Repository"**.
   - *(Alternativa manual)*: Abre VCC, ve a **Settings** -> pestaña **Packages** -> **Add Repository**, pega la URL `https://vcc.vrcfury.com` en el espacio correspondiente y haz clic en **Add**.
2. **Añadir VRCFury a tu proyecto:**
   - En VCC, ve a la lista de tus proyectos y haz clic en **Manage Project** sobre el proyecto que estés utilizando.
   - En la lista de repositorios a la izquierda (o arriba a la derecha), asegúrate de que **"VRCFury Repo"** esté marcado.
   - En la lista de paquetes disponibles para tu proyecto, busca **"VRCFury"** y haz clic en el ícono **[+]** a la derecha para añadirlo a tu proyecto.
3. **¡Listo!** Dale clic a **Open Project** en VCC y los prefabs con VRCFury se instalarán o configurarán automáticamente al subir tu avatar o al agregarlos en la escena.

> [!NOTE]
> Si al momento de instalarlo mediante VCC ves que la ventana se cierra inesperadamente, es normal. Para arreglarlo, solo cierra VCC, ábrelo de nuevo, y repite el proceso; verás que ahora funciona correctamente.

### Método 2: Instalación manual mediante .unitypackage (Legacy)

Este método ya no es el recomendado y se considera obsoleto (Legacy), pero sigue siendo posible de usar si tienes problemas con VCC.

1. Descarga el archivo del instalador de VRCFury en formato `.unitypackage` desde la sección de descargas de [GitHub](https://github.com/VRCFury/VRCFury/releases).
2. Abre el proyecto de Unity donde planeas trabajar tu avatar.
3. En el menú superior de Unity, ve a **Assets** → **Import Package** → **Custom Package...**
4. Selecciona el archivo `.unitypackage` de VRCFury que acabas de descargar.
5. Asegúrate de que todos los archivos estén seleccionados en la ventana emergente y haz clic en **Import**.
6. VRCFury se instalará y aparecerá un nuevo menú en la barra superior llamado **Tools > VRCFury**. (Desde ahí puedes actualizarlo si usas este método manual).

---

## Referencias

VRCFury. (s. f.). *Download*. VRCFury. Recuperado de https://vrcfury.com/download/

VRCFury. (s. f.). *VRCFury*. GitHub. Recuperado de https://github.com/VRCFury/VRCFury
