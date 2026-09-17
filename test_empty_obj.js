const http = require('http');
const req = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/api/webhook/bidv',
  method: 'POST',
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded'
  }
}, (res) => {
  let data = '';
  res.on('data', d => data += d);
  res.on('end', () => console.log('urlencoded empty:', res.statusCode, data));
});
req.write('{"text":"hello"}');
req.end();
