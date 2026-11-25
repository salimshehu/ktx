# TX — Host-Isolated Web Platform & PostgreSQL API

Your tech solution for every sector across **farmSense**, **Vmines**, **techx**, and **Biotx**.

## Architecture
- **Unified Host-Routed Server** (`backend/server.js`, default `PORT=8080`):
  - **Public Root (`PUBLIC_DOMAIN=localhost`)**: Serves the public landing page and public APIs (`/api/divisions`, `/api/farms`, `/api/inquiries`). Strictly returns `404 Not Found` for `/admin*` and `/api/admin*`.
  - **Admin Subdomain (`ADMIN_DOMAIN=admin.localhost`)**: Opens directly to the Admin Console/Login, blocks public landing pages (`index.html`), enforces host-only `HttpOnly; SameSite=Strict` cookies, restricts CORS/CSRF to `ADMIN_DOMAIN`, and sends `X-Robots-Tag: noindex, nofollow` on every response.
- **Database**: PostgreSQL (`pg`, `backend/db.js`)

## Run Locally

1. Copy `.env.example` to `.env` (or export variables).
2. Create the PostgreSQL database:
   ```bash
   psql -U postgres -c "CREATE USER tx_user WITH PASSWORD 'tx_pass';"
   psql -U postgres -c "CREATE DATABASE tx_limited OWNER tx_user;"
   psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE tx_limited TO tx_user;"
   ```
3. Install dependencies and start the unified server:
   ```bash
   npm install
   npm start
   ```
4. Open in your browser:
   - **Public Website**: `http://localhost:8080`
   - **Admin Console**: `http://admin.localhost:8080` (default login: `admin` / `tx_admin_pass`)
