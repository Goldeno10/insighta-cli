#!/usr/bin/env node
import axios, { type AxiosResponse } from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import fs from 'fs';
import http from 'http';
import open from 'open';
import os from 'os';
import path from 'path';
import pkceChallenge from 'pkce-challenge';

const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), '.insighta');
const CONFIG_PATH = path.join(CONFIG_DIR, 'credentials.json');

// ⚠️ Ensure this is your live Vercel URL
const BACKEND_URL = "https://hng-14-internship.vercel.app/" // "http://localhost:3000";
const LOCAL_PORT = 4800;

interface Credentials {
  access_token: string;
  refresh_token: string;
}

program
  .name('insighta')
  .description('Insighta Labs+ CLI Tool')
  .version('1.0.0');

// Helper to auto-refresh token if expired
async function getValidToken() {
  if (!fs.existsSync(CONFIG_PATH)) throw new Error('Please login first using "insighta login"');
  const creds: Credentials = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
  return creds.access_token;
}

// ---------------- AUTH COMMANDS ----------------

program
  .command('login')
  .description('Login via GitHub OAuth with PKCE')
  .action(async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();
    interface TokenRequest {
      code: string;
      code_verifier: string;
    }
    const server = http.createServer(async (req: http.IncomingMessage, res: http.ServerResponse) => {
      const url = new URL(req.url!, `http://localhost:${LOCAL_PORT}`);
      const code = url.searchParams.get('code');
      if (code) {
        try {
          const response: AxiosResponse<Credentials> = await axios.post<Credentials>(`${BACKEND_URL}/api/auth/token`, { code: code!, code_verifier });
          if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(response.data, null, 2));
          res.end("Login successful! You can close this tab and return to the terminal.");
          console.log(chalk.green('\n✅ Successfully logged in and saved credentials!'));
          server.close();
          process.exit(0);
        } catch (err) {
          res.end("Login failed.");
          process.exit(1);
        }
      }
    }).listen(LOCAL_PORT);
    const authUrl = `${BACKEND_URL}/auth/github?code_challenge=${code_challenge}`;
    console.log(chalk.blue('Opening browser for GitHub Login...'));
    await open(authUrl);
  });

program
  .command('logout')
  .description('Logout and clear credentials')
  .action(async () => {
    try {
      const token = await getValidToken();
      await axios.post(`${BACKEND_URL}/api/auth/logout`, {}, { headers: { 'Authorization': `Bearer ${token}` } });
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
      console.table([res.data.data]);
    } catch (err: any) { console.log(chalk.red('Profile not found')); }
  });

profiles
  .command('search <query>')
  .description('Search profiles using natural language')
  .action(async (query) => {
    try {
      const token = await getValidToken();
      const res = await axios.get(`${BACKEND_URL}/api/profiles/search?q=${encodeURIComponent(query)}`, {
        headers: { 'X-API-Version': '1', 'Authorization': `Bearer ${token}` }
      });
      console.table(res.data.data);
    } catch (err: any) { console.log(chalk.red('Search failed')); }
  });

profiles
  .command('create')
  .description('Create a new profile')
  .option('--name <name>', 'Full name')
  .action(async (options) => {
    try {
      const token = await getValidToken();
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
