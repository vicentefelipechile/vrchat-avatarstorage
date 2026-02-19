# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## ¿Qué es?
**SPS** (Super Plug Shader), a veces referido de mala manera como "SSP" ya que hay alguien que le molesta que se llame así y dedica a tirarle basura al que se equivoque, es un sistema de deformación de malla gratuito y moderno para VRChat diseñado por el equipo de **VRCFury**. Permite que las partes del avatar se deformen de manera realista al interactuar con otros avatares u objetos, reemplazando a sistemas antiguos y de pago como **DPS** (Dynamic Penetration System) y **TPS** [1].

## ¿Para qué sirve?
- **Deformación realista:** Simula penetración y contacto físico deformando la malla del avatar.
- **Optimización:** Es mucho más ligero y eficiente que los sistemas antiguos.
- **Gratuito:** A diferencia de DPS, SPS es completamente gratuito y de código abierto.
- **Compatibilidad:** Funciona con la mayoría de shaders modernos (Poiyomi, LilToon, etc.) y es retrocompatible con avatares que usan DPS o TPS.

## Requisitos Previos
Antes de comenzar, asegúrate de tener lo siguiente:
- **Unity:** La versión recomendada para VRChat.
- **VRChat SDK:** Instalado en tu proyecto (VCC).
- **VRCFury:** Instalado y actualizado a la última versión [2].
- **Modelo 3D:** Un avatar con las mallas que deseas animar (orificios o peneatradres).

## Guía de Instalación Paso a Paso

SPS se gestiona completamente a través de las herramientas de VRCFury en Unity. No necesitas importar paquetes de shaders extraños ni hacer configuraciones manuales complejas de animaciones.

### Paso 1: Instalar VRCFury
Si aún no lo tienes, instala VRCFury desde el VRChat Creator Companion (VCC).
1. Abre VCC.
2. Ve a "Manage Project".
3. Busca "VRCFury" en la lista de paquetes y dale a instalar (o añade el repositorio si no te sale).

### Paso 2: Crear un Socket (Orificio)
Un "Socket" es el receptor de la interacción (boca, etc.).

1. **Herramientas:** En la barra superior de Unity, ve a `Tools` > `VRCFury` > `SPS` > `Create Socket` [1].
2. **Colocación:** Aparecerá un nuevo objeto en tu escena.
   - Arrastra este objeto dentro de la jerarquía de tu avatar, y **hazlo hijo del hueso** correspondiente (ej: `Hip` o `Head`).
3. **Ajuste:** Mueve y rota el objeto Socket para que coincida con la entrada del orificio en tu malla.
   - La flecha del gizmo debe apuntar **hacia adentro** del orificio.
   - Asegúrate de que el tipo de Socket (en el inspector) coincida con lo que quieres (ej: Vagina, Anal, Oral).
4. **Luces:** No necesitas configurar luces ID manualmente; VRCFury lo hace por ti.

> [!TIP]
> **Nota de Colocación (ERP)**
> No pongas los puntos (Sockets) muy adentro del avatar. Si el "agujero" está demasiado profundo, resulta difícil hacer ERP cómodamente. Se recomienda colocarlos justo en la entrada o ligeramente hacia afuera.
>
> **Ojo con las Proporciones Grandes:** Si tu avatar tiene caderas muy anchas o un trasero muy grande ("culos enormes"), **saca el Socket aún más hacia afuera**. De lo contrario, la otra persona chocará con la malla del cuerpo antes de poder "alcanzar" el punto de interacción.

### Paso 3: Crear un Plug (Penetrador)
Un "Plug" es el objeto que penetra y se deforma.

1. **Preparación de la Malla:**
   - Asegúrate de que tu malla de penetrador esté "recta" y "extendida" en la posición de descanso en Unity. SPS necesita saber cuál es la longitud total.
   - Si vienes de DPS/TPS, asegúrate de quitar los scripts antiguos o materiales especiales. Usa un shader normal (Poiyomi) [1].
2. **Herramientas:** Ve a `Tools` > `VRCFury` > `SPS` > `Create Plug` [1].
3. **Colocación:**
   - **Opción A (Con huesos):** Si tu pene tiene huesos, arrastra el objeto Plug y hazlo hijo del **hueso base** del pene.
   - **Opción B (Sin huesos):** Si es solo una malla (mesh renderer), arrastra el objeto Plug y suéltalo directamente sobre el objeto con el **Mesh Renderer**.
4. **Configuración:**
   - En el inspector del componente `VRCFury | SPS Plug`, asegúrate de que el **Renderer** sea la malla de tu pene.
   - Ajusta la orientación: La parte curva del gizmo debe estar en la punta y la base en la base.
   - Configura el **Type** (tipo) adecuado.

### Paso 4: Probar en Unity
No necesitas subir el avatar para probar si funciona.
1. Instala **Gesture Manager** desde el VCC [1].
2. Entra en el **Play Mode** de Unity.
3. Selecciona el Gesture Manager.
4. En el menú de expresiones emulado, ve a las opciones de SPS.
   - VRCFury genera automáticamente un menú de prueba con opciones para activar/desactivar y probar la deformación.
   - Puedes crear un "Test Socket" desde el menú de herramientas para probar la interacción en tiempo real.

> [!WARNING]
> Advertencia: Constraints
> Evita usar Constraints de Unity en los mismos huesos que SPS deforma, ya que pueden causar conflictos de movimiento (jitter) [4].

---

## Referencias

[1] VRCFury. (s.f.). *SPS (Super Plug Shader)*. VRCFury Documentation. https://vrcfury.com/sps

[2] VRCFury. (s.f.). *Download & Install*. VRCFury Documentation. https://vrcfury.com/download

[3] VRCD. (s.f.). *SPS Tutorial*. VRCD. https://vrcd.org.cn

[4] VRCFury. (s.f.). *SPS Troubleshooting*. VRCFury Documentation. https://vrcfury.com/sps/troubleshooting
