# Insighta Labs+ CLI 🛡️

A globally installable Command Line Interface for the Insighta Labs+ Demographic Intelligence System. This tool provides secure, role-based access to demographic data directly from your terminal.

## 🌟 Features

- **OAuth 2.0 with PKCE** – Secure authentication flow without exposing credentials.
- **Session Management** – Automatic token handling with support for short-lived access tokens.
- **Global Availability** – Install once and use anywhere in your system.
- **Local Persistence** – Securely stores credentials at `~/.insighta/credentials.json`.
- **Role Enforcement** – Intelligent handling of Analyst and Admin permissions.

## 🛠️ Tech Stack

- **Runtime:** Node.js (TypeScript)
- **Framework:** [Commander.js](https://github.com/tj/commander.js/)
- **Auth Logic:** PKCE (Proof Key for Code Exchange)
- **Styling:** Chalk & Cli-table3
- **Network:** Axios

## 🚀 Installation

Install the CLI tool globally using npm:

```bash
# Clone the repository
git clone https://github.com
cd insighta-cli

# Install and build
npm install
npm run build

# Link globally
npm link
```

## 📖 Usage Guide

### 1. Authentication

To access protected endpoints, you must first authenticate via GitHub. This command initiates the PKCE flow and opens your default browser.

```bash
insighta login
```

The CLI will start a local loopback server to capture your tokens and save them to `~/.insighta/credentials.json`.

### 2. List Profiles

Retrieve a paginated list of demographic profiles.

```bash
# Default (Page 1)
insighta profiles

# Specify Page
insighta profiles --page 2
```

### 3. Profile Statistics (Analyst/Admin)

View a summary of current intelligence data.

```bash
insighta stats
```

## 🔐 Token Handling & Security

- **PKCE Implementation:** The CLI generates a `code_verifier` and `code_challenge` locally. The verifier never leaves your machine until the final token exchange.
- **Token Storage:** Credentials are stored in the user's home directory (`~/.insighta/`).
- **Expiry:** The CLI detects expired Access Tokens and uses the Refresh Token to seamlessly maintain your session (until the 5-minute refresh window closes).


```bash
# Build, link and run the cli
npm run build
npm link
insighta --version
```

## ⚠️ Limitations

- **Search Complexity:** Currently supports keyword-based natural language queries but lacks support for complex nested logical operators (e.g., AND/OR).
- **Environment:** Requires a GUI/Browser for the initial OAuth handshake.

## 📄 License

MIT

---