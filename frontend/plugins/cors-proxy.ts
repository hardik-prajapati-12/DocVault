/**
 * Vite Plugin: CORS Proxy for WebDAV
 *
 * This plugin adds a server middleware at `/api-proxy/` that forwards
 * requests to any external URL. The full target URL is passed via
 * the `x-target-url` request header.
 *
 * This solves CORS issues when connecting to WebDAV providers (like Koofr,
 * pCloud, Nextcloud) directly from the browser, since those providers
 * do not set Access-Control-Allow-Origin headers.
 */
import type { Plugin } from 'vite';
import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import fs from 'fs';
import path from 'path';

export function corsProxyPlugin(): Plugin {
  return {
    name: 'cors-proxy',
    configureServer(server) {
      server.middlewares.use('/api/write-icons', (req, res) => {
        if (req.method === 'POST') {
          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });
          req.on('end', () => {
            try {
              const data = JSON.parse(body);
              
              if (data.png192) {
                fs.writeFileSync(path.join(process.cwd(), 'public/pwa-192x192.png'), Buffer.from(data.png192, 'base64'));
              }
              if (data.png512) {
                fs.writeFileSync(path.join(process.cwd(), 'public/pwa-512x512.png'), Buffer.from(data.png512, 'base64'));
              }
              if (data.png180) {
                fs.writeFileSync(path.join(process.cwd(), 'public/apple-touch-icon.png'), Buffer.from(data.png180, 'base64'));
              }
              
              res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' });
              res.end(JSON.stringify({ success: true }));
            } catch (err: any) {
              res.writeHead(500, { 'Content-Type': 'text/plain', 'Access-Control-Allow-Origin': '*' });
              res.end(`Error writing icons: ${err.message}`);
            }
          });
          return;
        }
        res.writeHead(405);
        res.end();
      });

      server.middlewares.use('/api/api-proxy', (req, res) => {
        const targetBase = req.headers['x-target-url'] as string | undefined;
        if (!targetBase) {
          res.writeHead(400, { 'Content-Type': 'text/plain' });
          res.end('Missing x-target-url header');
          return;
        }

        // Build the full target URL:
        // targetBase is the WebDAV root (e.g. https://app.koofr.net/dav/Koofr/)
        // req.url is the remaining path after /api-proxy (e.g. / or /DocVault/file.pdf)
        const suffix = req.url && req.url !== '/' ? req.url : '';
        // Ensure no double slashes when concatenating
        const base = targetBase.endsWith('/') ? targetBase.slice(0, -1) : targetBase;
        const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
        const fullUrl = new URL(`${base}${cleanSuffix}`);

        const isHttps = fullUrl.protocol === 'https:';
        const makeRequest = isHttps ? httpsRequest : httpRequest;

        // Copy relevant headers, stripping our custom ones
        const forwardHeaders: Record<string, string> = {};
        for (const [key, value] of Object.entries(req.headers)) {
          if (
            key === 'x-target-url' ||
            key === 'host' ||
            key === 'origin' ||
            key === 'referer' ||
            key === 'connection'
          ) continue;
          if (typeof value === 'string') {
            forwardHeaders[key] = value;
          }
        }
        forwardHeaders['host'] = fullUrl.host;

        const proxyReq = makeRequest(
          {
            hostname: fullUrl.hostname,
            port: fullUrl.port || (isHttps ? 443 : 80),
            path: fullUrl.pathname + fullUrl.search,
            method: req.method || 'GET',
            headers: forwardHeaders,
            rejectUnauthorized: false,
          },
          (proxyRes) => {
            // Set CORS headers on the response back to the browser
            res.setHeader('Access-Control-Allow-Origin', '*');
            res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PROPFIND,MKCOL,OPTIONS');
            res.setHeader('Access-Control-Allow-Headers', '*');

            // Forward the status and headers from the upstream server
            res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
            proxyRes.pipe(res, { end: true });
          }
        );

        proxyReq.on('error', (err) => {
          console.error('[cors-proxy] Upstream error:', err.message);
          if (!res.headersSent) {
            res.writeHead(502, { 'Content-Type': 'text/plain' });
          }
          res.end(`Proxy error: ${err.message}`);
        });

        // Handle OPTIONS preflight quickly
        if (req.method === 'OPTIONS') {
          res.setHeader('Access-Control-Allow-Origin', '*');
          res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,DELETE,PROPFIND,MKCOL,OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', '*');
          res.writeHead(204);
          res.end();
          return;
        }

        // Pipe the incoming request body to the proxy request
        req.pipe(proxyReq, { end: true });
      });
    },
  };
}
