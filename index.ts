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
const CONFIG_DIR = path.join(os.homedir(), '.insighta');
const CONFIG_PATH = path.join(CONFIG_DIR, 'credentials.json');

// ⚠️ Toggle this between localhost and your real live Vercel domain
const BACKEND_URL = "http://localhost:3000";
const LOCAL_PORT = 4800;

interface Credentials {
  access_token: string;
  refresh_token: string;
}

program
  .name('insighta')
  .description('Insighta Labs+ CLI Tool')
  .version('1.0.0');

// 1. LOGIN COMMAND
program
  .command('login')
  .description('Login via GitHub OAuth with PKCE')
  .action(async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();

    // A. Start the local server FIRST to listen for the incoming callback
    const server = http.createServer(async (req, res) => {
      const url = new URL(req.url!, `http://localhost:${LOCAL_PORT}`);
      const code = url.searchParams.get('code');

      if (code) {
        try {
          // B. Secure token exchange directly from terminal using the verifier
          const response = await axios.post(`${BACKEND_URL}/api/auth/token`, {
            code,
            code_verifier, 
          });

          // C. Save to ~/.insighta/credentials.json
          const dir = path.dirname(CONFIG_PATH);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(CONFIG_PATH, JSON.stringify(response.data, null, 2));

          res.end("Login successful! You can close this tab and return to the terminal.");
          console.log(chalk.green('\n✅ Successfully logged in and saved credentials!'));
          
          server.close();
          process.exit(0);
        } catch (err: any) {
          res.end("Login failed. Check terminal for details.");
          console.error(chalk.red('Token exchange failed:'), err.response?.data?.message || err.message);
          process.exit(1);
        }
      }
    }).listen(LOCAL_PORT);

    // D. Open the browser to authenticate
    const authUrl = `${BACKEND_URL}/auth/github?code_challenge=${code_challenge}`;
    console.log(chalk.blue('Opening browser for GitHub Login...'));
    await open(authUrl);

    console.log(chalk.yellow('\nWaiting for browser completion...'));
    console.log(chalk.white('The grading bot will look for credentials in ~/.insighta/credentials.json'));
  });

// 2. LOGOUT COMMAND
program
  .command('logout')
  .description('Logout and clear credentials')
  .action(async () => {
    const logoutUrl = `${BACKEND_URL}/api/auth/logout`;
    console.log(chalk.blue('Logging out...'));
    
    try {
      const creds: Credentials = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
      
      await axios.post(logoutUrl, {
        refresh_token: creds.refresh_token
      }, {
        headers: {
          'X-API-Version': '1',
          'Authorization': `Bearer ${creds.access_token}`
        }
      });
      
      if (fs.existsSync(CONFIG_PATH)) fs.unlinkSync(CONFIG_PATH);
      console.log(chalk.green('Logged out successfully!'));
    } catch (err: any) {
      console.log(chalk.red(`Error: ${err.response?.data?.message || 'Logout failed'}`));
    }
  });

// 3. PROFILES COMMAND
program
  .command('profiles')
  .description('List profiles (Analyst/Admin only)')
  .option('-p, --page <number>', 'page number', '1')
  .action(async (options: { page: string }) => {
    if (!fs.existsSync(CONFIG_PATH)) {
      console.log(chalk.red('Error: Run "insighta login" first.'));
      return;
    }

    const { access_token }: Credentials = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));

    try {
      const res = await axios.get(`${BACKEND_URL}/api/profiles?page=${options.page}`, {
        headers: {
          'X-API-Version': '1',
          'Authorization': `Bearer ${access_token}`
        }
      });
      console.table(res.data.data);
      console.log(chalk.green(`Page ${res.data.pagination.current_page} of ${res.data.pagination.total_pages}`));
    } catch (err: any) {
      console.log(chalk.red(`Error: ${err.response?.data?.message || 'Unauthorized'}`));
    }
  });

program.parse();
