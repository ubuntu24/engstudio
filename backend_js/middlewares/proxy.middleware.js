const http = require('http');
const { verifyToken } = require('../utils/auth');

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5001';

function proxyToAIService(req, res, targetPath) {
  const url = new URL(targetPath || req.originalUrl, AI_SERVICE_URL);
  const token = req.cookies && req.cookies.auth_token;
  const userId = verifyToken(token);
  
  const headers = { ...req.headers, host: `${url.hostname}:${url.port}` };
  if (userId) {
    headers['x-user-id'] = userId.toString();
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
