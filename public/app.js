const appPayload = {
    content: document.getElementById('app')
};

// --- I18n Configuration ---
const translations = {
    es: {
        nav: { home: 'Inicio', avatars: 'Avatares', worlds: 'Mundos', assets: 'Assets', clothes: 'Ropa', others: 'Otros', login: 'Login' },
        home: { welcome: 'Bienvenido a VRChat Storage', browse: 'Explora recursos por categoría:', latest: 'Últimos Recursos' },
        card: { view: 'Ver Detalles' },
        category: { showing: 'Mostrando', of: 'de', resources: 'recursos', prev: 'Anterior', next: 'Siguiente' },
        item: { notFound: 'Recurso No Encontrado', category: 'Categoría', uploaded: 'Subido', uuid: 'UUID', description: 'Descripción', downloads: 'Descargas', downloadMain: 'Descargar (R2 Main)', backup: 'Backup', loginReq: 'Login Requerido', loginMsg: 'Debes iniciar sesión para descargar recursos.', goToLogin: 'Ir al Login', comments: 'Comentarios', noComments: 'No hay comentarios aún.', postComment: 'Publicar Comentario', commentPlaceholder: 'Escribe tu comentario...', send: 'Enviar', loginToComment: 'Inicia sesión para comentar' },
        login: { title: 'Login', username: 'Usuario', password: 'Password', btn: 'Entrar', hint: 'Pista: user / password', error: 'Credenciales inválidas', register: '¿No tienes cuenta? Regístrate' },
        register: { title: 'Registro', btn: 'Registrarse', loginLink: '¿Ya tienes cuenta? Inicia sesión', success: 'Registro exitoso. Por favor inicia sesión.' },
        cats: { avatars: 'Avatares', worlds: 'Mundos', assets: 'Assets', clothes: 'Ropa', others: 'Otros' }
    },
    en: {
        nav: { home: 'Home', avatars: 'Avatars', worlds: 'Worlds', assets: 'Assets', clothes: 'Clothes', others: 'Others', login: 'Login' },
        home: { welcome: 'Welcome to VRChat Storage', browse: 'Browse resources by category:', latest: 'Latest Resources' },
        card: { view: 'View Details' },
        category: { showing: 'Showing', of: 'of', resources: 'resources', prev: 'Previous', next: 'Next' },
        item: { notFound: 'Resource Not Found', category: 'Category', uploaded: 'Uploaded', uuid: 'UUID', description: 'Description', downloads: 'Downloads', downloadMain: 'Download (R2 Main)', backup: 'Backup', loginReq: 'Login Required', loginMsg: 'You must be logged in to download resources.', goToLogin: 'Go to Login', comments: 'Comments', noComments: 'No comments yet.', postComment: 'Post Comment', commentPlaceholder: 'Write your comment...', send: 'Send', loginToComment: 'Login to comment' },
        login: { title: 'Login', username: 'Username', password: 'Password', btn: 'Login', hint: 'Hint: user / password', error: 'Invalid credentials', register: 'No account? Register' },
        register: { title: 'Register', btn: 'Sign Up', loginLink: 'Already have an account? Login', success: 'Registration successful. Please login.' },
        cats: { avatars: 'Avatars', worlds: 'Worlds', assets: 'Assets', clothes: 'Clothes', others: 'Others' }
    },
    ru: {
        nav: { home: 'Главная', avatars: 'Аватары', worlds: 'Миры', assets: 'Ассеты', clothes: 'Одежда', others: 'Другое', login: 'Войти' },
        home: { welcome: 'Добро пожаловать в VRChat Storage', browse: 'Просмотр ресурсов по категориям:', latest: 'Последние ресурсы' },
        card: { view: 'Подробнее' },
        category: { showing: 'Показано', of: 'из', resources: 'ресурсов', prev: 'Назад', next: 'Вперед' },
        item: { notFound: 'Ресурс не найден', category: 'Категория', uploaded: 'Загружено', uuid: 'UUID', description: 'Описание', downloads: 'Скачать', downloadMain: 'Скачать (R2 Main)', backup: 'Резерв', loginReq: 'Требуется вход', loginMsg: 'Вы должны войти, чтобы скачивать ресурсы.', goToLogin: 'Войти', comments: 'Комментарии', noComments: 'Комментариев пока нет.', postComment: 'Оставить комментарий', commentPlaceholder: 'Напишите ваш комментарий...', send: 'Отправить', loginToComment: 'Войдите, чтобы комментировать' },
        login: { title: 'Вход', username: 'Имя пользователя', password: 'Пароль', btn: 'Войти', hint: 'Подсказка: user / password', error: 'Неверные данные', register: 'Нет аккаунта? Регистрация' },
        register: { title: 'Регистрация', btn: 'Зарегистрироваться', loginLink: 'Уже есть аккаунт? Войти', success: 'Регистрация успешна. Войдите.' },
        cats: { avatars: 'Аватары', worlds: 'Миры', assets: 'Ассеты', clothes: 'Одежда', others: 'Другое' }
    },
    jp: {
        nav: { home: 'ホーム', avatars: 'アバター', worlds: 'ワールド', assets: 'アセット', clothes: '服', others: 'その他', login: 'ログイン' },
        home: { welcome: 'VRChat Storageへようこそ', browse: 'カテゴリー別リソース:', latest: '最新のリソース' },
        card: { view: '詳細を見る' },
        category: { showing: '表示中', of: '/', resources: '件', prev: '前へ', next: '次へ' },
        item: { notFound: 'リソースが見つかりません', category: 'カテゴリー', uploaded: 'アップロード日時', uuid: 'UUID', description: '説明', downloads: 'ダウンロード', downloadMain: 'ダウンロード (R2 Main)', backup: 'バックアップ', loginReq: 'ログインが必要です', loginMsg: 'リソースをダウンロードするにはログインしてください。', goToLogin: 'ログイン画面へ', comments: 'コメント', noComments: 'まだコメントはありません。', postComment: 'コメントを投稿', commentPlaceholder: 'コメントを入力...', send: '送信', loginToComment: 'コメントするにはログインしてください' },
        login: { title: 'ログイン', username: 'ユーザー名', password: 'パスワード', btn: 'ログイン', hint: 'ヒント: user / password', error: '認証情報が無効です', register: 'アカウントをお持ちでないですか？ 登録' },
        register: { title: '登録', btn: '登録する', loginLink: 'すでにアカウントをお持ちですか？ ログイン', success: '登録が完了しました。ログインしてください。' },
        cats: { avatars: 'アバター', worlds: 'ワールド', assets: 'アセット', clothes: '服', others: 'その他' }
    },
    cn: {
        nav: { home: '主页', avatars: '模型', worlds: '世界', assets: '资源', clothes: '服装', others: '其他', login: '登录' },
        home: { welcome: '欢迎来到 VRChat Storage', browse: '按类别浏览资源：', latest: '最新资源' },
        card: { view: '查看详情' },
        category: { showing: '显示', of: '/', resources: '资源', prev: '上一页', next: '下一页' },
        item: { notFound: '未找到资源', category: '类别', uploaded: '上传时间', uuid: 'UUID', description: '描述', downloads: '下载', downloadMain: '下载 (R2 Main)', backup: '备用', loginReq: '需要登录', loginMsg: '您必须登录才能下载资源。', goToLogin: '去登录', comments: '评论', noComments: '暂无评论。', postComment: '发表评论', commentPlaceholder: '写下你的评论...', send: '发送', loginToComment: '登录后评论' },
        login: { title: '登录', username: '用户名', password: '密码', btn: '登录', hint: '提示: user / password', error: '凭据无效', register: '没有账号？注册' },
        register: { title: '注册', btn: '注册', loginLink: '已有账号？登录', success: '注册成功。请登录。' },
        cats: { avatars: '模型', worlds: '世界', assets: '资源', clothes: '服装', others: '其他' }
    },
    fr: {
        nav: { home: 'Accueil', avatars: 'Avatars', worlds: 'Mondes', assets: 'Actifs', clothes: 'Vêtements', others: 'Autres', login: 'Connexion' },
        home: { welcome: 'Bienvenue sur VRChat Storage', browse: 'Parcourir les ressources par catégorie :', latest: 'Dernières ressources' },
        card: { view: 'Voir les détails' },
        category: { showing: 'Affichage de', of: 'sur', resources: 'ressources', prev: 'Précédent', next: 'Suivant' },
        item: { notFound: 'Ressource introuvable', category: 'Catégorie', uploaded: 'Mis en ligne', uuid: 'UUID', description: 'Description', downloads: 'Téléchargements', downloadMain: 'Télécharger (R2 Main)', backup: 'Secours', loginReq: 'Connexion requise', loginMsg: 'Vous devez être connecté pour télécharger.', goToLogin: 'Se connecter', comments: 'Commentaires', noComments: 'Aucun commentaire pour le moment.', postComment: 'Poster un commentaire', commentPlaceholder: 'Écrivez votre commentaire...', send: 'Envoyer', loginToComment: 'Connectez-vous pour commenter' },
        login: { title: 'Connexion', username: 'Nom d\'utilisateur', password: 'Mot de passe', btn: 'Se connecter', hint: 'Indice : user / password', error: 'Identifiants invalides', register: 'Pas encore de compte ? S\'inscrire' },
        register: { title: 'Inscription', btn: 'S\'inscrire', loginLink: 'Déjà un compte ? Se connecter', success: 'Inscription réussie. Veuillez vous connecter.' },
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

function updateNav() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
        const key = el.getAttribute('data-i18n');
        el.textContent = t(key);
    });
}

