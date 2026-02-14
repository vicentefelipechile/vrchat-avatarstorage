const appPayload = {
    content: document.getElementById('app')
};

// --- I18n Configuration ---
const translations = {
    es: {
        nav: { home: 'Inicio', avatars: 'Avatares', worlds: 'Mundos', assets: 'Assets', clothes: 'Ropa', others: 'Otros', login: 'Login', upload: 'Subir' },
        home: { welcome: 'Bienvenido a VRCStorage', browse: 'Explora recursos por categoría:', latest: 'Últimos Recursos' },
        card: { view: 'Ver Detalles' },
        category: { showing: 'Mostrando', of: 'de', resources: 'recursos', prev: 'Anterior', next: 'Siguiente' },
        item: { notFound: 'Recurso No Encontrado', category: 'Categoría', uploaded: 'Subido', uuid: 'UUID', description: 'Descripción', downloads: 'Descargas', downloadMain: 'Descargar (R2 Main)', backup: 'Backup', loginReq: 'Login Requerido', loginMsg: 'Debes iniciar sesión para descargar recursos.', goToLogin: 'Ir al Login', comments: 'Comentarios', noComments: 'No hay comentarios aún.', postComment: 'Publicar Comentario', commentPlaceholder: 'Escribe tu comentario...', send: 'Enviar', loginToComment: 'Inicia sesión para comentar' },
        login: { title: 'Login', username: 'Usuario', password: 'Password', btn: 'Entrar', hint: 'Pista: user / password', error: 'Credenciales inválidas', register: '¿No tienes cuenta? Regístrate', logout: 'Logout', logoutConfirm: '¿Seguro que quieres cerrar sesión?' },
        register: { title: 'Registro', btn: 'Registrarse', loginLink: '¿Ya tienes cuenta? Inicia sesión', success: 'Registro exitoso. Por favor inicia sesión.' },
        upload: { title: 'Subir Recurso', name: 'Título', desc: 'Descripción', cat: 'Categoría', file: 'Archivo', btn: 'Subir', success: 'Subido correctamente', thumbnail: 'Miniatura (Thumbnail)', reference: 'Galería (Imágenes/Videos)', mainFile: 'Archivo Principal', preview: 'Vista Previa', optional: 'Opcional', required: '*', uploading: 'Subiendo archivos...', uploadingThumbnail: 'Subiendo miniatura...', uploadingReference: 'Subiendo archivos de galería...', uploadingFile: 'Subiendo archivo principal...', creating: 'Creando recurso...', error: 'Error', fileTypes: 'Solo archivos RAR, ZIP o UnityPackage', imageVideo: 'Imagen o video para la vista previa', imageVideoAdditional: 'Máximo 8 archivos (Imágenes/Videos)', validFile: 'archivo válido', invalidFile: 'Archivo inválido', markdownPlaceholder: 'Escribe la descripción usando Markdown...', noContent: 'Sin contenido', resourceName: 'Nombre del recurso', errorMainFile: 'El archivo principal debe ser .rar, .zip o .unitypackage', errorThumbnail: 'Debes seleccionar una miniatura', errorThumbnailUpload: 'Error al subir miniatura', errorReferenceUpload: 'Error al subir archivos de galería', errorFileUpload: 'Error al subir archivo principal', errorCreateResource: 'Error al crear recurso', errorUnknown: 'Error desconocido', errorCaptcha: 'Por favor completa el CAPTCHA', maxFiles: 'Máximo 8 archivos permitidos' },
        cats: { avatars: 'Avatares', worlds: 'Mundos', assets: 'Assets', clothes: 'Ropa', others: 'Otros' }
    },
    en: {
        nav: { home: 'Home', avatars: 'Avatars', worlds: 'Worlds', assets: 'Assets', clothes: 'Clothes', others: 'Others', login: 'Login', upload: 'Upload' },
        home: { welcome: 'Welcome to VRCStorage', browse: 'Browse resources by category:', latest: 'Latest Resources' },
        card: { view: 'View Details' },
        category: { showing: 'Showing', of: 'of', resources: 'resources', prev: 'Previous', next: 'Next' },
        item: { notFound: 'Resource Not Found', category: 'Category', uploaded: 'Uploaded', uuid: 'UUID', description: 'Description', downloads: 'Downloads', downloadMain: 'Download (R2 Main)', backup: 'Backup', loginReq: 'Login Required', loginMsg: 'You must be logged in to download resources.', goToLogin: 'Go to Login', comments: 'Comments', noComments: 'No comments yet.', postComment: 'Post Comment', commentPlaceholder: 'Write your comment...', send: 'Send', loginToComment: 'Login to comment' },
        login: { title: 'Login', username: 'Username', password: 'Password', btn: 'Login', hint: 'Hint: user / password', error: 'Invalid credentials', register: 'No account? Register', logout: 'Logout', logoutConfirm: 'Are you sure you want to log out?' },
        register: { title: 'Register', btn: 'Sign Up', loginLink: 'Already have an account? Login', success: 'Registration successful. Please login.' },
        upload: { title: 'Upload Resource', name: 'Title', desc: 'Description', cat: 'Category', file: 'File', btn: 'Upload', success: 'Upload successful', thumbnail: 'Thumbnail', reference: 'Gallery (Images/Videos)', mainFile: 'Main File', preview: 'Preview', optional: 'Optional', required: '*', uploading: 'Uploading files...', uploadingThumbnail: 'Uploading thumbnail...', uploadingReference: 'Uploading gallery files...', uploadingFile: 'Uploading main file...', creating: 'Creating resource...', error: 'Error', fileTypes: 'RAR, ZIP or UnityPackage files only', imageVideo: 'Image or video for preview', imageVideoAdditional: 'Max 8 files (Images/Videos)', validFile: 'valid file', invalidFile: 'Invalid file', markdownPlaceholder: 'Write description using Markdown...', noContent: 'No content', resourceName: 'Resource name', errorMainFile: 'Main file must be .rar, .zip or .unitypackage', errorThumbnail: 'You must select a thumbnail', errorThumbnailUpload: 'Error uploading thumbnail', errorReferenceUpload: 'Error uploading gallery files', errorFileUpload: 'Error uploading main file', errorCreateResource: 'Failed to create resource', errorUnknown: 'Unknown error', errorCaptcha: 'Please complete the CAPTCHA', maxFiles: 'Max 8 files allowed' },
        cats: { avatars: 'Avatars', worlds: 'Worlds', assets: 'Assets', clothes: 'Clothes', others: 'Others' }
    },
    ru: {
        nav: { home: 'Главная', avatars: 'Аватары', worlds: 'Миры', assets: 'Ассеты', clothes: 'Одежда', others: 'Другое', login: 'Войти', upload: 'Загрузить' },
        home: { welcome: 'Добро пожаловать в VRCStorage', browse: 'Просмотр ресурсов по категориям:', latest: 'Последние ресурсы' },
        card: { view: 'Подробнее' },
        category: { showing: 'Показано', of: 'из', resources: 'ресурсов', prev: 'Назад', next: 'Вперед' },
        item: { notFound: 'Ресурс не найден', category: 'Категория', uploaded: 'Загружено', uuid: 'UUID', description: 'Описание', downloads: 'Скачать', downloadMain: 'Скачать (R2 Main)', backup: 'Резерв', loginReq: 'Требуется вход', loginMsg: 'Вы должны войти, чтобы скачивать ресурсы.', goToLogin: 'Войти', comments: 'Комментарии', noComments: 'Комментариев пока нет.', postComment: 'Оставить комментарий', commentPlaceholder: 'Напишите ваш комментарий...', send: 'Отправить', loginToComment: 'Войдите, чтобы комментировать' },
        login: { title: 'Вход', username: 'Имя пользователя', password: 'Пароль', btn: 'Войти', hint: 'Подсказка: user / password', error: 'Неверные данные', register: 'Нет аккаунта? Регистрация', logout: 'Выйти', logoutConfirm: 'Вы уверены, что хотите выйти?' },
        register: { title: 'Регистрация', btn: 'Зарегистрироваться', loginLink: 'Уже есть аккаунт? Войти', success: 'Регистрация успешна. Войдите.' },
        upload: { title: 'Загрузить Ресурс', name: 'Название', desc: 'Описание', cat: 'Категория', file: 'Файл', btn: 'Загрузить', success: 'Успешно загружено', thumbnail: 'Миниатюра', reference: 'Галерея (Изображения/Видео)', mainFile: 'Основной файл', preview: 'Предпросмотр', optional: 'Необязательно', required: '*', uploading: 'Загрузка файлов...', uploadingThumbnail: 'Загрузка миниатюры...', uploadingReference: 'Загрузка файлов галереи...', uploadingFile: 'Загрузка основного файла...', creating: 'Создание ресурса...', error: 'Ошибка', fileTypes: 'Только файлы RAR, ZIP или UnityPackage', imageVideo: 'Изображение или видео для предпросмотра', imageVideoAdditional: 'Макс. 8 файлов (Изображения/Видео)', validFile: 'действительный файл', invalidFile: 'Недопустимый файл', markdownPlaceholder: 'Написать описание используя Markdown...', noContent: 'Нет содержимого', resourceName: 'Название ресурса', errorMainFile: 'Основной файл должен быть .rar, .zip или .unitypackage', errorThumbnail: 'Вы должны выбрать миниатюру', errorThumbnailUpload: 'Ошибка загрузки миниатюры', errorReferenceUpload: 'Ошибка загрузки файлов галереи', errorFileUpload: 'Ошибка загрузки файла', errorCreateResource: 'Ошибка создания ресурса', errorUnknown: 'Неизвестная ошибка', errorCaptcha: 'Пожалуйста, пройдите CAPTCHA', maxFiles: 'Макс. 8 файлов разрешено' },
        cats: { avatars: 'Аватары', worlds: 'Миры', assets: 'Ассеты', clothes: 'Одежда', others: 'Другое' }
    },
    jp: {
        nav: { home: 'ホーム', avatars: 'アバター', worlds: 'ワールド', assets: 'アセット', clothes: '服', others: 'その他', login: 'ログイン', upload: 'アップロード' },
        home: { welcome: 'VRCStorageへようこそ', browse: 'カテゴリー別リソース:', latest: '最新のリソース' },
        card: { view: '詳細を見る' },
        category: { showing: '表示中', of: '/', resources: '件', prev: '前へ', next: '次へ' },
        item: { notFound: 'リソースが見つかりません', category: 'カテゴリー', uploaded: 'アップロード日時', uuid: 'UUID', description: '説明', downloads: 'ダウンロード', downloadMain: 'ダウンロード (R2 Main)', backup: 'バックアップ', loginReq: 'ログインが必要です', loginMsg: 'リソースをダウンロードするにはログインしてください。', goToLogin: 'ログイン画面へ', comments: 'コメント', noComments: 'まだコメントはありません。', postComment: 'コメントを投稿', commentPlaceholder: 'コメントを入力...', send: '送信', loginToComment: 'コメントするにはログインしてください' },
        login: { title: 'ログイン', username: 'ユーザー名', password: 'パスワード', btn: 'ログイン', hint: 'ヒント: user / password', error: '認証情報が無効です', register: 'アカウントをお持ちでないですか？ 登録', logout: 'ログアウト', logoutConfirm: 'ログアウトしますか？' },
        register: { title: '登録', btn: '登録する', loginLink: 'すでにアカウントをお持ちですか？ ログイン', success: '登録が完了しました。ログインしてください。' },
        upload: { title: 'リソースをアップロード', name: 'タイトル', desc: '説明', cat: 'カテゴリー', file: 'ファイル', btn: 'アップロード', success: 'アップロード成功', thumbnail: 'サムネイル', reference: 'ギャラリー (画像/動画)', mainFile: 'メインファイル', preview: 'プレビュー', optional: 'オプション', required: '*', uploading: 'ファイルをアップロード中...', uploadingThumbnail: 'サムネイルをアップロード中...', uploadingReference: 'ギャラリーファイルをアップロード中...', uploadingFile: 'メインファイルをアップロード中...', creating: 'リソースを作成中...', error: 'エラー', fileTypes: 'RAR、ZIP、UnityPackageファイルのみ', imageVideo: 'プレビュー用の画像または動画', imageVideoAdditional: '最大8ファイル (画像/動画)', validFile: '有効なファイル', invalidFile: '無効なファイル', markdownPlaceholder: 'Markdownで説明を書く...', noContent: 'コンテンツなし', resourceName: 'リソース名', errorMainFile: 'メインファイルは .rar、.zip、または .unitypackage である必要があります', errorThumbnail: 'サムネイルを選択する必要があります', errorThumbnailUpload: 'サムネイルのアップロードエラー', errorReferenceUpload: 'ギャラリーファイルのアップロードエラー', errorFileUpload: 'ファイルのアップロードエラー', errorCreateResource: 'リソースの作成エラー', errorUnknown: '不明なエラー', errorCaptcha: 'CAPTCHAを完了してください', maxFiles: '最大8ファイルまで' },
        cats: { avatars: 'アバター', worlds: 'ワールド', assets: 'アセット', clothes: '服', others: 'その他' }
    },
    cn: {
        nav: { home: '主页', avatars: '模型', worlds: '世界', assets: '资源', clothes: '服装', others: '其他', login: '登录', upload: '上传' },
        home: { welcome: '欢迎来到 VRCStorage', browse: '按类别浏览资源：', latest: '最新资源' },
        card: { view: '查看详情' },
        category: { showing: '显示', of: '/', resources: '资源', prev: '上一页', next: '下一页' },
        item: { notFound: '未找到资源', category: '类别', uploaded: '上传时间', uuid: 'UUID', description: '描述', downloads: '下载', downloadMain: '下载 (R2 Main)', backup: '备用', loginReq: '需要登录', loginMsg: '您必须登录才能下载资源。', goToLogin: '去登录', comments: '评论', noComments: '暂无评论。', postComment: '发表评论', commentPlaceholder: '写下你的评论...', send: '发送', loginToComment: '登录后评论' },
        login: { title: '登录', username: '用户名', password: '密码', btn: '登录', hint: '提示: user / password', error: '凭据无效', register: '没有账号？注册', logout: '退出', logoutConfirm: '确定要退出吗？' },
        register: { title: '注册', btn: '注册', loginLink: '已有账号？登录', success: '注册成功。请登录。' },
        upload: { title: '上传资源', name: '标题', desc: '描述', cat: '类别', file: '文件', btn: '上传', success: '上传成功', thumbnail: '缩略图', reference: '画廊 (图片/视频)', mainFile: '主文件', preview: '预览', optional: '可选', required: '*', uploading: '上传文件中...', uploadingThumbnail: '上传缩略图中...', uploadingReference: '上传画廊文件中...', uploadingFile: '上传主文件中...', creating: '创建资源中...', error: '错误', fileTypes: '仅限 RAR、ZIP 或 UnityPackage 文件', imageVideo: '预览用图片或视频', imageVideoAdditional: '最多8个文件 (图片/视频)', validFile: '有效文件', invalidFile: '无效文件', markdownPlaceholder: '使用 Markdown 编写描述...', noContent: '无内容', resourceName: '资源名称', errorMainFile: '主文件必须是 .rar、.zip 或 .unitypackage', errorThumbnail: '您必须选择缩略图', errorThumbnailUpload: '上传缩略图错误', errorReferenceUpload: '上传画廊文件错误', errorFileUpload: '上传主文件错误', errorCreateResource: '创建资源错误', errorUnknown: '未知错误', errorCaptcha: '请完成验证码', maxFiles: '最多允许8个文件' },
        cats: { avatars: '模型', worlds: '世界', assets: '资源', clothes: '服装', others: '其他' }
    },
    fr: {
        nav: { home: 'Accueil', avatars: 'Avatars', worlds: 'Mondes', assets: 'Actifs', clothes: 'Vêtements', others: 'Autres', login: 'Connexion', upload: 'Upload' },
        home: { welcome: 'Bienvenue sur VRCStorage', browse: 'Parcourir les ressources par catégorie :', latest: 'Dernières ressources' },
        card: { view: 'Voir les détails' },
        category: { showing: 'Affichage de', of: 'sur', resources: 'ressources', prev: 'Précédent', next: 'Suivant' },
        item: { notFound: 'Ressource introuvable', category: 'Catégorie', uploaded: 'Mis en ligne', uuid: 'UUID', description: 'Description', downloads: 'Téléchargements', downloadMain: 'Télécharger (R2 Main)', backup: 'Secours', loginReq: 'Connexion requise', loginMsg: 'Vous devez être connecté pour télécharger.', goToLogin: 'Se connecter', comments: 'Commentaires', noComments: 'Aucun commentaire pour le moment.', postComment: 'Poster un commentaire', commentPlaceholder: 'Écrivez votre commentaire...', send: 'Envoyer', loginToComment: 'Connectez-vous pour commenter' },
        login: { title: 'Connexion', username: 'Nom d\'utilisateur', password: 'Mot de passe', btn: 'Se connecter', hint: 'Indice : user / password', error: 'Identifiants invalides', register: 'Pas encore de compte ? S\'inscrire', logout: 'Déconnexion', logoutConfirm: 'Voulez-vous vraiment vous déconnecter ?' },
        register: { title: 'Inscription', btn: 'S\'inscrire', loginLink: 'Déjà un compte ? Se connecter', success: 'Inscription réussie. Veuillez vous connecter.' },
        upload: { title: 'Télécharger une ressource', name: 'Titre', desc: 'Description', cat: 'Catégorie', file: 'Fichier', btn: 'Télécharger', success: 'Téléchargement réussi', thumbnail: 'Miniature', reference: 'Galerie (Images/Vidéos)', mainFile: 'Fichier principal', preview: 'Aperçu', optional: 'Facultatif', required: '*', uploading: 'Téléchargement des fichiers...', uploadingThumbnail: 'Téléchargement de la miniature...', uploadingReference: 'Téléchargement des fichiers de la galerie...', uploadingFile: 'Téléchargement du fichier principal...', creating: 'Création de la ressource...', error: 'Erreur', fileTypes: 'Fichiers RAR, ZIP ou UnityPackage uniquement', imageVideo: 'Image ou vidéo pour l\'aperçu', imageVideoAdditional: 'Max 8 fichiers (Images/Vidéos)', validFile: 'fichier valide', invalidFile: 'Fichier invalide', markdownPlaceholder: 'Écrire la description en Markdown...', noContent: 'Pas de contenu', resourceName: 'Nom de la ressource', errorMainFile: 'Le fichier principal doit être .rar, .zip ou .unitypackage', errorThumbnail: 'Vous devez sélectionner une miniature', errorThumbnailUpload: 'Erreur de téléchargement de la miniature', errorReferenceUpload: 'Erreur de téléchargement des fichiers de la galerie', errorFileUpload: 'Erreur de téléchargement du fichier principal', errorCreateResource: 'Erreur de création de la ressource', errorUnknown: 'Erreur inconnue', errorCaptcha: 'Veuillez compléter le CAPTCHA', maxFiles: 'Max 8 fichiers autorisés' },
        cats: { avatars: 'Avatars', worlds: 'Mondes', assets: 'Actifs', clothes: 'Vêtements', others: 'Autres' }
    }
};

