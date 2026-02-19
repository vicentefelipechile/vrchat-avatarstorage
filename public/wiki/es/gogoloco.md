# Gogo Loco

<span class="badge">RECOMENDADO</span>

## ¿Qué es?
Gogo Loco es un sistema de locomoción avanzado para avatares de VRChat creado por **franada** [1]. Permite a los usuarios de escritorio y VR sin "full body tracking" acceder a funciones de pose, vuelo y ajustes de avatar que normalmente no estarían disponibles.

## ¿Para qué sirve?
- **Poses estáticas:** Permite sentarse, acostarse y realizar diversas poses artísticas en cualquier lugar.
- **Simulación de Full Body:** Incluye animaciones que simulan tener rastreadores en las piernas.
- **Vuelo:** Permite volar en mundos que tienen colisiones o restricciones de salto.
- **Ajuste de altura:** Permite escalar el tamaño de tu avatar dentro del juego.
- **Modo Estacionario:** Permite mover tu avatar visualmente sin desplazarte físicamente (útil para fotos).

> [!NOTE]
> Nota
> Aunque se puede instalar manualmente, se recomienda encarecidamente usar **VRCFury** para facilitar la instalación y evitar conflictos con otros menús.

## ¿Dónde obtenerlo?
- [GitHub - Gogo Loco (Gratis)](https://github.com/franada/gogo-loco)
- [Gumroad - Gogo Loco (Apoya al creador)](https://franadavrc.gumroad.com/l/gogoloco)

## ¿Se puede poner a modelos que no lo tienen?
Sí, **Gogo Loco** se puede añadir a prácticamente cualquier avatar, siempre que cumpla con un requisito principal:
- **Debe ser un avatar humanoide** (o tener el esqueleto configurado como humanoide en Unity).

Los avatares "genéricos" o no humanoides (como objetos flotante, arañas complejas sin esqueleto humano, etc.) pueden tener problemas o no funcionar correctamente, ya que Gogo Loco manipula huesos humanos específicos (caderas, piernas, espalda).

## Requisitos Previos
Antes de empezar, asegúrate de tener lo siguiente:
- **Unity:** La versión recomendada para VRChat (actualmente algo como 2022.3.22f1).
- **VRChat SDK:** Instalado en tu proyecto (VCC).
- **Gogo Loco:** El paquete `.unitypackage` descargado (versión gratuita o de pago).
- **VRCFury (Opcional pero recomendado):** Para la instalación fácil.
- **Avatar 3.0 Manager (Opcional):** Para la instalación manual.

## Guía de Instalación Paso a Paso

Existen dos métodos principales para instalar Gogo Loco en tu avatar. Elige el que mejor se adapte a tus necesidades.

---

### Método 1: Usando VRCFury (Recomendado y Fácil)
Este es el método más sencillo, automatizado y menos propenso a errores [3].

1. **Instalar VRCFury:** Asegúrate de tener **VRCFury** instalado en tu proyecto a través del VRChat Creator Companion (VCC).
2. **Importar Gogo Loco:** Arrastra el archivo `.unitypackage` de Gogo Loco a la carpeta `Assets` de tu proyecto o, haz doble clic sobre él para importarlo.
3. **Buscar el Prefab:**
   - En la ventana `Project` de Unity, navega a la carpeta: `Assets/GoGo/Loco/Prefabs`.
   - Busca el prefab llamado **GoGo Loco Beyond**.
     - *Nota:* "Beyond" incluye las funciones de vuelo, escala y poses. Si solo quieres algunas funciones, explora las otras carpetas.
4. **Instalar en el Avatar:**
   - Arrastra el prefab **GoGo Loco Beyond** y **suéltalo directamente sobre tu avatar** en la jerarquía (`Hierarchy`). El prefab debe quedar como un "hijo" (child) de tu avatar.
   - ¡Listo! No necesitas configurar nada más.
5. **Subir:** Al subir tu avatar a VRChat, VRCFury detectará el prefab y fusionará automáticamente todos los controladores, menús y parámetros necesarios.

---

### Método 2: Instalación Manual con Avatar 3.0 Manager
Si prefieres no usar VRCFury o necesitas un control total, usa esta herramienta para evitar errores humanos al copiar parámetros y capas [4].

1. **VRLabs Avatar 3.0 Manager:** Descarga e importa esta herramienta gratuita (disponible en GitHub o VCC).
2. **Importar Gogo Loco:** Importa el paquete a Unity.
3. **Abrir Avatar 3.0 Manager:** Ve al menú superior `VRLabs` -> `Avatar 3.0 Manager`.
4. **Seleccionar Avatar:** Arrastra tu avatar al campo "Avatar" de la herramienta.
5. **Fusionar Controladores (FX):**
   - En la sección "FX", despliega las opciones.
   - Haz clic en **"Add Animator to Merge"**.
   - Selecciona el controlador FX de Gogo Loco (ubicado usualmente en `GoGo/Loco/Controllers`).
   - Haz clic en **"Merge on Current"**. Esto combinará las capas de Gogo Loco con las tuyas sin sobrescribir.
6. **Copiar Parámetros:**
   - Ve a la pestaña **"Parameters"** del Manager.
   - Selecciona la opción **"Copy Parameters"**.
   - Selecciona la lista de parámetros de Gogo Loco como origen y cópialos a tu avatar.
7. **Añadir el Menú:**
   - Ve al **VRChat Avatar Descriptor** de tu avatar en el Inspector.
   - Busca la sección **Expressions Menu**.
   - Abre tu menú principal (doble clic en el archivo).
   - Añade un nuevo control (Control -> Add Control).
   - Nómbrelo "Gogo Loco".
   - Tipo: **Sub Menu**.
   - Parameter: None.
   - Sub Menu: Arrastra aquí el menú `GoGo Loco Menu` (o `GoGo Loco All`).
8. **Action & Base Layers (Opcional):**
   - Si deseas las animaciones de sentarse y "afk" personalizadas, repite el paso de fusión para las capas **Action** y **Base** en el Avatar Descriptor.

> [!WARNING]
> Advertencia: Write Defaults
> Gogo Loco suele funcionar mejor con **Write Defaults OFF** [1]. Si tu avatar usa "Mixed Write Defaults" (mezcla de ON y OFF), podrías experimentar comportamientos extraños. VRCFury suele arreglar esto automáticamente, pero en manual debes tener cuidado.

---

## Referencias

[1] Franada. (s.f.). *Gogo Loco*. GitHub. https://github.com/franada/gogo-loco

[2] Franada. (s.f.). *Gogo Loco*. Gumroad. https://franadavrc.gumroad.com/l/gogoloco

[3] VRCFury. (s.f.). *VRCFury Documentation*. https://vrcfury.com

[4] VRLabs. (s.f.). *Avatar 3.0 Manager*. GitHub. https://github.com/VRLabs/Avatars-3.0-Manager
