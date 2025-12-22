const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4000;

const server = http.createServer((req, res) => {
    const filePath = path.join(__dirname, 'index.html');
    
    fs.readFile(filePath, (err, content) => {
        if (err) {
            res.writeHead(500);
            res.end('Error loading page');
            return;
        }
        
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(content);
    });
});

server.listen(PORT, () => {
    console.log(`🌐 Test app running at http://localhost:${PORT}`);
    console.log(`📝 Test credentials:`);
    console.log(`   Email: demo@testdriver.ai`);
    console.log(`   Password: TestPass123!`);
});
