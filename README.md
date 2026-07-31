# TaskFlow

A full-stack collaborative Kanban project management application with a modern UI/UX built with React, Node.js/Express, MySQL, and WebSockets.

## 🚀 Live Demo
- **Frontend (Vercel)**: [taskflow-kanban-task-management.vercel.app](https://taskflow-kanban-task-management.vercel.app/)

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + Vite, React Router v7 |
| Styling | Vanilla CSS (dark theme, CSS variables) |
| Live Sync | `socket.io-client` for real-time multiplayer updates & presence |
| Drag & Drop | `@hello-pangea/dnd` (React 19 compatible fork of react-beautiful-dnd) |
| Backend | Node.js + Express.js |
| Real-time Server | `socket.io` for event broadcasting |
| Authentication | JSON Web Tokens (JWT) + `bcryptjs` password hashing |
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
- **Activity Log** — Auto-logged user activity feed per card (dynamically attributed to action authors)
- **Attachments** — Upload and download file attachments on cards
- **Card Covers** — Color covers on cards via the card modal
- **Search** — Search cards by title within a board (header search bar)
- **Filter** — Filter cards by label, member, or due date status

### Real-Time & Social Features
- **JWT Authentication** — Full user signup, login, and quick-auth Guest login session persistence
- **Collaborative Live Sync** — Real-time board state updates across all active users on the board via WebSockets
- **Live Board Presence** — Live indicator bar displaying avatars of active board viewers in real-time
- **Custom User Profiles** — User avatar profile photos (via upload) or curated preset emojis (e.g. 🦝)
- **Universal Avatar Badges** — Avatars rendered across card items, comment threads, activity logs, presence, filters, and header profile menus

---

## Database Schema

13 tables: `users`, `boards`, `board_members`, `lists`, `cards`, `card_members`, `labels`, `card_labels`, `checklists`, `checklist_items`, `comments`, `attachments`, `activity_log`

Key design decisions:
- **Float-based positions** — Cards and lists use `FLOAT` position column, enabling fractional indexing for drag-and-drop reordering without renumbering all rows
- **Soft delete (archive)** — Cards and lists have `archived BOOLEAN` to archive instead of hard-delete
- **JSON activity data** — `activity_log.data` stored as JSON for flexible contextual payloads
- **Cascade deletes** — Foreign keys use `ON DELETE CASCADE` to maintain referential integrity
- **Avatar Support** — `users.avatar_url` supports both custom path file uploads and local preset emoji strings

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
```env
PORT=5000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=taskflow
JWT_SECRET=your_jwt_secret_key
```

Edit `client/.env` (optional, if backend URL varies):
```env
VITE_API_BASE_URL=http://localhost:5000
```

### 3. Set Up Database

Create the `taskflow` database in MySQL, then run:

```bash
cd server
npm run db:setup
```

This will:
- Create all 13 tables
- Seed 5 users, 3 boards, 12 lists, 21 cards, labels, checklists, comments, and member associations

### 4. Run the Application

**Run Client & Server Together:**
```bash
npm run dev
# Starts backend server (http://localhost:5000) and Vite frontend (http://localhost:5173) concurrently
```

Alternatively, run separately:
- **Backend**: `cd server && npm run dev`
- **Frontend**: `cd client && npm run dev`

Open **http://localhost:5173** in your browser.

---

## API Overview

| Resource | Methods |
|---|---|
| `/api/auth/register` | POST (Create new user) |
| `/api/auth/login` | POST (Login credentials) |
| `/api/auth/guest` | POST (Instantly log in with guest session) |
| `/api/auth/me` | GET (Get logged-in user context) |
| `/api/profile` | PATCH (Update user details/preset avatar) |
| `/api/profile/photo` | POST (Upload custom profile picture) |
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

## User Context

- **Guest Account** — Auto-seeded for quick review (`guest@taskflow.com` / `guest123` or via Guest login button)
- **Pre-seeded Members** — Rajvil Choudhary, Alice Johnson, Bob Smith, Carol White, David Brown

---

## Technical Implementations

1. **Floating-point Positioning**: List/card reorder requests compute a midpoint between target nodes, reducing updates to a single database row.
2. **WebSocket Sync**: Broadcast triggers emit targeted changes via `X-Socket-ID` header-based exclusions so origin clients don't double-refresh, ensuring seamless updates for other participants.
3. **Flexible User Avatars**: Dynamic `UserAvatar` React component detects storage type to handle local file upload endpoints, raw unicode emojis, or initials fallback color rendering dynamically.

