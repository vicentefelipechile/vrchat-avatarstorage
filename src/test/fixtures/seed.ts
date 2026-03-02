// src/test/fixtures/seed.ts
// ============================================================================
// VRCStorage — Seed de datos de prueba
// Genera datos realistas para probar la app localmente con D1
//
// Uso:
//   npx wrangler d1 execute DB --local --file=src/test/fixtures/seed.sql
//   (o ejecutar directamente con el binding si usas un script de setup)
//
// Requiere: npm install --save-dev @faker-js/faker
// ============================================================================

import { faker } from '@faker-js/faker'
import { createHash } from 'crypto'
import { writeFileSync } from 'fs'

// ─── Configuración ───────────────────────────────────────────────────────────

const SEED_CONFIG = {
    users: 20,           // usuarios normales
    admins: 2,           // administradores
    resourcesPerUser: 5, // recursos por usuario (aprox)
    tagsTotal: 30,       // tags disponibles en el sistema
    tagsPerResource: 4,  // máximo tags por recurso
    commentsPerResource: 6,
    favoritesPerUser: 8,
    linksPerResource: 3,
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

// ─── Helpers ─────────────────────────────────────────────────────────────────

function uuid(): string {
    return faker.string.uuid()
}

function unixNow(): number {
    return Math.floor(Date.now() / 1000)
}

function unixPast(daysAgo: number): number {
    return Math.floor(faker.date.past({ years: 1 }).getTime() / 1000)
}

// Hash de contraseña simulado (bcrypt-like prefix para que el código no lo rechace)
function fakePasswordHash(): string {
    const hash = createHash('sha256').update('password').digest('hex')
    return `$2b$10$${hash.slice(0, 53)}`
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

function collectInserts(table: string, rows: string[]): string {
    return rows.join('\n') + '\n'
}

// ─── Generadores ─────────────────────────────────────────────────────────────

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

// ─── Builder de SQL ──────────────────────────────────────────────────────────

function buildSQL(): string {
    const lines: string[] = []

    lines.push('-- ============================================================================')
    lines.push('-- VRCStorage — Seed de datos generado automáticamente')
    lines.push(`-- Generado: ${new Date().toISOString()}`)
    lines.push('-- ============================================================================')
    lines.push('')
    lines.push('PRAGMA foreign_keys = OFF;')
    lines.push('')

    // ── Limpiar tablas (orden inverso de dependencias) ──────────────────────────
    lines.push('-- Limpiar datos existentes')
    const tablesToClear = [
        'resource_history', 'wiki_comments', 'rate_limits',
        'comments', 'resource_links', 'resource_tags', 'user_favorites',
        'resource_n_media', 'resources', 'tags', 'media', 'users',
    ]
    for (const t of tablesToClear) {
        lines.push(`DELETE FROM ${t};`)
    }
    lines.push('')

    // ── Usuarios ──────────────────────────────────────────────────────────────
    const admins = generateUsers(SEED_CONFIG.admins, true)
    const normalUsers = generateUsers(SEED_CONFIG.users, false)
    const allUsers = [...admins, ...normalUsers]

    lines.push('-- Usuarios')
    for (const u of allUsers) {
        lines.push(
            `INSERT INTO users (uuid, username, password_hash, avatar_url, created_at, is_admin) VALUES ` +
            `(${sql(u.uuid)}, ${sql(u.username)}, ${sql(u.password_hash)}, ${sql(u.avatar_url)}, ${u.created_at}, ${u.is_admin});`
        )
    }
    lines.push('')

    // ── Tags ──────────────────────────────────────────────────────────────────
    const tagRecords: { id: number; name: string }[] = VRCHAT_TAGS.slice(0, SEED_CONFIG.tagsTotal).map((name, i) => ({
        id: i + 1,
        name,
    }))

    lines.push('-- Tags')
    for (const t of tagRecords) {
        lines.push(`INSERT INTO tags (id, name) VALUES (${t.id}, ${sql(t.name)});`)
    }
    lines.push('')

    // ── Media, Resources y relaciones ────────────────────────────────────────
    const allResourceUuids: string[] = []

    lines.push('-- Media y Resources')
    for (const user of normalUsers) {
        const resourceCount = faker.number.int({
            min: 1,
            max: SEED_CONFIG.resourcesPerUser,
        })

        for (let i = 0; i < resourceCount; i++) {
            // Thumbnail (obligatorio)
            const thumbMedia = generateMedia('placeholder', 'thumbnail')
            // Reference image (opcional, 60% chance)
            const refMedia = faker.helpers.maybe(() => generateMedia('placeholder', 'reference'), { probability: 0.6 }) ?? null

            // Resource
            const resource = generateResource(user.uuid, thumbMedia.uuid, refMedia?.uuid ?? null)

            // Actualizar r2_key con el uuid real del resource
            thumbMedia.r2_key = r2Key(`resources/${resource.uuid}`, `thumbnail_${faker.string.nanoid(8)}.webp`)
            if (refMedia) {
                refMedia.r2_key = r2Key(`resources/${resource.uuid}`, `reference_${faker.string.nanoid(8)}.webp`)
            }

            // Insertar media
            lines.push(
                `INSERT INTO media (uuid, r2_key, media_type, file_name, created_at) VALUES ` +
                `(${sql(thumbMedia.uuid)}, ${sql(thumbMedia.r2_key)}, ${sql(thumbMedia.media_type)}, ${sql(thumbMedia.file_name)}, ${thumbMedia.created_at});`
            )
            if (refMedia) {
                lines.push(
                    `INSERT INTO media (uuid, r2_key, media_type, file_name, created_at) VALUES ` +
                    `(${sql(refMedia.uuid)}, ${sql(refMedia.r2_key)}, ${sql(refMedia.media_type)}, ${sql(refMedia.file_name)}, ${refMedia.created_at});`
                )
            }

            // Gallery media adicional (0-3 imágenes)
            const galleryCount = faker.number.int({ min: 0, max: 3 })
            const galleryMediaList = Array.from({ length: galleryCount }, () => {
                const gm = generateMedia(resource.uuid, 'gallery')
                lines.push(
                    `INSERT INTO media (uuid, r2_key, media_type, file_name, created_at) VALUES ` +
                    `(${sql(gm.uuid)}, ${sql(gm.r2_key)}, ${sql(gm.media_type)}, ${sql(gm.file_name)}, ${gm.created_at});`
                )
                return gm
            })

            // Insertar resource
            lines.push(
                `INSERT INTO resources (uuid, title, description, category, thumbnail_uuid, reference_image_uuid, author_uuid, download_count, is_active, created_at, updated_at) VALUES ` +
                `(${sql(resource.uuid)}, ${sql(resource.title)}, ${sql(resource.description)}, ${sql(resource.category)}, ` +
                `${sql(resource.thumbnail_uuid)}, ${sql(resource.reference_image_uuid)}, ${sql(resource.author_uuid)}, ` +
                `${resource.download_count}, ${resource.is_active}, ${resource.created_at}, ${resource.updated_at});`
            )

            // resource_n_media — thumbnail
            lines.push(
                `INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid, created_at) VALUES ` +
                `(${sql(uuid())}, ${sql(resource.uuid)}, ${sql(thumbMedia.uuid)}, ${thumbMedia.created_at});`
            )
            // resource_n_media — gallery
            for (const gm of galleryMediaList) {
                lines.push(
                    `INSERT INTO resource_n_media (uuid, resource_uuid, media_uuid, created_at) VALUES ` +
                    `(${sql(uuid())}, ${sql(resource.uuid)}, ${sql(gm.uuid)}, ${gm.created_at});`
                )
            }

            // Tags
            const selectedTagIds = faker.helpers.arrayElements(
                tagRecords.map(t => t.id),
                { min: 1, max: SEED_CONFIG.tagsPerResource }
            )
            for (const tagId of selectedTagIds) {
                lines.push(
                    `INSERT INTO resource_tags (resource_uuid, tag_id) VALUES (${sql(resource.uuid)}, ${tagId});`
                )
            }

            // Links
            const linkCount = faker.number.int({ min: 1, max: SEED_CONFIG.linksPerResource })
            for (let l = 0; l < linkCount; l++) {
                const link = generateResourceLink(resource.uuid, l)
                lines.push(
                    `INSERT INTO resource_links (uuid, resource_uuid, link_url, link_title, link_type, display_order, created_at) VALUES ` +
                    `(${sql(link.uuid)}, ${sql(link.resource_uuid)}, ${sql(link.link_url)}, ${sql(link.link_title)}, ` +
                    `${sql(link.link_type)}, ${link.display_order}, ${link.created_at});`
                )
            }

            // Resource history (1-2 entradas por resource activo)
            if (resource.is_active) {
                const historyActor = faker.helpers.arrayElement(admins)
                lines.push(
                    `INSERT INTO resource_history (uuid, resource_uuid, actor_uuid, change_type, previous_data, created_at) VALUES ` +
                    `(${sql(uuid())}, ${sql(resource.uuid)}, ${sql(historyActor.uuid)}, 'approved', ` +
                    `${sql(JSON.stringify({ is_active: 0 }))}, ${resource.created_at + 3600});`
                )
            }

            allResourceUuids.push(resource.uuid)
        }
    }
    lines.push('')

    // ── Comentarios ───────────────────────────────────────────────────────────
    lines.push('-- Comentarios en recursos')
    for (const resourceUuid of allResourceUuids) {
        const commentCount = faker.number.int({ min: 0, max: SEED_CONFIG.commentsPerResource })
        for (let c = 0; c < commentCount; c++) {
            const author = faker.helpers.arrayElement(allUsers)
            const comment = generateComment(resourceUuid, author.uuid)
            lines.push(
                `INSERT INTO comments (uuid, resource_uuid, author_uuid, text, created_at, updated_at) VALUES ` +
                `(${sql(comment.uuid)}, ${sql(comment.resource_uuid)}, ${sql(comment.author_uuid)}, ` +
                `${sql(comment.text)}, ${comment.created_at}, ${comment.updated_at});`
            )
        }
    }
    lines.push('')

    // ── Favoritos ─────────────────────────────────────────────────────────────
    lines.push('-- Favoritos de usuarios')
    for (const user of normalUsers) {
        const favoriteResources = faker.helpers.arrayElements(
            allResourceUuids,
            { min: 0, max: SEED_CONFIG.favoritesPerUser }
        )
        for (let order = 0; order < favoriteResources.length; order++) {
            lines.push(
                `INSERT OR IGNORE INTO user_favorites (user_uuid, resource_uuid, display_order, created_at) VALUES ` +
                `(${sql(user.uuid)}, ${sql(favoriteResources[order])}, ${order}, ${unixPast(100)});`
            )
        }
    }
    lines.push('')

    // ── Wiki comments ─────────────────────────────────────────────────────────
    lines.push('-- Comentarios de wiki')
    for (let w = 0; w < SEED_CONFIG.wikiComments; w++) {
        const author = faker.helpers.arrayElement(allUsers)
        const wc = generateWikiComment(author.uuid)
        lines.push(
            `INSERT INTO wiki_comments (uuid, author_uuid, text, created_at) VALUES ` +
            `(${sql(wc.uuid)}, ${sql(wc.author_uuid)}, ${sql(wc.text)}, ${wc.created_at});`
        )
    }
    lines.push('')

    lines.push('PRAGMA foreign_keys = ON;')
    lines.push('')
    lines.push(`-- Seed completado: ${allUsers.length} usuarios, ${allResourceUuids.length} recursos, ${tagRecords.length} tags`)

    return lines.join('\n')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const sql_output = buildSQL()
writeFileSync('src/test/fixtures/seed.sql', sql_output, 'utf-8')

console.log('✅ seed.sql generado en src/test/fixtures/seed.sql')
console.log('')
console.log('Para aplicarlo localmente:')
console.log('  npx wrangler d1 execute DB --local --file=src/test/fixtures/seed.sql')
console.log('')
console.log('Para aplicarlo en producción (¡CUIDADO!):')
console.log('  npx wrangler d1 execute DB --file=src/test/fixtures/seed.sql')