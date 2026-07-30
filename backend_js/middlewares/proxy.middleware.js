const http = require('http');
const { verifyToken } = require('../utils/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

function proxyToAIService(req, res, targetPath) {
  const url = new URL(targetPath || req.originalUrl, AI_SERVICE_URL);
  const userId = req.userId;
  
  const headers = { ...req.headers, host: `${url.hostname}:${url.port}` };
  // SECURITY FIX (vuln-0004): Inject a shared secret so the Python backend
  // can verify that X-User-Id originates from the trusted Node.js proxy,
  // not from an untrusted external client.
  const internalSecret = process.env.INTERNAL_API_SECRET;
  if (userId) {
    headers['x-user-id'] = userId.toString();
    if (internalSecret) {
      headers['x-internal-secret'] = internalSecret;
    }
  }

  const options = {
    hostname: url.hostname,
    port: url.port,
    path: url.pathname + url.search,
    method: req.method,
    headers: headers,
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res, { end: true });
  });

  proxyReq.on('error', (err) => {
    console.error(`[backend_core] Proxy error to AI Service (${options.path}):`, err.message);
    res.status(503).json({ error: 'AI Service currently unavailable (Port 5001)' });
  });

  if (req.body && Object.keys(req.body).length > 0) {
    const bodyData = JSON.stringify(req.body);
    proxyReq.setHeader('Content-Type', 'application/json');
    proxyReq.setHeader('Content-Length', Buffer.byteLength(bodyData));
    proxyReq.write(bodyData);
  }
  proxyReq.end();
}

module.exports = {
  proxyToAIService
};
