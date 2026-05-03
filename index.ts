#!/usr/bin/env node
/// <reference types="node" />

import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import http from 'http';
import open from 'open';
import os from 'os';
import path from 'path';
import pkceChallenge from 'pkce-challenge';


const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), process.env.CONFIG_DIR_NAME || '.insighta');
const CONFIG_PATH = path.join(CONFIG_DIR, process.env.CONFIG_FILE_NAME || 'credentials.json');

// ⚠️ Ensure this is your live Vercel URL
const BACKEND_URL =  process.env.BACKEND_URL || 'http://localhost:3000';
const LOCAL_PORT = process.env.LOCAL_PORT || 4800;

interface Credentials {
  access_token: string;
  refresh_token: string;
  expires_in: number;
}

program
  .name('insighta')
  .description('Insighta Labs+ CLI Tool')
  .version('1.0.0');

// Helper to auto-refresh token if expired
async function getValidToken() {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error('Please login first using "insighta login"');
  const creds: Credentials = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  // BACKEND_URL/auth/refresh {refresh_token} -> new access token + refresh token + expires_in
  const now = Math.floor(Date.now() / 1000);
  if (creds.expires_in && creds.expires_in < now) {
    try {
      const res = await axios.post(`${BACKEND_URL}/auth/refresh`, { refresh_token: creds.refresh_token });
      const { access_token, refresh_token, expires_in } = res.data;
      fs.writeFileSync(CONFIG_PATH, JSON.stringify({ access_token, refresh_token, expires_in }, null, 2), { mode: 0o600 });
      return access_token;
    } catch (err) {
      fs.unlinkSync(CONFIG_PATH);
      throw new Error('Session expired. Please login again.');
    }
  }

  return creds.access_token;
}

// ---------------- AUTH COMMANDS ----------------
program
  .command('login')
  .description('Login via GitHub OAuth with PKCE')
  .action(async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();

    await new Promise<void>((resolve) => {
      let timeout: NodeJS.Timeout;

      const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
        const url = new URL(req.url!, `http://localhost:${LOCAL_PORT}`);

        if (!url.pathname.startsWith('/callback')) {
          res.writeHead(404); res.end(); return;
        }

        const access_token = url.searchParams.get('access_token');
        const refresh_token = url.searchParams.get('refresh_token');
        const expires_in = url.searchParams.get('expires_in');
        const error        = url.searchParams.get('error');

        // convert expires_in to timestamp
        const expires_in_ts = expires_in ? Math.floor(Date.now() / 1000) + parseInt(expires_in) : null;

        const done = (code: number) => {
          clearTimeout(timeout);
          server.close();
          resolve();
          process.exit(code);
        };

        if (error) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end(`Login failed: ${error}`);
          console.log(chalk.red(`\n❌ Login failed: ${error}`));
          return done(1);
        }

        if (!access_token) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('No token received.');
          console.log(chalk.red('\n❌ No token received.'));
          return done(1);
        }

        // Save credentials
        if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
        fs.writeFileSync(CONFIG_PATH, JSON.stringify({ access_token, refresh_token, expires_in: expires_in_ts }, null, 2), { mode: 0o600 });

        res.writeHead(200, { 'Content-Type': 'text/plain' });
        res.end('✅ Login successful! You can close this tab and return to the terminal.');
        console.log(chalk.green('\n✅ Successfully logged in!'));
        console.log(chalk.gray(`   Credentials saved to ${CONFIG_PATH}`));
        return done(0);
      });

      // Only open browser once port is actually bound
      server.listen(LOCAL_PORT, async () => {
        timeout = setTimeout(() => {
          console.log(chalk.yellow('\n⏱  Login timed out after 5 minutes.'));
          server.close();
          resolve();
          process.exit(1);
        }, 5 * 60 * 1000);

        const authParams = new URLSearchParams({
          code_challenge,
          code_challenge_method: 'S256',
          code_verifier,
          redirect: 'cli',
        });

        console.log(chalk.blue('🔐 Opening browser for GitHub login...'));
        console.log(chalk.gray(`   Listening on http://localhost:${LOCAL_PORT}/callback\n`));
        await open(`${BACKEND_URL}/auth/github?${authParams}`);
      });

      server.on('error', (err: NodeJS.ErrnoException) => {
        if (err.code === 'EADDRINUSE') {
          console.log(chalk.red(`\n❌ Port ${LOCAL_PORT} is already in use. Close the other process and try again.`));
        } else {
          console.log(chalk.red(`\n❌ Server error: ${err.message}`));
        }
        resolve();
        process.exit(1);
      });
    });
  });

