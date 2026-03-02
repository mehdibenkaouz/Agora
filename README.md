# AGORA Social — Technical & UI Specification

## 1. Overview

Agora è un social network minimalista costruito su:

* **Cloudflare Pages** (frontend statico)
* **Cloudflare Workers** (backend API)
* **Cloudflare D1** (database SQLite)
* **Cloudflare R2** (storage immagini)

Design:
Sobrio, moderno, minimal, elegante, con blur, vetro satinato e bordi arrotondati.

---

# 2. Backend Architecture

## 2.1 API Base

```
https://agora-api.convergegame.workers.dev
```

---

## 2.2 Database (D1 Schema)

### Tables

#### users

```sql
id TEXT PRIMARY KEY
email TEXT UNIQUE NOT NULL
created_at TEXT NOT NULL
google_sub TEXT
display_name TEXT
picture_url TEXT
```

#### sessions

```sql
token TEXT PRIMARY KEY
user_id TEXT NOT NULL
created_at TEXT NOT NULL
expires_at TEXT NOT NULL
```

#### posts

```sql
id TEXT PRIMARY KEY
user_id TEXT NOT NULL
content TEXT NOT NULL
created_at TEXT NOT NULL
```

---

## 2.3 R2 Storage

### Bucket: AGORA_MEDIA

Le immagini vengono salvate con struttura:

```
u/<user_id>/<uuid>.<ext>
```

Esempio:

```
u/abc123/550e8400-e29b-41d4-a716-446655440000.png
```

Accesso pubblico tramite:

```
/media/<encoded_key>
```

---

# 3. Authentication System

## 3.1 OAuth Google Flow

### Start

```
GET /api/auth/google/start
```

Parametri:

* client_id
* response_type=code
* scope=openid email profile
* state
* redirect_uri
* prompt=select_account

### Callback

```
GET /api/auth/google/callback
```

Crea:

* user (se non esiste)
* session token
* redirect con token al frontend

---

## 3.2 Session Management

* Token salvato in `localStorage` con chiave:

```
agora_token
```

* Stato login mantenuto tramite:

```js
CURRENT_USER_EMAIL
```

Non si basa sul testo UI.

---

# 4. Feed System

## 4.1 Endpoint

```
GET /api/posts
```

Ritorna:

```json
{
  posts: [
    {
      id,
      author_email,
      content,
      created_at
    }
  ]
}
```

---

## 4.2 Render Logic

Funzione principale:

```js
renderPosts(posts)
```

Per ogni post:

* Genera `.post-card`
* Salva:

  ```
  card.dataset.postId = p.id
  ```

---

# 5. Authorization Logic (isMine)

Determinazione proprietà post:

```js
const myEmail = getCurrentUserEmail();
const isMine =
  canInteract &&
  myEmail.includes("@") &&
  myEmail === String(p.author_email || "").trim().toLowerCase();
```

Se `isMine === true`:

* Mostra menu ⋮
* Mostra Delete

Se `false`:

* Nessun menu visibile

---

# 6. Post Menu (⋮)

## 6.1 Struttura HTML

```html
<div class="post-menu-wrap">
  <button class="post-menu-btn">
    <svg>3 vertical dots</svg>
  </button>
  <div class="post-menu">
    <button class="post-menu-item danger post-menu-delete">
      Delete
    </button>
  </div>
</div>
```

---

## 6.2 Behavior

* Click su ⋮ → toggle `.open`
* Click fuori → chiude
* ESC → chiude

Helper:

```js
closeAllPostMenus()
```

---

## 6.3 Delete Post Flow

1. Click Delete
2. Open confirm modal
3. Se confermato:

```
DELETE /api/posts/<id>
```

Backend:

* Verifica token
* Verifica ownership
* Elimina immagini associate da R2
* DELETE FROM posts
* return { ok: true }

Frontend:

* reload feed
* chiude eventuale thread attivo

---

# 7. Editor System

## 7.1 ContentEditable

Elemento:

```
# createPostContent
```

Permette:

* Testo
* Bold
* Italic
* Underline
* Immagini inline

---

## 7.2 Image Node Structure

```html
<span class="img-node">
  <img />
  <span class="img-handle move"></span>
  <span class="img-handle resize"></span>
  <span class="img-handle delete"></span>
</span>
```

---

## 7.3 Image Features

### Move

Drag handle verticale

### Resize

Pointer drag con:

* min width: 140px
* max width: editor width - 24px

### Delete (editor only)

* Rimuove dal DOM
* Chiama `/api/media/delete` se presente `dataset.r2Key`

---

# 8. Confirm Modal (Custom, no browser popup)

## 8.1 Structure

```html
<div class="confirm-modal">
  <div class="confirm-backdrop"></div>
  <div class="confirm-card">
```

---

## 8.2 Visual Style

* Backdrop: blur + rgba(0,0,0,0.35)
* Card:

  * border-radius: 22px
  * shadow soft
  * background: rgba(255,255,255,0.96)
  * centered via margin auto
  * z-index: 2000

---

# 9. Graphic System

## 9.1 General Style

Design language:

* Glassmorphism
* Soft shadows
* Large radius
* Cream background
* Subtle borders

---

## 9.2 Post Card

* Rounded
* Subtle border
* Drop shadow
* Flex layout header

### Header Layout

```
.post-head
 ├── .post-author (flex:1)
 └── .post-head-right (flex-shrink:0)
```

---

## 9.3 Buttons

Rounded:

```
border-radius: 999px (icon buttons)
border-radius: 14px (modal buttons)
```

---

## 9.4 Z-index Layers

* Confirm modal: 2000
* Post menu: 50
* Image handles: 5+

---

# 10. Media System

## Upload

```
POST /api/media/upload
```

* Max size: 8MB
* image/*
* Auth required

Returns:

```json
{ ok: true, key, url }
```

## Delete

```
DELETE /api/media/delete
```

Checks:

* session valid
* key startsWith `u/<user_id>/`

---

# 11. Interaction States

## Logged Out

* No create post
* No ⋮ menu
* No delete
* accountMenuSub: "Not logged in"

---

## Logged In

* Can create post
* Can delete own post
* Can upload images

---

# 12. Security Model

* Token required for:

  * Create post
  * Delete post
  * Upload media
  * Delete media
* Ownership always verified in backend
* Media keys prefixed with user id

---

# 13. Current Known UX Characteristics

* Blur overlay on confirm
* Menu closes on:

  * outside click
  * ESC
* Feed auto refresh on delete
* Images inline editable
* SVG icons for 3 dots (no font dependency)

---

# 14. Architectural Strengths

* Stateless frontend
* Token-based session
* Media ownership enforced
* No client-trusted delete
* UI state decoupled from auth state
* Minimal dependencies

---


Se vuoi, nel prossimo step posso:

* Fare un `.md` ancora più tecnico (tipo specifica formale API + diagrammi logici)
* Oppure fare una versione “Product Spec” per presentazione
* Oppure fare una mappa completa UI con tutti i componenti nominati