let currentLang = localStorage.getItem('lang') || 'es';
// ... (rest of t(), setLanguage, updateNav - UNCHANGED)

function t(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], translations[currentLang]) || path;
}

function setLanguage(lang) {
    if (translations[lang]) {
        currentLang = lang;
        localStorage.setItem('lang', lang);
        updateNav();
        router(); // Re-render current view
    }
}

async function updateNav() {
    // Check auth status
    let isLoggedIn = false;
    try {
        const res = await fetch('/api/auth/status');
        const data = await res.json();
        isLoggedIn = data.loggedIn;
    } catch (e) {
        console.error('Auth check failed', e);
    }

    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');

        // Dynamic Login/Logout
        if (key === 'nav.login') {
            el.textContent = isLoggedIn ? t('login.logout') : t('nav.login');
            el.setAttribute('href', isLoggedIn ? '/logout' : '/login');
        } else if (key === 'nav.upload') {
            if (isLoggedIn) {
                el.style.display = 'inline-block';
                el.textContent = t('nav.upload');
            } else {
                el.style.display = 'none';
            }
        } else {
            el.textContent = t(key);
        }
    });
}

// Ensure global access for the HTML selector (if we use inline onclick, but better to bind in DOMContentLoaded)
window.setLanguage = setLanguage;


