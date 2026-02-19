# SPS (Super Plug Shader)

<span class="badge badge-purple">ERP</span> <span class="badge badge-red">NSFW</span>

## ¿Qué es?
**SPS** (Super Plug Shader), a veces referido coloquialmente como "SSP", es un sistema de deformación de malla gratuito y moderno para VRChat. Permite que las partes del avatar se deformen de manera realista al interactuar con otros avatares u objetos, reemplazando a sistemas antiguos y de pago como **DPS** (Dynamic Penetration System).

## ¿Para qué sirve?
- **Deformación realista:** Simula penetración y contacto físico deformando la malla del avatar.
- **Optimización:** Es mucho más ligero y eficiente que los sistemas antiguos.
- **Gratuito:** A diferencia de DPS, SPS es completamente gratuito y de código abierto.
- **Compatibilidad:** Funciona con la mayoría de shaders modernos (Poiyomi, LilToon, etc.).

## ¿Dónde obtenerlo?
SPS viene integrado y se gestiona principalmente a través de **VRCFury**. No necesitas descargar un "shader" separado manualmente si usas VRCFury.

- [VRCFury (Incluye SPS)](https://vrcfury.com)
- [Guía oficial de SPS](https://vrcfury.com/sps)

## ¿Cómo instalarlo?
La instalación se realiza casi enteramente dentro de Unity usando **VRCFury**:

1. Asegúrate de tener **VRCFury** instalado en tu proyecto (ver guía de VRCFury).
2. En tu avatar, selecciona el objeto de malla (mesh) o el hueso donde quieres añadir el componente.
3. Añade un componente **VRCFury** al objeto.
4. En el componente VRCFury, busca y añade la prop **SPS Plug** (para el penetrador) o **SPS Socket** (para el orificio).
5. Configura los parámetros (tamaño, tipo) directamente en el componente.
6. ¡Listo! Al subir el avatar, VRCFury generará automáticamente todas las animaciones, menús y lógica necesaria.

> [!TIP]
> Compatibilidad con DPS
> SPS es capaz de interactuar con avatares que usan DPS antiguo. No necesitas que la otra persona tenga SPS para que funcione.
