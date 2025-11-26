# Mini IPAM

[![E2E Tests (Playwright)](https://github.com/dobriak/mini-ipam/actions/workflows/e2e.yml/badge.svg)](https://github.com/dobriak/mini-ipam/actions/workflows/e2e.yml)

# Mini IPAM

Extremely simplistic IPAM app to help keep track of multiple ip/port combinations, especially when running multiple services on a single machine.

**This README covers:** local development, running the app, running unit and E2E tests, and deployment with Docker Compose (SQLite persisted to `./data`).

**Quick start (development)**
- **Server** (API):
	```bash
	cd server
	npm install
	npm start
	```

- **Client** (dev server - Vite):
	```bash
	cd client
	npm install
	npm run dev
	```

Open the UI at: http://localhost:5173

Data store: `server/network.db` (SQLite). When running locally the DB file is created in the `server/` folder. When running with Docker Compose the DB is persisted under `./data/network.db` on the host.

**Developer workflows**

- Clone and install dependencies for both services:
	```bash
	git clone git@github.com:dobriak/mini-ipam.git
	cd mini-ipam
	# server
	cd server
	npm install
	# client (in another terminal)
	cd ../client
	npm install --legacy-peer-deps
	```

- Run both services for development (two terminals):
	- Terminal A:
		```bash
		cd server
		npm start
		```
	- Terminal B:
		```bash
		cd client
		npm run dev
		```

**Testing**

- Unit / Component tests (Vitest + Testing Library):
	```bash
	# from repo root
	cd client
	npm test        # runs vitest once
	npm run test:watch  # watch mode
	```

- E2E tests (Playwright): tests run the dev server and mock API responses where appropriate.
	```bash
	# install playwright browsers (once)
	cd client
	npx playwright install --with-deps

	# run E2E tests (headless)
	npm run e2e

	# or run headed (see browser)
	npm run e2e:headed
	```

Notes:
- Unit tests live under `client/src/__tests__`.
- E2E tests live under `client/e2e/tests` and intercept `/api` calls to provide deterministic fixtures.

**Deploy with Docker Compose (recommended for easy deploy)**

This repo includes Dockerfiles for both services and a `docker-compose.yml` that:
- builds the `server` and `client` images,
- maps host ports `3001` -> server and `5173` -> client (served by nginx),
- mounts `./data` on the host to `/data` in the server container so the SQLite DB persists across restarts.

Run the app with Docker Compose:
```bash
# from repo root
mkdir -p data
docker compose up --build
```

Open the UI at: http://localhost:5173

Stop and remove containers:
```bash
docker compose down
```

If you'd prefer a named Docker volume instead of the host `./data` folder, update `docker-compose.yml` and I can make that change for you.

**Advanced / CI notes**
- A GitHub Actions workflow runs Playwright E2E on pushes / PRs; the status badge at the top links to the workflow page.

**Tips**
- The server `package.json` uses `nodemon` for `npm start` which is convenient for development. The server Dockerfile uses `node index.js` for production; change the `CMD` in `server/Dockerfile` to `npm start` if you want `nodemon` behavior in container (not recommended for production).

