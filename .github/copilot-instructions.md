# Copilot / AI Agent Instructions for ip-crud-app

This repository is a minimal two-part app: a small Express + SQLite API (`server/`) and a React + Vite frontend (`client/`). The app includes a `collections` concept (named CIDR ranges) that can own zero or more nodes.

**Architecture (short):**
- **Server:** `server/index.js` — single Express app exposing REST endpoints under `/api/nodes` and `/api/collections`. Uses `sqlite3` with `server/network.db`. On startup the server creates tables and performs a lightweight migration to add `collection_id` to `nodes` when upgrading older DBs.
- **Client:** `client/` — Vite + React app. Main UI in `client/src/App.jsx` (axios-based calls). The UI provides CRUD for both collections and nodes and lets you assign a node to a collection.

**Run & dev workflow:**
- Start backend (dev):
  - `cd server && npm install` (first time)
  - `npm start` (uses `nodemon index.js`, listens on `:3001`)
- Start frontend (dev):
  - `cd client && npm install` (first time)
  - `npm run dev` (Vite dev server, HMR)
- Use both terminals. The client expects `http://localhost:3001`.

**Key files to inspect:**
- `server/index.js` — DB initialization, migration (`PRAGMA table_info(nodes)`), CRUD endpoints for `/api/collections` and `/api/nodes`, and CIDR/ip helper functions.
- `client/src/App.jsx` — UI: collections form/list, node form/list, client-side CIDR checks, `collection_id` selector on nodes.
- `server/network.db` — persisted SQLite DB file created at runtime.

**API shapes & behavior (concrete):**
- `GET /api/collections` → `{ data: [{ id, name, cidr }, ...] }`
- `POST /api/collections` → body `{ name, cidr }` (server validates CIDR format and RFC1918 range)
- `PUT /api/collections/:id` → body `{ name, cidr }` (same validations)
- `GET /api/nodes` → `{ data: [{ id, ip_address, port, collection_id }, ...] }`
- `POST /api/nodes` → body `{ ip_address, port, [collection_id] }` — if `collection_id` provided server verifies IP is inside that collection's CIDR
- `PUT /api/nodes/:id` → body `{ ip_address, port, [collection_id] }` (server-side validation applies)

**Validation rules implemented (important):**
- Collections `cidr` must be a valid IPv4 CIDR and must fall inside RFC1918 private ranges: `10.0.0.0/8`, `172.16.0.0/12`, or `192.168.0.0/16`.
- Nodes: when `collection_id` is provided, the server ensures the node's `ip_address` is contained in that collection's CIDR. Client implements the same quick checks for UX but the server is authoritative.
 - Ports: both server and client validate `port` values. Ports must be integers between `0` and `65535`. The client input constrains values (`min=0`, `max=65535`) and performs an early check; the server parses and enforces the range and returns a `400` error for invalid ports.

**Migration notes (what agents must respect):**
- On startup the server checks `PRAGMA table_info(nodes)`. If `collection_id` is missing it runs `ALTER TABLE nodes ADD COLUMN collection_id INTEGER` — this is non-destructive and preserves rows.
- If you must add foreign-key constraints or change column types, do a deliberate migration: create a new table, copy data, then rename — do not attempt destructive ALTERs in-place without a backup.

**Client patterns & UX details:**
- `client/src/App.jsx` now shows both a Collections section and a Nodes section. The node form contains a select of available collections (optional). Selecting a collection causes client-side containment validation before submit.
- Client uses lightweight IPv4 CIDR parsing helpers for quick validation. Always rely on server validation for correctness.

**Quick examples (cURL):**
- List collections:
```bash
curl http://localhost:3001/api/collections
```
- Create a collection (CIDR must be RFC1918):
```bash
curl -X POST http://localhost:3001/api/collections -H 'Content-Type: application/json' \
  -d '{"name":"Office LAN","cidr":"192.168.10.0/24"}'
```
- Create a node assigned to a collection (replace `<COLLECTION_ID>`):
```bash
curl -X POST http://localhost:3001/api/nodes -H 'Content-Type: application/json' \
  -d '{"ip_address":"192.168.10.5","port":8080,"collection_id":<COLLECTION_ID>}'
```

**Safety & conventions:**
- DB path is relative: `new sqlite3.Database('./network.db')`. Run the server from `server/` to avoid creating DB files in unexpected locations.
- Avoid destructive operations on `server/network.db` unless the user requests a reset — prefer additive, non-breaking schema changes.

**Potential next tasks (pick one):**
- Add SQLite foreign key constraints (requires table rebuild and migration). Decide cascade behavior for deletes.
- Add server-side CIDR normalization (store network address normalized to prefix).
- Add unit tests for CIDR helpers and API endpoints.

If anything here is out-of-date, update `server/index.js` and `client/src/App.jsx` and include short verification examples in this file.

