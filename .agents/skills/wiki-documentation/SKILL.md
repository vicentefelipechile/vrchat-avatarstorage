---
name: VRChat Wiki Documentation
description: Guidelines for creating and editing wiki articles in the VRCStorage project.
---

# VRChat Wiki Documentation

> [!IMPORTANT]
> Follow this guide EXACTLY. Do not deviate from templates or formats.

---

## 1. Quick Reference

| Task | Action |
|------|--------|
| New topic | Create ES first → confirm with user → translate |
| References | Use `* Author. (Year). Title. Platform. URL` |
| Internal links | `[text](/wiki?topic=slug)` |
| Badges | `<span class="badge badge-blue">Category</span>` |
| Alerts | `> [!NOTE]`, `> [!TIP]`, `> [!WARNING]` |

---

## 2. Templates

### 2.1 Guía Paso a Paso (Setup Style)

```markdown
# Título de la Guía
Descripción breve de qué trata esta guía.

> [!NOTE]
> Nota introductoria importante.

### Paso 1: Título del Paso
Descripción del paso. Incluye enlaces relevantes.

### Paso 2: Título del Paso
Descripción del paso.

> [!TIP]
> Consejo útil opcional.

---

## Referencias

* Autor. (Año). Título. Plataforma. URL
```

### 2.2 Documento de Referencia (Parameter Style)

```markdown
# Título del Tema
Descripción general del tema.

## Sección 1
Contenido de la sección.

## Sección 2
Contenido de la sección.

### Subsection
Más detalles.

> [!IMPORTANT]
> Información crítica.

---

## Referencias

* Autor. (Año). Título. Plataforma. URL
* Otro Autor. (Año). Título. Plataforma. URL
```

### 2.3 FAQ

```markdown
# Preguntas Frecuentes

## Pregunta 1
Respuesta a la pregunta 1.

## Pregunta 2
Respuesta a la pregunta 2.

> [!TIP]
> Consejo relacionado con las preguntas frecuentes.

---

## Referencias

* Fuente. (Año). Título. URL
```

---

## 3. Reference Format (CRITICAL)

### CORRECTO ✓

```markdown
## Referencias

* VRChat Inc. (s.f.). VRChat Creator Companion. VRChat. https://vrchat.com/home/download
* Poiyomi. (s.f.). Poiyomi Toon Shader. GitHub. https://github.com/poiyomi/PoiyomiToonShader
```

### INCORRECTO ✗

```markdown
## Referencias

[1] VRChat Inc. (s.f.). VRChat Creator Companion. https://vrchat.com/home/download

[2] Poiyomi. (s.f.). Poiyomi Toon Shader. https://github.com/poiyomi/PoiyomiToonShader
```

> [!WARNING]
> NEVER use numbered references like `[1]`, `[2]`. ALWAYS use bullet points `*`.

---

## 4. Workflow: Creating a New Topic

### Step 1: Create Spanish Version
Create `public/wiki/es/[topic-slug].md` using the appropriate template from Section 2.

### Step 2: Verify All Links
Before finalizing, verify EVERY external URL using WebFetch:
- VRChat docs: `https://creators.vrchat.com/...`
- VCC docs: `https://vcc.drc.vrchat.com/...`
- GitHub/Booth/Gumroad links

> [!IMPORTANT]
> Unverified links are PROHIBITED. Check each URL manually.

### Step 3: Request User Confirmation
Send message to user:
```
He creado el draft en español. ¿Confirmas que el contenido es correcto antes de traducir a otros idiomas?
```

Wait for explicit user confirmation before proceeding.

### Step 4: Update WikiView.js
Add topic to `public/js/views/WikiView.js`:

```javascript
{
    id: 'topic-slug',
    label: 'wiki.topicSlug.title'
}
```

### Step 5: Update i18n.js
Add translations in `public/js/i18n.js` for ALL languages you plan to support:

```javascript
wiki: {
    topicSlug: { title: 'Title in Language' },
    // ... existing topics
}
```

### Step 6: Translate (Only After Confirmation)
After user confirms Spanish version, translate to:
- `public/wiki/en/[topic-slug].md`
- Other languages as needed

> [!NOTE]
> Re-verification of links is NOT required when translating. Links verified in Spanish are valid for all languages.

---

## 5. Common Errors (DO NOT DO)

| Error | Correct Way |
|-------|-------------|
| Using `[1]`, `[2]` in references | Use `*` bullet points |
| Relative links like `./file.md` | Use `/wiki?topic=slug` |
| Creating new badge colors | Use existing: `badge-blue`, `badge-purple` |
| Skipping link verification | Always verify with WebFetch |
| Translating before confirmation | Wait for user OK in Spanish |
| Missing WikiView.js update | Always update both WikiView.js AND i18n.js |

---

## 6. Language Support

- **Primary:** Spanish (es) - Create first, always
- **Secondary:** English (en) - Translate after confirmation
- **Others:** ru, pt, fr, jp, cn - Translate as needed

> [!TIP]
> Only Spanish is mandatory. English is recommended. Other languages are optional unless specifically requested.

---

## 7. Verification Checklist

Before marking a task complete, verify:

- [ ] Spanish version created with correct template
- [ ] All external links verified (no 404s)
- [ ] References use `*` bullets, NOT numbered
- [ ] Internal links use `/wiki?topic=slug` format
- [ ] WikiView.js updated with new topic
- [ ] i18n.js updated with title translations
- [ ] User confirmed Spanish content (for new topics)
- [ ] English version created (at minimum)