// Router
const router = async () => {
    await updateNav(); // Ensure nav is translated & state updated

    const routes = [
        { path: '/', view: HomeView },
        { path: '/category/:id', view: CategoryView },
        { path: '/item/:id', view: ItemView },
        { path: '/login', view: LoginView },
        { path: '/logout', view: LogoutView },
        { path: '/register', view: RegisterView },
        { path: '/upload', view: UploadView }
    ];

    const potentialMatches = routes.map(route => {
        return {
            route: route,
            result: location.pathname.match(pathToRegex(route.path))
        };
    });

    let match = potentialMatches.find(potentialMatch => potentialMatch.result !== null);

    if (!match) {
        match = {
            route: routes[0],
            result: [location.pathname]
        };
    }

    const view = new match.route.view(getParams(match));
    appPayload.content.innerHTML = await view.getHtml();
    if (view.postRender) await view.postRender();
};

const navigateTo = url => {
    history.pushState(null, null, url);
    router();
};

window.addEventListener('popstate', router);

document.addEventListener('DOMContentLoaded', () => {
    document.body.addEventListener('click', e => {
        if (e.target.matches('[data-link]')) {
            e.preventDefault();
            navigateTo(e.target.href);

            // Close mobile menu if open
            const navLinks = document.querySelector('.nav-links');
            if (navLinks && navLinks.classList.contains('active')) {
                navLinks.classList.remove('active');
            }
        }
    });

    // Mobile Menu Toggle
    const menuBtn = document.getElementById('mobile-menu-btn');
    const navLinks = document.querySelector('.nav-links');
    if (menuBtn && navLinks) {
        menuBtn.addEventListener('click', () => {
            navLinks.classList.toggle('active');
        });
    }

    // Initialize Lang Selector
    const langSelector = document.getElementById('lang-selector');
    if (langSelector) {
        langSelector.value = currentLang;
        langSelector.addEventListener('change', (e) => setLanguage(e.target.value));
    }

    router();
});

