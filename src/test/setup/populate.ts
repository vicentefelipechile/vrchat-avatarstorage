// ============================================================================
// Database Faker Generator — Auto-populate local D1
// ============================================================================
// Usage:
//      npm run seed
// ============================================================================
// Requires:
//      @faker-js/faker, tsx (already in dependencies)
// ============================================================================
// What it does:
//   1. Runs all SQL schema files (SCHEMA_INIT + migrations) on local D1
//   2. Generates realistic fake data for all tables
//   3. Writes seed.sql to test/ and executes it on local D1
// ============================================================================

import { faker } from '@faker-js/faker'

// __scriptDir is only needed by the CLI (isMain) path — resolved lazily below

// ============================================================================
// Configuration
// ============================================================================

const SEED_CONFIG = {
    // usuarios normales
    users: 100,
    // administradores
    admins: 2,
    // recursos por usuario (aprox)
    resourcesPerUser: 7,
    // tags disponibles en el sistema
    tagsTotal: 30,
    // máximo tags por recurso
    tagsPerResource: 4,
    // comentarios por recurso (aprox)
    commentsPerResource: 6,
    // favoritos por usuario (aprox)
    favoritesPerUser: 8,
    // links por recurso (aprox)
    linksPerResource: 3,
    // comentarios en wiki (aprox)
    wikiComments: 15,
}

// Categorías reales del proyecto
const CATEGORIES = ['avatars', 'assets', 'clothes']

// Tags temáticos de VRChat
const VRCHAT_TAGS = [
    'anime', 'furry', 'fantasy', 'scifi', 'cyberpunk', 'medieval',
    'cute', 'horror', 'mecha', 'chibi', 'realistic', 'stylized',
    'female', 'male', 'nonbinary', 'robot', 'monster', 'human',
    'free', 'paid', 'quest-compatible', 'pc-only', 'sdk3',
    'poiyomi', 'liltoon', 'unity', 'blender', 'vrchat-plus',
    'original', 'fanart',
]

// Link types para resource_links
const LINK_TYPES = ['booth', 'gumroad', 'github', 'discord', 'general']

// ============================================================================
// Helpers
// ============================================================================

function uuid(): string {
    return faker.string.uuid()
}

function unixPast(daysAgo: number): number {
    return Math.floor(faker.date.past({ years: 1 }).getTime() / 1000)
}

// Fake bcrypt hash — workers don't have node:crypto, and tests never verify passwords
const FAKE_HASH = '$2b$10$abcdefghijklmnopqrstuvuFakeHashForTestingPurposesOnly123'
function fakePasswordHash(): string {
    return FAKE_HASH
}

// Genera un R2 key realista
function r2Key(folder: string, filename: string): string {
    return `${folder}/${faker.string.nanoid(12)}/${filename}`
}

// Escapa strings para SQL
function sql(value: string | null | undefined): string {
    if (value === null || value === undefined) return 'NULL'
    return `'${value.replace(/'/g, "''")}'`
}

// ============================================================================
// Generators
// ============================================================================

function generateUsers(count: number, isAdmin = false) {
    return Array.from({ length: count }, () => {
        const createdAt = unixPast(365)
        return {
            uuid: uuid(),
            username: faker.internet.username().slice(0, 32).replace(/[^a-zA-Z0-9_]/g, '_'),
            password_hash: fakePasswordHash(),
            avatar_url: faker.helpers.maybe(() => faker.image.avatar(), { probability: 0.7 }) ?? null,
            created_at: createdAt,
            is_admin: isAdmin ? 1 : 0,
        }
    })
}

function generateMedia(resourceUuid: string, type: 'thumbnail' | 'reference' | 'gallery') {
    const extensions: Record<string, string> = {
        thumbnail: 'webp',
        reference: 'webp',
        gallery: faker.helpers.arrayElement(['webp', 'png', 'jpg']),
    }
    const ext = extensions[type]
    const filename = `${type}_${faker.string.nanoid(8)}.${ext}`

    return {
        uuid: uuid(),
        r2_key: r2Key(`resources/${resourceUuid}`, filename),
        media_type: `image/${ext === 'jpg' ? 'jpeg' : ext}`,
        file_name: filename,
        created_at: unixPast(300),
    }
}

