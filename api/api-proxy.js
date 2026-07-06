const https = require('https');
const http = require('http');

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, PROPFIND, MKCOL, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  const targetBase = req.headers['x-target-url'];
  if (!targetBase) {
    res.writeHead(400, { 'Content-Type': 'text/plain' });
    res.end('Missing x-target-url header');
    return;
  }

  // Extract path suffix after /api/api-proxy
  const proxyPrefix = '/api/api-proxy';
  let suffix = '';
  if (req.url.startsWith(proxyPrefix)) {
    suffix = req.url.slice(proxyPrefix.length);
  } else {
    // Fallback if request rewritten
    const match = req.url.match(/^\/api\/api-proxy(.*)/);
    suffix = match ? match[1] : req.url.replace(/^\/[^/]+/, '');
  }

  const base = targetBase.endsWith('/') ? targetBase.slice(0, -1) : targetBase;
  const cleanSuffix = suffix.startsWith('/') ? suffix : `/${suffix}`;
  
  const fullUrl = new URL(`${base}${cleanSuffix}`);
  const isHttps = fullUrl.protocol === 'https:';
  const makeRequest = isHttps ? https.request : http.request;

  const forwardHeaders = {};
  for (const [key, value] of Object.entries(req.headers)) {
    if (
      key === 'x-target-url' ||
      key === 'host' ||
      key === 'origin' ||
      key === 'referer' ||
      key === 'connection'
    ) continue;
    forwardHeaders[key] = value;
  }
  forwardHeaders['host'] = fullUrl.host;

  const bodyData = [];
  req.on('data', (chunk) => {
    bodyData.push(chunk);
  });

  req.on('end', () => {
    const fullBody = Buffer.concat(bodyData);
    
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
        // Forward the response status and headers
        res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
        proxyRes.pipe(res, { end: true });
      }
    );

    proxyReq.on('error', (err) => {
      console.error('[vercel-proxy] Error:', err.message);
      if (!res.headersSent) {
        res.writeHead(502, { 'Content-Type': 'text/plain' });
      }
      res.end(`Proxy error: ${err.message}`);
    });

    if (fullBody.length > 0) {
      proxyReq.write(fullBody);
    }
    proxyReq.end();
  });
};
