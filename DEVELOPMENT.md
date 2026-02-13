# Development Guide

Complete guide for developing and testing the Air-1 Dashboard addon locally.

## 🚀 Quick Start

```bash
# Install dependencies
bun install

# Start development (mock server + dashboard with hot reload)
bun dev

# Open dashboard in browser
# → http://localhost:4321 (auto-opens)
# → Mock API at http://localhost:8099
```

## 🛠️ Development Environment

### Prerequisites
- **Bun** >= 1.0.0 ([install](https://bun.sh))
- **Git**
- **Docker** (for testing container builds)
- **Home Assistant** instance (optional, for integration testing)

### First-Time Setup

```bash
# Clone repository
git clone https://github.com/yourusername/air1-dashboard-ha-addon.git
cd air1-dashboard-ha-addon

# Install all workspace dependencies
bun install

# Start development servers
bun dev
```

## 💻 Development Workflow

### Local Development with Mock Data

The `bun dev` command starts two servers concurrently:

1. **Mock API Server** (port 8099)
   - 3 mock Apollo AIR-1 sensors with realistic data
   - Full REST API endpoints (`/api/config`, `/api/sensors`, `/api/history`)
   - Mock storage API with in-memory data
   - CORS enabled for cross-origin requests

2. **Dashboard Dev Server** (port 4321)
   - Astro + SolidJS with hot module reload
   - Automatically connects to mock API
   - Opens in browser automatically

```bash
# Start both servers
bun dev

# Build dashboard only
bun run build:dashboard

# Check for type errors
bun run typecheck

# Run linter
bun run lint

# Auto-fix lint issues
bun run lint:fix
```

### Project Structure

```
air1-dashboard-ha-addon/
├── dashboard/              # Frontend (Astro + SolidJS)
│   ├── src/
│   │   ├── components/     # UI components (TSX)
│   │   ├── pages/          # Astro pages
│   │   ├── config.ts       # API base URL config
│   │   └── styles/         # CSS styles
│   ├── .env.development    # Dev environment (points to mock server)
│   ├── .env.production     # Production (relative API paths)
│   └── astro.config.mjs    # Astro configuration
│
├── server/                 # Backend (TypeScript + Express)
│   ├── server.ts           # Production server
│   ├── dev-server.ts       # Mock server for development
│   ├── ha-client.ts        # Home Assistant API client
│   ├── storage-routes.ts   # Storage API endpoints
│   ├── db.ts               # SQLite database wrapper
│   ├── config.ts           # Entity mapping utilities
│   └── types.ts            # Shared TypeScript types
│
├── examples/               # Example API responses (for reference)
│   ├── config_response.json
│   ├── sensors_response.json
│   └── readings_response.json
│
├── scripts/                # Build and deployment scripts
│   ├── build.sh            # Build dashboard
│   ├── clean.sh            # Clean artifacts
│   ├── deploy-local.sh     # Deploy to HA via SMB
│   ├── test-docker.sh      # Test Docker build
│   ├── validate.sh         # Validate server code
│   └── *.ts                # Release and version scripts
│
├── .github/                # GitHub templates
│   └── pull_request_template.md
│
├── Dockerfile              # Multi-stage production build
├── config.yaml             # HA addon manifest
├── rootfs/                 # HA addon runtime files
│   └── usr/bin/run.sh      # Startup script
│
├── CONTRIBUTING.md         # Contribution guidelines
└── DEVELOPMENT.md          # This file
```

### Making Changes

**Dashboard (Frontend)**:
1. Edit files in `dashboard/src/components/`
2. Changes hot-reload automatically
3. TypeScript errors show in terminal and browser

**Server (Backend)**:
1. Edit files in `server/`
2. Restart dev server: Stop (Ctrl+C) and `bun dev`
3. Or use watch mode: `bun run --cwd server dev` (watches server.ts only)

**Mock Server**:
1. Edit `server/dev-server.ts`
2. Restart: Stop (Ctrl+C) and `bun dev`
3. Mock data resets on restart

## 🧪 Testing

### Local Testing (No HA Required)

```bash
# Start mock environment
bun dev

# Test in browser at http://localhost:4321
# - Check sensor data loads
# - Test storage (save/load snapshots)
# - View historical data charts
# - Test mobile responsive layout
```

### Docker Build Test

```bash
# Test the production Docker build
./scripts/test-docker.sh

# Or manually
docker build -t air1-test .
docker run -it --rm -p 8099:8099 air1-test
```

### Testing in Home Assistant

#### Option 1: SMB Deploy (Fastest)

**Prerequisites**:
- SMB share mounted: Open `smb://homeassistant/addons` in Finder (macOS) or file explorer
- Path should be `/Volumes/addons` (macOS) or network drive (Windows/Linux)

**Deploy**:
```bash
# Clean and deploy to HA
./scripts/deploy-local.sh

# Then in Home Assistant:
# Settings → Add-ons → ⋮ → Check for updates → Rebuild
```

**What happens**:
1. Runs `./scripts/clean.sh` to remove build artifacts
2. Copies source to `/Volumes/addons/air1_dashboard/`
3. HA Supervisor builds Docker image
4. Install or rebuild addon in HA UI

#### Option 2: Manual Copy

```bash
# Clean build artifacts
./scripts/clean.sh

# Copy to your HA addons directory
cp -r . /path/to/homeassistant/addons/air1_dashboard/

# Refresh in HA: Settings → Add-ons → ⋮ → Check for updates
```

#### Option 3: Git Clone in HA

```bash
# SSH into Home Assistant
ssh root@homeassistant.local

# Clone to addons directory
cd /addons
git clone https://github.com/yourusername/air1-dashboard-ha-addon.git air1_dashboard

# Refresh in HA UI
```

## 🧹 Cleaning

```bash
# Remove all build artifacts and dependencies
./scripts/clean.sh
```

**What gets cleaned**:
- `dashboard/dist/` - Built static files
- `dashboard/node_modules/` - Dependencies
- `dashboard/.astro/` - Astro cache
- `server/node_modules/` - Dependencies
- Logs and temp files

**When to clean**:
- ✅ Before deploying to HA (ensures fresh Docker build)
- ✅ Before committing (keeps repo small)
- ✅ When switching branches
- ✅ After dependency changes
- ✅ When troubleshooting build issues

## 📦 Scripts Reference

| Command | Purpose | Usage |
|---------|---------|-------|
| `bun dev` | Start mock server + dashboard dev | `bun dev` |
| `bun run build` | Build dashboard for production | `bun run build` |
| `bun run lint` | Run Biome linter | `bun run lint` |
| `bun run lint:fix` | Auto-fix lint issues | `bun run lint:fix` |
| `bun run typecheck` | Check TypeScript types | `bun run typecheck` |
| `./scripts/build.sh` | Build dashboard (shell script) | `./scripts/build.sh` |
| `./scripts/clean.sh` | Remove all build artifacts | `./scripts/clean.sh` |
| `./scripts/deploy-local.sh` | Deploy to HA via SMB | `./scripts/deploy-local.sh` |
| `./scripts/test-docker.sh` | Test Docker build locally | `./scripts/test-docker.sh` |

## 🔍 Debugging

### Check Logs in Development

```bash
# Mock server logs (stdout)
# Shows in terminal where you ran `bun dev`

# Dashboard logs (browser console)
# Open DevTools → Console
```

### Check Logs in Home Assistant

```bash
# In HA UI:
# Settings → Add-ons → Air-1 Quality Dashboard → Log

# Or via CLI:
docker logs addon_local_air1_dashboard
```

### Test API Endpoints

```bash
# Health check
curl http://localhost:8099/health

# Config
curl http://localhost:8099/api/config

# Sensors (mock data)
curl http://localhost:8099/api/sensors

# History
curl http://localhost:8099/api/history/2c77c8?days=7

# Storage
curl http://localhost:8099/api/storage/readings
```

### Common Issues

**`bun dev` fails**:
- Ensure Bun >= 1.0.0: `bun --version`
- Delete node_modules: `./scripts/clean.sh && bun install`
- Check ports 8099 and 4321 are free

**TypeScript errors**:
- Run `bun run typecheck` to see all errors
- Check `tsconfig.json` settings
- Ensure dependencies are installed

**Build fails in HA**:
- Check addon logs for errors
- Ensure Dockerfile has all dependencies
- Try: Settings → Add-ons → Rebuild
- Test locally: `./scripts/test-docker.sh`

**SMB deploy fails**:
- Mount share: `open smb://homeassistant/addons`
- Check network connection to HA
- Verify `/Volumes/addons` exists

**Dashboard won't load**:
- Check browser console for errors
- Verify API base URL in `.env.development`
- Ensure mock server is running (port 8099)

## 🚀 Release Workflow

1. **Make and test changes** locally with `bun dev`
2. **Update version** in `package.json` and `config.yaml`
3. **Update CHANGELOG.md** with changes
4. **Run tests**:
   ```bash
   bun run lint
   bun run typecheck
   bun run build
   ./scripts/test-docker.sh
   ```
5. **Clean the repo**: `./scripts/clean.sh`
6. **Commit changes**:
   ```bash
   git add -A
   git commit -m "feat: add new feature"
   ```
7. **Tag release**: `git tag v0.5.1`
8. **Push**: `git push && git push --tags`

## 🎯 Development Tips

### Fast Iteration
- Use `bun dev` for UI changes with hot reload
- Mock server provides instant feedback
- No need to rebuild for dashboard changes

### Testing HA Integration
- Use `./scripts/deploy-local.sh` to test in real HA
- Keep addon logs open in HA UI
- Check for API errors in server logs

### Code Quality
- Run `bun run lint:fix` before committing
- Git hooks run automatically (Lefthook)
- Pre-commit: Runs Biome formatter/linter
- Commit-msg: Validates commit message format

### Performance
- Dashboard build is optimized by Astro
- Mock server uses in-memory storage (fast)
- Production uses SQLite (persistent)

### Debugging TypeScript
- Use VS Code with TypeScript extension
- Enable "TypeScript: Check JS" in settings
- Use `console.log()` in dev server
- Browser DevTools for dashboard debugging

## 🌐 Environment Variables

### Dashboard (.env.development)
```env
PUBLIC_API_BASE_URL=http://localhost:8099
```

### Dashboard (.env.production)
```env
PUBLIC_API_BASE_URL=
# Empty = relative paths (works with HA ingress)
```

### Server (HA addon runtime)
```bash
SUPERVISOR_TOKEN=<auto-provided-by-ha>
HA_API_BASE=http://supervisor/core/api
PORT=8099
CONFIG_PATH=/data/options.json
STATIC_PATH=/app/dashboard/dist
```

## 📚 Additional Resources

- **Bun Documentation**: https://bun.sh/docs
- **Astro Documentation**: https://astro.build
- **SolidJS Documentation**: https://www.solidjs.com
- **Express Documentation**: https://expressjs.com
- **Home Assistant Addon Development**: https://developers.home-assistant.io/docs/add-ons

## 🆘 Getting Help

- **Documentation**: Check README.md and CONTRIBUTING.md
- **Issues**: Search existing GitHub issues
- **Questions**: Open a GitHub discussion
- **Bugs**: File an issue with details and logs

---

Happy coding! 🎉