function generateResource(authorUuid: string, thumbnailUuid: string, refImageUuid: string | null) {
    const createdAt = unixPast(300)
    const category = faker.helpers.arrayElement(CATEGORIES)

    const titlePrefixes: Record<string, string[]> = {
        avatars: ['Neko', 'Dragon', 'Cyber', 'Fairy', 'Wolf', 'Bunny', 'Shadow', 'Crystal', 'Star', 'Moon'],
        assets: ['Particle FX', 'Prop', 'Accessory', 'Hair', 'Wings', 'Tail', 'Ears', 'Sword', 'Shield', 'Cape'],
        clothes: ['Dress', 'Jacket', 'Hoodie', 'Outfit', 'Uniform', 'Armor', 'Swimsuit', 'Casual', 'Formal', 'Maid'],
    }

    const prefix = faker.helpers.arrayElement(titlePrefixes[category])
    const title = `${prefix} ${faker.word.adjective()} ${faker.word.noun()}`

    return {
        uuid: uuid(),
        title: title.slice(0, 120),
        description: faker.helpers.maybe(
            () => faker.lorem.paragraphs({ min: 1, max: 3 }),
            { probability: 0.85 }
        ) ?? null,
        category,
        thumbnail_uuid: thumbnailUuid,
        reference_image_uuid: refImageUuid,
        author_uuid: authorUuid,
        download_count: faker.number.int({ min: 0, max: 5000 }),
        is_active: faker.helpers.maybe(() => 1, { probability: 0.8 }) ?? 0,
        created_at: createdAt,
        updated_at: createdAt + faker.number.int({ min: 0, max: 86400 * 30 }),
    }
}

function generateComment(resourceUuid: string, authorUuid: string) {
    const createdAt = unixPast(200)
    return {
        uuid: uuid(),
        resource_uuid: resourceUuid,
        author_uuid: authorUuid,
        text: faker.helpers.arrayElement([
            faker.lorem.sentences({ min: 1, max: 3 }),
            'This is amazing! Thank you so much!',
            'Love this avatar, works great in VRChat.',
            'Does this work with Poiyomi shaders?',
            'Quest compatible?',
            'Great work! The textures are beautiful.',
            'Can I use this for commercial worlds?',
            '10/10 would recommend.',
            faker.lorem.sentence(),
        ]),
        created_at: createdAt,
        updated_at: createdAt,
    }
}

function generateResourceLink(resourceUuid: string, order: number) {
    const linkType = faker.helpers.arrayElement(LINK_TYPES)
    const urls: Record<string, string> = {
        booth: `https://booth.pm/ja/items/${faker.number.int({ min: 1000000, max: 9999999 })}`,
        gumroad: `https://gumroad.com/l/${faker.string.alphanumeric(8)}`,
        github: `https://github.com/${faker.internet.username()}/${faker.word.noun()}-vrchat`,
        discord: `https://discord.gg/${faker.string.alphanumeric(8)}`,
        general: faker.internet.url(),
    }

    return {
        uuid: uuid(),
        resource_uuid: resourceUuid,
        link_url: urls[linkType],
        link_title: faker.helpers.maybe(() => faker.lorem.words({ min: 2, max: 4 }), { probability: 0.7 }) ?? null,
        link_type: linkType,
        display_order: order,
        created_at: unixPast(250),
    }
}

function generateWikiComment(authorUuid: string) {
    return {
        uuid: uuid(),
        author_uuid: authorUuid,
        text: faker.helpers.arrayElement([
            'This guide helped me a lot, thanks!',
            'Could you add more info about Quest avatars?',
            faker.lorem.sentences({ min: 1, max: 2 }),
            'The instructions are very clear.',
            'Missing some steps, but overall good.',
            'Updated info would be appreciated.',
        ]),
        created_at: unixPast(180),
    }
}

// ============================================================================
// SQL Builder
// ============================================================================

