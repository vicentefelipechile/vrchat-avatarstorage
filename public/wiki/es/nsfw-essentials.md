# Guía Esencial NSFW

<span class="badge badge-red">NSFW</span> <span class="badge">TOS</span> <span class="badge">OPTIMIZACIÓN</span>

## Introducción
VRChat permite una gran libertad creativa, incluyendo contenido para adultos (NSFW) y erótico (ERP). Sin embargo, es **CRUCIAL** entender las reglas y las herramientas adecuadas para disfrutar de este contenido sin arriesgar tu cuenta o el rendimiento de los demás.

## Reglas de VRChat (TOS)
VRChat tiene una política de tolerancia cero con cierto contenido en espacios públicos.

- **Mundos Públicos:** Está **estrictamente prohibido** mostrar contenido sexualmente explícito, desnudez o comportamiento erótico en instancias públicas. Hacerlo puede resultar en un **baneo permanente**.
- **Mundos Privados:** El contenido NSFW y el ERP se toleran en instancias privadas (Friends+, Invite, etc.) donde todos los participantes son adultos y han dado su consentimiento.
- **Avatares:** Puedes subir avatares NSFW, pero **NO** debes usar sus funciones explícitas en público. Usa el sistema de "Toggles" para mantener todo oculto por defecto.

## Herramientas Esenciales
Para tener una experiencia completa, estas son las herramientas estándar que la mayoría de la comunidad utiliza:

1.  **VRCFury:** La herramienta "navaja suiza". Esencial para añadir Toggles, ropa y sistemas complejos sin romper tu avatar.
    *   [Ver guía de VRCFury](/wiki?topic=vrcfury)
2.  **SPS (Super Plug Shader):** El sistema estándar para interacción física (penetración y deformación). Es gratuito y mucho mejor que el antiguo DPS.
    *   [Ver guía de SPS](/wiki?topic=sps)
3.  **OscGoesBrrr (OGB):** El estándar de oro para conectar juguetes sexuales (Lovense) a VRChat mediante vibración háptica.
    *   [Ver guía de Hápticos](/wiki?topic=haptics)

## Optimización y Memoria de Texturas
Los avatares NSFW tienden a ser "pesados" debido a la gran cantidad de ropa y texturas de piel alta calidad.

- **VRAM (Memoria de Video):** Es el recurso más escaso. Si tu avatar usa más de 150MB de memoria de texturas, harás que la gente se "crashee" (se le cierre el juego).
- **Compresión:** Asegúrate siempre de comprimir tus texturas en Unity. Una textura 4K sin comprimir ocupa mucho espacio.

## Contactos y PhysBones
La interacción en VRChat se basa en **Contactos** (VRCContactReceiver y VRCContactSender).
- **Headpat (Acariciar):** Se hace detectando la mano en la cabeza.
- **Interacción Sexual:** SPS y OGB usan contactos para detectar cuándo un objeto entra en otro, activando animaciones, sonidos o vibraciones en tu juguete real.