// Ensure global access for the HTML selector (if we use inline onclick, but better to bind in DOMContentLoaded)
window.setLanguage = setLanguage;


// Router
const router = async () => {
    updateNav(); // Ensure nav is translated

    const routes = [
        { path: '/', view: HomeView },
        { path: '/category/:id', view: CategoryView },
        { path: '/item/:id', view: ItemView },
        { path: '/login', view: LoginView },
        { path: '/register', view: RegisterView }
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
        }
    });

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
                <p>${res.description.substring(0, 100)}...</p>
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
                <p>${res.description.substring(0, 100)}...</p>
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
    console.log('Rendering Turnstile with key:', key);

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
                callback: function (token) {
                    console.log(`Challenge Success ${token}`);
                },
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
            <div style="border-bottom: 1px solid #ccc; padding: 10px 0;">
                <div style="font-weight: bold;">${c.author} <span style="font-weight: normal; font-size: 0.8em; color: #666;">(${new Date(c.timestamp).toLocaleString()})</span></div>
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

        return `
            <div class="details-box">
                <h1>${res.title}</h1>
                <div class="meta">
                    <strong>${t('item.category')}:</strong> <a href="/category/${res.category}" data-link>${categoryName}</a> | 
                    <strong>${t('item.uploaded')}:</strong> ${new Date(res.timestamp).toLocaleString()} |
                    <strong>${t('item.uuid')}:</strong> ${res.uuid}
                </div>
                <hr> 
                <h3>${t('item.description')}</h3>
                <div style="white-space: pre-wrap; font-family: inherit;">${res.description}</div>
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
