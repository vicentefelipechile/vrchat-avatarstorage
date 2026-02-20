# Gesture Manager Emulator

<span class="badge badge-purple">Tool</span> <span class="badge badge-blue">Workflow</span>

## ¿Qué es el Gesture Manager?
El **Gesture Manager**, desarrollado por **BlackStartx**, es una herramienta esencial para creadores de avatares de VRChat. Permite previsualizar y editar las animaciones, gestos y menús de un avatar directamente dentro de Unity, eliminando la necesidad de subir el avatar al juego para probar cada cambio [1].

Simula casi por completo el sistema de animación de VRChat, incluyendo el **Menú Radial (Expressions Menu)**, lo que permite verificar que tus toggles y sliders funcionen correctamente de forma instantánea.

---

## Instalación

Existen dos métodos principales para instalar esta herramienta en tu proyecto.

### Método 1: VRChat Creator Companion (Recomendado)
Es la forma más sencilla y asegura que siempre tengas la versión más reciente compatible con tu proyecto [2].
1. Abre el **VRChat Creator Companion (VCC)**.
2. Selecciona tu proyecto.
3. Asegúrate de que los paquetes "Curated" no estén filtrados.
4. Busca **"Gesture Manager"** y haz clic en el botón **"Add"**.
5. Abre tu proyecto de Unity.

### Método 2: Manual (Unity Package)
Si no usas VCC o necesitas una versión específica:
1. Descarga el archivo `.unitypackage` desde la sección de *Releases* en el GitHub de BlackStartx o desde su página en BOOTH [3].
2. Importa el paquete en tu proyecto de Unity (`Assets > Import Package > Custom Package`).

---

## Características Principales

*   **Menú Radial 3.0:** Recrea fielmente el menú de expresiones de VRChat.
*   **Emulación de Gestos:** Permite probar los gestos de mano izquierda y derecha mediante botones en el inspector.
*   **Cámara de Escena Activa:** Sincroniza la cámara del juego con la de la escena para facilitar las pruebas de PhysBones y Contactos.
*   **Prueba de Contactos:** Permite activar *VRCContacts* haciendo clic sobre ellos con el ratón.
*   **Depuración de Parámetros:** Muestra una lista de todos los parámetros del avatar y sus valores actuales.

---

## Cómo utilizarlo

1.  Una vez instalado, ve a la barra superior y selecciona `Tools > Gesture Manager Emulator`.
2.  Esto añadirá un objeto llamado `GestureManager` a tu jerarquía.
3.  Entra en **Play Mode** en Unity.
4.  Selecciona el objeto `GestureManager` en la jerarquía.
5.  En la ventana del **Inspector**, verás el menú radial y todos los controles para probar tu avatar.

> [!IMPORTANT]
> Debes tener seleccionado el objeto `GestureManager` para ver los controles en el inspector mientras Unity está en ejecución.

---

## Referencias

[1] BlackStartx. (s.f.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[2] VRChat. (s.f.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[3] VRChat. (s.f.). *VCC Documentation*. VRChat Creator Companion. https://vcc.docs.vrchat.com

[4] BlackStartx. (s.f.). *Gesture Manager*. Booth. https://blackstartx.booth.pm/items/3922472
