# Solución a Errores de Unity Hub

Si Unity Hub no abre, se queda cargando infinitamente o experimentas errores de inicio de sesión que no te dejan usar el programa, la solución más efectiva es realizar una **reinstalación limpia**.

A continuación se detalla cómo borrar todos los archivos temporales y configuraciones corruptas.

## Método 1: Reinstalación Limpia (Eliminar todo rastro)

Sigue estos pasos cuidadosamente para asegurar que Unity Hub vuelva a funcionar:

### 1. Desinstalar Unity Hub
> [!WARNING]
> Advertencia
> Para este paso, debes utilizar el **desinstalador oficial de Windows** (desde *Configuración -> Aplicaciones* o desde el *Panel de Control*). **NO uses programas de terceros** como IObit Uninstaller, Revo Uninstaller, etc., ya que pueden borrar claves de registro necesarias y empeorar el problema.

- Ve a las **Configuraciones de Windows** -> **Aplicaciones**.
- Busca "Unity Hub" en la lista y dale a **Desinstalar**.

### 2. Eliminar directorios residuales
Incluso después de desinstalar, Unity deja carpetas de configuración (caché) ocultas en tu sistema. Debes buscarlas y eliminarlas manualmente.

Abre el Explorador de Archivos de Windows, copia cada una de las siguientes direcciones en la barra superior y presiona Enter. **Si la carpeta existe, elimínala por completo:**

- `C:\Program Files\Unity`
- `C:\Program Files\Unity Hub`
- `%USERPROFILE%\AppData\Roaming\Unity`
- `%USERPROFILE%\AppData\Roaming\Unity Hub`
- `%USERPROFILE%\AppData\Local\Unity`
- `%USERPROFILE%\AppData\Local\Unity Hub`

*(Nota: Puedes copiar y pegar la ruta `%USERPROFILE%` directamente en la barra del explorador, de la misma manera que usarías `%appdata%` para instalar mods en Minecraft, y te llevará automáticamente a tu carpeta de usuario actual).*

### 3. Reinstalar Unity Hub
Una vez que el sistema esté completamente limpio de archivos de Unity:
1. Ve a la [página oficial de Unity](https://unity.com/download) y descarga la versión más reciente de Unity Hub.
2. Ejecuta el instalador y sigue los pasos con normalidad.
3. Espera a que todo se instale correctamente, inicia sesión de nuevo y confirma que el error se ha solucionado.
