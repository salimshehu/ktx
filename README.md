# TX Limited — Company Website, Admin Console & PostgreSQL Backend

Human-centered engineering platform for **TX Limited** across four divisions:
- **Precision Agriculture**
- **Mining Tech Solutions**
- **AI & Machine Learning**
- **Biotech Technology**

## Stack
- **Frontend**: Vanilla HTML5, CSS3 (`index.css`), and ES6+ JavaScript (`main.js`, `admin.js`)
- **Backend**: Node.js (`>=22`) HTTP API (`backend/server.js`)
- **Database**: PostgreSQL (`pg` driver, `backend/db.js`)

## Run Locally on Your Machine

### 1. Prerequisites
- **Node.js 20+** (`node -v`)
- **PostgreSQL 14+** running locally (`psql --version`)
- **Python 3** (or any static file server like `npx serve`) for the frontend

### 2. Create the PostgreSQL Database
```bash
psql -U postgres -c "CREATE USER tx_user WITH PASSWORD 'tx_pass';"
psql -U postgres -c "CREATE DATABASE tx_limited OWNER tx_user;"
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE tx_limited TO tx_user;"
```
*(Or set `DATABASE_URL` in your environment to point to any PostgreSQL instance.)*

### 3. Install Dependencies & Start the Backend
```bash
npm install
npm start
```
The API server starts at `http://localhost:3001` and automatically creates and seeds the `divisions`, `deployments`, `telemetry_logs`, and `inquiries` tables.

### 4. Start the Frontend
In a second terminal:
```bash
python3 -m http.server 8080
```
Then open in your local browser:
- **Company Website**: `http://localhost:8080/index.html`
- **Admin Console**: `http://localhost:8080/admin.html`
