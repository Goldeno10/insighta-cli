# Insighta Labs+ CLI Tool 🛡️

A globally installable Command Line Interface for the Insighta Labs+ Demographic Intelligence System. This tool provides secure, terminal-based access to demographic data with integrated session management.

## 🌟 Features

- **OAuth 2.0 with PKCE** – Secure authentication flow without exposing credentials [TRD].
- **Automated Handshake** – Spins up a background server on port `4800` to automatically catch tokens from the browser [TRD].
- **Session Management** – Stores credentials securely at `~/.insighta/credentials.json` [TRD].
- **Token Handling** – Enforces small authorization windows to prevent session hijacking [TRD].
- **Interactive Outputs** – Renders raw data cleanly in structured CLI tables.

## 🛠️ Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Core Library**: [Commander.js](https://github.com/tj/commander.js/)
- **Network Requests**: Axios
- **Auth Logic**: `pkce-challenge`
- **Output Styling**: Chalk

## 🚀 Installation

Install the CLI tool globally using npm [TRD]:

```bash
# 1. Clone the repository
git clone https://github.com
cd insighta-cli

# 2. Install dependencies
npm install

# 3. Build the TypeScript files
npm run build

# 4. Grant execution permission (Linux/macOS)
chmod +x ./dist/index.js

# 5. Link globally
npm link
```

## 📖 Usage Guide

### 1. Authentication

Initiate the secure PKCE GitHub login flow:

```bash
insighta login
```

Your terminal will open the browser. Once authorized, the CLI will automatically capture the tokens on port `4800` and save them locally [TRD].

### 2. View Profiles

Fetch paginated demographic data from the database:

```bash
# Default (Page 1)
insighta profiles

# Fetch a specific page
insighta profiles --page 2
```

### 3. Clear Session

Wipe your credentials from the computer:

```bash
insighta logout
```

## 🔐 Token Handling & File Structure

The CLI securely maintains state in your system’s root directory:

- **Location**: `~/.insighta/credentials.json` [TRD]
- **Access Token Lifetime**: 3 minutes [TRD]
- **Refresh Token Lifetime**: 5 minutes [TRD]

If you encounter an `Invalid or expired token` error, simply run `insighta login` again to establish a brand‑new secure session [TRD].

## 📄 License

MIT
```