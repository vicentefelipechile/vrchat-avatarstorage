
const translations = {
    es: {
        common: { loading: 'Cargando...', loadingResources: 'Cargando recursos...', loadingComments: 'Cargando comentarios...', loadingCleanup: 'Cargando información de limpieza...', loadingPending: 'Cargando recursos pendientes...', accessDenied: 'Acceso Denegado', noResourcesFound: 'No se encontraron recursos en esta categoría.', error: 'Error' },
        nav: { home: 'Inicio', avatars: 'Avatares', worlds: 'Mundos', assets: 'Assets', clothes: 'Ropa', others: 'Otros', login: 'Login', upload: 'Subir', admin: 'Admin', settings: 'Configuración', menu: 'Menú', wiki: 'Wiki' },
        settings: { title: 'Configuración de Usuario', avatar: 'Foto de Perfil', save: 'Guardar Cambios', success: 'Perfil actualizado correctamente', logout: 'Cerrar Sesión' },
        home: { welcome: 'Bienvenido a VRCStorage', browse: 'Explora recursos por categoría:', latest: 'Últimos Recursos' },
        card: { view: 'Ver Detalles' },
        category: { showing: 'Mostrando', of: 'de', resources: 'recursos', prev: 'Anterior', next: 'Siguiente' },
        admin: { title: 'Panel de Administrador', noPending: 'No hay recursos pendientes de aprobación.', delete: 'Eliminar', deleteConfirm: '¿Estás seguro de que deseas eliminar este comentario?', cleanupOrphaned: 'Limpiar Archivos No Asociados', cleanupConfirm: '¿Limpiar archivos no asociados? Esto eliminará archivos subidos hace más de 24 horas que no están asociados a ningún recurso.', cleaning: 'Limpiando...', cleanupSuccess: 'Limpieza exitosa: {count} archivos eliminados', error: 'Error', networkError: 'Error de red', orphanedFiles: 'Archivos No Asociados', totalMedia: 'Total de Archivos', totalResources: 'Total de Recursos', orphanedFilesFound: 'Archivos No Asociados Encontrados', orphanedFilesDesc: 'Se encontraron {count} archivos subidos hace más de {hours} horas que no están asociados a ningún recurso.', viewFileList: 'Ver lista de archivos', noOrphanedFiles: 'Sin Archivos No Asociados', noOrphanedFilesDesc: 'No hay archivos no asociados en este momento. El sistema está limpio.', pendingResources: 'Recursos Pendientes de Aprobación' },
        item: { notFound: 'Recurso No Encontrado', category: 'Categoría', uploaded: 'Subido', uuid: 'UUID', description: 'Descripción', downloads: 'Descargas', downloadMain: 'Descargar (R2 Main)', backup: 'Backup', loginReq: 'Login Requerido', loginMsg: 'Debes iniciar sesión para descargar recursos.', goToLogin: 'Ir al Login', comments: 'Comentarios', noComments: 'No hay comentarios aún.', postComment: 'Publicar Comentario', commentPlaceholder: 'Escribe tu comentario...', send: 'Enviar', sending: 'Enviando...', deleting: 'Eliminando...', loginToComment: 'Inicia sesión para comentar', underReview: 'Esperando aprobación del administrador', approve: 'Aprobar', reject: 'Rechazar', deactivate: 'Desactivar', confirmDeactivate: '¿Estás seguro de que deseas desactivar este recurso?', confirmReject: '¿Estás seguro de que deseas rechazar y eliminar este recurso?', adminPanel: 'Panel de Administrador', pendingApproval: 'Este recurso espera aprobación.' },
        login: { title: 'Login', username: 'Usuario', password: 'Password', btn: 'Entrar', hint: 'Pista: user / password', error: 'Credenciales inválidas', register: '¿No tienes cuenta? Regístrate', logout: 'Logout', logoutConfirm: '¿Seguro que quieres cerrar sesión?' },
        register: { title: 'Registro', btn: 'Registrarse', loginLink: '¿Ya tienes cuenta? Inicia sesión', success: 'Registro exitoso. Por favor inicia sesión.' },
        upload: { title: 'Subir Recurso', name: 'Título', desc: 'Descripción', cat: 'Categoría', file: 'Archivo', btn: 'Subir', success: 'Subido correctamente', thumbnail: 'Miniatura (Thumbnail)', reference: 'Galería (Imágenes/Videos)', mainFile: 'Archivo Principal', preview: 'Vista Previa', optional: 'Opcional', required: '*', uploading: 'Subiendo archivos...', uploadingThumbnail: 'Subiendo miniatura...', uploadingReference: 'Subiendo archivos de galería...', uploadingFile: 'Subiendo archivo principal...', creating: 'Creando recurso...', error: 'Error', fileTypes: 'Solo archivos RAR, ZIP o UnityPackage', imageVideo: 'Imagen o video para la vista previa', imageVideoAdditional: 'Máximo 8 archivos (Imágenes/Videos)', validFile: 'archivo válido', invalidFile: 'Archivo inválido', markdownPlaceholder: 'Escribe la descripción usando Markdown...', noContent: 'Sin contenido', resourceName: 'Nombre del recurso', errorMainFile: 'El archivo principal debe ser .rar, .zip o .unitypackage', errorThumbnail: 'Debes seleccionar una miniatura', errorThumbnailUpload: 'Error al subir miniatura', errorReferenceUpload: 'Error al subir archivos de galería', errorFileUpload: 'Error al subir archivo principal', errorCreateResource: 'Error al crear recurso', errorUnknown: 'Error desconocido', errorCaptcha: 'Por favor completa el CAPTCHA', maxFiles: 'Máximo 8 archivos permitidos', backupLinks: 'Enlaces de Respaldo (Opcional)', backupLinksHint: 'Un enlace por línea (Google Drive, Dropbox, etc.). Tambien puede ser el enlace original del producto.' },
        cats: { avatars: 'Avatares', worlds: 'Mundos', assets: 'Assets', clothes: 'Ropa', others: 'Otros' },
        wiki: {
            title: 'Wiki - Guía de Dependencias',
            poiyomi: { title: 'Poiyomi Toon Shader' },
            vrcfury: { title: 'VRCFury' },
            setup: { title: 'Guía de Instalación' },
            faq: { title: 'Preguntas Frecuentes' },
            gogoloco: { title: 'GoGo Loco' },
            gogolocoNsfw: { title: 'NSFW Locomotion' },
            sps: { title: 'SPS (Super Plug Shader)' },
            dps: { title: 'DPS (Dynamic Penetration System)' },
            insideView: { title: 'Inside View' },
            pcs: { title: 'PCS (Penetration Contact System)' },
            parameter: { title: 'Parámetros del Avatar' },
            nsfwEssentials: { title: 'Guía Esencial NSFW' },
            haptics: { title: 'Guía de Hápticos' },
            comments: { title: 'Comentarios' },
            categories: { vrchat: 'VRChat', dependencies: 'Dependencias', erp: 'ERP', informative: 'Informativo' }
        }
    },
    en: {
        common: { loading: 'Loading...', loadingResources: 'Loading resources...', loadingComments: 'Loading comments...', loadingCleanup: 'Loading cleanup info...', loadingPending: 'Loading pending resources...', accessDenied: 'Access Denied', noResourcesFound: 'No resources found in this category.', error: 'Error' },
        nav: { home: 'Home', avatars: 'Avatars', worlds: 'Worlds', assets: 'Assets', clothes: 'Clothes', others: 'Others', login: 'Login', upload: 'Upload', admin: 'Admin', settings: 'Settings', menu: 'Menu', wiki: 'Wiki' },
        settings: { title: 'User Settings', avatar: 'Profile Picture', save: 'Save Changes', success: 'Profile updated successfully', logout: 'Logout' },
        home: { welcome: 'Welcome to VRCStorage', browse: 'Browse resources by category:', latest: 'Latest Resources' },
        card: { view: 'View Details' },
        category: { showing: 'Showing', of: 'of', resources: 'resources', prev: 'Previous', next: 'Next' },
        admin: { title: 'Admin Panel', noPending: 'No resources pending approval.', delete: 'Delete', deleteConfirm: 'Are you sure you want to delete this comment?', cleanupOrphaned: 'Cleanup Unassociated Files', cleanupConfirm: 'Cleanup unassociated files? This will delete files uploaded more than 24 hours ago that are not associated with any resource.', cleaning: 'Cleaning...', cleanupSuccess: 'Cleanup successful: {count} files deleted', error: 'Error', networkError: 'Network error', orphanedFiles: 'Unassociated Files', totalMedia: 'Total Files', totalResources: 'Total Resources', orphanedFilesFound: 'Unassociated Files Found', orphanedFilesDesc: 'Found {count} files uploaded more than {hours} hours ago that are not associated with any resource.', viewFileList: 'View file list', noOrphanedFiles: 'No Unassociated Files', noOrphanedFilesDesc: 'There are no unassociated files at this time. The system is clean.', pendingResources: 'Pending Resources' },
        item: { notFound: 'Resource Not Found', category: 'Category', uploaded: 'Uploaded', uuid: 'UUID', description: 'Description', downloads: 'Downloads', downloadMain: 'Download (R2 Main)', backup: 'Backup', loginReq: 'Login Required', loginMsg: 'You must be logged in to download resources.', goToLogin: 'Go to Login', comments: 'Comments', noComments: 'No comments yet.', postComment: 'Post Comment', commentPlaceholder: 'Write your comment...', send: 'Send', sending: 'Sending...', deleting: 'Deleting...', loginToComment: 'Login to comment', underReview: 'Waiting for admin approval', approve: 'Approve', reject: 'Reject', deactivate: 'Deactivate', confirmDeactivate: 'Are you sure you want to deactivate this resource?', confirmReject: 'Are you sure you want to reject and delete this resource?', adminPanel: 'Admin Panel', pendingApproval: 'This resource is pending approval.' },
        login: { title: 'Login', username: 'Username', password: 'Password', btn: 'Login', hint: 'Hint: user / password', error: 'Invalid credentials', register: 'No account? Register', logout: 'Logout', logoutConfirm: 'Are you sure you want to log out?' },
        register: { title: 'Register', btn: 'Sign Up', loginLink: 'Already have an account? Login', success: 'Registration successful. Please login.' },
        upload: { title: 'Upload Resource', name: 'Title', desc: 'Description', cat: 'Category', file: 'File', btn: 'Upload', success: 'Upload successful', thumbnail: 'Thumbnail', reference: 'Gallery (Images/Videos)', mainFile: 'Main File', preview: 'Preview', optional: 'Optional', required: '*', uploading: 'Uploading files...', uploadingThumbnail: 'Uploading thumbnail...', uploadingReference: 'Uploading gallery files...', uploadingFile: 'Uploading main file...', creating: 'Creating resource...', error: 'Error', fileTypes: 'RAR, ZIP or UnityPackage files only', imageVideo: 'Image or video for preview', imageVideoAdditional: 'Max 8 files (Images/Videos)', validFile: 'valid file', invalidFile: 'Invalid file', markdownPlaceholder: 'Write description using Markdown...', noContent: 'No content', resourceName: 'Resource name', errorMainFile: 'Main file must be .rar, .zip or .unitypackage', errorThumbnail: 'You must select a thumbnail', errorThumbnailUpload: 'Error uploading thumbnail', errorReferenceUpload: 'Error uploading gallery files', errorFileUpload: 'Error uploading main file', errorCreateResource: 'Failed to create resource', errorUnknown: 'Unknown error', errorCaptcha: 'Please complete the CAPTCHA', maxFiles: 'Max 8 files allowed', backupLinks: 'Backup Links (Optional)', backupLinksHint: 'One URL per line (Google Drive, Dropbox, etc.). Also can be the original link of the product.' },
        cats: { avatars: 'Avatars', worlds: 'Worlds', assets: 'Assets', clothes: 'Clothes', others: 'Others' },
        wiki: {
            title: 'Wiki - Dependencies Guide',
            poiyomi: { title: 'Poiyomi Toon Shader' },
            vrcfury: { title: 'VRCFury' },
            setup: { title: 'Setup Guide' },
            faq: { title: 'FAQ' },
            gogoloco: { title: 'GoGo Loco' },
            gogolocoNsfw: { title: 'NSFW Locomotion' },
            sps: { title: 'SPS (Super Plug Shader)' },
            dps: { title: 'DPS (Dynamic Penetration System)' },
            insideView: { title: 'Inside View' },
            parameter: { title: 'Avatar Parameters' },
            nsfwEssentials: { title: 'NSFW Essentials' },
            haptics: { title: 'Haptics Guide' },
            comments: { title: 'Wiki Comments' },
            categories: { vrchat: 'VRChat', dependencies: 'Dependencies', erp: 'ERP', informative: 'Informative' }
        }
    },
    ru: {
        common: { loading: 'Загрузка...', loadingResources: 'Загрузка ресурсов...', loadingComments: 'Загрузка комментариев...', loadingCleanup: 'Загрузка информации об очистке...', loadingPending: 'Загрузка ожидающих ресурсов...', accessDenied: 'Доступ запрещен', noResourcesFound: 'Ресурсы в этой категории не найдены.', error: 'Ошибка' },
        nav: { home: 'Главная', avatars: 'Аватары', worlds: 'Миры', assets: 'Ассеты', clothes: 'Одежда', others: 'Другое', login: 'Войти', upload: 'Загрузить', admin: 'Админ', settings: 'Настройки', menu: 'Меню', wiki: 'Вики' },
        settings: { title: 'Настройки профиля', avatar: 'Фото профиля', save: 'Сохранить изменения', success: 'Профиль успешно обновлен', logout: 'Выйти' },
        home: { welcome: 'Добро пожаловать в VRCStorage', browse: 'Просмотр ресурсов по категориям:', latest: 'Последние ресурсы' },
        card: { view: 'Подробнее' },
        category: { showing: 'Показано', of: 'из', resources: 'ресурсов', prev: 'Назад', next: 'Вперед' },
        admin: { title: 'Панель администратора', noPending: 'Нет ресурсов, ожидающих одобрения.', delete: 'Удалить', deleteConfirm: 'Вы уверены, что хотите удалить этот комментарий?', cleanupOrphaned: 'Очистка несвязанных файлов', cleanupConfirm: 'Очистить несвязанные файлы? Это удалит файлы, загруженные более 24 часов назад и не связанные ни с одним ресурсом.', cleaning: 'Очистка...', cleanupSuccess: 'Очистка успешна: удалено {count} файлов', error: 'Ошибка', networkError: 'Ошибка сети', orphanedFiles: 'Несвязанные файлы', totalMedia: 'Всего файлов', totalResources: 'Всего ресурсов', orphanedFilesFound: 'Найдены несвязанные файлы', orphanedFilesDesc: 'Найдено {count} файлов, загруженных более {hours} часов назад, которые не связаны ни с одним ресурсом.', viewFileList: 'Посмотреть список файлов', noOrphanedFiles: 'Нет несвязанных файлов', noOrphanedFilesDesc: 'На данный момент нет несвязанных файлов. Система чиста.', pendingResources: 'Ресурсы, ожидающие проверки' },
        item: { notFound: 'Ресурс не найден', category: 'Категория', uploaded: 'Загружено', uuid: 'UUID', description: 'Описание', downloads: 'Скачать', downloadMain: 'Скачать (R2 Main)', backup: 'Резерв', loginReq: 'Требуется вход', loginMsg: 'Вы должны войти, чтобы скачивать ресурсы.', goToLogin: 'Войти', comments: 'Комментарии', noComments: 'Комментариев пока нет.', postComment: 'Оставить комментарий', commentPlaceholder: 'Напишите ваш комментарий...', send: 'Отправить', sending: 'Отправка...', deleting: 'Удаление...', loginToComment: 'Войдите, чтобы комментировать', underReview: 'Ожидает одобрения администратора', approve: 'Одобрить', reject: 'Отклонить', deactivate: 'Деактивировать', confirmDeactivate: 'Вы уверены, что хотите деактивировать этот ресурс?', confirmReject: 'Вы уверены, что хотите отклонить и удалить этот ресурс?', adminPanel: 'Панель администратора', pendingApproval: 'Этот ресурс ожидает одобрения.' },
        login: { title: 'Вход', username: 'Имя пользователя', password: 'Пароль', btn: 'Войти', hint: 'Подсказка: user / password', error: 'Неверные данные', register: 'Нет аккаунта? Регистрация', logout: 'Выйти', logoutConfirm: 'Вы уверены, что хотите выйти?' },
        register: { title: 'Регистрация', btn: 'Зарегистрироваться', loginLink: 'Уже есть аккаунт? Войти', success: 'Регистрация успешна. Войдите.' },
        upload: { title: 'Загрузить Ресурс', name: 'Название', desc: 'Описание', cat: 'Категория', file: 'Файл', btn: 'Загрузить', success: 'Успешно загружено', thumbnail: 'Миниатюра', reference: 'Галерея (Изображения/Видео)', mainFile: 'Основной файл', preview: 'Предпросмотр', optional: 'Необязательно', required: '*', uploading: 'Загрузка файлов...', uploadingThumbnail: 'Загрузка миниатюры...', uploadingReference: 'Загрузка файлов галереи...', uploadingFile: 'Загрузка основного файла...', creating: 'Создание ресурса...', error: 'Ошибка', fileTypes: 'Только файлы RAR, ZIP или UnityPackage', imageVideo: 'Изображение или видео для предпросмотра', imageVideoAdditional: 'Макс. 8 файлов (Изображения/Видео)', validFile: 'действительный файл', invalidFile: 'Недопустимый файл', markdownPlaceholder: 'Написать описание используя Markdown...', noContent: 'Нет содержимого', resourceName: 'Название ресурса', errorMainFile: 'Основной файл должен быть .rar, .zip или .unitypackage', errorThumbnail: 'Вы должны выбрать миниатюру', errorThumbnailUpload: 'Ошибка загрузки миниатюры', errorReferenceUpload: 'Ошибка загрузки файлов галереи', errorFileUpload: 'Ошибка загрузки файла', errorCreateResource: 'Ошибка создания ресурса', errorUnknown: 'Неизвестная ошибка', errorCaptcha: 'Пожалуйста, пройдите CAPTCHA', maxFiles: 'Макс. 8 файлов разрешено', backupLinks: 'Резервные ссылки (Необязательно)', backupLinksHint: 'Одна ссылка в строке (Google Drive, Dropbox, etc.).' },
        cats: { avatars: 'Аватары', worlds: 'Миры', assets: 'Ассеты', clothes: 'Одежда', others: 'Другое' },
        wiki: {
            title: 'Вики - Руководство по зависимостям',
            poiyomi: { title: 'Poiyomi Toon Shader' },
            vrcfury: { title: 'VRCFury' },
            setup: { title: 'Руководство по установке' },
            faq: { title: 'Часто задаваемые вопросы' },
            gogoloco: { title: 'GoGo Loco' },
            gogolocoNsfw: { title: 'NSFW Locomotion' },
            sps: { title: 'SPS (Super Plug Shader)' },
            dps: { title: 'DPS (Dynamic Penetration System)' },
            insideView: { title: 'Inside View' },
            parameter: { title: 'Параметры аватара' },
            nsfwEssentials: { title: 'Основы NSFW' },
            haptics: { title: 'Руководство по Хаптике' },
            comments: { title: 'Комментарии Вики' },
            categories: { vrchat: 'VRChat', dependencies: 'Зависимости', erp: 'ERP', informative: 'Информационный' }
        }
    },
    jp: {
        common: { loading: '読み込み中...', loadingResources: 'リソースを読み込み中...', loadingComments: 'コメントを読み込み中...', loadingCleanup: 'クリーンアップ情報を読み込み中...', loadingPending: '保留中のリソースを読み込み中...', accessDenied: 'アクセスが拒否されました', noResourcesFound: 'このカテゴリにリソースが見つかりませんでした。', error: 'エラー' },
        nav: { home: 'ホーム', avatars: 'アバター', worlds: 'ワールド', assets: 'アセット', clothes: '服', others: 'その他', login: 'ログイン', upload: 'アップロード', admin: '管理', settings: '設定', menu: 'メニュー', wiki: 'ウィキ' },
        settings: { title: 'プロフィール設定', avatar: 'プロフィール画像', save: '変更を保存', success: 'プロフィールが正常に更新されました', logout: 'ログアウト' },
        home: { welcome: 'VRCStorageへようこそ', browse: 'カテゴリー別リソース:', latest: '最新のリソース' },
        card: { view: '詳細を見る' },
        category: { showing: '表示中', of: '/', resources: '件', prev: '前へ', next: '次へ' },
        admin: { title: '管理パネル', noPending: '承認待ちのリソースはありません。', delete: '削除', deleteConfirm: 'このコメントを削除してもよろしいですか？', cleanupOrphaned: '不要なファイルのクリーンアップ', cleanupConfirm: '不要なファイルを削除しますか？これにより、24時間以上前にアップロードされ、リソースに関連付けられていないファイルが削除されます。', cleaning: 'クリーニング中...', cleanupSuccess: 'クリーンアップ成功: {count} 個のファイルを削除しました', error: 'エラー', networkError: 'ネットワークエラー', orphanedFiles: '関連付けられていないファイル', totalMedia: '総ファイル数', totalResources: '総リソース数', orphanedFilesFound: '関連付けられていないファイルが見つかりました', orphanedFilesDesc: '{hours} 時間以上前にアップロードされ、リソースに関連付けられていない {count} 個のファイルが見つかりました。', viewFileList: 'ファイルリストを表示', noOrphanedFiles: '関連付けられていないファイルはありません', noOrphanedFilesDesc: '現在、関連付けられていないファイルはありません。システムはクリーンです。', pendingResources: '承認待ちのリソース' },
        item: { notFound: 'リソースが見つかりません', category: 'カテゴリー', uploaded: 'アップロード日時', uuid: 'UUID', description: '説明', downloads: 'ダウンロード', downloadMain: 'ダウンロード (R2 Main)', backup: 'バックアップ', loginReq: 'ログインが必要です', loginMsg: 'リソースをダウンロードするにはログインしてください。', goToLogin: 'ログイン画面へ', comments: 'コメント', noComments: 'まだコメントはありません。', postComment: 'コメントを投稿', commentPlaceholder: 'コメントを入力...', send: '送信', sending: '送信中...', deleting: '削除中...', loginToComment: 'コメントするにはログインしてください', underReview: '管理者による承認待ち', approve: '承認', reject: '拒否', deactivate: '無効化', confirmDeactivate: 'このリソースを無効にしてもよろしいですか？', confirmReject: 'このリソースを拒否して削除してもよろしいですか？', adminPanel: '管理パネル', pendingApproval: 'このリソースは承認待ちです。' },
        login: { title: 'ログイン', username: 'ユーザー名', password: 'パスワード', btn: 'ログイン', hint: 'ヒント: user / password', error: '認証情報が無効です', register: 'アカウントをお持ちでないですか？ 登録', logout: 'ログアウト', logoutConfirm: 'ログアウトしますか？' },
        register: { title: '登録', btn: '登録する', loginLink: 'すでにアカウントをお持ちですか？ ログイン', success: '登録が完了しました。ログインしてください。' },
        upload: { title: 'リソースをアップロード', name: 'タイトル', desc: '説明', cat: 'カテゴリー', file: 'ファイル', btn: 'アップロード', success: 'アップロード成功', thumbnail: 'サムネイル', reference: 'ギャラリー (画像/動画)', mainFile: 'メインファイル', preview: 'プレビュー', optional: 'オプション', required: '*', uploading: 'ファイルをアップロード中...', uploadingThumbnail: 'サムネイルをアップロード中...', uploadingReference: 'ギャラリーファイルをアップロード中...', uploadingFile: 'メインファイルをアップロード中...', creating: 'リソースを作成中...', error: 'エラー', fileTypes: 'RAR、ZIP、UnityPackageファイルのみ', imageVideo: 'プレビュー用の画像または動画', imageVideoAdditional: '最大8ファイル (画像/動画)', validFile: '有効なファイル', invalidFile: '無効なファイル', markdownPlaceholder: 'Markdownで説明を書く...', noContent: 'コンテンツなし', resourceName: 'リソース名', errorMainFile: 'メインファイルは .rar、.zip、または .unitypackage である必要があります', errorThumbnail: 'サムネイルを選択する必要があります', errorThumbnailUpload: 'サムネイルのアップロードエラー', errorReferenceUpload: 'ギャラリーファイルのアップロードエラー', errorFileUpload: 'ファイルのアップロードエラー', errorCreateResource: 'リソースの作成エラー', errorUnknown: '不明なエラー', errorCaptcha: 'CAPTCHAを完了してください', maxFiles: '最大8ファイルまで', backupLinks: 'バックアップリンク (オプション)', backupLinksHint: '1行に1つのURL (Google Drive, Dropboxなど)' },
        cats: { avatars: 'アバター', worlds: 'ワールド', assets: 'アセット', clothes: '服', others: 'その他' },
        wiki: {
            title: 'ウィキ - 依存関係ガイド',
            poiyomi: { title: 'Poiyomi Toon Shader' },
            vrcfury: { title: 'VRCFury' },
            setup: { title: 'セットアップガイド' },
            faq: { title: 'よくある質問' },
            gogoloco: { title: 'GoGo Loco' },
            gogolocoNsfw: { title: 'NSFW Locomotion' },
            sps: { title: 'SPS (Super Plug Shader)' },
            dps: { title: 'DPS (Dynamic Penetration System)' },
            insideView: { title: 'Inside View' },
            parameter: { title: 'アバターパラメータ' },
            nsfwEssentials: { title: 'NSFW エッセンシャル' },
            haptics: { title: 'ハプティクスガイド' },
            comments: { title: 'Wikiコメント' },
            categories: { vrchat: 'VRChat', dependencies: '依存関係', erp: 'ERP', informative: '情報' }
        }
    },
    cn: {
        common: { loading: '加载中...', loadingResources: '加载资源中...', loadingComments: '加载评论中...', loadingCleanup: '加载清理信息中...', loadingPending: '加载待处理资源中...', accessDenied: '访问被拒绝', noResourcesFound: '此类别中未找到资源。', error: '错误' },
        nav: { home: '主页', avatars: '虚拟形象', worlds: '世界', assets: '资产', clothes: '服装', others: '其他', login: '登录', upload: '上传', admin: '管理', settings: '设置', menu: '菜单', wiki: '维基' },
        settings: { title: '个人资料设置', avatar: '头像', save: '保存更改', success: '个人资料已成功更新', logout: '退出登录' },
        home: { welcome: '欢迎来到 VRCStorage', browse: '按类别浏览资源：', latest: '最新资源' },
        card: { view: '查看详情' },
        category: { showing: '显示', of: '/', resources: '资源', prev: '上一页', next: '下一页' },
        admin: { title: '管理员面板', noPending: '没有等待批准的资源。', delete: '删除', deleteConfirm: '您确定要删除此评论吗？', cleanupOrphaned: '清理未关联文件', cleanupConfirm: '清理未关联文件？这将删除24小时前上传且未与任何资源关联的文件。', cleaning: '清理中...', cleanupSuccess: '清理成功：已删除 {count} 个文件', error: '错误', networkError: '网络错误', orphanedFiles: '未关联文件', totalMedia: '文件总数', totalResources: '资源总数', orphanedFilesFound: '发现未关联文件', orphanedFilesDesc: '发现 {count} 个在 {hours} 小时前上传且未与任何资源关联的文件。', viewFileList: '查看文件列表', noOrphanedFiles: '没有未关联文件', noOrphanedFilesDesc: '目前没有未关联文件。系统很干净。', pendingResources: '待批准资源' },
        item: { notFound: '未找到资源', category: '类别', uploaded: '上传时间', uuid: 'UUID', description: '描述', downloads: '下载', downloadMain: '下载 (R2 Main)', backup: '备用', loginReq: '需要登录', loginMsg: '您必须登录才能下载资源。', goToLogin: '去登录', comments: '评论', noComments: '暂无评论。', postComment: '发表评论', commentPlaceholder: '写下你的评论...', send: '发送', sending: '发送中...', deleting: '删除中...', loginToComment: '登录后评论', underReview: '等待管理员批准', approve: '批准', reject: '拒绝', deactivate: '停用', confirmDeactivate: '您确定要停用此资源吗？', confirmReject: '您确定要拒绝并删除此资源吗？', adminPanel: '管理员面板', pendingApproval: '此资源正在等待批准。' },
        login: { title: '登录', username: '用户名', password: '密码', btn: '登录', hint: '提示: user / password', error: '凭据无效', register: '没有账号？注册', logout: '退出', logoutConfirm: '确定要退出吗？' },
        register: { title: '注册', btn: '注册', loginLink: '已有账号？登录', success: '注册成功。请登录。' },
        upload: { title: '上传资源', name: '标题', desc: '描述', cat: '类别', file: '文件', btn: '上传', success: '上传成功', thumbnail: '缩略图', reference: '画廊 (图片/视频)', mainFile: '主文件', preview: '预览', optional: '可选', required: '*', uploading: '上传文件中...', uploadingThumbnail: '上传缩略图中...', uploadingReference: '上传画廊文件中...', uploadingFile: '上传主文件中...', creating: '创建资源中...', error: '错误', fileTypes: '仅限 RAR、ZIP 或 UnityPackage 文件', imageVideo: '预览用图片或视频', imageVideoAdditional: '最多8个文件 (图片/视频)', validFile: '有效文件', invalidFile: '无效文件', markdownPlaceholder: '使用 Markdown 编写描述...', noContent: '无内容', resourceName: '资源名称', errorMainFile: '主文件必须是 .rar、.zip 或 .unitypackage', errorThumbnail: '您必须选择缩略图', errorThumbnailUpload: '上传缩略图错误', errorReferenceUpload: '上传画廊文件错误', errorFileUpload: '上传主文件错误', errorCreateResource: '创建资源错误', errorUnknown: '未知错误', errorCaptcha: '请完成验证码', maxFiles: '最多允许8个文件', backupLinks: '备用链接 (可选)', backupLinksHint: '每行一个链接 (Google Drive, Dropbox 等)' },
        cats: { avatars: '虚拟形象', worlds: '世界', assets: '资产', clothes: '服装', others: '其他' },
        wiki: {
            title: '维基 - 依赖指南',
            poiyomi: { title: 'Poiyomi Toon Shader' },
            vrcfury: { title: 'VRCFury' },
            setup: { title: '安装指南' },
            faq: { title: '常见问题' },
            gogoloco: { title: 'GoGo Loco' },
            gogolocoNsfw: { title: 'NSFW Locomotion' },
            sps: { title: 'SPS (Super Plug Shader)' },
            dps: { title: 'DPS (Dynamic Penetration System)' },
            insideView: { title: 'Inside View' },
            parameter: { title: '虚拟形象参数' },
            nsfwEssentials: { title: 'NSFW 基础指南' },
            haptics: { title: '触觉指南' },
            comments: { title: 'Wiki 评论' },
            categories: { vrchat: 'VRChat', dependencies: '依赖项', erp: 'ERP', informative: '信息' }
        }
    },
    fr: {
        common: { loading: 'Chargement...', loadingResources: 'Chargement des ressources...', loadingComments: 'Chargement des commentaires...', loadingCleanup: 'Chargement des informations de nettoyage...', loadingPending: 'Chargement des ressources en attente...', accessDenied: 'Accès refusé', noResourcesFound: 'Aucune ressource trouvée dans cette catégorie.', error: 'Erreur' },
        nav: { home: 'Accueil', avatars: 'Avatars', worlds: 'Mondes', assets: 'Actifs', clothes: 'Vêtements', others: 'Autres', login: 'Connexion', upload: 'Upload', admin: 'Admin', settings: 'Paramètres', menu: 'Menu', wiki: 'Wiki' },
        settings: { title: 'Paramètres du profil', avatar: 'Photo de profil', save: 'Enregistrer les modifications', success: 'Profil mis à jour avec succès', logout: 'Déconnexion' },
        home: { welcome: 'Bienvenue sur VRCStorage', browse: 'Parcourir les ressources par catégorie :', latest: 'Dernières ressources' },
        card: { view: 'Voir les détails' },
        category: { showing: 'Affichage de', of: 'sur', resources: 'ressources', prev: 'Précédent', next: 'Suivant' },
        admin: { title: 'Panneau d\'administration', noPending: 'Aucune ressource en attente d\'approbation.', delete: 'Supprimer', deleteConfirm: 'Êtes-vous sûr de vouloir supprimer ce commentaire ?', cleanupOrphaned: 'Nettoyer les fichiers orphelins', cleanupConfirm: 'Nettoyer les fichiers orphelins ? Cela supprimera les fichiers téléchargés il y a plus de 24 heures qui ne sont associés à aucune ressource.', cleaning: 'Nettoyage...', cleanupSuccess: 'Nettoyage réussi : {count} fichiers supprimés', error: 'Erreur', networkError: 'Erreur réseau', orphanedFiles: 'Fichiers orphelins', totalMedia: 'Total des fichiers', totalResources: 'Total des ressources', orphanedFilesFound: 'Fichiers orphelins trouvés', orphanedFilesDesc: '{count} fichiers trouvés téléchargés il y a plus de {hours} heures qui ne sont associés à aucune ressource.', viewFileList: 'Voir la liste des fichiers', noOrphanedFiles: 'Aucun fichier orphelin', noOrphanedFilesDesc: 'Il n\'y a aucun fichier orphelin pour le moment. Le système est propre.', pendingResources: 'Ressources en attente' },
        item: { notFound: 'Ressource introuvable', category: 'Catégorie', uploaded: 'Mis en ligne', uuid: 'UUID', description: 'Description', downloads: 'Téléchargements', downloadMain: 'Télécharger (R2 Main)', backup: 'Secours', loginReq: 'Connexion requise', loginMsg: 'Vous devez être connecté pour télécharger.', goToLogin: 'Se connecter', comments: 'Commentaires', noComments: 'Aucun commentaire pour le moment.', postComment: 'Poster un commentaire', commentPlaceholder: 'Écrivez votre commentaire...', send: 'Envoyer', sending: 'Envoi en cours...', deleting: 'Suppression...', loginToComment: 'Connectez-vous pour commenter', underReview: 'En attente d\'approbation par l\'administrateur', approve: 'Approuver', reject: 'Rejeter', deactivate: 'Désactiver', confirmDeactivate: 'Êtes-vous sûr de vouloir désactiver cette ressource ?', confirmReject: 'Êtes-vous sûr de vouloir rejeter et supprimer cette ressource ?', adminPanel: 'Panneau d\'administration', pendingApproval: 'Cette ressource est en attente d\'approbation.' },
        login: { title: 'Connexion', username: 'Nom d\'utilisateur', password: 'Mot de passe', btn: 'Se connecter', hint: 'Indice : user / password', error: 'Identifiants invalides', register: 'Pas encore de compte ? S\'inscrire', logout: 'Déconnexion', logoutConfirm: 'Voulez-vous vraiment vous déconnecter ?' },
        register: { title: 'Inscription', btn: 'S\'inscrire', loginLink: 'Déjà un compte ? Se connecter', success: 'Inscription réussie. Veuillez vous connecter.' },
        upload: { title: 'Télécharger une ressource', name: 'Titre', desc: 'Description', cat: 'Catégorie', file: 'Fichier', btn: 'Télécharger', success: 'Téléchargement réussi', thumbnail: 'Miniature', reference: 'Galerie (Images/Vidéos)', mainFile: 'Fichier principal', preview: 'Aperçu', optional: 'Facultatif', required: '*', uploading: 'Téléchargement des fichiers...', uploadingThumbnail: 'Téléchargement de la miniature...', uploadingReference: 'Téléchargement des fichiers de la galerie...', uploadingFile: 'Téléchargement du fichier principal...', creating: 'Création de la ressource...', error: 'Erreur', fileTypes: 'Fichiers RAR, ZIP ou UnityPackage uniquement', imageVideo: 'Image ou vidéo pour l\'aperçu', imageVideoAdditional: 'Max 8 fichiers (Images/Vidéos)', validFile: 'fichier valide', invalidFile: 'Fichier invalide', markdownPlaceholder: 'Écrire la description en Markdown...', noContent: 'Pas de contenu', resourceName: 'Nom de la ressource', errorMainFile: 'Le fichier principal doit être .rar, .zip ou .unitypackage', errorThumbnail: 'Vous devez sélectionner une miniature', errorThumbnailUpload: 'Erreur de téléchargement de la miniature', errorReferenceUpload: 'Erreur de téléchargement des fichiers de la galerie', errorFileUpload: 'Erreur de téléchargement du fichier principal', errorCreateResource: 'Erreur de création de la ressource', errorUnknown: 'Erreur inconnue', errorCaptcha: 'Veuillez compléter le CAPTCHA', maxFiles: 'Max 8 fichiers autorisés', backupLinks: 'Liens de secours (Facultatif)', backupLinksHint: 'Une URL par ligne (Google Drive, Dropbox, etc.)' },
        cats: { avatars: 'Avatars', worlds: 'Mondes', assets: 'Actifs', clothes: 'Vêtements', others: 'Autres' },
        wiki: {
            title: 'Wiki - Guide des dépendances',
            poiyomi: { title: 'Poiyomi Toon Shader' },
            vrcfury: { title: 'VRCFury' },
            setup: { title: 'Guide d\'installation' },
            faq: { title: 'FAQ' },
            gogoloco: { title: 'GoGo Loco' },
            gogolocoNsfw: { title: 'NSFW Locomotion' },
            sps: { title: 'SPS (Super Plug Shader)' },
            dps: { title: 'DPS (Dynamic Penetration System)' },
            insideView: { title: 'Inside View' },
            parameter: { title: 'Paramètres d\'Avatar' },
            nsfwEssentials: { title: 'Les Essentiels NSFW' },
            haptics: { title: 'Guide Haptique' },
            comments: { title: 'Commentaires Wiki' },
            categories: { vrchat: 'VRChat', dependencies: 'Dépendances', erp: 'ERP', informative: 'Informatif' }
        }
    }
};

let currentLang = localStorage.getItem('lang') || 'es';

export function t(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], translations[currentLang]) || path;
}

export function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        // Note: reload or re-render logic is usually in main app or handled via event
        location.reload();
    }
}

export function getCurrentLang() {
    return currentLang;
}
