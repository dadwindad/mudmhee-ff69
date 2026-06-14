const http = require('http');
const fs = require('fs');
const path = require('path');

// อ่านไฟล์ .env ขึ้นมาเพื่อจำลองสภาพแวดล้อมเหมือน Next.js 
let envBasePath = '';
try {
    const envFile = fs.readFileSync(path.join(__dirname, '.env'), 'utf8');
    const match = envFile.match(/NEXT_PUBLIC_BASE_PATH=['"]?([^'"]+)['"]?/);
    if (match) envBasePath = match[1];
} catch (e) {
    console.log('No .env file found or cannot read it.');
}

// ใช้ค่าจาก Environment Variable (ถ้ามีเซ็ตไว้จากนอกสคริปต์) 
// หรือใช้จากบรรทัดที่ดึงมาจาก .env ได้เลย หรือ default เป็น ''
const basePath = process.env.NEXT_PUBLIC_BASE_PATH || envBasePath || '';

console.log(`👉 Using basePath from .env: "${basePath}"`);
console.log(`👉 Making request to path: "${basePath}/api/gallery"`);

const data = JSON.stringify({ test: "data testing 123" });

// ฟังก์ชันสำหรับยิงเทส API
function testApi(port) {
    console.log(`\n--- Testing POST ${basePath}/api/gallery on port ${port} ---`);
    const options = {
        hostname: 'localhost',
        port: port,
        path: `${basePath}/api/gallery`,
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(data)
        }
    };

    const req = http.request(options, (res) => {
        console.log(`[Port ${port}] STATUS: ${res.statusCode}`);
        let responseData = '';
        res.on('data', (chunk) => { responseData += chunk; });
        res.on('end', () => {
            console.log(`[Port ${port}] BODY: ${responseData}`);
        });
    });

    req.on('error', (e) => {
        console.error(`[Port ${port}] Connection failed: ${e.message} (Is the server running on this port?)`);
    });

    req.write(data);
    req.end();
}

// เทสทั้ง 2 พอร์ท:
// 3000 สำหรับการรัน npm run dev ปกติ
// 3901 สำหรับการรันผ่าน docker-compose
testApi(3000);
testApi(3901);
