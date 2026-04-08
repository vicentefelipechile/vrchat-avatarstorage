# VRCQuestTools

<span class="badge">HERRAMIENTA</span>

## ¿Qué es?

VRCQuestTools es una extensión de Unity desarrollada por **kurotu** que permite convertir avatares de VRChat diseñados para PC hacia la plataforma Android (Meta Quest/PICO). Esta herramienta automatiza el proceso de hacer un avatar compatible con las estrictas limitaciones de rendimiento de los dispositivos móviles.

> [!NOTE]
> VRCQuestTools funciona mediante el sistema **Non-Destructive Modular Framework (NDMF)** en sus versiones más recientes, lo que permite procesar el avatar sin modificar los archivos originales.

## ¿Para qué sirve?

- Convertir avatares de PC a Android con unos pocos clics
- Reducir polígonos y materiales automáticamente
- Eliminar componentes no compatibles con Quest (Lights, Cloth, etc.)
- Ajustar texturas y materiales para optimizar rendimiento
- Utilidades varias para subir avatares a Quest

> [!WARNING]
> IMPORTANTE: Los avatares de VRoid Studio no son compatibles con Android debido a su uso intensivo de materiales transparentes. VRCQuestTools no puede ayudarte con estos avatares; debes modificarlos manualmente.

## Requisitos del entorno

| Requisito                    | Versión mínima                        |
| ---------------------------- | ------------------------------------- |
| Unity                        | 2019.4.31f1, 2022.3.6f1 o 2022.3.22f1 |
| VRChat SDK                   | Avatars 3.3.0 o posterior             |
| Módulo Android Build Support | Instalado en Unity                    |

## ¿Dónde obtenerlo?

- **Página Oficial:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **Documentación:** [Documentación VRCQuestTools](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth (Donación):** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## ¿Cómo instalarlo?

### Instalación mediante VCC (VRChat Creator Companion)

1. Añade el repositorio a VCC:
   - Haz clic en: [Add VRCQuestTools to VCC](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - O ve a **Settings** → **Packages** → **Add Repository**, pega la URL `https://kurotu.github.io/vpm-repos/vpm.json` y haz clic en **Add**
2. Ve a **Manage Project** para tu proyecto
3. En la lista de paquetes, busca **VRCQuestTools** y haz clic en el **[+]** para añadirlo
4. Haz clic en **Open Project** en VCC

## ¿Cómo convertir un avatar para Android?

### Método rápido (No destructivo con NDMF)

1. Haz clic derecho sobre tu avatar en la jerarquía de Unity
2. Selecciona **VRCQuestTools** → **Convert Avatar For Android**
3. En la ventana que se abre, haz clic en **Begin Converter Settings** y luego en **Convert**
4. Espera a que termine la conversión
5. Ve a **File** → **Build Settings**
6. Selecciona la plataforma **Android** y haz clic en **Switch Platform**
7. Espera a que Unity cambie la plataforma
8. Sube el avatar convertido a VRChat

> [!TIP]
> El avatar original se desactiva después de la conversión. Puedes activarlo nuevamente desde el Inspector si lo necesitas.

> [!NOTE]
> El avatar convertido **no optimiza automáticamente el rendimiento**. En la mayoría de los casos, el avatar convertido tendrá clasificación **Very Poor** para Android. Usa la configuración de Avatar Display (Mostrar Avatar) para verlo de todos modos.

## Limitaciones de rendimiento en Quest

| Métrica            | Excellent | Good   | Medium | Poor   | Very Poor |
| ------------------ | --------- | ------ | ------ | ------ | --------- |
| **Triángulos**     | 7,500     | 10,000 | 15,000 | 20,000 | >20,000   |
| **Material Slots** | 1         | 1      | 1      | 2      | >2        |
| **Skinned Meshes** | 1         | 1      | 1      | 2      | >2        |
| **PhysBones**      | 2         | 4      | 6      | 8      | >8        |

> [!NOTE]
> Por defecto, el nivel de **Minimum Displayed Performance Rank** en dispositivos móviles está configurado en **Medium**. Esto significa que los avatares clasificados como Poor o Very Poor no serán visibles para otros usuarios, a menos que decidan mostrar tu avatar manualmente.

Para más información sobre el sistema de ranking de rendimiento, consulta la [documentación oficial de VRChat](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/).

## Relación con otras herramientas

- **[Modular Avatar](/wiki?topic=modular-avatar)**: Si usas Modular Avatar u otras herramientas NDMF, la conversión será completamente no destructiva.
- **[VRCFury](/wiki?topic=vrcfury)**: VRCFury puede ayudarte a preparar animaciones y gestos antes de convertir.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**: Debes asegurarte de que los shaders sean compatibles con Android después de la conversión.

---

## Referencias

kurotu. (s. f.). _VRCQuestTools - Avatar Converter and Utilities for Android_. GitHub Pages. https://kurotu.github.io/VRCQuestTools/

kurotu. (s. f.). _Introduction_. VRCQuestTools Docs. https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). _kurotu/VRCQuestTools_ [Software]. GitHub. https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). _Performance Ranks_. VRChat Creator Documentation. https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
