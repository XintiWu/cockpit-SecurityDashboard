# Cockpit Security Dashboard

[![License: LGPL v2.1](https://img.shields.io/badge/License-LGPL%20v2.1-blue.svg)](https://www.gnu.org/licenses/lgpl-2.1)

A comprehensive security monitoring and management dashboard for [Cockpit](https://cockpit-project.org/).

![Security Dashboard Screenshot](https://via.placeholder.com/800x400?text=Security+Dashboard+Screenshot)

## Features

- 🛡️ **Real-time Security Monitoring** - Monitor system security status in real-time
- 📊 **Security Dashboard** - Visual overview of your system's security posture
- ⚙️ **Configuration Management** - Manage security settings from a centralized interface
- 🔔 **Alerts & Notifications** - Get notified about security events
- 🌐 **Multi-language Support** - Available in multiple languages

## Installation

### From Distribution Packages

#### Fedora / RHEL / CentOS

```bash
# When available in repositories:
sudo dnf install cockpit-security-dashboard
```

#### Ubuntu / Debian

```bash
# When available in repositories:
sudo apt install cockpit-security-dashboard
```

### From Source

#### Prerequisites

On Fedora/RHEL/CentOS:
```bash
sudo dnf install gettext nodejs npm make cockpit-devel
```

On Ubuntu/Debian:
```bash
sudo apt install gettext nodejs npm make cockpit-dev
```

#### Build and Install

```bash
git clone https://github.com/xinti/cockpit-security-dashboard.git
cd cockpit-security-dashboard
make
sudo make install
```

#### Development Installation

For development, you can install the module without system-wide installation:

```bash
make
make devel-install
```

This creates a symbolic link in `~/.local/share/cockpit/` pointing to your build directory.

To uninstall the development version:

```bash
make devel-uninstall
```

## Development

### Building

```bash
make
```

### Watch Mode

Automatically rebuild on code changes:

```bash
make watch
```

Or with automatic upload to a remote test machine:

```bash
RSYNC=hostname make watch
```

### Code Quality

Run ESLint:
```bash
npm run eslint
npm run eslint:fix  # Auto-fix issues
```

Run Stylelint:
```bash
npm run stylelint
npm run stylelint:fix  # Auto-fix issues
```

Run all code checks:
```bash
make codecheck
```

### Testing

Run integration tests:

```bash
make check
```

Run tests on a specific OS:

```bash
TEST_OS=fedora-40 make check
```

## Usage

1. Open Cockpit in your web browser (usually https://localhost:9090)
2. Log in with your system credentials
3. Navigate to "Security Dashboard" in the sidebar
4. Monitor and manage your system's security from the dashboard

## Project Structure

```
cockpit-security-dashboard/
├── src/                    # Source files
│   ├── app.tsx            # Main React application
│   ├── index.tsx          # Application entry point
│   ├── app.scss           # Styles
│   ├── manifest.json      # Cockpit manifest
│   └── index.html         # HTML template
├── dist/                  # Built files (generated)
├── test/                  # Integration tests
├── po/                    # Translations
├── packaging/             # RPM and DEB packaging files
├── build.js               # Build script
├── Makefile              # Build targets
├── package.json          # NPM dependencies
└── README.md             # This file
```

## Technologies

- **Frontend**: React 18, TypeScript
- **UI Framework**: PatternFly 6
- **Build Tool**: esbuild
- **Testing**: Cockpit's Chrome DevTools Protocol based testing framework

## Contributing

Contributions are welcome! Please follow these guidelines:

1. **Fork the repository** on GitHub
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Make your changes** and test thoroughly
4. **Run code quality checks** (`make codecheck`)
5. **Commit your changes** (`git commit -m 'Add amazing feature'`)
6. **Push to your fork** (`git push origin feature/amazing-feature`)
7. **Open a Pull Request**

### Code Style

- Follow the existing code style
- Run `npm run eslint:fix` and `npm run stylelint:fix` before committing
- Write meaningful commit messages

### Testing

- Add tests for new features
- Ensure all existing tests pass (`make check`)
- Test on multiple operating systems if possible

## Roadmap

- [ ] Enhanced security metrics visualization
- [ ] Integration with SELinux
- [ ] Firewall management integration
- [ ] Security audit log viewer
- [ ] Vulnerability scanning
- [ ] Compliance reporting

## License

This project is licensed under the GNU Lesser General Public License v2.1 or later (LGPL-2.1-or-later).

See [LICENSE](LICENSE) file for details.

## Support

- **Bug Reports**: [GitHub Issues](https://github.com/xinti/cockpit-security-dashboard/issues)
- **Documentation**: [GitHub Wiki](https://github.com/xinti/cockpit-security-dashboard/wiki)
- **Discussions**: [GitHub Discussions](https://github.com/xinti/cockpit-security-dashboard/discussions)

## Acknowledgments

- Built on the [Cockpit Starter Kit](https://github.com/cockpit-project/starter-kit)
- Uses [PatternFly](https://www.patternfly.org/) design system
- Powered by the [Cockpit Project](https://cockpit-project.org/)

## Related Projects

- [Cockpit](https://cockpit-project.org/) - The web-based interface for Linux servers
- [cockpit-podman](https://github.com/cockpit-project/cockpit-podman) - Podman container management
- [cockpit-machines](https://github.com/cockpit-project/cockpit-machines) - Virtual machine management
- [cockpit-navigator](https://github.com/flathub/org.cockpit_project.CockpitNavigator) - File system browser

---

Made with ❤️ for the Cockpit community