export function buildSQL(): string {
    const lines: string[] = []
    const BATCH_SIZE = 50

    // Helper: emite un INSERT multi-row con hasta BATCH_SIZE filas por sentencia
    function batchInsert(table: string, columns: string[], rows: string[][], orIgnore = false): void {
        const keyword = orIgnore ? 'INSERT OR IGNORE' : 'INSERT'
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            const chunk = rows.slice(i, i + BATCH_SIZE)
            const values = chunk.map(r => `(${r.join(', ')})`).join(',\n')
            lines.push(`${keyword} INTO ${table} (${columns.join(', ')}) VALUES\n${values};`)
        }
    }

    lines.push('-- ============================================================================')
    lines.push('-- VRCStorage — Seed de datos generado automáticamente')
    lines.push(`-- Generado: ${new Date().toISOString()}`)
    lines.push('-- ============================================================================')
    lines.push('')
    lines.push('PRAGMA foreign_keys = OFF;')
    lines.push('')
    lines.push('BEGIN TRANSACTION;')
    lines.push('')

    // Clear existing data
    lines.push('-- Clear existing data')
    const tablesToClear = [
        'resource_history',
        'wiki_comments',
        'rate_limits',
        'comments',
        'resource_links',
        'resource_tags',
        'user_favorites',
        'resource_n_media',
        'resources',
        'tags',
        'media',
        'users',
    ]
    for (const t of tablesToClear) {
        lines.push(`DELETE FROM ${t};`)
    }
    lines.push('')

    // ── Collect all data first, then batch-insert ──

    const admins = generateUsers(SEED_CONFIG.admins, true)
    const normalUsers = generateUsers(SEED_CONFIG.users, false)
    const allUsers = [...admins, ...normalUsers]

    const mediaRows: string[][] = []
    const resourceRows: string[][] = []
    const resourceNMediaRows: string[][] = []
    const resourceTagRows: string[][] = []
    const resourceLinkRows: string[][] = []
    const resourceHistoryRows: string[][] = []
    const commentRows: string[][] = []
    const favoriteRows: string[][] = []
    const wikiCommentRows: string[][] = []
    const allResourceUuids: string[] = []

    // Users
    lines.push('-- Users')
    const userRows = allUsers.map(u => [
        sql(u.uuid), sql(u.username), sql(u.password_hash), sql(u.avatar_url),
        String(u.created_at), String(u.is_admin),
    ])
    batchInsert('users', ['uuid', 'username', 'password_hash', 'avatar_url', 'created_at', 'is_admin'], userRows)
    lines.push('')

    // Tags
    const tagRecords = VRCHAT_TAGS.slice(0, SEED_CONFIG.tagsTotal).map((name, i) => ({
        id: i + 1,
        name,
    }))

    lines.push('-- Tags')
    const tagRows = tagRecords.map(t => [String(t.id), sql(t.name)])
    batchInsert('tags', ['id', 'name'], tagRows)
    lines.push('')

    // Generate resources + all related data
    for (const user of normalUsers) {
        const resourceCount = faker.number.int({
            min: 1,
            max: SEED_CONFIG.resourcesPerUser,
        })

        for (let i = 0; i < resourceCount; i++) {
            const thumbMedia = generateMedia('placeholder', 'thumbnail')
            const refMedia = faker.helpers.maybe(() => generateMedia('placeholder', 'reference'), { probability: 0.6 }) ?? null
            const resource = generateResource(user.uuid, thumbMedia.uuid, refMedia?.uuid ?? null)

            thumbMedia.r2_key = r2Key(`resources/${resource.uuid}`, `thumbnail_${faker.string.nanoid(8)}.webp`)
            if (refMedia) {
                refMedia.r2_key = r2Key(`resources/${resource.uuid}`, `reference_${faker.string.nanoid(8)}.webp`)
            }

            // Media rows
            mediaRows.push([sql(thumbMedia.uuid), sql(thumbMedia.r2_key), sql(thumbMedia.media_type), sql(thumbMedia.file_name), String(thumbMedia.created_at)])
            if (refMedia) {
                mediaRows.push([sql(refMedia.uuid), sql(refMedia.r2_key), sql(refMedia.media_type), sql(refMedia.file_name), String(refMedia.created_at)])
            }

            // Gallery
            const galleryCount = faker.number.int({ min: 0, max: 3 })
            const galleryMediaList = Array.from({ length: galleryCount }, () => {
                const gm = generateMedia(resource.uuid, 'gallery')
                mediaRows.push([sql(gm.uuid), sql(gm.r2_key), sql(gm.media_type), sql(gm.file_name), String(gm.created_at)])
                return gm
            })

            // Resource
            resourceRows.push([
                sql(resource.uuid), sql(resource.title), sql(resource.description), sql(resource.category),
                sql(resource.thumbnail_uuid), sql(resource.reference_image_uuid), sql(resource.author_uuid),
                String(resource.download_count), String(resource.is_active), String(resource.created_at), String(resource.updated_at),
            ])

            // resource_n_media
            resourceNMediaRows.push([sql(uuid()), sql(resource.uuid), sql(thumbMedia.uuid), String(thumbMedia.created_at)])
            for (const gm of galleryMediaList) {
                resourceNMediaRows.push([sql(uuid()), sql(resource.uuid), sql(gm.uuid), String(gm.created_at)])
            }

            // Tags
            const selectedTagIds = faker.helpers.arrayElements(
                tagRecords.map(t => t.id),
                { min: 1, max: SEED_CONFIG.tagsPerResource }
            )
            for (const tagId of selectedTagIds) {
                resourceTagRows.push([sql(resource.uuid), String(tagId)])
            }

            // Links
            const linkCount = faker.number.int({ min: 1, max: SEED_CONFIG.linksPerResource })
            for (let l = 0; l < linkCount; l++) {
                const link = generateResourceLink(resource.uuid, l)
                resourceLinkRows.push([
                    sql(link.uuid), sql(link.resource_uuid), sql(link.link_url), sql(link.link_title),
                    sql(link.link_type), String(link.display_order), String(link.created_at),
                ])
            }

            // History
            if (resource.is_active) {
                const historyActor = faker.helpers.arrayElement(admins)
                resourceHistoryRows.push([
                    sql(uuid()), sql(resource.uuid), sql(historyActor.uuid), `'approved'`,
                    sql(JSON.stringify({ is_active: 0 })), String(resource.created_at + 3600),
                ])
            }

            allResourceUuids.push(resource.uuid)
        }
    }

    // Emit media
    lines.push('-- Media')
    batchInsert('media', ['uuid', 'r2_key', 'media_type', 'file_name', 'created_at'], mediaRows)
    lines.push('')

    // Emit resources
    lines.push('-- Resources')
    batchInsert('resources', ['uuid', 'title', 'description', 'category', 'thumbnail_uuid', 'reference_image_uuid', 'author_uuid', 'download_count', 'is_active', 'created_at', 'updated_at'], resourceRows)
    lines.push('')

    // Emit resource_n_media
    lines.push('-- Resource ↔ Media')
    batchInsert('resource_n_media', ['uuid', 'resource_uuid', 'media_uuid', 'created_at'], resourceNMediaRows)
    lines.push('')

    // Emit resource_tags
    lines.push('-- Resource Tags')
    batchInsert('resource_tags', ['resource_uuid', 'tag_id'], resourceTagRows)
    lines.push('')

    // Emit resource_links
    lines.push('-- Resource Links')
    batchInsert('resource_links', ['uuid', 'resource_uuid', 'link_url', 'link_title', 'link_type', 'display_order', 'created_at'], resourceLinkRows)
    lines.push('')

    // Emit resource_history
    lines.push('-- Resource History')
    batchInsert('resource_history', ['uuid', 'resource_uuid', 'actor_uuid', 'change_type', 'previous_data', 'created_at'], resourceHistoryRows)
    lines.push('')

    // Comments
    for (const resourceUuid of allResourceUuids) {
        const commentCount = faker.number.int({ min: 0, max: SEED_CONFIG.commentsPerResource })
        for (let c = 0; c < commentCount; c++) {
            const author = faker.helpers.arrayElement(allUsers)
            const comment = generateComment(resourceUuid, author.uuid)
            commentRows.push([
                sql(comment.uuid), sql(comment.resource_uuid), sql(comment.author_uuid),
                sql(comment.text), String(comment.created_at), String(comment.updated_at),
            ])
        }
    }
    lines.push('-- Comments')
    batchInsert('comments', ['uuid', 'resource_uuid', 'author_uuid', 'text', 'created_at', 'updated_at'], commentRows)
    lines.push('')

    // Favorites
    for (const user of normalUsers) {
        const favoriteResources = faker.helpers.arrayElements(
            allResourceUuids,
            { min: 0, max: SEED_CONFIG.favoritesPerUser }
        )
        for (let order = 0; order < favoriteResources.length; order++) {
            favoriteRows.push([sql(user.uuid), sql(favoriteResources[order]), String(order), String(unixPast(100))])
        }
    }
    lines.push('-- Favorites')
    batchInsert('user_favorites', ['user_uuid', 'resource_uuid', 'display_order', 'created_at'], favoriteRows, true)
    lines.push('')

    // Wiki comments
    for (let w = 0; w < SEED_CONFIG.wikiComments; w++) {
        const author = faker.helpers.arrayElement(allUsers)
        const wc = generateWikiComment(author.uuid)
        wikiCommentRows.push([sql(wc.uuid), sql(wc.author_uuid), sql(wc.text), String(wc.created_at)])
    }
    lines.push('-- Wiki Comments')
    batchInsert('wiki_comments', ['uuid', 'author_uuid', 'text', 'created_at'], wikiCommentRows)
    lines.push('')

    lines.push('COMMIT;')
    lines.push('')
    lines.push('PRAGMA foreign_keys = ON;')
    lines.push('')
    lines.push(`-- Seed completado: ${allUsers.length} usuarios, ${allResourceUuids.length} recursos, ${tagRecords.length} tags`)

    return lines.join('\n')
}

