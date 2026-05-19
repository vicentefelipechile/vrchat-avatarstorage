# Удаление GoGo Loco из проекта Unity

<span class="badge badge-blue">Logic</span>

## Что это такое?

GoGo Loco — это префаб перемещения, созданный Franada, который заменяет или модифицирует несколько игровых слоев (Playable Layers) в Avatar Descriptor (Base/Locomotion, Additive, Gesture) и внедряет собственные параметры и записи в Expression Menu аватара. Поскольку он затрагивает так много взаимосвязанных частей проекта аватара, его полное удаление требует работы на нескольких уровнях — от объектов сцены до ассетов на уровне проекта и, если применимо, манифеста VPM.

> [!WARNING]
> Всегда делайте резервную копию вашего проекта Unity (или коммит в систему контроля версий) перед началом этого процесса. Многие из этих шагов удаляют или перезаписывают контроллеры анимации (Animator Controllers) и ассеты Expression, которые могут использоваться совместно с другими частями вашего аватара.

## Для чего это нужно?

- Замена GoGo Loco другой системой передвижения (например, перемещением Modular Avatar, Locomotion Fix от WetCat или контроллерами VRChat по умолчанию).
- Очистка купленного аватара, который поставлялся с предустановленным GoGo Loco, но он вам не нужен.
- Разрешение конфликтов с NSFW Locomotion или другими пакетами, которые используют такие же названия слоев и параметров, как у GoGo Loco.
- Снижение использования памяти параметров (по умолчанию GoGo Loco потребляет 16–17 бит синхронизируемой памяти).

## Шаг 1: Удаление префаба из сцены

GoGo Loco может быть установлен как дочерний GameObject в корне аватара, особенно если он настроен через VRCFury или Modular Avatar.

1. Откройте сцену, содержащую ваш аватар, в окне **Hierarchy**.
2. Разверните корневой GameObject аватара.
3. Найдите любой дочерний объект с именем `GoGo Loco`, `GGL`, `GoGoLoco` или подобным. Выберите его и нажмите **Delete**.
4. Если GoGo Loco был установлен через [VRCFury](/wiki?topic=vrcfury), найдите дочерний объект с компонентом `VRCFury`, который ссылается на префаб GoGo Loco, — удалите этот объект тоже.
5. Если он был установлен через [Modular Avatar](/wiki?topic=modular-avatar), найдите дочерний объект с компонентом `MA Merge Animator` или `MA Menu Installer`, указывающим на ассеты GoGo Loco, и удалите его.

> [!NOTE]
> Если аватар был куплен и GoGo Loco был встроен в него (т.е. отдельного дочернего GameObject не существует), пропустите этот шаг и перейдите сразу к Шагу 2.

## Шаг 2: Восстановление Playable Layers в Avatar Descriptor

GoGo Loco заменяет до трех из пяти Playable Layers в компоненте `VRCAvatarDescriptor`. Вам нужно переназначить каждый из них на контроллеры VRChat по умолчанию или на ваши собственные пользовательские контроллеры.

1. Выберите корень аватара в иерархии и найдите компонент **VRC Avatar Descriptor** в инспекторе.
2. Разверните раздел **Playable Layers**.
3. Для каждого из следующих слоев проверьте, назначен ли в данный момент контроллер GoGo Loco (имена файлов будут начинаться с `go_` или содержать `GoGoLoco/GGL`):

| Слой | Имя файла GoGo Loco (примерное) | Замена по умолчанию |
| :------------ | :--------------------------------- | :---------------------------------------------------- |
| **Base** | `go_locomotion` | `vrc_AvatarV3LocomotionLayer` (из примеров VRCSDK) |
| **Additive** | `go_additive` | `vrc_AvatarV3IdleLayer` (из примеров VRCSDK) |
| **Gesture** | `go_gesture` | `vrc_AvatarV3HandsLayer` (из примеров VRCSDK) |

4. Для каждого затронутого слоя нажмите маленький кружок выбора справа от поля и назначьте соответствующий контроллер VRChat по умолчанию или назначьте свой собственный пользовательский контроллер.
5. Если у вас нет контроллеров VRChat по умолчанию в вашем проекте, их можно найти в `Assets/VRCSDK/Examples3/Animation/Controllers/`.

> [!TIP]
> Если у вашего аватара были пользовательские жесты руками до добавления GoGo Loco, вам следует восстановить здесь ваш исходный контроллер слоя Gesture, а не контроллер VRChat по умолчанию — проверьте вашу систему контроля версий или резервные копии.

## Шаг 3: Удаление слоев GoGo Loco из FX Controller

Для функции полета GoGo Loco объединяет два дополнительных слоя в FX Animator Controller аватара. Они остаются даже после удаления префаба и должны быть удалены вручную.

