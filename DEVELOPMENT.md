# Development Guide

Quick reference for developing and testing the Air-1 Dashboard addon locally.

## 🛠️ Development Workflow

### Local Development with Mock Data

```bash
# Build the dashboard
./build.sh

# Start dev server with fake sensors
./dev-preview.sh

# Open in browser
open http://localhost:8099
```

The dev server provides 3 mock sensors (Bedroom, Living Room, Office) with realistic air quality data.

### Making Changes

1. **Edit dashboard code**: `dashboard/src/components/`
2. **Rebuild**: `./build.sh`
3. **Restart dev server**: Stop (Ctrl+C) and run `./dev-preview.sh`
4. **Refresh browser** to see changes

## 🧪 Testing in Home Assistant

### Option 1: SMB Deploy (Fastest for iteration)

**Prerequisites**:
- SMB share mounted at `/Volumes/addons`
- To mount: Open `smb://homeassistant/addons` in Finder (Cmd+K)

**Deploy**:
```bash
# Clean and deploy to HA
./deploy-local.sh

# Then in HA:
# Settings → Add-ons → ⋮ → Check for updates → Install/Rebuild
```

**What this does**:
1. Cleans all build artifacts (node_modules, dist, etc.)
2. Copies clean source to `/Volumes/addons/air1_dashboard/`
3. HA Supervisor builds the Docker image with multi-stage build

### Option 2: Manual Copy

```bash
# Clean first
./clean.sh

# Copy to your HA addons directory
cp -r . /path/to/homeassistant/addons/air1_dashboard/

# Refresh in HA
```

### Option 3: Docker Build Locally

```bash
# Test the multi-stage build
docker build -t air1-dashboard-test .

# Run container (limited - needs HA API)
docker run -it --rm -p 8099:8099 \
  -e SUPERVISOR_TOKEN="test" \
  -e SENSOR_PREFIX="air1" \
  air1-dashboard-test
```

## 🧹 Cleaning

```bash
# Remove all build artifacts
./clean.sh
```

**What gets cleaned**:
- `dashboard/dist/` - Built static files
- `dashboard/node_modules/` - Dashboard dependencies
- `server/node_modules/` - Server dependencies
- `dashboard/.astro/` - Astro cache
- Logs and temp files

**When to clean**:
- Before deploying to HA (ensures fresh Docker build)
- Before committing (keeps repo small)
- When switching branches
- After dependency changes

## 📦 Scripts Reference

| Script | Purpose | Usage |
|--------|---------|-------|
| `build.sh` | Build dashboard locally | `./build.sh` |
| `dev-preview.sh` | Run dev server with mock data | `./dev-preview.sh` |
| `clean.sh` | Remove all build artifacts | `./clean.sh` |
| `deploy-local.sh` | Clean + deploy to HA via SMB | `./deploy-local.sh` |

## 🔍 Debugging

### Check Server Logs in HA

```bash
# In HA: Settings → Add-ons → Air-1 Quality Dashboard → Log
```

### Test API Endpoints

```bash
# Health check
curl http://homeassistant.local:8099/health

# Get config
curl http://homeassistant.local:8099/api/config

# List sensors (requires HA API token)
curl http://homeassistant.local:8099/api/sensors
```

### Common Issues

**Build fails in HA**:
- Check addon logs for errors
- Ensure multi-stage Dockerfile has all dependencies
- Try rebuilding: Settings → Add-ons → Rebuild

**Dev server can't find dist/**:
- Run `./build.sh` first
- Check that `dashboard/dist/` exists

**SMB deploy fails**:
- Mount the share: `open smb://homeassistant/addons`
- Check `/Volumes/addons` exists
- Verify network connection to HA

## 🚀 Release Workflow

1. **Make changes** and test with `./dev-preview.sh`
2. **Clean the repo**: `./clean.sh`
3. **Commit changes**: `git add -A && git commit -m "description"`
4. **Update version** in `config.yaml` and `CHANGELOG.md`
5. **Tag release**: `git tag v1.0.1`
6. **Push**: `git push && git push --tags`
7. **Users pull updates** from GitHub

## 📂 Project Structure

```
air1-dashboard-ha-addon/
├── config.yaml           # HA addon manifest
├── Dockerfile            # Multi-stage build
├── build.sh              # Build dashboard locally
├── dev-preview.sh        # Dev server with mocks
├── clean.sh              # Remove build artifacts
├── deploy-local.sh       # Deploy to HA via SMB
│
├── server/               # Node.js backend
│   ├── server.js         # Express API server
│   ├── ha-client.js      # HA API integration
│   ├── dev-server.js     # Mock server for dev
│   └── config.js         # Entity mappings
│
├── dashboard/            # SolidJS frontend
│   ├── src/
│   │   ├── components/   # UI components
│   │   │   ├── Dashboard.tsx
│   │   │   ├── HADataSource.tsx
│   │   │   └── ...
│   │   └── pages/
│   └── dist/            # Built files (gitignored)
│
└── rootfs/
    └── usr/bin/run.sh    # Addon startup script
```

## 🎯 Quick Tips

- **Fast iteration**: Use `./dev-preview.sh` for UI changes
- **Test HA integration**: Use `./deploy-local.sh` to test in real HA
- **Before committing**: Run `./clean.sh` to keep repo clean
- **Check Docker build**: Run `docker build .` locally before releasing

## 🆘 Getting Help

- **Issues**: Check addon logs in HA
- **Questions**: See README.md for configuration options
- **Bugs**: File an issue on GitHub
