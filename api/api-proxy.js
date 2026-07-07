import https from 'https';
import http from 'http';

export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS');
  res.setHeader(
  'Access-Control-Allow-Headers',
  'Authorization, Content-Type, Depth, x-target-url'
);

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  const targetBase = Array.isArray(req.headers['x-target-url'])
  ? req.headers['x-target-url'][0]
  : req.headers['x-target-url'];

  if (!targetBase) {
    res.status(400).send('Missing x-target-url header');
    return;
  }

  const proxyPrefix = '/api/api-proxy';

  let suffix = req.url.replace(proxyPrefix, '');

  const base = targetBase.endsWith('/')
    ? targetBase.slice(0, -1)
    : targetBase;

  const url = new URL(base + suffix);

  const client = url.protocol === 'https:' ? https : http;

  const headers = { ...req.headers };

  delete headers.host;
  delete headers.origin;
  delete headers.referer;
  delete headers.connection;
  delete headers['x-target-url'];

  const proxyReq = client.request(
    {
      hostname: url.hostname,
      port: url.port || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method: req.method,
      headers,
    },
    (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 500, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
      proxyRes.on('error', (err) => {
        console.error(err);

        if (!res.headersSent) {
          res.status(500).end();
        }
      });
    }
  );

  proxyReq.on('error', (err) => {
    res.status(500).send(err.message);
  });

  const chunks = [];

for await (const chunk of req) {
  chunks.push(chunk);
}

const body = Buffer.concat(chunks);

if (body.length > 0) {
  proxyReq.write(body);
}

proxyReq.end();
}