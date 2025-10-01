# Technical Context: Shelly CLI Assistant

**Technology Stack:**

*   **Programming Language:** JavaScript (with TypeScript)
*   **AI/ML Library:** `@juspay/neurolink`
*   **Interactive CLI:** `inquirer`
*   **Pseudo-Terminal Interaction:** `node-pty`
*   **Process Management:** `ps-tree`
*   **Linting:** `eslint`
*   **Formatting:** `prettier`
*   **Git Hooks:** `husky`, `lint-staged`
*   **Automated Release:** `semantic-release`
*   **Testing:** Node.js built-in test runner

**Dependencies:**

*   `@juspay/neurolink`: AI/machine learning capabilities
*   `inquirer`: Interactive command-line interfaces
*   `node-pty`: Spawning and interacting with pseudo-terminals
*   `ps-tree`: Process management

**Development Setup:**

1.  Clone the repository: `git clone [your-repo-url]`
2.  Navigate to the project directory: `cd shelly-cli`
3.  Install dependencies: `npm install`
4.  Configure environment variables (if necessary): `cp .env.example .env`
5.  Start the development server: `npm run dev`

**Build Processes:**

*   The `build` script uses `tsc` (TypeScript compiler) to compile the TypeScript code into JavaScript.
*   `semantic-release` automates the versioning and release management process.
*   `npm run build`