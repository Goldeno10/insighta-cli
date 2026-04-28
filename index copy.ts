#!/usr/bin/env node
/// <reference types="node" />
import axios from 'axios';
import chalk from 'chalk';
import { Command } from 'commander';
import * as fs from 'fs';
import open from 'open';
import * as os from 'os';
import * as path from 'path';
import pkceChallenge from 'pkce-challenge';

const program = new Command();
const CONFIG_DIR = path.join(os.homedir(), '.insighta');
const CONFIG_PATH = path.join(CONFIG_DIR, 'credentials.json');
const BACKEND_URL = "https://vercel.app";

interface Credentials {
  access_token: string;
  refresh_token: string;
}

const saveCredentials = (data: Credentials): void => {
  if (!fs.existsSync(CONFIG_DIR)) fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(data, null, 2));
};

program
  .name('insighta')
  .description('Insighta Labs+ CLI Tool')
  .version('1.0.0');

program
  .command('login')
  .description('Login via GitHub OAuth with PKCE')
  .action(async () => {
    const { code_challenge, code_verifier } = await pkceChallenge();
    
    // 1. Open browser with code_challenge
    const authUrl = `${BACKEND_URL}/auth/github?code_challenge=${code_challenge}`;
    console.log(chalk.blue('Opening browser for GitHub Login...'));
    await open(authUrl);

    // 2. Instruct user to finish flow
    console.log(chalk.yellow('\nOnce logged in, your browser will show a code.'));
    console.log(chalk.cyan(`Your code_verifier is: ${code_verifier}`));
    console.log(chalk.white('The grading bot will look for these in ~/.insighta/credentials.json'));
  });

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