---
Edit summary: instructions updated to document `collections`, migration behavior, CIDR validation, and usage examples.
# Copilot / AI Agent Instructions for ip-crud-app

This repository is a minimal two-part app: a small Express + SQLite API (`server/`) and a React + Vite frontend (`client/`). Use the notes below to get productive quickly and to make targeted changes safely.

**Architecture:**
- **Server:** `server/index.js` — single Express app exposing a small REST API under `/api/nodes`. It uses `sqlite3` with a file `server/network.db`. The server creates the `nodes` table on startup if missing.
- **Server:** `server/index.js` — single Express app exposing a small REST API under `/api/nodes` and `/api/collections`. It uses `sqlite3` with a file `server/network.db`. The server creates the `nodes` and `collections` tables on startup if missing, and performs a lightweight migration to add `collection_id` to `nodes` when upgrading existing DBs.
- **Client:** `client/` — Vite + React app. Single-page UI lives in `client/src/App.jsx` and calls the API (via `axios`) at `http://localhost:3001/api/nodes`.

**How to run (developer workflow):**
- Start backend (dev):
  - `cd server && npm install` (first time)
  - `npm start` (runs `nodemon index.js`, server listens on port `3001`)
- Start frontend (dev):
  - `cd client && npm install` (first time)
  - `npm run dev` (Vite dev server, HMR)
- Run both in separate terminals. The client expects the API at `http://localhost:3001`.

**Key files to inspect when changing behavior:**
- API routes and DB logic: `server/index.js` (look for `CREATE TABLE IF NOT EXISTS nodes`, and routes: `GET /api/nodes`, `POST /api/nodes`, `PUT /api/nodes/:id`, `DELETE /api/nodes/:id`).
- DB file: `server/network.db` — persisted SQLite DB file created at runtime.
- Frontend entry: `client/src/main.jsx` and UI/state: `client/src/App.jsx` (form handling, axios usage, `fetchNodes()`).
- Build and lint: `client/package.json` scripts (`dev`, `build`, `preview`, `lint`) and `server/package.json` (`start`).

**Data flow & patterns (concrete examples):**
- The client reads nodes with `axios.get('http://localhost:3001/api/nodes')` and expects `{ data: rows }` where each row has `id`, `ip_address`, `port` (see `client/src/App.jsx`).
- Collections: `GET /api/collections` returns `{ data: rows }` with `id`, `name`, `cidr`. Nodes now include an optional `collection_id` linking a node to a collection CIDR.
- Creating a node uses `POST /api/nodes` with JSON `{ ip_address, port }`. Updating uses `PUT /api/nodes/:id` with the same payload.
- Server uses plain `sqlite3` callbacks (e.g. `db.all(sql, [], (err, rows) => { ... })`). Be careful to follow the callback style when editing server DB code.

**Project-specific conventions & gotchas:**
- Single-file server: the API and DB initialization are colocated in `server/index.js`. There are no migration tools — schema changes must be applied manually (update the `CREATE TABLE` SQL and handle existing DB files).
- DB path is relative: `new sqlite3.Database('./network.db')`. Running the server from a different cwd may create a DB in the wrong place — always `cd server` first.
- No authentication or validation beyond minimal checks in the client. Assume public API when writing integrations or tests.
 - CIDR validation: server enforces that collection `cidr` values are valid CIDR strings and must fall within RFC1918 private ranges (10/8, 172.16/12, 192.168/16). Client performs the same checks before submitting. Node create/update also validate that an IP belongs to its selected collection's CIDR when a `collection_id` is provided.
- ESLint: run `cd client && npm run lint` to check frontend style.

**When adding fields to nodes (practical checklist):**
1. Update the SQL `CREATE TABLE` in `server/index.js` to include the new column.
2. Update server route handlers to accept and persist the new field (adjust `INSERT` and `UPDATE` statements and `params`).
3. Update `client/src/App.jsx` form state (`formData`), inputs, and where payloads are sent to match the new field.
4. Test by starting both servers and using the UI or `curl`/`httpie` to exercise endpoints.

**Search terms useful for agents:** `api/nodes`, `network.db`, `sqlite3`, `axios`, `vite`, `nodemon`, `CREATE TABLE IF NOT EXISTS nodes`.

**Safety notes for automated edits:**
- Avoid destructive operations on `server/network.db` unless the user explicitly requests a reset — changes will remove persisted test data.
- Prefer non-breaking server changes (add columns with defaults, keep existing response shapes) to avoid breaking the UI.

If any of these conventions are out-of-date with your intentions, tell me where to prioritize more detail (e.g., adding migration steps, CI, or tests) and I will iterate.

---
Edit summary: created a focused, actionable guide pointing to `server/index.js`, `client/src/App.jsx`, and the key run commands. Ask me to expand any section.
