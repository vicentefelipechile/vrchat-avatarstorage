# Esska Desktop Puppeteer

<span class="badge">UTILIDAD</span>

## ¿Qué es?
**Esska Desktop Puppeteer** es una herramienta avanzada para usuarios de escritorio en VRChat creada por **Esska**. Consiste en un sistema de dos partes (una aplicación de escritorio y un paquete para el avatar) que permite controlar partes específicas del cuerpo de tu avatar usando el ratón de tu ordenador, ofreciendo un nivel de precisión y expresividad que normalmente solo está disponible para usuarios de Realidad Virtual (VR).

## ¿Para qué sirve?
- **Control de extremidades:** Permite mover los brazos y manos de tu avatar de forma independiente y precisa directamente con el ratón.
- **Partes personalizadas:** Facilita el control de partes adicionales del avatar, como orejas, colas o accesorios.
- **Simulación de VR en Escritorio:** Su objetivo principal es dar a los usuarios de escritorio (Desktop) una libertad de movimiento que los hace lucir como si estuvieran jugando en VR.
- **Head Tracking (Seguimiento de cabeza):** Cuenta con soporte para dispositivos TrackIR, permitiendo que la cabeza de tu avatar se mueva según tus movimientos reales.

> [!NOTE]
> Nota
> Esta herramienta utiliza **OSC (Open Sound Control)** para enviar los parámetros desde la aplicación de escritorio hacia tu cliente de VRChat. Asegúrate de tener la opción OSC activada en el menú circular (Radial Menu) de VRChat.

## ¿Dónde obtenerlo?
- [BOOTH - Esska Desktop Puppeteer](https://esska.booth.pm/items/6366670)

## Requisitos Previos
Antes de empezar, asegúrate de cumplir con lo siguiente:
- **Sistema Operativo:** Windows 10 o Windows 11.
- **Software:** [Microsoft .NET 9.0 Desktop Runtime](https://dotnet.microsoft.com/es-es/download/dotnet/9.0) instalado en tu PC.
  - *Cómo descargar:* Al entrar al enlace, busca la sección que dice "**Entorno de ejecución de escritorio de .NET**" (o ".NET Desktop Runtime" si está en inglés). En la pequeña tabla debajo, en la fila de "Windows", haz clic en el enlace que dice "**x64**" para descargar el instalador.
- **Hardware:** Un ratón (mouse) que tenga botón central (rueda de desplazamiento / scroll wheel).
- **VRChat SDK:** Instalado en tu proyecto de Unity (a través de VCC).
- **Avatar:** Un avatar humanoide compatible (funciona mejor con proporciones humanas estándar).

## Guía de Instalación Paso a Paso

El proceso de instalación se divide en dos partes fundamentales: la preparación del avatar en Unity y la configuración de la aplicación de escritorio.

### Parte 1: Instalación en el Avatar (Unity)
1. **Importar el Paquete:** Descarga el "Base Package" desde la página oficial y arrastra el archivo `.unitypackage` a la carpeta `Assets` de tu proyecto de Unity.
2. **Añadir al Avatar:** Busca el prefab incluido en el paquete de Esska Desktop Puppeteer y arrástralo sobre tu avatar en la jerarquía (`Hierarchy`).
3. **Configuración de Parámetros:** El sistema utiliza parámetros OSC. Asegúrate de que tu avatar tenga suficiente espacio en la memoria de parámetros (Parameters Memory) para acomodar los nuevos controles.
4. **Subir el Avatar:** Una vez que el prefab esté correctamente posicionado y configurado, sube tu avatar a VRChat como lo harías normalmente.

### Parte 2: Configuración de la Aplicación de Escritorio
1. **Descargar la App:** Descarga la aplicación "Esska Desktop Puppeteer App".
2. **Ejecutar:** Abre la aplicación en tu PC antes o durante tu sesión de VRChat.
3. **Activar OSC en VRChat:** Dentro de VRChat, abre tu menú circular, ve a `Options` -> `OSC` y asegúrate de que esté en **Enabled**.
4. **Uso:** Utiliza los botones de tu ratón (especialmente el botón central) y el teclado según las instrucciones de la aplicación para comenzar a mover las extremidades de tu avatar.

> [!WARNING]
> Advertencia: Privacidad y Controles
> La aplicación necesita "escuchar" tus pulsaciones de teclado y ratón (global hooks) para poder funcionar mientras tienes la ventana de VRChat activa. El creador afirma que no recopila datos personales, pero es importante saber cómo funciona el programa para evitar interferencias con otras aplicaciones.

---

## Referencias

[1] Esska. (s.f.). *Esska Desktop Puppeteer*. BOOTH. https://esska.booth.pm/items/6366670
