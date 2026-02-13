# Contributing to Air-1 Dashboard

Thank you for your interest in contributing! This guide will help you get started.

## 🚀 Quick Start

1. **Fork and clone** the repository
2. **Install Bun** (our runtime): `curl -fsSL https://bun.sh/install | bash`
3. **Install dependencies**: `bun install`
4. **Start development server**: `bun dev`
5. **Make your changes** and test locally
6. **Submit a pull request**

## 💻 Development Setup

### Prerequisites
- [Bun](https://bun.sh) >= 1.0.0
- Git

### Local Development

```bash
# Install all workspace dependencies
bun install

# Start mock server + dashboard (hot reload enabled)
bun dev

# Build dashboard for production
bun run build

# Run linter
bun run lint

# Fix linting issues automatically
bun run lint:fix

# Run type checking
bun run typecheck
```

The development server provides:
- **Mock API server** on http://localhost:8099 with realistic data
- **Dashboard dev server** with hot reload
- **Full storage API** with in-memory mock data
- **3 mock sensors** for testing

## 📁 Project Structure

```
air1-dashboard-ha-addon/
├── dashboard/           # SolidJS frontend (Astro)
│   ├── src/
│   │   ├── components/  # UI components
│   │   ├── pages/       # Astro pages
│   │   └── config.ts    # API configuration
│   └── dist/            # Built files (gitignored)
│
├── server/              # TypeScript backend
│   ├── server.ts        # Production server (Express)
│   ├── dev-server.ts    # Mock server for development
│   ├── ha-client.ts     # Home Assistant API client
│   ├── storage-routes.ts # Storage API endpoints
│   ├── db.ts            # SQLite database
│   └── types.ts         # Shared TypeScript types
│
├── scripts/             # Build and deployment scripts
│   ├── build.sh         # Build dashboard
│   ├── clean.sh         # Clean build artifacts
│   ├── deploy-local.sh  # Deploy to HA (SMB)
│   └── test-docker.sh   # Test Docker build
│
└── examples/            # Example API responses
```

## 🎯 What to Contribute

### Good First Issues
- UI improvements and bug fixes
- Documentation improvements
- Adding tests
- Fixing linter warnings

### Feature Ideas
- Additional air quality metrics
- Enhanced visualizations
- Improved mobile experience
- Internationalization (i18n)
- More chart types
- Historical data analysis

### Areas Needing Help
- Test coverage
- Accessibility improvements
- Performance optimizations
- Documentation

## 📝 Coding Standards

### TypeScript
- Use TypeScript for all server and dashboard code
- Prefer explicit types over `any`
- Use interfaces for object shapes
- Document complex functions with JSDoc

### Code Style
- We use [Biome](https://biomejs.dev/) for linting and formatting
- Run `bun run lint:fix` before committing
- Follow existing code patterns
- Keep functions small and focused

### Commits
- Follow [Conventional Commits](https://www.conventionalcommits.org/)
- Format: `type(scope): description`
- Types: `feat`, `fix`, `docs`, `chore`, `refactor`, `test`, `style`
- Examples:
  - `feat(dashboard): add CO2 trend chart`
  - `fix(server): handle missing sensor gracefully`
  - `docs: update installation guide`

### Git Hooks
We use [Lefthook](https://github.com/evilmartians/lefthook) for git hooks:
- **Pre-commit**: Runs Biome linter/formatter
- **Commit-msg**: Validates commit message format

Hooks are installed automatically after `bun install`.

## 🧪 Testing

### Manual Testing
```bash
# Test with mock server
bun dev
# Open http://localhost:4321

# Test Docker build
./scripts/test-docker.sh

# Test in Home Assistant (requires HA instance)
./scripts/deploy-local.sh
```

### What to Test
- [ ] Dashboard loads without errors
- [ ] Sensor data displays correctly
- [ ] Storage (save/load snapshots) works
- [ ] Historical data charts render
- [ ] Mobile responsive layout
- [ ] Error states handle gracefully
- [ ] Docker build completes successfully

## 📤 Pull Request Process

1. **Create a feature branch** from `main`
   ```bash
   git checkout -b feat/your-feature-name
   ```

2. **Make your changes** and commit
   - Write clear commit messages
   - Keep commits focused and atomic
   - Follow our commit conventions

3. **Test your changes**
   - Run `bun dev` and test locally
   - Run `bun run lint` and `bun run typecheck`
   - Ensure `bun run build` succeeds

4. **Update documentation**
   - Update README.md if adding features
   - Update CHANGELOG.md with your changes
   - Add code comments for complex logic

5. **Submit pull request**
   - Fill out the PR template
   - Link related issues
   - Describe what changed and why
   - Include screenshots for UI changes

6. **Address review feedback**
   - Be responsive to comments
   - Make requested changes
   - Re-request review when ready

## 🐛 Bug Reports

When reporting bugs, please include:
- **Description**: Clear description of the issue
- **Steps to reproduce**: How to trigger the bug
- **Expected behavior**: What should happen
- **Actual behavior**: What actually happens
- **Environment**: Home Assistant version, addon version
- **Logs**: Relevant error logs from HA addon logs
- **Screenshots**: If applicable

## 💡 Feature Requests

For feature requests, please include:
- **Use case**: Why you need this feature
- **Proposed solution**: How you envision it working
- **Alternatives**: Other solutions you've considered
- **Additional context**: Mockups, examples, etc.

## 📜 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Welcome newcomers
- Accept constructive criticism
- Focus on what's best for the community
- Show empathy

### Unacceptable Behavior
- Harassment or discriminatory language
- Trolling or insulting comments
- Personal or political attacks
- Publishing others' private information

## 📄 License

By contributing, you agree that your contributions will be licensed under the MIT License.

## ❓ Questions?

- **Documentation**: Check README.md and DEVELOPMENT.md
- **Issues**: Search existing issues first
- **Discussion**: Open a GitHub discussion
- **Bugs**: File an issue with details

---

Thank you for contributing! 🎉
