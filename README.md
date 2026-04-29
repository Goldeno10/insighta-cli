# Insighta Labs+ CLI Tool 🛡️

A globally installable Command Line Interface for the Insighta Labs+ Demographic Intelligence System. This tool provides secure, terminal-based access to demographic data with integrated session management [3️⃣ CLI Application].

---

## 🌟 Features

- **OAuth 2.0 with PKCE** – Secure authentication flow without exposing credentials [3️⃣ CLI Application].
- **Automated Handshake** – Spins up a background server on port `4800` to automatically catch tokens from the browser [3️⃣ CLI Application].
- **Session Management** – Stores credentials securely at `~/.insighta/credentials.json` [3️⃣ CLI Application].
- **Token Handling** – Enforces small authorization windows to prevent session hijacking [3️⃣ CLI Application].
- **Interactive Outputs** – Renders raw data cleanly in structured CLI tables with a loader state while fetching [3️⃣ CLI Application].
- **Active Directory File Savings** – Saves your bulk CSV exports straight to your current working directory [3️⃣ CLI Application].

---

## 🛠️ Tech Stack

- **Runtime**: Node.js (TypeScript)
- **Core Library**: [Commander.js](https://github.com/tj/commander.js/)
- **Network Requests**: Axios
- **Auth Logic**: `pkce-challenge`
- **Output Styling**: Chalk

---

## 🚀 Installation

Install the CLI tool globally using npm [3️⃣ CLI Application]:

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

---

## 📖 Usage Guide

### 1. Authentication

```bash
# Initiate GitHub PKCE flow
insighta login

# View active terminal identity
insighta whoami

# Wipe local session data and logout
insighta logout
```

Your terminal will open the browser. Once authorized, the CLI will automatically seize the tokens on port `4800` and save them locally [3️⃣ CLI Application].

### 2. View Profiles

Fetch paginated demographic data from the database [3️⃣ CLI Application].

```bash
# List profiles with default pagination
insighta profiles list

# Apply query chains
insighta profiles list --gender male --country NG
insighta profiles list --min-age 25 --max-age 40

# Custom sorting
insighta profiles list --sort-by age --order desc
```

### 3. Record Management

```bash
# Get a single profile
insighta profiles get <id>

# Run plain english queries
insighta profiles search "young males from nigeria"

# Append a record to the dataset (Admin only)
insighta profiles create --name "Harriet Tubman"
```

### 4. File Extractions

```bash
# Bulk download in CSV format
insighta profiles export --format csv

# Download filtered chains
insighta profiles export --format csv --gender male --country NG
```

---

## 🔐 Token Handling & File Structure

The CLI securely maintains state in your system’s root directory:

- **Location**: `~/.insighta/credentials.json` [3️⃣ CLI Application]
- **Access Token Lifetime**: 3 minutes
- **Refresh Token Lifetime**: 5 minutes

If you encounter an `Invalid or expired token` error, simply run `insighta login` again to establish a brand‑new secure session [3️⃣ CLI Application].

---

## 📄 License

MIT
