#!/usr/bin/env node
/// <reference types="node" />
import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import * as fs from 'fs';
import http from 'http';
import open from 'open';
import * as os from 'os';
import * as path from 'path';
import pkceChallenge from 'pkce-challenge';

const program = new Command();
const CONFIG_PATH = path.join(os.homedir(), '.insighta', 'credentials.json');
const BACKEND_URL = "https://vercel.app";
const LOCAL_PORT = 4800;

program.command('login').action(async () => {
  const { code_challenge, code_verifier } = await pkceChallenge();
  
  // 1. Start a local server to "catch" the token
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url!, `http://localhost:${LOCAL_PORT}`);
    const code = url.searchParams.get('code');

    if (code) {
      try {
        // 2. Exchange code + verifier for JWTs
        const response = await axios.post(`${BACKEND_URL}/api/auth/token`, {
          code,
          code_verifier,
          grant_type: 'authorization_code'
        });

        // 3. Save to ~/.insighta/credentials.json
        const dir = path.dirname(CONFIG_PATH);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify(response.data, null, 2));

        res.end("Login successful! You can close this tab and return to the terminal.");
        console.log(chalk.green('\n✅ Successfully logged in and saved credentials!'));
        process.exit(0);
      } catch (err) {
        res.end("Login failed. Check terminal for details.");
        console.error(chalk.red('Token exchange failed'));
        process.exit(1);
      }
    }
  }).listen(LOCAL_PORT);

  // 4. Open browser
  const authUrl = `${BACKEND_URL}/api/auth/github?code_challenge=${code_challenge}&redirect_uri=http://localhost:${LOCAL_PORT}`;
  console.log(chalk.blue(`Opening browser at: ${authUrl}`));
  await open(authUrl);
});

program.parse();
