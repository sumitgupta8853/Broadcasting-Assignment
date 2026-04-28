# Content Broadcasting System

A backend system for broadcasting educational content from teachers to students, with a principal-based approval workflow, role-based access control, and subject-wise content scheduling/rotation.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Node.js |
| Framework | Express.js |
| Database | PostgreSQL |
| Auth | JWT + bcrypt |
| File Upload | Multer (local disk) |
| Rate Limiting | express-rate-limit |

---

## Quick Start

### Prerequisites
- Node.js v18+
- PostgreSQL 14+

### 1. Clone & Install

```bash
git clone <repo-url>
cd content-broadcasting-system
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your DB credentials and JWT secret
```

### 3. Set Up Database

```bash
# Create the database first
psql -U postgres -c "CREATE DATABASE content_broadcasting;"

# Run migrations
npm run migrate

# (Optional) Seed demo users
npm run seed
```

### 4. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server runs on `http://localhost:3000`

---

## Demo Credentials (after seeding)

| Role | Email | Password |
|------|-------|----------|
| Principal | principal@school.com | password123 |
| Teacher 1 | teacher1@school.com | password123 |
| Teacher 2 | teacher2@school.com | password123 |
| Teacher 3 | teacher3@school.com | password123 |

---

## API Reference

### Auth Endpoints

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/auth/register` | None | Register a new user |
| POST | `/auth/login` | None | Login and get JWT token |
| GET | `/auth/me` | JWT | Get current user profile |

**Register Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123",
  "role": "teacher"
}
```

**Login Body:**
```json
{
  "email": "teacher1@school.com",
  "password": "password123"
}
```

---

### Content Endpoints

| Method | Endpoint | Auth | Role | Description |
|--------|----------|------|------|-------------|
| POST | `/content/upload` | JWT | Teacher | Upload content with file |
| GET | `/content` | JWT | Both | List content (principal=all, teacher=own) |
| GET | `/content/:id` | JWT | Both | Get single content item |
| PATCH | `/content/:id/review` | JWT | Principal | Approve or reject content |
| GET | `/content/live/:teacherId` | None | Public | Get live content for a teacher |
| GET | `/content/schedule/me` | JWT | Teacher | View own rotation schedule |

**Upload Content (multipart/form-data):**
```
POST /content/upload
Content-Type: multipart/form-data

title           (required) - Content title
subject         (required) - e.g., "maths", "science"
file            (required) - JPG/PNG/GIF, max 10MB
description     (optional) - Additional info
start_time      (optional) - ISO date string, e.g., 2024-01-01T09:00:00Z
end_time        (optional) - ISO date string
rotation_duration (optional) - Minutes per rotation slot (default: 5)
```

**Review Content:**
```json
{ "action": "approve" }
// or
{ "action": "reject", "rejection_reason": "Content is inappropriate." }
```

**Query Parameters for GET /content:**
```
?status=pending|approved|rejected
?subject=maths
?page=1&limit=20
```

---

### Public Broadcasting Endpoint

```
GET /content/live/:teacherId
GET /content/live/:teacherId?subject=maths
```

Returns the **currently active** content for the given teacher. No authentication required.

**Responses:**

```json
// Active content found
{
  "success": true,
  "message": "Live content fetched.",
  "data": {
    "id": "uuid",
    "title": "Chapter 5 Notes",
    "subject": "maths",
    "file_url": "http://localhost:3000/uploads/abc.jpg",
    "rotation_order": 1,
    "duration": 5
  }
}

// No content available (any edge case)
{
  "success": true,
  "message": "No content available.",
  "data": null
}
```

### User Endpoints (Principal Only)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/users/teachers` | List all teachers |
| GET | `/users/teachers/:id/content` | Get all content for a teacher |

---

## Scheduling Logic

Content rotation is **stateless and deterministic**:

1. Only `approved` content with valid `start_time` and `end_time` is eligible
2. Items are grouped by `subject` — each subject rotates independently
3. Rotation uses epoch-based modulo arithmetic:

```
anchor       = MIN(start_time) across items in the subject slot
totalCycle   = SUM(all item durations in ms)
elapsed      = (NOW - anchor) % totalCycle
→ Walk rotation order until elapsed is exhausted
```

This means no database writes or background jobs are needed — any server instance computes the same "active" item at the same moment.

---

## Edge Cases Handled

| Case | Behavior |
|------|----------|
| No approved content | Returns `"No content available."` |
| Content approved but no start/end time | Not shown (excluded from scheduling) |
| Content outside time window | Not shown |
| Invalid teacher ID | Returns `"No content available."` (not 404) |
| Invalid subject query | Returns `"No content available."` |
| Only one item in rotation | Always shown (no rotation needed) |

---

## Folder Structure

```
src/
├── app.js                    → Entry point
├── config/
│   └── database.js           → PostgreSQL pool
├── controllers/
│   ├── auth.controller.js
│   ├── content.controller.js
│   └── user.controller.js
├── middlewares/
│   ├── auth.middleware.js    → JWT + RBAC
│   ├── upload.middleware.js  → Multer
│   └── validation.middleware.js
├── routes/
│   ├── auth.routes.js
│   ├── content.routes.js
│   └── user.routes.js
├── services/
│   ├── auth.service.js
│   ├── content.service.js
│   └── scheduling.service.js → Core rotation algorithm
├── utils/
│   ├── jwt.js
│   ├── migrate.js
│   ├── response.js
│   └── seed.js
└── uploads/                  → Local file storage
```

---

## Security

- Passwords hashed with bcrypt (12 rounds)
- JWT tokens expire after 7 days (configurable)
- No sensitive fields (password_hash) exposed in any response
- File type validated by both MIME type and extension
- Rate limiting on auth (20/15min) and public API (60/min)
- Role checks enforced at middleware layer on every protected route

---

## Assumptions & Notes

- `start_time` and `end_time` are required for content to appear in rotation. Content without them is treated as "not scheduled".
- `rotation_duration` defaults to 5 minutes if not provided.
- The public live endpoint returns all active subjects' content as an array if no subject filter is applied.
- Local disk storage is used; files are served via `/uploads/<filename>`.
- For S3 support, swap Multer's diskStorage with multer-s3 — no other changes needed.
- For Redis caching, wrap the `getLiveContent` service call with a 60-second cache keyed on `live:<teacherId>:<subject>`.
