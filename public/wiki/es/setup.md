# Guía Paso a Paso: Preparando Unity con VCC
Sigue estos pasos ANTES de importar tu avatar descargado

### Paso 1: Instalar VRChat Creator Companion (VCC)
Descarga el **VRChat Creator Companion** desde [vrchat.com/home/download](https://vrchat.com/home/download). El **VCC** es la herramienta oficial que gestiona Unity, el SDK de VRChat y todos los paquetes necesarios automáticamente.

### Paso 2: Crear un Nuevo Proyecto de Avatar
Abre el VCC → **Projects** → **Create New Project**. Selecciona la plantilla **"Avatars"**. Dale un nombre (ej: "Mis Avatares VRChat"). El VCC instalará automáticamente **Unity** y el **VRChat SDK**.

### Paso 3: Agregar Repositorio de Poiyomi
En el VCC, ve a **Settings** → **Packages** → **Add Repository**. Pega esta URL: [https://poiyomi.github.io/vpm/index.json](https://poiyomi.github.io/vpm/index.json) y haz clic en "Add". Esto te permitirá instalar **Poiyomi** fácilmente.

### Paso 4: Agregar Repositorio de VRCFury (Opcional)
Si tu avatar lo requiere, en **Settings** → **Packages** → **Add Repository**, pega: [https://vcc.vrcfury.com](https://vcc.vrcfury.com) y haz clic en "Add". **VRCFury** facilita la instalación de ropa y accesorios.

### Paso 5: Instalar Paquetes en tu Proyecto
En el VCC, selecciona tu proyecto → **Manage Project**. Busca **"Poiyomi Toon Shader"** y haz clic en el botón **"+"** para agregarlo. Si necesitas VRCFury, agrégalo también. Haz clic en **"Apply"**.

### Paso 6: Abrir Proyecto e Importar Avatar
En el VCC, haz clic en **"Open Project"** para abrir Unity. Una vez abierto, importa tu avatar: arrastra el archivo **.unitypackage** a la ventana de Unity o usa **Assets → Import Package → Custom Package**.

### Paso 7: Verificar y Configurar
Arrastra el **prefab del avatar** a la escena. Si todo está correcto, **NO verás materiales en magenta** (rosa). Configura el avatar usando **VRChat SDK → Show Control Panel → Builder**. Resuelve errores con **"Auto Fix"** y sube con **"Build & Publish"**.

> [!TIP]
> Consejo Importante
> El VCC simplifica TODO. Ya no necesitas instalar Unity manualmente ni buscar la versión correcta. El VCC lo hace automáticamente. Siempre usa el VCC para gestionar tus proyectos de VRChat.
