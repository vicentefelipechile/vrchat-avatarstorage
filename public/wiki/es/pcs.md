# PCS (Penetration Contact System)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span> <span class="badge badge-blue">Audio</span>

## ¿Qué es?
**PCS** (Penetration Contact System), creado por **Dismay** [1], es un sistema complementario para avatares de VRChat que utiliza los **Contactos** (Contact Senders y Receivers) para añadir interactividad avanzada a las relaciones sexuales (ERP).

Su función principal es generar **feedback auditivo** (sonidos). Opcionalmente, permite controlar juguetes sexuales reales mediante vibración (Hápticos) [3][4].

### Diferencia Clave
- **Sin OSC (Básico):** El sistema reproduce sonidos de "slap", "slide" y fluidos dentro del juego. Todos los que estén cerca pueden escucharlo. Funciona de manera autónoma en VRChat [1].
- **Con OSC (Avanzado/Opcional):** Envía datos fuera de VRChat para hacer vibrar juguetes sexuales (Lovense, etc.) sincronizados con la penetración.

## Funcionalidad Básica (Sonido)
Esta es la función por defecto de PCS y **no requiere software externo**.

1. **Detección:** Los "Receivers" (orificios) detectan cuando un "Sender" (pene/penetrador) entra en ellos.
2. **Sonido Dinámico:**
   - Al rozar la entrada: Sonidos de roce o "slap".
   - Al penetrar: Sonidos de fricción/líquidos ("squelch") que varían de intensidad según la velocidad y profundidad.
3. **Plug & Play:** Una vez instalado en el avatar, funciona automáticamente con cualquier otro usuario que tenga configurado sus "Senders" (o si tú tienes los "Receivers").

## Integración OSC y Hápticos (Opcional)
**OSC** (Open Sound Control) es un protocolo que permite a VRChat "hablar" con programas externos [3]. PCS usa esto para convertir la acción del juego en vibraciones reales.

### ¿Por qué existe esta integración?
Para aumentar la inmersión. Si tienes un juguete sexual compatible, PCS le "dice" al juguete cuándo y con qué intensidad vibrar basándose en qué tan profundo está el penetrador en el juego.

### Requisitos para Hápticos
- **Juguete Compatible:** (Ej. Lovense Hush, Lush, Max, etc.).
- **Software Puente:** Un programa que recibe la señal de VRChat y controla el juguete.
  - *OscGoesBrrr* (Gratis, popular) [3].
  - *VibeGoesBrrr*.
  - *Intiface Central* (Motor de conexión) [4].

### Configuración de OSC
Solo necesitas activar esto si vas a usar juguetes:
1. En VRChat, abre el **Action Menu**.
2. Ve a `Options` > `OSC` > **Enabled**.
3. Abre tu software puente y conecta tu juguete.

---

## Guía de Instalación en Unity
Esto instala tanto el sistema de sonido como los parámetros para OSC (aunque no lo uses, los parámetros están ahí por defecto).

### Requisitos
- **Unity** y **VRChat SDK 3.0**.
- **Asset PCS** (Paquete de Dismay) [1].
- **VRCFury** (Altamente recomendado para facilitar la instalación) [2].

### Paso 1: Importar
Arrastra el `.unitypackage` de PCS a tu proyecto.

### Paso 2: Configurar Componentes
El sistema usa dos tipos de prefabs:

**A. El que recibe (Orificios)**
1. Busca el prefab `PCS_Orifice`.
2. Colócalo dentro del hueso correspondiente (Hips, Head, etc.).
3. Alinéalo con la entrada del agujero de tu malla.

**B. El que penetra (Penetradores)**
1. Busca el prefab `PCS_Penetrator`.
2. Colócalo dentro del hueso del pene.
3. Alinéalo para que cubra el largo del pene.

### Paso 3: Finalizar
Si usas VRCFury, el sistema se fusionará automáticamente al subir el avatar.
Si no, usa **Avatars 3.0 Manager** para fusionar el FX Controller y los Parámetros de PCS con los de tu avatar.

---

## Referencias

[1] Dismay. (s.f.). *Penetration Contact System*. Booth. https://dismay.booth.pm/items/5001027

[2] VRCFury. (s.f.). *VRCFury Documentation*. https://vrcfury.com

[3] OscGoesBrrr. (s.f.). *OscGoesBrrr*. https://osc.toys

[4] Intiface. (s.f.). *Intiface Central*. https://intiface.com/desktop/
