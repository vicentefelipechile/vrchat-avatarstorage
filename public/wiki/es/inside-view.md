# Inside View

<span class="badge badge-blue">Visual</span> <span class="badge badge-purple">ERP</span> <span class="badge badge-yellow">SPS</span>

## ¿Qué es?
**Inside View**, creado por **Liindy** [1], es un asset para avatares de VRChat que permite ver el interior de una malla (como un orificio SPS) añadiendo profundidad visual simulada.

A diferencia de simplemente borrar la parte trasera de las caras de la malla (backface culling), Inside View utiliza un "Screen Shader" que proyecta una textura de profundidad dentro del orificio, creando una ilusión de interior realista sin necesidad de modelar geometría interna compleja. Es comúnmente usado junto con sistemas como [SPS](/wiki?topic=sps) para mejorar la visualización durante el ERP.

## Características Principales
- **Profundidad Simulada:** Crea la ilusión de un túnel o interior detallado.
- **Optimizado:** Utiliza shaders para evitar geometría extra pesada.
- **Integración con SPS:** Diseñado para funcionar en conjunto con las penetraciones de SPS [3].
- **Fácil Instalación:** Compatible con **VRCFury** para una configuración "drag-and-drop".

## Requisitos Previos
- **Unity:** Versión recomendada para VRChat (actualmente 2022.3.22f1 o similar) [1].
- **VRChat SDK 3.0:** (Avatars) Descargado vía VCC [1].
- **VRCFury:** Necesario para la instalación automática.
- **Poiyomi Toon Shader:** (Opcional pero recomendado) Versión 8.1 o superior para compatibilidad de materiales [2].

## Guía de Instalación

> [!NOTE]
> Esta guía asume el uso de **VRCFury**, que es el método oficial recomendado por el creador.

### Paso 1: Importar
Una vez adquirido el paquete (gratito o de pago) desde Jinxxy o Gumroad:
1. Abre tu proyecto de Unity con el SDK y VRCFury ya instalados.
2. Importa el paquete `.unitypackage` de **Inside View**.

### Paso 2: Colocación (VRCFury)
1. Busca el prefab de Inside View en la carpeta del asset (normalmente `Assets/Liindy/Inside View`).
2. Arrastra el prefab y suéltalo dentro de la jerarquía de tu avatar.
   - **Importante:** Colócalo como "hijo" del hueso o objeto donde está el orificio (o el Socket de SPS).
3. Asegúrate de que el objeto "Socket" de SPS y el "Inside View" estén alineados en la misma posición y rotación.

### Paso 3: Configuración de Profundidad
El asset funciona mediante una animación de profundidad (Depth Animation).
1. Selecciona el componente VRCFury en el prefab de Inside View.
2. Verifica que esté apuntando al **Renderer** (malla) correcto de tu orificio.
3. Al subir el avatar, VRCFury fusionará automáticamente los menús y lógica necesarios.

### Notas Adicionales
- **Parameter Cost:** La versión "Full" puede usar hasta 35 bits de memoria de parámetros, mientras que la versión "Standard" usa alrededor de 17. Ten esto en cuenta si tu avatar ya tiene muchos parámetros [1].
- **Backface Culling:** Asegúrate de que el material de tu orificio tenga el "Cull" en "Off" o "Back" según las instrucciones del shader para que el efecto sea visible desde el ángulo correcto.

---

## Referencias

[1] Liindy. (s.f.). *Inside View (VRCFury)*. Jinxxy. https://jinxxy.com/Liindy/InsideView

[2] Liindy. (s.f.). *Inside View*. Jinxxy. https://jinxxy.com/Liindy/InsideView