program
  .command('logout')
  .description('Logout and clear credentials')
  .action(async () => {
    try {
      const token = await getValidToken();
      await axios.post(`${BACKEND_URL}/auth/logout`, {}, { headers: { 'Authorization': `Bearer ${token}` } });
    } catch {}
    if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
    console.log(chalk.green('Logged out successfully!'));
  });

program
  .command('whoami')
  .description('Display current user information')
  .action(async () => {
    try {
      const token = await getValidToken();
      const res = await axios.get(`${BACKEND_URL}/api/users/me`, { headers: { 'Authorization': `Bearer ${token}`, 'X-API-Version': '1' } });
      console.log(chalk.cyan(`Logged in as: ${res.data.data.username} (${res.data.data.role})`));
    } catch (err: any) {
      console.log(chalk.red(err.message));
    }
  });

// ---------------- PROFILES COMMANDS ----------------

const profiles = program.command('profiles').description('Manage profiles');

profiles
  .command('list')
  .description('List profiles with filters')
  .option('--gender <type>', 'Filter by gender')
  .option('--country <id>', 'Filter by country ISO code')
  .option('--age-group <group>', 'Filter by age group')
  .option('--min-age <age>', 'Min age filter')
  .option('--max-age <age>', 'Max age filter')
  .option('--sort-by <field>', 'Sort by field', 'created_at')
  .option('--order <dir>', 'Sort direction', 'desc')
  .option('--page <num>', 'Page number', '1')
  .option('--limit <num>', 'Limit per page', '10')
  .action(async (options) => {
    try {
      const token = await getValidToken();
      const params = new URLSearchParams(options);
      const res = await axios.get(`${BACKEND_URL}/api/profiles?${params.toString()}`, {
        headers: { 'X-API-Version': '1', 'Authorization': `Bearer ${token}` }
      });
      console.table(res.data.data);
    } catch (err: any) { console.log(chalk.red('Failed to fetch profiles')); }
  });

profiles
  .command('get <id>')
  .description('Get a single profile by ID')
  .action(async (id) => {
    try {
      const token = await getValidToken();
      const res = await axios.get(`${BACKEND_URL}/api/profiles/${id}`, {
        headers: { 'X-API-Version': '1', 'Authorization': `Bearer ${token}` }
      });
      
      console.table([res.data.data[0]]);
    } catch (err: any) { console.log(chalk.red('Profile not found')); }
  });

profiles
  .command('search <query>')
  .description('Search profiles using natural language')
  .action(async (query) => {
    try {
      const token = await getValidToken();
      const res = await axios.get(`https://hng-14-internship.vercel.app/api/profiles/search?q=${encodeURIComponent(query)}`, {
        headers: { 'X-API-Version': '1', 'Authorization': `Bearer ${token}` }
      });
      console.table(res.data.data);
    } catch (err: any) { console.log(chalk.red('Search failed'), err); }
  });

profiles
  .command('create')
  .description('Create a new profile')
  .option('--name <name>', 'Full name')
  .action(async (options) => {
    try {
      const token = await getValidToken();
      console.log(chalk.blue('Creating profile...', options.name));
      const res = await axios.post(`${BACKEND_URL}/api/profiles`, { name: options.name }, {
        headers: { 'X-API-Version': '1', 'Authorization': `Bearer ${token}` }
      });
      console.log(chalk.green('Profile created successfully!'));
      console.table([res.data.data]);
    } catch (err: any) { console.log(chalk.red('Forbidden or invalid payload')); }
  });

profiles
  .command('export')
  .description('Export profiles as CSV')
  .option('--format <format>', 'Export format (csv)', 'csv')
  .option('--gender <type>', 'Filter by gender')
  .option('--country <id>', 'Filter by country')
  .action(async (options) => {
    try {
      const token = await getValidToken();
      const params = new URLSearchParams(options);
      const res = await axios.get(`${BACKEND_URL}/api/profiles/export?${params.toString()}`, {
        headers: { 'X-API-Version': '1', 'Authorization': `Bearer ${token}` },
        responseType: 'text'
      });
      const filename = `profiles_${Date.now()}.csv`;
      fs.writeFileSync(path.join(process.cwd(), filename), res.data);
      console.log(chalk.green(`CSV exported successfully to current directory: ${filename}`));
    } catch (err: any) { console.log(chalk.red('Export failed')); }
  });

program.parse();
