# 🌙 Midnight Quick Starter Template

> **Base template for blockchain projects on Midnight Network** - A complete and modern template for developing decentralized applications (dApps) with smart contracts, backend APIs, CLI tools, and user interfaces.

## 📋 Table of Contents

- [🎯 Description](#-description)
- [✨ Features](#-features)
- [🏗️ Architecture](#️-architecture)
- [⚙️ System Requirements](#️-system-requirements)
- [🚀 Installation](#-installation)
- [📖 Basic Usage](#-basic-usage)
- [🏛️ Project Structure](#️-project-structure)
- [🔍 Quick Development Guide](#-quick-development-guide)
- [🐳 Docker Services](#-docker-services)
- [🚀 Running the Application](#-running-the-application)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [🚀 Roadmap & Ideas for Improvement](#-roadmap-ideas-for-improvement)

## 🎯 Description

**Midnight Quick Starter** is a complete and modern template for developing blockchain applications on the Midnight network. This template provides a solid foundation with all the necessary tools to create dApps with smart contracts, APIs, user interfaces, and CLI tools.

### Use Cases

- ✅ Complete dApp development on Midnight Network
- ✅ Smart contract creation with Compact
- ✅ Backend APIs for blockchain interaction
- ✅ Modern user interfaces with React
- ✅ CLI tools for development
- ✅ Monorepo with optimized dependency management

## ✨ Features

- **🔧 Monorepo with Turbo** - Optimized build system and dependency management
- **📝 TypeScript** - Complete static typing across all packages
- **⚡ React + Vite** - Modern UI with hot reload
- **🔒 Compact Contracts** - Smart contracts with Compact language
- **🌐 REST/WebSocket API** - Backend for blockchain interaction
- **🖥️ CLI Tools** - Command line tools
- **🎨 Tailwind CSS** - Modern and responsive styles
- **📏 ESLint + Prettier** - Clean and consistent code

## 🏗️ Architecture

```
midnight-quick-starter/
├── 📦 packages/
│   ├── 🎨 ui/          # React + Vite Frontend
│   ├── 🔧 api/         # Backend API
│   ├── 🖥️ cli/         # CLI Tools
│   └── 🔒 contract/    # Compact Contracts
├── 🔧 compact/         # Compact Compiler
└── 📚 docs/           # Documentation
```

## ⚙️ System Requirements

- **Node.js** >= 22.0.0
- **Yarn** >= 4.9.2
- **Git** >= 2.0.0
- **Docker** (optional, for local testing)

### Requirements Verification

```bash
node --version  # >= 22.0.0
yarn --version  # >= 4.9.2
git --version   # >= 2.0.0
```

## 🚀 Installation

### 1. Clone the Template

```bash
# Option 1: Use "Use this template" button on GitHub
# Click "Use this template" → "Create a new repository"

# Option 2: Fork the repository
# Click "Fork" → Clone your forked repository
git clone <your-forked-repository-url>
cd midnight-quick-starter

# Option 3: Clone directly (for contributing)
git clone <repository-url>
cd midnight-quick-starter
```

### 2. Install Dependencies

```bash
yarn install
```

### 3. Download and Prepare ZK Parameters (Required for Proofs)

Before building, you need to fetch the zero-knowledge (ZK) parameters required by the proof server. This is done via a helper script that you should place in the CLI package:

```bash
# Move to the CLI package directory
cd packages/cli

# Download the fetch-zk-params.sh script
curl -O https://raw.githubusercontent.com/bricktowers/midnight-proof-server/main/fetch-zk-params.sh
# or
wget https://raw.githubusercontent.com/bricktowers/midnight-proof-server/main/fetch-zk-params.sh

# Give execution permissions
chmod +x fetch-zk-params.sh

# Run the script to download ZK parameters
./fetch-zk-params.sh
```

> **Note:**
> - This script will generate a folder at `/.cache/midnight/zk-params` with all the required parameters for zero-knowledge proofs.
> - **Why is this needed?** If you see an error like:
>   `Error in response: Proving(public parameters for k=16 not found in cache)`
>   it means the required parameters are missing.
> - **This script is a workaround** to ensure your application works locally. The Midnight team is working on a more integrated solution for parameter management in the future.

### 4. Configure Compact Compiler

To Install the compiler in your teminal follow these steps:

**Download compiler**

This command will download and run a shell script. It will instruct you how to add the binary directory it uses to your PATH environment variable.

```bash
curl --proto '=https' --tlsv1.2 -LsSf https://github.com/midnightntwrk/compact/releases/latest/download/compact-installer.sh | sh
```

**Update compiler**

Once you've done this, the compact command line tool is available to use. This tool has a number of useful subcommands that can be invoked. For instance, to update the toolchain to the latest version, you will run the command:

```bash
compact update
```

The output will look something like this (on an Apple Silicon macOS machine, for instance):

```bash
compact: aarch64-darwin -- 0.24.0 -- installed
compact: aarch64-darwin -- 0.24.0 -- default.
```

**Check new version available**

You can check if there is a new version available using the check subcommand like this:

```bash
compact check
```

If there is a new version available, you will see something like:

```
compact: aarch64-darwin -- Update Available -- 0.24.0
compact: Latest version available: 0.24.0.
```

This is reporting that you are on version 0.24.0 and that 0.25.0 is available.

**Note:**
You will not actually see this output until there is a new version available. Instead, you will see that you are on the latest version:

```bash
compact: aarch64-darwin -- Up to date -- 0.24.0
```

**Invoking the Compiler**

In addition to keeping the toolchain updated, the compact tool will also be the official supported way to invoke all the toolchain tools themselves. For the time being, the only such tool is the compiler, but we will be building out more tools in the future. The compiler can be invoked with the compile subcommand:

```bash
compact compile <contract file> <output directory>
```

You can see and learn more information, commands about the compiler here: [compact developer tools](https://docs.midnight.network/blog/compact-developer-tools)

### 5. Build All Packages

```bash
# Build all packages (creates necessary folders automatically)
yarn build:all
```

> **Note:** The build process automatically creates the necessary folders (`keys` and `zkir`) that are required by the frontend. No manual folder creation is needed.
>
> **What `yarn build:all` does:**
> - Builds the contract package (compiles Compact contracts)
> - Builds the API package (TypeScript compilation)
> - Builds the CLI package (TypeScript compilation)
> - Builds the UI package (Vite build with contract assets)
> - Creates necessary folders for frontend compatibility

## 🏛️ Project Structure

### 📦 Main Packages

#### `packages/ui/` - Frontend
```
ui/
├── src/
│   ├── components/     # React Components
│   ├── hooks/         # Custom hooks
│   ├── lib/           # Utilities
│   ├── providers/     # Context providers
│   └── assets/        # Static resources
├── public/            # Public files
└── dist/              # Production build
```

#### `packages/api/` - Backend API
```
api/
├── src/
│   ├── index.ts       # Entry point
│   └── test/          # Tests
└── dist/              # Compiled build
```

#### `packages/contract/` - Smart Contracts
```
contract/
├── src/
│   ├── quick-starter.compact  # Main contract
│   ├── managed/               # Generated contracts
│   └── index.ts              # Exports
└── dist/                     # Compiled build
```

#### `packages/cli/` - CLI Tools
```
cli/
├── src/
│   ├── launcher/      # Network launchers
│   ├── config.ts      # Configurations
│   └── index.ts       # Entry point
└── dist/              # Compiled build
```

### 🔧 Configuration

- **`turbo.json`** - Monorepo configuration
- **`package.json`** - Root dependencies and scripts
- **`.eslintrc.js`** - Linting rules
- **`tsconfig.json`** - TypeScript configuration

## 🔍 Quick Development Guide

### 🎯 Areas to Modify (Marked with TODO)

To quickly find areas that need customization, search for `TODO` comments throughout the codebase:

**Using your code editor's global search:**
- **VS Code:** `Ctrl+Shift+F` (or `Cmd+Shift+F` on Mac) and search for `TODO`
- **WebStorm/IntelliJ:** `Ctrl+Shift+F` and search for `TODO`
- **Sublime Text:** `Ctrl+Shift+F` and search for `TODO`

**Using command line:**
```bash
# Search for all TODO comments
grep -r "TODO" .

# Or search in specific packages
grep -r "TODO" packages/contract/
grep -r "TODO" packages/api/
grep -r "TODO" packages/ui/
grep -r "TODO" packages/cli/
```

### 📝 Key Files to Customize

- **`packages/contract/src/quick-starter.compact`** - Your main smart contract
- **`packages/contract/src/index.ts`** - Contract exports and logic
- **`packages/api/src/index.ts`** - Backend API implementation
- **`packages/cli/src/index.ts`** - CLI interaction logic
- **`packages/ui/src/main.tsx`** - Main React application
- **`packages/ui/src/components/`** - React components
- **`packages/ui/src/hooks/`** - Custom React hooks
- **`packages/ui/src/lib/`** - Utility functions
- **`packages/ui/src/providers/`** - Context providers

### 🚀 Development Workflow

1. **Edit your contract** in `packages/contract/src/quick-starter.compact`
2. **Build the contract** with `cd packages/contract && npx turbo run build`
3. **Build other packages** as needed using individual build commands
4. **Customize UI components** in `packages/ui/src/`
5. **Implement API logic** in `packages/api/src/`

## 🐳 Docker Services

After building your packages, you can run the Infrastructure services using Docker:

### Testnet Environment

```bash
cd packages/cli
docker compose -f testnet.yml up -d
```

### Standalone Environment

```bash
cd packages/cli
docker compose -f standalone.yml up -d
```

> **Note:** The `-d` flag runs containers in detached mode (background), so you can continue using your terminal.

You should see something like:
```
✔ Container quick-starter-proof-server  Started
✔ Container quick-starter-node          Started  
✔ Container quick-starter-indexer       Started
```

## 🚀 Running the Application

### Start the UI

```bash
cd packages/ui
yarn start
```

The application will be available at `localhost:8080`

## 🤝 Contributing

### Contribution Guidelines

This is a template designed to be used as a starting point for new projects. You can:

1. **Use as Template** - Click "Use this template" to create a new repository
2. **Fork** the repository for your own project
3. **Contribute** - Any PR is welcome to improve the template

If contributing:
1. **Fork** the repository
2. **Create** a feature branch (`git checkout -b feature/amazing-feature`)
3. **Commit** your changes (`git commit -m 'feat: add amazing feature'`)
4. **Push** to the branch (`git push origin feature/amazing-feature`)
5. **Open** a Pull Request

### Code Standards

- Use **TypeScript** for all code
- Follow configured **ESLint** and **Prettier**
- Write **tests** for new features
- Document **APIs** and complex functions

### Commit Structure

```
feat: new feature
fix: bug fix
docs: documentation
style: code formatting
refactor: refactoring
test: tests
chore: maintenance tasks
```

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🚀 Roadmap & Ideas for Improvement

This template is designed to be a living project and welcomes suggestions and contributions for new features and improvements. Here are some ideas and known areas for future enhancement:

- [ ] **Integrated ZK Parameter Management:**  
  Instead of requiring a manual script, the ZK parameters could be downloaded automatically as part of the Docker image or build process.  
  The infrastructure could check for missing parameters and fetch them on demand.

- [x] **Better Developer Onboarding:**  
  Add interactive setup scripts or a CLI wizard for first-time setup.  
  Provide more example contracts, API endpoints, and UI components.

- [x] **Automated Environment Checks:**  
  Add pre-build checks for required tools, environment variables, and folder structure.

- [ ] **Improved Error Handling:**  
  More descriptive error messages and troubleshooting guides for common issues.

- [ ] **Template Customization Tools:**  
  Scripts to easily rename the template, update package names, and clean up example files.

- [ ] **CI/CD Integration:**  
  Add GitHub Actions or other CI pipelines for automated testing, linting, and deployment.

- [ ] **Documentation Enhancements:**  
  More diagrams, architecture overviews, and real-world usage examples.

- [x] **Community Feedback:**  
  Encourage users to open issues or discussions for feature requests and pain points.

- [ ] **Unified CLI/Library for Project Management:**  
  Create a library or CLI tool to automate all setup, configuration, and project management from a single command (e.g., midnight-quick-starter init).

- [x] **Basic Hello World Contract Validation:**  
  Add a minimal contract and test that simply sets and reads a "Hello World" message to validate that the toolchain and build are working correctly.

- [ ] **Lace Beta Wallet Integration:**  
  Add support and documentation for integrating with Lace Beta Wallet for user authentication and transaction signing in the UI.

> **Have an idea?** Open an issue or pull request to help make this template even better!

---

## 🆘 Support

If you have issues or questions:

1. Check the [documentation](docs/)
2. Search [existing issues](../../issues)
3. Create a [new issue](../../issues/new)

## 🔗 Useful Links

- [Midnight Network Documentation](https://docs.midnight.network/)
- [Compact Language Guide](https://docs.midnight.network/develop/reference/compact/)
- [Turbo Documentation](https://turbo.build/repo/docs)
- [React Documentation](https://react.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/docs/)

---

**⭐ If this template is useful to you, consider giving the repository a star!**

---

**Made with ❤️ by the Midnight ecosystem**
