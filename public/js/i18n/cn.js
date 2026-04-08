// ============================================================================
// Locale: Chinese (cn)
// ============================================================================

export default {
    common: {
        loading: '加载中...',
        loadingResources: '加载资源中...',
        loadingComments: '加载评论中...',
        loadingCleanup: '加载清理信息中...',
        loadingPending: '加载待处理资源中...',
        accessDenied: '访问被拒绝',
        noResourcesFound: '此类别中未找到资源。',
        error: '错误',
        cancel: '取消',
        unknown: '未知',
        noFavorites: '您还没有收藏。',
        moveToTop: '移到顶部',
        removeFavorite: '取消收藏',
        networkError: '网络错误，请重试。',
    },
    nav: {
        home: '主页',
        avatars: '虚拟形象',
        worlds: '世界',
        assets: '资产',
        clothes: '服装',
        others: '其他',
        login: '登录',
        upload: '上传',
        admin: '管理',
        settings: '设置',
        menu: '菜单',
        wiki: '维基',
        favorites: '收藏',
        blog: '博客',
    },
    settings: {
        title: '个人资料设置',
        avatar: '头像',
        save: '保存更改',
        success: '个人资料已成功更新',
        logout: '退出登录',
        change_password: '修改密码',
        current_password: '当前密码',
        new_password: '新密码',
        confirm_password: '确认新密码',
        current_password_required: '请输入当前密码',
        password_too_short: '新密码至少需要8个字符',
        password_mismatch: '两次输入的密码不一致',
        password_changed: '密码已修改！请重新登录。',
        '2fa_title': '双因素认证',
        '2fa_secret': '手动密钥',
        '2fa_verify': '输入代码',
        '2fa_enable': '启用2FA',
        '2fa_password': '密码',
        '2fa_password_required': '需要输入密码',
        '2fa_code': '2FA代码',
        '2fa_code_hint': '您的账户已启用2FA。请输入TOTP代码或备用代码。',
        '2fa_code_required': '需要输入2FA代码',
        '2fa_disable': '禁用2FA',
        '2fa_enabled': '2FA已启用',
        '2fa_disabled': '2FA未启用',
        '2fa_success': '2FA启用成功！',
        '2fa_enabled_success': '2FA启用成功！',
        '2fa_disabled_success': '2FA禁用成功！',
        '2fa_backup_warning': '请保存这些备用代码！您将无法再次查看。',
        '2fa_enter_password': '输入您的密码以设置2FA：',
        '2fa_view_backup': '查看备用代码',
        '2fa_activate': '激活2FA',
        '2fa_setup_instructions': '使用您的身份验证器应用程序扫描二维码，然后输入代码以启用2FA。',
        '2fa_cancel': '取消',
        '2fa_confirm_disable': '确认禁用',
        '2fa_backup_ok': '我已保存我的代码',
        '2fa_continue': '继续',
    },
    home: {
        welcome: '欢迎来到 VRCStorage',
        browse: '按类别浏览资源：',
        latest: '最新资源'
    },
    card: {
        view: '查看详情'
    },
    avatar: {
        options: '虚拟形象选项',
        platform: '平台',
        sdk: 'SDK',
        version: '版本',
        blend: '包含 .blend 文件？',
        poiyomi: '使用 Poiyomi？',
        vrcfury: '使用 VRCFury？',
        pcOnly: '仅PC',
        quest: 'Quest',
        pcQuest: 'PC / Quest',
        default: '默认',
    },
    category: {
        showing: '显示',
        of: '/',
        resources: '资源',
        prev: '上一页',
        next: '下一页'
    },
    pagination: {
        prev: '上一页',
        next: '下一页',
        page: '页',
        of: '/'
    },
    admin: {
        title: '管理员面板',
        noPending: '没有等待批准的资源。',
        delete: '删除',
        deleteConfirm: '您确定要删除此评论吗？',
        cleanupOrphaned: '清理未关联文件',
        cleanupConfirm: '清理未关联文件？这将删除24小时前上传且未与任何资源关联的文件。',
        cleaning: '清理中...',
        cleanupSuccess: '清理成功：已删除 {count} 个文件',
        error: '错误',
        networkError: '网络错误',
        orphanedFiles: '未关联文件',
        totalMedia: '文件总数',
        totalResources: '资源总数',
        orphanedFilesFound: '发现未关联文件',
        orphanedFilesDesc: '发现 {count} 个在 {hours} 小时前上传且未与任何资源关联的文件。',
        viewFileList: '查看文件列表',
        noOrphanedFiles: '没有未关联文件',
        noOrphanedFilesDesc: '目前没有未关联文件。系统很干净。',
        pendingResources: '待批准资源',
        cacheClear: '清除用户缓存',
        usernamePlaceholder: '用户名',
        clearCacheBtn: '清除缓存',
        cacheClearSuccess: '已清除用户 {user} 的缓存',
        cacheClearError: '清除缓存失败',
    },
    item: {
        notFound: '未找到资源',
        category: '类别',
        uploaded: '上传时间',
        uuid: 'UUID',
        description: '描述',
        downloads: '下载',
        downloadMain: '下载 (R2 Main)',
        backup: '备用',
        loginReq: '需要登录',
        loginMsg: '您必须登录才能下载资源。',
        goToLogin: '去登录',
        comments: '评论',
        noComments: '暂无评论。',
        postComment: '发表评论',
        commentPlaceholder: '写下你的评论...',
        send: '发送',
        sending: '发送中...',
        deleting: '删除中...',
        loginToComment: '登录后评论',
        underReview: '等待管理员批准',
        approve: '批准',
        reject: '拒绝',
        deactivate: '停用',
        confirmDeactivate: '您确定要停用此资源吗？',
        confirmReject: '您确定要拒绝并删除此资源吗？',
        adminPanel: '管理员面板',
        pendingApproval: '此资源正在等待批准。',
        edit: '编辑',
        history: '历史记录',
        errorLoadingComments: '加载评论时出错。',
        md: {
            bold: '粗体',
            italic: '斜体',
            strike: '删除线',
            code: '内联代码',
            codeblock: '代码块',
            link: '链接',
            quote: '引用',
            ul: '列表',
            image: '上传图片',
            uploading: '上传图片中...',
            uploadError: '上传失败，请重试。',
        },
        specifications: '规格',
    },
    edit: {
        title: '编辑资源',
        addFileHeader: '添加文件 (更新)',
        addFileDesc: '上传新文件以添加到下载列表 (v1.1, v1.2等)。不会替换之前的文件。',
        saving: '保存中...',
    },
    history: {
        title: '变更历史',
        backToResource: '返回资源',
        noHistory: '此资源没有变更记录。',
        field: {
            title: '标题',
            desc: '描述',
            cat: '类别',
            tags: '标签'
        },
        noVisibleChanges: '没有可见的内容变更。',
        types: {
            content_edit: '内容编辑',
            create: '创建',
            approval: '批准',
            meta_edit: '元数据已编辑'
        },
    },
    login: {
        title: '登录',
        username: '用户名',
        password: '密码',
        btn: '登录',
        hint: '提示: user / password',
        error: '凭据无效',
        success: '登录成功！',
        enter2FA: '请输入您验证器应用中的6位数代码',
        invalid2FA: '代码必须是6位数字',
        logout_success: '已成功退出登录',
        register: '没有账号？注册',
        logout: '退出',
        logoutConfirm: '确定要退出吗？',
        '2fa_code': '验证码',
        '2fa_hint': '输入您身份验证器应用的6位代码或8位备用代码',
        back: '返回',
        or: '或',
        google: '通过Google登录',
    },
    oauthRegister: {
        title: '选择用户名',
        subtitle: '您即将创建账户，请选择一个唯一的用户名。',
        usernamePlaceholder: '用户名',
        btn: '创建账户',
        loading: '创建账户中...',
        errorExpired: '注册会话已过期，请重新使用Google登录。',
        errorTaken: '该用户名已被使用。',
        errorInvalid: '用户名必须为3到32个字符，只能包含字母、数字和下划线。',
    },
    register: {
        title: '注册',
        btn: '注册',
        loginLink: '已有账号？登录',
        hasAccount: '已有账号？',
        confirmPassword: '确认密码',
        passwordMismatch: '两次输入的密码不一致',
        error: '注册失败，请重试。',
        success: '注册成功。请登录。',
    },
    upload: {
        title: '上传资源',
        name: '标题',
        desc: '描述',
        cat: '类别',
        file: '文件',
        btn: '上传',
        success: '上传成功',
        thumbnail: '缩略图',
        reference: '画廊 (图片/视频)',
        mainFile: '主文件',
        preview: '预览',
        optional: '可选',
        required: '*',
        uploading: '上传文件中...',
        uploadingThumbnail: '上传缩略图中...',
        uploadingReference: '上传画廊文件中...',
        uploadingFile: '上传主文件中...',
        creating: '创建资源中...',
        error: '错误',
        fileTypes: '仅限 RAR、ZIP 或 UnityPackage 文件',
        imageVideo: '预览用图片或视频',
        imageVideoAdditional: '最多8个文件 (图片/视频)',
        validFile: '有效文件',
        invalidFile: '无效文件',
        markdownPlaceholder: '使用 Markdown 编写描述...',
        noContent: '无内容',
        resourceName: '资源名称',
        errorMainFile: '主文件必须是 .rar、.zip、.unitypackage 或 .blend',
        errorThumbnail: '您必须选择缩略图',
        errorThumbnailUpload: '上传缩略图错误',
        errorReferenceUpload: '上传画廊文件错误',
        errorFileUpload: '上传主文件错误',
        errorCreateResource: '创建资源错误',
        errorUnknown: '未知错误',
        errorCaptcha: '请完成验证码',
        maxFiles: '最多允许8个文件',
        backupLinks: '备用链接 (可选)',
        backupLinksHint: '每行一个链接 (Google Drive, Dropbox 等)',
        tags: '标签',
        tagsHint: '以逗号分隔',
        captcha: 'CAPTCHA *',
        errorMaxFiles: '最多3个文件',
        errorFileTooLarge: '文件太大',
        errorImageDimensions: '图片尺寸太大',
        errorInvalidFileType: '无效的文件类型',
    },
    cats: {
        avatars: '虚拟形象',
        worlds: '世界',
        assets: '资产',
        clothes: '服装',
        others: '其他',
        desc: {
            avatars: 'VRChat的3D虚拟形象',
            worlds: '可探索的虚拟世界',
            assets: '资源和工具',
            clothes: '服装和配饰',
            others: '其他各种资源',
        },
    },
    wiki: {
        title: '维基 - 依赖指南',
        poiyomi: {
            title: 'Poiyomi Toon Shader'
        },
        vrcfury: {
            title: 'VRCFury'
        },
        modularAvatar: {
            title: 'Modular Avatar'
        },
        physbones: {
            title: 'PhysBones'
        },
        syncdances: {
            title: 'SyncDances'
        },
        vrcquesttools: {
            title: 'VRCQuestTools'
        },
        setup: {
            title: '安装指南'
        },
        faq: {
            title: '常见问题'
        },
        gogoloco: {
            title: 'GoGo Loco'
        },
        gogolocoNsfw: {
            title: 'NSFW Locomotion'
        },
        sps: {
            title: 'SPS (Super Plug Shader)'
        },
        dps: {
            title: 'DPS (Dynamic Penetration System)'
        },
        insideView: {
            title: 'Inside View'
        },
        pcs: {
            title: 'PCS (Penetration Contact System)'
        },
        parameter: {
            title: '虚拟形象参数'
        },
        actionMenu: {
            title: '操作菜单'
        },
        gestureManager: {
            title: 'Gesture Manager 模拟器'
        },
        nsfwEssentials: {
            title: 'NSFW 基础指南'
        },
        haptics: {
            title: '触觉指南'
        },
        comments: {
            title: 'Wiki 评论'
        },
        desktopPuppeteer: {
            title: 'Desktop Puppeteer'
        },
        unityhubError: {
            title: 'Unity Hub 错误'
        },
        justkisssfx: {
            title: 'JustKissSFX'
        },
        categories: {
            vrchat: 'VRChat',
            dependencies: '依赖项',
            erp: 'ERP',
            informative: '信息'
        },
    },
    blog: {
        title: '博客',
        subtitle: 'VRCStorage 文章与新闻',
        noPostsYet: '暂无文章。',
        readMore: '阅读更多',
        by: '作者',
        team: 'VRCStorage 团队',
        publishedOn: '发布于',
        createPost: '新文章',
        editPost: '编辑文章',
        deletePost: '删除文章',
        deleteConfirm: '您确定要删除这篇文章吗？',
        titleLabel: '标题',
        contentLabel: '内容 (Markdown)',
        excerptLabel: '摘要 (可选)',
        coverImageLabel: '封面图片 (可选)',
        authorDisplayLabel: '发布为',
        authorPersonal: '我的用户名',
        authorTeam: 'VRCStorage 团队',
        savePost: '保存文章',
        comments: '评论',
        noComments: '暂无评论。',
        commentPlaceholder: '写下你的评论...',
        loginToComment: '登录后评论',
        loading: '加载文章中...',
        notFound: '未找到文章。',
        preview: '预览',
        write: '写作',
    },
}