// Utilities
const pathToRegex = path => new RegExp('^' + path.replace(/\//g, '\\/').replace(/:\w+/g, '(.+)') + '$');

const getParams = match => {
    const values = match.result.slice(1);
    const keys = Array.from(match.route.path.matchAll(/:(\w+)/g)).map(result => result[1]);

    return Object.fromEntries(keys.map((key, i) => {
        return [key, values[i]];
    }));
};


function stripMarkdown(md) {
    if (!md) return '';
    try {
        // Remove headers
        md = md.replace(/^#+\s+/gm, '');
        // Remove bold/italic
        md = md.replace(/(\*\*|__)(.*?)\1/g, '$2');
        md = md.replace(/(\*|_)(.*?)\1/g, '$2');
        // Remove links [text](url) -> text
        md = md.replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1');
        // Remove images ![alt](url) -> alt
        md = md.replace(/!\[([^\]]+)\]\([^\)]+\)/g, '$1');
        // Remove blockquotes
        md = md.replace(/^>\s+/gm, '');
        // Remove lists
        md = md.replace(/^[\+\-\*]\s+/gm, '');
        // Remove inline code
        md = md.replace(/`([^`]+)`/g, '$1');
        return md;
    } catch (e) {
        return md;
    }
}

// --- Views ---

class AbstractView {
    constructor(params) {
        this.params = params;
    }
    async getHtml() { return ''; }
}

class HomeView extends AbstractView {
    async getHtml() {
        const apiCategories = ['avatars', 'worlds', 'assets', 'clothes', 'others'];
        const latest = await fetch('/api/latest').then(res => res.json());

        const categoriesHtml = apiCategories.map(cat =>
            `<a href="/category/${cat}" data-link class="btn mr-10 mb-10">${t('cats.' + cat)}</a>`
        ).join('');

        const cardsHtml = latest.map(res => `
            <div class="card">
                <h3>${res.title}</h3>
                <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.timestamp).toLocaleDateString()}</div>
                <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
            </div>
        `).join('');

        return `
            <section class="mb-40 text-center">
                <h1>${t('home.welcome')}</h1>
                <p>${t('home.browse')}</p>
                <div class="flex-center">${categoriesHtml}</div>
            </section>
            <section>
                <h2>${t('home.latest')}</h2>
                <div class="grid">${cardsHtml}</div>
            </section>
        `;
    }
}

class CategoryView extends AbstractView {
    async getHtml() {
        const categoryKey = decodeURIComponent(this.params.id);
        const displayName = t('cats.' + categoryKey) || categoryKey;
        const data = await fetch(`/api/category/${categoryKey}`).then(res => res.json());

        const cardsHtml = data.resources.map(res => `
            <div class="card">
                <h3>${res.title}</h3>
                <div class="meta">${t('cats.' + res.category) || res.category} | ${new Date(res.timestamp).toLocaleDateString()}</div>
                <p>${stripMarkdown(res.description).substring(0, 100)}...</p>
                <a href="/item/${res.uuid}" data-link class="btn">${t('card.view')}</a>
            </div>
        `).join('');

        return `
            <h1>${displayName}</h1>
            <div class="grid">${cardsHtml}</div>
        `;
    }
}

// --- Turnstile Helper ---
let siteKey = null;

async function getSiteKey() {
    if (siteKey) return siteKey;
    try {
        const res = await fetch('/api/config');
        const data = await res.json();
        siteKey = data.turnstileSiteKey;
        return siteKey;
    } catch (e) {
        console.error('Failed to fetch config', e);
        return null;
    }
}

async function renderTurnstile(containerId) {
    if (!window.turnstile) {
        console.warn('Turnstile script not loaded yet.');
        return;
    }

    const key = await getSiteKey();
    if (!key) {
        console.error('Turnstile Site Key missing');
        return;
    }

    try {
        const container = document.querySelector(containerId);
        if (container) {
            container.innerHTML = ''; // Clear previous instance if any
            window.turnstile.render(containerId, {
                sitekey: key.trim(),
            });
        } else {
            console.error('Turnstile container not found:', containerId);
        }
    } catch (e) {
        console.error('Turnstile Render Error:', e);
    }
}

class ItemView extends AbstractView {
    async getHtml() {
        const uuid = this.params.id;
        const [res, comments] = await Promise.all([
            fetch(`/api/item/${uuid}`).then(r => r.ok ? r.json() : null),
            fetch(`/api/comments/${uuid}`).then(r => r.ok ? r.json() : [])
        ]);

        if (!res) return `<h1>${t('item.notFound')}</h1>`;

        const categoryName = t('cats.' + res.category) || res.category;

        let downloadSection = '';
        if (res.canDownload) {
            downloadSection = `
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <a href="${res.downloadUrl}" target="_blank" class="btn">${t('item.downloadMain')}</a>
                    ${res.backupUrls.map((url, i) => `
                        <a href="${url}" target="_blank" class="btn" style="background: #666;">${t('item.backup')} ${i + 1}</a>
                    `).join('')}
                </div>`;
        } else {
            downloadSection = `
                <div style="background: #eee; padding: 15px; border: 1px solid #999;">
                    <p><strong>${t('item.loginReq')}</strong></p>
                    <p>${t('item.loginMsg')}</p>
                    <a href="/login" data-link class="btn">${t('item.goToLogin')}</a>
                </div>`;
        }

        const commentsList = comments.length > 0 ? comments.map(c => `
            <div style="border: 1px solid #ddd; padding: 10px; margin-bottom: 10px; border-radius: 4px; background: #fff;">
                <div style="font-weight: bold; margin-bottom: 5px;">${c.author} <span style="font-weight: normal; font-size: 0.8em; color: #666;">(${new Date(c.timestamp).toLocaleString()})</span></div>
                <div>${c.text}</div>
            </div>
        `).join('') : `<p>${t('item.noComments')}</p>`;

        const canComment = res.canDownload; // Logged in check

        let commentForm = '';
        if (canComment) {
            commentForm = `
                <div style="margin-top: 20px;">
                    <h3>${t('item.postComment')}</h3>
                    <form id="comment-form">
                        <textarea id="comment-text" style="width: 100%; height: 80px; margin-bottom: 10px;" placeholder="${t('item.commentPlaceholder')}" required></textarea>
                        <div id="turnstile-comment" class="mb-10"></div>
                        <button type="submit" class="btn">${t('item.send')}</button>
                    </form>
                </div>
            `;
        } else {
            commentForm = `<p><em>${t('item.loginToComment')}</em></p>`;
        }

        // Gallery Logic
        let galleryHtml = '';
        const mediaItems = [];
        if (res.thumbnail) mediaItems.push(res.thumbnail);
        if (res.mediaFiles) {
            res.mediaFiles.forEach(m => {
                if (m.media_type !== 'file' && (!res.thumbnail || m.uuid !== res.thumbnail.uuid)) {
                    mediaItems.push(m);
                }
            });
        }

        if (mediaItems.length > 0) {
            galleryHtml = `
                <h3>${t('upload.reference')}</h3>
                <div class="gallery-grid">
                    ${mediaItems.map(m => {
                const url = `/api/download/${m.r2_key}`;
                if (m.media_type === 'video') {
                    return `<div class="gallery-item"><video src="${url}" controls></video></div>`;
                } else {
                    return `<div class="gallery-item"><a href="${url}" target="_blank"><img src="${url}" loading="lazy" alt="Gallery Image"></a></div>`;
                }
            }).join('')}
                </div>
                <hr>
            `;
        }

        return `
            <div class="details-box">
                <h1>${res.title}</h1>
                <div class="meta">
                    <strong>${t('item.category')}:</strong> <a href="/category/${res.category}" data-link>${categoryName}</a> | 
                    <strong>${t('item.uploaded')}:</strong> ${new Date(res.timestamp).toLocaleString()} |
                    <strong>${t('item.uuid')}:</strong> ${res.uuid}
                </div>
                <hr>
                
                ${galleryHtml}

                <h3>${t('item.description')}</h3>
                <div class="markdown-body" style="font-family: inherit;">${window.marked ? window.marked.parse(res.description || '') : (res.description || '')}</div>
                <hr>
                <h3>${t('item.downloads')}</h3>
                ${downloadSection}
                <hr>
                <h3>${t('item.comments')}</h3>
                <div id="comments-container">
                    ${commentsList}
                </div>
                ${commentForm}
            </div>
        `;
    }

    async postRender() {
        const form = document.getElementById('comment-form');
        if (form) {
            renderTurnstile('#turnstile-comment');
            form.addEventListener('submit', async e => {
                e.preventDefault();
                const text = document.getElementById('comment-text').value;
                const uuid = this.params.id;

                // Get Turnstile Token
                const formData = new FormData(form);
                const token = formData.get('cf-turnstile-response');

                const res = await fetch(`/api/comments/${uuid}`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ text, author: 'user', token })
                });

                if (res.ok) {
                    router();
                } else {
                    const data = await res.json();
                    alert('Error: ' + (data.error || 'Unknown'));
                }
            });
        }
    }
}

class UploadView extends AbstractView {
    async getHtml() {
        return `
            <div style="max-width: 1200px; margin: 0 auto;">
                <h1>${t('upload.title')}</h1>
                <form id="upload-form">
                    <div class="form-group">
                        <label><strong>${t('upload.name')} ${t('upload.required')}</strong></label>
                        <input type="text" id="title" required placeholder="${t('upload.resourceName')}">
                    </div>
                    
                    <div class="form-group">
                        <label><strong>${t('upload.cat')} ${t('upload.required')}</strong></label>
                        <select id="category" class="form-control" required>
                            <option value="avatars">${t('cats.avatars')}</option>
                            <option value="worlds">${t('cats.worlds')}</option>
                            <option value="assets">${t('cats.assets')}</option>
                            <option value="clothes">${t('cats.clothes')}</option>
                            <option value="others">${t('cats.others')}</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label><strong>${t('upload.desc')} (Markdown)</strong></label>
                        <div class="upload-grid">
                            <div>
                                <textarea id="description" rows="12" placeholder="${t('upload.markdownPlaceholder')}" style="width: 100%; font-family: monospace; resize: vertical;"></textarea>
                            </div>
                            <div>
                                <div class="preview-container">
                                    <strong>${t('upload.preview')}:</strong>
                                    <hr>
                                    <div id="markdown-preview" class="markdown-body"></div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div class="upload-grid" style="margin-bottom: 20px;">
                        <div class="form-group">
                            <label><strong>${t('upload.thumbnail')} ${t('upload.required')}</strong></label>
                            <input type="file" id="thumbnail" accept="image/png,image/jpg,image/jpeg" required>
                            <small style="color: #666;">${t('upload.imageVideo')}</small>
                            <div id="thumbnail-preview" style="margin-top: 10px;"></div>
                        </div>
                        
                        <div class="form-group">
                            <label><strong>${t('upload.reference')} (${t('upload.optional')})</strong></label>
                            <input type="file" id="reference-image" accept="image/png,image/jpg,image/jpeg,video/mp4,video/webm" multiple>
                            <small style="color: #666;">${t('upload.imageVideoAdditional')}</small>
                            <div id="reference-preview" style="margin-top: 10px;"></div>
                        </div>
                    </div>

                    <div class="form-group">
                        <label><strong>${t('upload.mainFile')} (.rar, .zip, .unitypackage) ${t('upload.required')}</strong></label>
                        <input type="file" id="file" accept=".rar,.zip,.unitypackage" required>
                        <small style="color: #666;">${t('upload.fileTypes')}</small>
                        <div id="file-info" style="margin-top: 10px; color: #666;"></div>
                    </div>

                    <div class="form-group" style="margin: 20px 0;">
                        <label><strong>CAPTCHA *</strong></label>
                        <div id="turnstile-container"></div>
                    </div>

                    <div id="upload-error" style="color: red; margin-bottom: 10px;"></div>
                    <button type="submit" class="btn" style="width: 100%; padding: 15px; font-size: 16px;">${t('upload.btn')}</button>
                </form>
            </div>
        `;
    }

    async postRender() {
        const form = document.getElementById('upload-form');
        const descriptionField = document.getElementById('description');
        const markdownPreview = document.getElementById('markdown-preview');
        const thumbnailInput = document.getElementById('thumbnail');
        const referenceInput = document.getElementById('reference-image');
        const fileInput = document.getElementById('file');
        const thumbnailPreview = document.getElementById('thumbnail-preview');
        const referencePreview = document.getElementById('reference-preview');
        const fileInfo = document.getElementById('file-info');
        const uploadError = document.getElementById('upload-error');
        let turnstileToken = null;
        let turnstileWidgetId = null;

        // Initialize Turnstile
        try {
            const configRes = await fetch('/api/config');
            const config = await configRes.json();

            if (window.turnstile) {
                turnstileWidgetId = window.turnstile.render('#turnstile-container', {
                    sitekey: config.turnstileSiteKey,
                    callback: function (token) {
                        turnstileToken = token;
                    },
                    'expired-callback': function () {
                        turnstileToken = null;
                    }
                });
            }
        } catch (e) {
            console.error('Failed to load Turnstile config', e);
        }

        // Markdown Preview
        descriptionField.addEventListener('input', () => {
            const markdown = descriptionField.value;
            if (window.marked) {
                markdownPreview.innerHTML = window.marked.parse(markdown || `*${t('upload.noContent')}*`);
            } else {
                markdownPreview.textContent = markdown || t('upload.noContent');
            }
        });

        // Trigger initial preview
        descriptionField.dispatchEvent(new Event('input'));

        // Thumbnail Preview
        thumbnailInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const isVideo = file.type.startsWith('video/');
                const url = URL.createObjectURL(file);
                if (isVideo) {
                    thumbnailPreview.innerHTML = `<video src="${url}" style="max-width: 200px; max-height: 200px;" controls></video>`;
                } else {
                    thumbnailPreview.innerHTML = `<img src="${url}" style="max-width: 200px; max-height: 200px;">`;
                }
            }
        });

        // Reference Image Preview
        // Reference Image Preview
        referenceInput.addEventListener('change', (e) => {
            const files = Array.from(e.target.files);
            referencePreview.innerHTML = '';

            if (files.length > 8) {
                alert(t('upload.maxFiles'));
                referenceInput.value = '';
                return;
            }

            files.forEach(file => {
                const isVideo = file.type.startsWith('video/');
                const url = URL.createObjectURL(file);
                const container = document.createElement('div');
                container.style.display = 'inline-block';
                container.style.margin = '5px';

                if (isVideo) {
                    container.innerHTML = `<video src="${url}" style="max-width: 100px; max-height: 100px; object-fit: cover;" controls></video>`;
                } else {
                    container.innerHTML = `<img src="${url}" style="max-width: 100px; max-height: 100px; object-fit: cover;">`;
                }
                referencePreview.appendChild(container);
            });
        });

        // File Validation
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const validExtensions = ['.rar', '.zip', '.unitypackage'];
                const fileName = file.name.toLowerCase();
                const isValid = validExtensions.some(ext => fileName.endsWith(ext));

                if (isValid) {
                    const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
                    fileInfo.innerHTML = `<span style="color: green;">✓ ${file.name} (${sizeMB} MB)</span>`;
                    uploadError.textContent = '';
                } else {
                    fileInfo.innerHTML = `<span style="color: red;">✗ ${t('upload.invalidFile')}</span>`;
                    uploadError.textContent = `${t('upload.error')}: ${t('upload.errorMainFile')}`;
                    fileInput.value = '';
                }
            }
        });

        // Form Submit
        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = e.target.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = t('upload.uploading');
            btn.disabled = true;
            uploadError.textContent = '';

            const title = document.getElementById('title').value;
            const description = descriptionField.value;
            const category = document.getElementById('category').value;
            const file = fileInput.files[0];
            const thumbnail = thumbnailInput.files[0];
            const referenceFiles = referenceInput.files;

            // Validate main file
            const validExtensions = ['.rar', '.zip', '.unitypackage'];
            const fileName = file.name.toLowerCase();
            const isValid = validExtensions.some(ext => fileName.endsWith(ext));

            if (!isValid) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorMainFile')}`;
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            if (!thumbnail) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorThumbnail')}`;
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            if (!turnstileToken) {
                uploadError.textContent = `${t('upload.error')}: ${t('upload.errorCaptcha')}`;
                btn.textContent = originalText;
                btn.disabled = false;
                return;
            }

            try {
                btn.textContent = t('upload.uploadingThumbnail');

                // 1. Upload Thumbnail
                const thumbnailFormData = new FormData();
                thumbnailFormData.append('file', thumbnail);
                thumbnailFormData.append('media_type', thumbnail.type.startsWith('video/') ? 'video' : 'image');

                const thumbnailRes = await fetch('/api/upload', {
                    method: 'PUT',
                    body: thumbnailFormData
                });

                if (!thumbnailRes.ok) throw new Error(t('upload.errorThumbnailUpload'));
                const thumbnailData = await thumbnailRes.json();

                // 2. Upload Reference Images (Gallery)
                const galleryUuids = [];
                if (referenceFiles.length > 0) {
                    if (referenceFiles.length > 8) {
                        alert(t('upload.maxFiles'));
                        btn.textContent = originalText;
                        btn.disabled = false;
                        return;
                    }

                    btn.textContent = t('upload.uploadingReference');

                    for (let i = 0; i < referenceFiles.length; i++) {
                        const file = referenceFiles[i];
                        const formData = new FormData();
                        formData.append('file', file);
                        formData.append('media_type', file.type.startsWith('video/') ? 'video' : 'image');

                        const res = await fetch('/api/upload', {
                            method: 'PUT',
                            body: formData
                        });

                        if (!res.ok) throw new Error(t('upload.errorReferenceUpload'));
                        const data = await res.json();
                        galleryUuids.push(data.media_uuid);
                    }
                }

                // 3. Upload Main File
                btn.textContent = t('upload.uploadingFile');
                const fileFormData = new FormData();
                fileFormData.append('file', file);
                fileFormData.append('media_type', 'file');

                const fileRes = await fetch('/api/upload', {
                    method: 'PUT',
                    body: fileFormData
                });

                if (!fileRes.ok) throw new Error(t('upload.errorFileUpload'));
                const fileData = await fileRes.json();

                // 4. Create Resource
                btn.textContent = t('upload.creating');
                const resourceBody = {
                    title,
                    description,
                    category,
                    thumbnail_uuid: thumbnailData.media_uuid,
                    reference_image_uuid: galleryUuids.length > 0 ? galleryUuids[0] : null,
                    media_files: [fileData.media_uuid, ...galleryUuids],
                    links: [{
                        link_url: `/api/download/${fileData.r2_key}`,
                        link_title: 'Download',
                        link_type: 'download',
                        display_order: 0,
                        file_size: file.size,
                        version: '1.0'
                    }]
                };

                // Add token
                resourceBody.token = turnstileToken;

                const res = await fetch('/api/resources', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(resourceBody)
                });

                if (res.ok) {
                    const data = await res.json();
                    navigateTo('/item/' + data.uuid);
                } else {
                    const err = await res.json();
                    uploadError.textContent = `${t('upload.error')}: ${err.error || t('upload.errorCreateResource')}`;
                    btn.textContent = originalText;
                    btn.disabled = false;
                    if (window.turnstile && turnstileWidgetId) {
                        window.turnstile.reset(turnstileWidgetId);
                        turnstileToken = null;
                    }
                }
            } catch (err) {
                console.error(err);
                uploadError.textContent = `${t('upload.error')}: ${err.message}`;
                btn.textContent = originalText;
                btn.disabled = false;
                if (window.turnstile && turnstileWidgetId) {
                    window.turnstile.reset(turnstileWidgetId);
                    turnstileToken = null;
                }
            }
        });
    }
}