// ============================================================================
// Main — Generate and execute seed
// Only runs when invoked directly (npm run seed), NOT when imported by Vitest.
// ============================================================================

// isMain: true when running as `tsx populate.ts`, false when imported by Vitest
const isMain = typeof process !== 'undefined' &&
    (process.argv[1]?.endsWith('populate.ts') || process.argv[1]?.endsWith('populate.js'))

if (isMain) {
    // Lazy-load Node.js-only modules — never runs inside the Workers sandbox
    const { writeFileSync, readdirSync } = await import('fs')
    const { execSync } = await import('child_process')
    const { resolve, join, dirname } = await import('path')
    const { fileURLToPath } = await import('url')
    const __scriptDir = typeof __dirname !== 'undefined'
        ? __dirname
        : dirname(fileURLToPath(import.meta.url))

    const projectRoot = resolve(__scriptDir, '..', '..')
    const sqlDir = join(projectRoot, 'sql')
    const seedFile = join(projectRoot, 'seed.sql')

    // 1. Initialize schema
    const sqlFiles = readdirSync(sqlDir)
        .filter((f: string) => f.endsWith('.sql'))
        .sort((a: string, b: string) => {
            if (a.startsWith('SCHEMA_INIT')) return -1
            if (b.startsWith('SCHEMA_INIT')) return 1
            return a.localeCompare(b)
        })

    console.log('📦 Inicializando schema local...')
    for (const file of sqlFiles) {
        const filePath = join(sqlDir, file)
        console.log(`   ├─ ${file}`)
        try {
            execSync(`npx wrangler d1 execute DB --local --file="${filePath}"`, {
                cwd: projectRoot,
                stdio: ['pipe', 'pipe', 'pipe'],
            })
        } catch (err: any) {
            const output = (err.stderr?.toString() ?? '') + (err.stdout?.toString() ?? '')
            if (!output.includes('already exists') && !output.includes('duplicate column')) {
                console.error(`   ❌ Error en ${file}: ${output}`)
                process.exit(1)
            }
        }
    }
    console.log('   └─ ✅ Schema inicializado\n')

    // 2. Generate and write seed SQL
    console.log('🎲 Generando datos ficticios...')
    const sql_output = buildSQL()
    writeFileSync(seedFile, sql_output, 'utf-8')
    console.log(`   └─ seed.sql generado (${(sql_output.length / 1024).toFixed(1)} KB)\n`)

    // 3. Execute seed
    console.log('🚀 Ejecutando seed en D1 local...')
    try {
        execSync(`npx wrangler d1 execute DB --local --file="${seedFile}"`, {
            cwd: projectRoot,
            stdio: ['pipe', 'pipe', 'pipe'],
        })
        console.log('   └─ ✅ Seed aplicado correctamente\n')
    } catch (err: any) {
        console.error('   └─ ❌ Error ejecutando seed:', err.stderr?.toString() ?? '')
        process.exit(1)
    }

    console.log('🎉 ¡Base de datos local poblada exitosamente!')
    console.log('\n   Para iniciar el servidor local:')
    console.log('     npm run dev\n')
}