1. Найдите FX Animator Controller вашего аватара в окне Project и дважды щелкните его, чтобы открыть окно **Animator**.
2. На панели **Layers** слева найдите слои с названиями `GoGo Fly`, `GoGo Freeze` или любой слой, имя которого начинается с `go_`.
3. Щелкните правой кнопкой мыши каждый слой GoGo Loco и выберите **Delete Layer**.
4. В том же окне Animator перейдите на вкладку **Parameters**.
5. Удалите каждый параметр, принадлежащий GoGo Loco. Общие включают:

| Имя параметра | Тип |
| :-------------- | :------ |
| `Go/Freeze` | Bool |
| `Go/Fly` | Bool |
| `Go/Loco` | Bool |
| `Go/Crouch` | Bool |
| `Go/Prone` | Bool |
| `Go/Pose` | Int |
| `Go/PlaySpace` | Float |
| `VelocityMagnitude` | Float |

Параметры, которые начинаются с `go_` или `Go/`, являются параметрами GoGo Loco. Удалите их все. Параметры, такие как `VelocityY`, `VRCFaceBlendH`, `Grounded` и т.д., являются стандартными встроенными параметрами VRChat — **не** удаляйте их.

> [!CAUTION]
> Удаление параметра, на который все еще ссылается оставшееся состояние анимации или переход, приведет к поломке этих состояний. Всегда проверяйте, что никакие слои, не относящиеся к GoGo Loco, не зависят от параметра перед его удалением.

## Шаг 4: Очистка ассета Expression Parameters

GoGo Loco добавляет свои параметры в ассет `VRCExpressionParameters` аватара, потребляя синхронизируемую память. Каждый оставленный параметр GoGo Loco тратит биты впустую.

1. В окне Project найдите файл `.asset`, назначенный полю **Expression Parameters** в Avatar Descriptor.
2. Выберите его и посмотрите на список параметров в инспекторе.
3. Удалите каждую запись, соответствующую параметру GoGo Loco (те же имена, что указаны в Шаге 3).
4. Убедитесь, что значение **Total Cost**, отображаемое в нижней части инспектора, уменьшилось после удаления.

## Шаг 5: Удаление пункта меню GoGo Loco

GoGo Loco устанавливает пункт подменю в корневое Expression Menu аватара.

1. Найдите файл `.asset`, назначенный полю **Expressions Menu** в Avatar Descriptor.
2. Выберите его и проверьте список **Controls**.
3. Удалите любую запись с именем `GoGo Loco`, `GGL`, `Loco` или подобную, которая ссылается на ассет подменю GoGo Loco.
4. Рекурсивно откройте каждое оставшееся подменю и удалите любые вложенные элементы управления GoGo Loco.

## Шаг 6: Удаление файлов ассетов GoGo Loco из проекта

После отключения GoGo Loco от аватара удалите его файлы из проекта Unity, чтобы сохранить чистоту папки `Assets/`.

1. В окне Project введите `go_` в строку поиска (убедитесь, что область поиска установлена на **All**).
2. Просмотрите результаты — файлы, начинающиеся с `go_`, почти всегда являются ассетами GoGo Loco (Animation Clips, Animator Controllers, Textures, Materials для значков меню).
3. Также выполните поиск по `GoGoLoco` и `GGL`, чтобы найти файлы, в которых используется полное имя.
4. Выберите все подтвержденные ассеты GoGo Loco и нажмите **Delete** (или щелкните правой кнопкой мыши → **Delete**).
5. Unity попросит вас подтвердить удаление. Примите.

> [!WARNING]
> Не удаляйте ассеты, имена которых начинаются с `go_`, если они принадлежат вашему собственному проекту (например, GameObject или анимация, которые вы так назвали). Проверьте каждый файл перед удалением.

Общие места расположения папок для файлов GoGo Loco:

- `Assets/GoGoLoco/`
- `Assets/Franada/GoGoLoco/`
- `Assets/GoGo Loco/`
- В любом месте, где купленный аватар мог распаковать свой `.unitypackage`.

Удалите всю папку после подтверждения, что все содержащиеся в ней файлы принадлежат GoGo Loco.

## Шаг 7: Удаление пакета VPM (только при установке через VCC)

Если GoGo Loco был установлен как пакет VPM через VRChat Creator Companion, файлы пакета находятся в `Packages/`, а не в `Assets/`, и должны быть удалены через VCC или манифест.

### Вариант А — Через графический интерфейс VCC

1. Откройте **VRChat Creator Companion**.
2. Перейдите к своему проекту на вкладке **Projects** и нажмите **Manage Project**.
3. В списке пакетов найдите `GoGoLoco` (ID пакета `com.franada.gogoloco` или подобный).
4. Нажмите кнопку **минус (−)** или установите раскрывающееся меню версии на **Remove** и примените.
5. Снова откройте проект в Unity. Resolver обнаружит удаление и очистит папку `Packages/`.

### Вариант B — Через `vpm-manifest.json` (вручную)

