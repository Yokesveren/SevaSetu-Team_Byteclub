const http = require('http');
let latestUplink = null;

const server = http.createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method === 'POST' && req.url === '/api/uplink') {
    let body = '';
    req.on('data', chunk => { body += chunk.toString(); });
    req.on('end', () => {
      try {
        latestUplink = JSON.parse(body);
        console.log('🟢 FIRST LOCAL UPLINK DETECTED FROM PHONE:', latestUplink);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true }));
      } catch (e) {
        res.writeHead(400);
        res.end('Invalid JSON');
      }
    });
  } else if (req.method === 'GET' && req.url === '/api/uplink') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(latestUplink || {}));
  } else {
    res.writeHead(404);
    res.end();
  }
});

server.listen(5000, '0.0.0.0', () => {
  console.log('🚀 Local Uplink Server listening on http://0.0.0.0:5000');
});