class LogoutView extends AbstractView {
    async getHtml() {
        return `
            <div class="login-box" style="text-align: center;">
                <h1>${t('login.logout')}</h1>
                <p>${t('login.logoutConfirm')}</p>
                <div style="margin-top: 20px;">
                    <button id="confirm-logout" class="btn">${t('login.logout')}</button>
                    <a href="/" data-link class="btn" style="background: #666; margin-left: 10px;">${t('item.backup').replace('Backup', 'Cancel')}</a>
                </div>
            </div>
        `;
    }

    async postRender() {
        document.getElementById('confirm-logout').addEventListener('click', async () => {
            const res = await fetch('/api/logout', { method: 'POST' });
            if (res.ok) {
                navigateTo('/');
            }
        });
    }
}

class LoginView extends AbstractView {
    async getHtml() {
        return `
            <div class="login-box">
                <h1>${t('login.title')}</h1>
                <div id="login-error" class="danger"></div>
                <form id="login-form">
                    <div class="form-group">
                        <label for="username">${t('login.username')}</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">${t('login.password')}</label>
                        <input type="password" id="password" required>
                    </div>
                    <div id="turnstile-login" class="mb-10"></div>
                    <button type="submit" class="btn" style="width: 100%;">${t('login.btn')}</button>
                </form>
                <p style="font-size: 0.8rem; margin-top: 10px; color: #666;">
                    (${t('login.hint')})
                </p>
                <p style="margin-top: 15px; text-align: center;">
                    <a href="/register" data-link>${t('login.register')}</a>
                </p>
            </div>
        `;
    }