1. Закройте Unity.
2. Откройте `<ВашПроект>/Packages/vpm-manifest.json` в текстовом редакторе.
3. Удалите запись для GoGo Loco из объектов `"dependencies"` и `"locked"`.
4. Удалите физическую папку `<ВашПроект>/Packages/com.franada.gogoloco/` (или ее эквивалент).
5. Снова откройте Unity. Resolver выполнит повторное сканирование и подтвердит отсутствие пропавших пакетов.

> [!NOTE]
> Удаление пакета VPM не отменяет автоматически слои, параметры, меню или дочерние объекты префабов, добавленные во время установки. Шаги 1–6 все равно должны быть выполнены независимо от того, какой метод установки использовался.

## Шаг 8: Повторное включение Force Locomotion (если необходимо)

Когда установлен GoGo Loco, он обычно снимает флажок **Force Locomotion animations for 6-point tracking** в Avatar Descriptor, потому что его пользовательский слой Locomotion внутренне управляет режимами отслеживания. После удаления вы можете захотеть восстановить поведение по умолчанию.

1. Выберите корень аватара и откройте **VRC Avatar Descriptor** в инспекторе.
2. Прокрутите до раздела **IK**.
3. Снова установите флажок **Force Locomotion animations for 6 point tracking**, если вы используете контроллер VRChat Locomotion по умолчанию.

> [!TIP]
> Если вы не используете отслеживание всего тела (FBT), этот флажок не имеет видимого эффекта и его можно оставить в любом состоянии.

## Контрольный список для проверки

Перед загрузкой аватара подтвердите все следующее:

| Проверка | Как проверить |
| :---------------------------------------- | :--------------------------------------------------- |
| Нет дочернего объекта GoGo Loco в иерархии | Изучите иерархию аватара в сцене Unity |
| Playable Layers указывают на правильные контроллеры | VRC Avatar Descriptor → Раздел Playable Layers |
| Нет слоев `go_` в FX Controller | Откройте FX Animator Controller → Панель Layers |
| Нет параметров `go_` / `Go/` в FX | Откройте FX Animator Controller → Панель Parameters |
| Нет записей GoGo Loco в Expression Parameters | Проверьте файл `.asset` в инспекторе |
| Нет записей GoGo Loco в Expression Menu | Рекурсивно проверьте файл `.asset` корневого меню |
| Нет файлов GoGo Loco в `Assets/` | Поиск в окне Project по `go_`, `GoGoLoco`, `GGL` |
| Нет пакета GoGo Loco в `vpm-manifest.json` | Откройте файл в текстовом редакторе и найдите `gogoloco` |
| Настройка Force Locomotion сделана намеренно | VRC Avatar Descriptor → Раздел IK |

## Сводная таблица

| Что добавляет GoGo Loco | Где это удалить |
| :---------------------------------------------- | :------------------------------------------------ |
| Дочерний префаб/GameObject в корне аватара | Unity Hierarchy → удалить дочерний объект |
| Playable Layers Base, Additive, Gesture | VRC Avatar Descriptor → Playable Layers |
| Слои FX (`GoGo Fly`, `GoGo Freeze`, `go_*`) | FX Animator Controller → Панель Layers |
| Параметры FX (`Go/*`, `VelocityMagnitude` и т.д.) | FX Animator Controller → Панель Parameters |
| Записи в Expression Parameters | VRCExpressionParameters `.asset` → Список Controls |
| Запись подменю в Expression Menu | VRCExpressionsMenu `.asset` → Список Controls |
| Файлы ассетов (`go_*.anim`, контроллеры, текстуры) | Окно Project → удалить папку `GoGoLoco` |
| Запись пакета VPM | Графический интерфейс VCC или `vpm-manifest.json` |
| Флажок Force Locomotion снят | VRC Avatar Descriptor → Раздел IK (восстановить) |

## Источники

* Jellejurre, JustSleightly. (2024). _Playable Layers_. VRC School. https://vrc.school/docs/Avatars/Playable-Layers
* Shadsterwolf. (2023). _ShadstersAvatarTools — README_. GitHub. https://github.com/Shadsterwolf/ShadstersAvatarTools
* Franada. (2023). _gogoloco-legacy — Releases_. GitHub. https://github.com/Franada/gogoloco-legacy/releases
* VRChat. (2024). _CLI — VRChat Creator Companion_. Документация VRChat Creator Companion. https://vcc.docs.vrchat.com/vpm/cli/
* VRChat. (2024). _Community Repositories — VRChat Creator Companion_. Документация VRChat Creator Companion. https://vcc.docs.vrchat.com/guides/community-repositories/
* VRChat Wiki Contributors. (2025). _Community:GoGo Loco_. VRChat Wiki. https://wiki.vrchat.com/wiki/Community:GoGo_Loco
* LastationVRChat. (2024). _NSFW-Locomotion — README_. GitHub. https://github.com/LastationVRChat/NSFW-Locomotion
