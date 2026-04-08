# VRCQuestTools

<span class="badge">ИНСТРУМЕНТ</span>

## Что это?

VRCQuestTools — это расширение Unity, разработанное **kurotu**, которое позволяет конвертировать аватары VRChat, предназначенные для PC, на платформу Android (Meta Quest/PICO). Этот инструмент автоматизирует процесс создания аватара, совместимого с жёсткими ограничениями производительности мобильных устройств.

> [!NOTE]
> VRCQuestTools работает через систему **Non-Destructive Modular Framework (NDMF)** в последних версиях, что позволяет обрабатывать аватар без изменения исходных файлов.

## Для чего это нужно?

- Конвертация аватаров PC в Android несколькими щелчками мыши
- Автоматическое уменьшение полигонов и материалов
- Удаление компонентов, несовместимых с Quest (Lights, Cloth и т.д.)
- Настройка текстур и материалов для оптимизации производительности
- Различные утилиты для загрузки аватаров на Quest

> [!WARNING]
> ВАЖНО: Аватары VRoid Studio несовместимы с Android из-за интенсивного использования прозрачных материалов. VRCQuestTools не может помочь с такими аватарами; вы должны修改 их вручную.

## Требования к окружению

| Требование                   | Минимальная версия                      |
| ---------------------------- | --------------------------------------- |
| Unity                        | 2019.4.31f1, 2022.3.6f1 или 2022.3.22f1 |
| VRChat SDK                   | Avatars 3.3.0 или выше                  |
| Модуль Android Build Support | Установлен в Unity                      |

## Где получить?

- **Официальная страница:** [kurotu.github.io/VRCQuestTools](https://kurotu.github.io/VRCQuestTools/)
- **Документация:** [Документация VRCQuestTools](https://kurotu.github.io/VRCQuestTools/docs/intro)
- **GitHub:** [kurotu/VRCQuestTools](https://github.com/kurotu/VRCQuestTools)
- **Booth (Пожертвование):** [kurotu.booth.pm](https://kurotu.booth.pm/items/2436054)

## Как установить?

### Установка через VCC (VRChat Creator Companion)

1. Добавьте репозиторий в VCC:
   - Нажмите: [Добавить VRCQuestTools в VCC](vcc://vpm/addRepo?url=https://kurotu.github.io/vpm-repos/vpm.json)
   - Или перейдите в **Settings** → **Packages** → **Add Repository**, вставьте URL `https://kurotu.github.io/vpm-repos/vpm.json` и нажмите **Add**
2. Перейдите в **Manage Project** для вашего проекта
3. В списке пакетов найдите **VRCQuestTools** и нажмите **[+]** для добавления
4. Нажмите **Open Project** в VCC

## Как конвертировать аватар для Android?

### Быстрый метод (неразрушающий с NDMF)

1. Щёлкните правой кнопкой мыши по аватару в иерархии Unity
2. Выберите **VRCQuestTools** → **Convert Avatar For Android**
3. В открывшемся окне нажмите **Begin Converter Settings**, затем **Convert**
4. Дождитесь завершения конвертации
5. Перейдите в **File** → **Build Settings**
6. Выберите платформу **Android** и нажмите **Switch Platform**
7. Дождитесь, пока Unity переключит платформу
8. Загрузите конвертированный аватар в VRChat

> [!TIP]
> Оригинальный аватар деактивируется после конвертации. При необходимости вы можете повторно активировать его в Inspector.

> [!NOTE]
> Конвертированный аватар **не оптимизирует производительность автоматически**. В большинстве случаев конвертированный аватар получит рейтинг **Very Poor** для Android. Используйте настройку Avatar Display (Показать аватар), чтобы просмотреть его.

## Ограничения производительности Quest

| Метрика            | Excellent | Good   | Medium | Poor   | Very Poor |
| ------------------ | --------- | ------ | ------ | ------ | --------- |
| **Треугольники**   | 7,500     | 10,000 | 15,000 | 20,000 | >20,000   |
| **Material Slots** | 1         | 1      | 1      | 2      | >2        |
| **Skinned Meshes** | 1         | 1      | 1      | 2      | >2        |
| **PhysBones**      | 2         | 4      | 6      | 8      | >8        |

> [!NOTE]
> По умолчанию уровень **Minimum Displayed Performance Rank** на мобильных устройствах установлен на **Medium**. Это означает, что аватары с рейтингом Poor или Very Poor не будут видны другим пользователям, если они не решат вручную показать ваш аватар.

Для получения дополнительной информации о системе рейтинга производительности см. [официальную документацию VRChat](https://creators.vrchat.com/avatars/avatar-performance-ranking-system/).

## Связь с другими инструментами

- **[Modular Avatar](/wiki?topic=modular-avatar)**: Если вы используете Modular Avatar или другие инструменты NDMF, конвертация будет полностью неразрушающей.
- **[VRCFury](/wiki?topic=vrcfury)**: VRCFury может помочь подготовить анимации и жесты перед конвертацией.
- **[Poiyomi Toon Shader](/wiki?topic=poiyomi)**: Убедитесь, что шейдеры совместимы с Android после конвертации.

---

## Ссылки

kurotu. (n.d.). _VRCQuestTools - Avatar Converter and Utilities for Android_. GitHub Pages. Retrieved from https://kurotu.github.io/VRCQuestTools/

kurotu. (n.d.). _Introduction_. VRCQuestTools Docs. Retrieved from https://kurotu.github.io/VRCQuestTools/docs/intro

kurotu. (2025). _kurotu/VRCQuestTools_ [Программное обеспечение]. GitHub. Retrieved from https://github.com/kurotu/VRCQuestTools

VRChat Inc. (2025). _Performance Ranks_. VRChat Creator Documentation. Retrieved from https://creators.vrchat.com/avatars/avatar-performance-ranking-system/
