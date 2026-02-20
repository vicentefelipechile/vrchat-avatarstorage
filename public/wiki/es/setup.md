# Guía Paso a Paso: Preparando Unity con VCC
Sigue estos pasos ANTES de importar tu avatar descargado

> [!NOTE]
> Nota
> No necesitas instalar, manipular o gestionar Unity directamente por tu cuenta. Todo el proceso de preparación del proyecto y la instalación de dependencias se hace dentro de VCC. Solo abrirás Unity al final para importar y subir tu avatar.

### Paso 1: Instalar VRChat Creator Companion (VCC)
Descarga el **VRChat Creator Companion** desde [vrchat.com/home/download](https://vrchat.com/home/download). El **VCC** es la herramienta oficial que gestiona Unity, el SDK de VRChat y todos los paquetes necesarios automáticamente.

### Paso 2: Instalar Unity Hub y Unity a través de VCC
Al abrir el VCC por primera vez, detectará si tienes instalado Unity. Sigue el asistente de configuración para que te instale **Unity Hub** y luego descargue la versión correcta de **Unity** requerida por VRChat (actualmente la serie 2022.3). Permite que el VCC instale ambos programas automáticamente.

### Paso 3: Crear un Nuevo Proyecto de Avatar
Abre el VCC → **Projects** → **Create New Project**. Selecciona la plantilla **"Avatars"**. Dale un nombre (ej: "Mis Avatares VRChat"). El VCC preparará tu proyecto automáticamente con el **VRChat SDK**.

### Paso 4: Agregar Repositorio de Poiyomi
En el VCC, ve a **Settings** → **Packages** → **Add Repository**. Pega esta URL: [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) y haz clic en "Add". Esto te permitirá instalar **Poiyomi** fácilmente, el cual es vital para que las texturas de los avatares se vean bien. Puedes encontrar más detalles en nuestra [guía sobre Poiyomi](/wiki?topic=poiyomi).

### Paso 5: Agregar Repositorio de VRCFury (Opcional)
Si tu avatar lo requiere, en **Settings** → **Packages** → **Add Repository**, pega: [https://vcc.vrcfury.com](https://vcc.vrcfury.com) y haz clic en "Add". **VRCFury** facilita la instalación de ropa y accesorios mediante arrastrar y soltar. Te recomendamos revisar la [guía sobre VRCFury](/wiki?topic=vrcfury) para más información.

### Paso 6: Instalar Paquetes en tu Proyecto
En el VCC, selecciona tu proyecto recién creado → **Manage Project**. Busca **"Poiyomi Toon Shader"** y haz clic en el botón **"+"** para agregarlo. Si necesitas VRCFury, agrégalo también usando el mismo botón. Haz clic en **"Apply"** o simplemente espera a que cargue.

### Paso 7: Abrir Proyecto e Importar Avatar
En el menú de tu proyecto del VCC, haz clic en **"Open Project"** para abrir Unity por primera vez (puede tardar un poco). Una vez abierto, importa tu avatar: arrastra el archivo **.unitypackage** a la ventana de Unity (en la pestaña `Project` o `Assets`) o usa **Assets → Import Package → Custom Package**.

### Paso 8: Verificar y Configurar
Arrastra el **prefab del avatar** a la escena. Si todo está correcto y Poiyomi está instalado, **NO verás materiales en magenta** (rosa). Configura el avatar usando **VRChat SDK → Show Control Panel → Builder**. Resuelve errores con **"Auto Fix"** y sube con **"Build & Publish"**.

> [!TIP]
> Consejo Importante
> El VCC simplifica TODO. Ya no necesitas buscar la versión correcta de Unity en internet ni lidiar con incompatibilidades. Siempre usa el VCC como punto central para gestionar tus proyectos de VRChat.

---

## Referencias

[1] VRChat Inc. (s.f.). *VRChat Creator Companion*. VRChat. https://vrchat.com/home/download

[2] Unity Technologies. (s.f.). *Unity Hub*. Unity. https://unity.com/download

[3] Poiyomi. (s.f.). *Poiyomi Toon Shader*. GitHub. https://github.com/poiyomi/PoiyomiToonShader

[4] VRCFury. (s.f.). *VRCFury Documentation*. https://vrcfury.com