    async postRender() {
        renderTurnstile('#turnstile-login');
        const form = document.getElementById('login-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Get Turnstile Token
            const formData = new FormData(form);
            const token = formData.get('cf-turnstile-response');

            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, token })
            });

            if (res.ok) {
                navigateTo('/');
            } else {
                const data = await res.json();
                document.getElementById('login-error').innerText = t('login.error') + ': ' + (data.error || '');
            }
        });
    }
}

class RegisterView extends AbstractView {
    async getHtml() {
        return `
            <div class="login-box">
                <h1>${t('register.title')}</h1>
                <div id="register-error" class="danger"></div>
                <form id="register-form">
                    <div class="form-group">
                        <label for="username">${t('login.username')}</label>
                        <input type="text" id="username" required>
                    </div>
                    <div class="form-group">
                        <label for="password">${t('login.password')}</label>
                        <input type="password" id="password" required>
                    </div>
                    <div id="turnstile-register" class="mb-10"></div>
                    <button type="submit" class="btn" style="width: 100%;">${t('register.btn')}</button>
                </form>
                <p style="margin-top: 15px; text-align: center;">
                    <a href="/login" data-link>${t('register.loginLink')}</a>
                </p>
            </div>
        `;
    }

    async postRender() {
        renderTurnstile('#turnstile-register');
        const form = document.getElementById('register-form');
        form.addEventListener('submit', async e => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Get Turnstile Token
            const formData = new FormData(form);
            const token = formData.get('cf-turnstile-response');

            const res = await fetch('/api/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password, token })
            });

            if (res.ok) {
                alert(t('register.success'));
                navigateTo('/login');
            } else {
                const data = await res.json();
                document.getElementById('register-error').innerText = data.error || 'Registration failed';
            }
        });
    }
}
