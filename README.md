# TaskFlow

A full-stack Kanban project management app with a modern UI/UX built with React, Node.js/Express, and MySQL.

## 🚀 Live Demo
- **Frontend (Vercel)**: [taskflow-kanban-task-management.vercel.app](https://taskflow-kanban-task-management.vercel.app/)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite, React Router v6 |
| Styling | Vanilla CSS (dark theme, CSS variables) |
| Drag & Drop | `@hello-pangea/dnd` (React 18 compatible fork of react-beautiful-dnd) |
| Backend | Node.js + Express.js |
| Database | MySQL 8 + `mysql2/promise` connection pool |
| File Uploads | `multer` (local disk storage) |

---

## Features

### Core Features
- **Multi-board support** — Create, browse, and delete multiple boards
- **Lists** — Create, rename, delete (archive) lists with drag-and-drop reordering
- **Cards** — Create, edit title/description, delete (archive) cards; drag between lists
- **Labels** — Color-coded label chips; create, edit, delete labels per board
- **Members** — Assign/remove members to cards; member avatars on cards
- **Due Dates** — Set due dates with overdue/upcoming visual indicators
- **Checklists** — Multiple checklists per card with progress bar and item toggle
- **Comments** — Add and delete comments on cards
- **Activity Log** — Auto-logged activity feed per card
- **Attachments** — Upload and download file attachments on cards
- **Card Covers** — Color covers on cards via the card modal
- **Search** — Search cards by title within a board (header search bar)
- **Filter** — Filter cards by label, member, or due date status

### Bonus Features
- Responsive design (mobile/tablet/desktop)
- Board background customization (gradient + solid color themes)
- Board picker dropdown in the header
- Background preview when creating a board

---

## Database Schema

13 tables: `users`, `boards`, `board_members`, `lists`, `cards`, `card_members`, `labels`, `card_labels`, `checklists`, `checklist_items`, `comments`, `attachments`, `activity_log`

Key design decisions:
- **Float-based positions** — Cards and lists use `FLOAT` position column, enabling fractional indexing for drag-and-drop reordering without renumbering all rows
- **Soft delete (archive)** — Cards and lists have `archived BOOLEAN` to archive instead of hard-delete
- **JSON activity data** — `activity_log.data` stored as JSON for flexible contextual payloads
- **Cascade deletes** — Foreign keys use `ON DELETE CASCADE` to maintain referential integrity

---

## Setup Instructions

### Prerequisites
- Node.js 18+
- MySQL 8+
- npm

### 1. Clone & Install

```bash
# Install server dependencies
cd server
npm install

# Install client dependencies
cd ../client
npm install
```

### 2. Configure Environment

Edit `server/.env`:
```
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=taskflow
```

### 3. Set Up Database

Create the `taskflow` database in MySQL, then run:

```bash
cd server
npm run db:setup
```

This will:
- Create all 13 tables
- Seed 5 users, 3 boards, 12 lists, 21 cards, labels, checklists, and comments

### 4. Run the Application

**Terminal 1 — Backend:**
```bash
cd server
npm run dev
# → http://localhost:5000
```

**Terminal 2 — Frontend:**
```bash
cd client
npm run dev
# → http://localhost:5173
```

Open **http://localhost:5173** in your browser.

---

## API Overview

| Resource | Methods |
|---|---|
| `/api/boards` | GET, POST |
| `/api/boards/:id` | GET (full tree), PUT, DELETE |
| `/api/lists` | POST, PUT /:id, DELETE /:id |
| `/api/cards` | GET /:id, POST, PUT /:id, DELETE /:id |
| `/api/cards/:id/labels` | POST, DELETE /:labelId |
| `/api/cards/:id/members` | POST, DELETE /:userId |
| `/api/cards/:id/checklists` | POST |
| `/api/cards/:id/comments` | GET, POST |
| `/api/cards/:id/attachments` | POST (multipart) |
| `/api/checklist-items/:id` | PUT, DELETE |
| `/api/labels/:id` | PUT, DELETE |

---

## Default User

**Rajvil Choudhary (RC)** — ID: 1 (no login required, auto-assigned as current user)

Other pre-seeded members: Alice Johnson, Bob Smith, Carol White, David Brown

---

## Assumptions

1. Authentication is omitted; user ID 1 (Rajvil) is assumed to be the logged-in user
2. File attachments are stored locally in `server/uploads/` and served statically
3. Board backgrounds are CSS gradient strings or hex colors
4. The `position` column uses floating-point midpoint insertion for drag-and-drop ordering
5. "Delete" operations are soft-deletes (archive) for lists and cards; hard-delete for boards
