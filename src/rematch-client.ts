import puppeteer from 'puppeteer';
import * as crypto from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import axios from 'axios';

const CACHE_FILE = path.join(__dirname, '../.secret-cache.json');
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

export default class RematchClient {
  private secret: string | null = null;

  constructor() {
    this.loadCache();
  }

  private loadCache(): boolean {
    try {
      if (fs.existsSync(CACHE_FILE)) {
        const cache = JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8'));
        const age = Date.now() - cache.timestamp;

        if (age < CACHE_DURATION) {
          this.secret = cache.secret;
          console.log('✓ Using cached secret (age: ' + Math.round(age / 1000 / 60) + ' minutes)');
          return true;
        } else {
          console.log('✗ Cached secret expired');
        }
      }
    } catch (error: any) {
      console.log('✗ Error loading cache:', error.message);
    }
    return false;
  }

  private saveCache(secret: string): void {
    try {
      fs.writeFileSync(CACHE_FILE, JSON.stringify({
        secret,
        timestamp: Date.now()
      }));
      console.log('✓ Secret cached');
    } catch (error: any) {
      console.log('✗ Error saving cache:', error.message);
    }
  }

  private async extractSecret(): Promise<string> {
    console.log('Extracting secret with Puppeteer...');

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });

    const page = await browser.newPage();

    await page.evaluateOnNewDocument(() => {
      const originalImportKey = crypto.subtle.importKey.bind(crypto.subtle);
      crypto.subtle.importKey = async function(format: any, keyData: any, algorithm: any, extractable: any, keyUsages: any) {
        if (format === 'raw' && algorithm.name === 'HMAC') {
          const decoder = new TextDecoder();
          (window as any).__capturedSecret = decoder.decode(keyData);
        }
        return originalImportKey(format, keyData, algorithm, extractable, keyUsages);
      };
    });

    await page.goto('https://www.rematchtracker.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60000
    });

    await page.waitForFunction(() => (window as any).api !== undefined, { timeout: 15000 });

    await page.evaluate(async () => {
      try {
        await (window as any).api.post('/scrap/resolve', { platform: 'steam', identifier: 'test' });
      } catch (e) {}
    });

    await new Promise(resolve => setTimeout(resolve, 1000));

    const secret = await page.evaluate(() => (window as any).__capturedSecret);
    await browser.close();

    if (!secret) {
      throw new Error('Failed to extract secret');
    }

    this.secret = secret;
    this.saveCache(secret);
    console.log('✓ Secret extracted');

    return secret;
  }

  private async ensureSecret(): Promise<string> {
    if (!this.secret) {
      await this.extractSecret();
    }
    return this.secret!;
  }

  private generateSignature(method: string, path: string, body: any, timestamp: number, nonce: string): string {
    const bodyStr = method !== 'GET' ? JSON.stringify(body) : '';
    const signatureBase = `${method}|${path}|${bodyStr}|${timestamp}|${nonce}`;

    const hmac = crypto.createHmac('sha256', this.secret!);
    hmac.update(signatureBase);
    return hmac.digest('hex');
  }

  private generateNonce(): string {
    return crypto.randomUUID();
  }

  private async request(method: string, endpoint: string, body: any = null): Promise<any> {
    await this.ensureSecret();

    const timestamp = Date.now();
    const nonce = this.generateNonce();
    const path = endpoint.startsWith('/') ? endpoint : '/' + endpoint;
    const signature = this.generateSignature(method, path, body, timestamp, nonce);

    const headers = {
      'Content-Type': 'application/json',
      'x-timestamp': timestamp.toString(),
      'x-nonce': nonce,
      'x-signature': signature
    };

    const url = `https://api.rematchtracker.com${path}`;

    try {
      let response;
      if (method === 'GET') {
        response = await axios.get(url, { headers });
      } else if (method === 'POST') {
        response = await axios.post(url, body, { headers });
      } else if (method === 'PUT') {
        response = await axios.put(url, body, { headers });
      } else if (method === 'DELETE') {
        response = await axios.delete(url, { headers });
      }

      return response?.data;
    } catch (error: any) {
      if (error.response?.status === 401 || error.response?.data?.error === 'Unauthorized') {
        console.log('✗ Unauthorized - secret may have changed, re-extracting...');
        this.secret = null;
        if (fs.existsSync(CACHE_FILE)) {
          fs.unlinkSync(CACHE_FILE);
        }

        await this.ensureSecret();
        const newSignature = this.generateSignature(method, path, body, timestamp, nonce);
        headers['x-signature'] = newSignature;

        let response;
        if (method === 'GET') {
          response = await axios.get(url, { headers });
        } else if (method === 'POST') {
          response = await axios.post(url, body, { headers });
        }
        return response?.data;
      }

      throw error;
    }
  }

  async post(endpoint: string, body: any): Promise<any> {
    return this.request('POST', endpoint, body);
  }

  async get(endpoint: string): Promise<any> {
    return this.request('GET', endpoint);
  }

  async put(endpoint: string, body: any): Promise<any> {
    return this.request('PUT', endpoint, body);
  }

  async delete(endpoint: string): Promise<any> {
    return this.request('DELETE', endpoint);
  }
}
