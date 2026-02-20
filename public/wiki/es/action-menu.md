# Menú de Acciones (Action Menu)

<span class="badge badge-blue">Logic</span> <span class="badge badge-purple">Workflow</span>

## Introducción
El **Menú de Acciones** (también conocido como Expression Menu) es el menú radial que utilizas dentro de VRChat para activar animaciones, cambiar ropa o modificar parámetros de tu avatar [1].

Tradicionalmente, los creadores suben el avatar a VRChat cada vez que quieren probar un pequeño cambio, lo cual consume mucho tiempo. Afortunadamente, existen herramientas que permiten simular este menú **directamente en Unity**, permitiéndote ver cómo funcionan tus toggles y sliders al instante.

---

## Herramientas de Simulación

Existen dos herramientas principales recomendadas por la comunidad y compatibles con el **VRChat Creator Companion (VCC)**.

### 1. Gesture Manager (por BlackStartx)
Es la herramienta más popular para visualizar el menú radial tal cual se ve en el juego. Permite probar gestos, contactos y parámetros de forma intuitiva.

> [!NOTE]
> Para una guía detallada sobre cómo instalarlo y todas sus funciones, consulta nuestro artículo dedicado: **[Gesture Manager Emulator](/wiki?topic=gesture-manager-emulator)**.

### 2. Avatars 3.0 Emulator (por Lyuma)
Esta herramienta es más técnica y potente, ideal para debuguear la lógica compleja detrás del avatar.

*   **Instalación:** Disponible en VCC o vía GitHub. A menudo se instala automáticamente con herramientas como [VRCFury](/wiki?topic=vrcfury) [3].
*   **Cómo usar:**
    1.  Ve a `Tools` > `Avatar 3.0 Emulator`.
    2.  Al entrar en **Play Mode**, se generará un panel de control.
    3.  Permite forzar valores de [parámetros](/wiki?topic=parameter) y ver en tiempo real qué capa del Animator se está reproduciendo.

---

## ¿Cuál debo usar?

| Característica | Gesture Manager | Av3 Emulator |
| :--- | :--- | :--- |
| **Interfaz Visual** | Excelente (Radial) | Básica (Botones/Sliders) |
| **Prueba de Menús** | Sí | Limitada |
| **Debug de Lógica** | Básico | Avanzado |
| **Prueba de Gestos** | Fácil (Botones) | Manual (Animator) |

**Recomendación:** Usa **Gesture Manager** para la mayoría de tus pruebas de toggles y ropa. Usa **Av3 Emulator** si tus animaciones no están activándose cuando deberían y necesitas ver qué está pasando "bajo el capó".

---

## Build & Test (La alternativa oficial)
Si necesitas probar algo que requiere la red o interacciones con otros (como [PhysBones](/wiki?topic=parameter)), usa la función **Build & Test** del SDK oficial [1]:
1.  Abre el `VRChat SDK Control Panel`.
2.  En la pestaña `Builder`, busca la sección "Offline Testing".
3.  Haz clic en `Build & Test`.
4.  Unity compilará el avatar y abrirá una instancia local de VRChat donde solo tú podrás verlo sin haberlo subido a los servidores.

---

## Referencias

[1] VRChat. (s.f.). *Expression Menu and Controls*. VRChat Documentation. https://creators.vrchat.com/avatars/expression-menu-and-controls

[2] BlackStartx. (s.f.). *VRC-Gesture-Manager*. GitHub. https://github.com/BlackStartx/VRC-Gesture-Manager

[3] Lyuma. (s.f.). *Av3Emulator*. GitHub. https://github.com/lyuma/Av3Emulator
