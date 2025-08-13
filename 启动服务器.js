#!/usr/bin/env node
/**
 * 百宝箱工具本地服务器启动脚本 (Node.js版本)
 * 运行方法: node 启动服务器.js
 * 或者: npm install -g http-server && http-server -p 8000 --cors
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

// 设置端口
let PORT = 8000;

// MIME类型映射
const mimeTypes = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css',
    '.js': 'application/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.svg': 'image/svg+xml'
};

// 检查端口是否被占用
function isPortInUse(port) {
    return new Promise((resolve) => {
        const server = http.createServer();
        server.listen(port, () => {
            server.close(() => resolve(false));
        });
        server.on('error', () => resolve(true));
    });
}

// 寻找可用端口
async function findAvailablePort() {
    while (await isPortInUse(PORT) && PORT < 8010) {
        PORT++;
    }
    if (PORT >= 8010) {
        console.log("❌ 端口8000-8009都被占用，请手动关闭其他服务后重试");
        process.exit(1);
    }
    return PORT;
}

// 打开浏览器
function openBrowser() {
    const url = `http://localhost:${PORT}`;
    const platform = process.platform;
    
    let command;
    if (platform === 'darwin') {
        command = `open ${url}`;
    } else if (platform === 'win32') {
        command = `start ${url}`;
    } else {
        command = `xdg-open ${url}`;
    }
    
    setTimeout(() => {
        exec(command, (error) => {
            if (error) {
                console.log(`请手动在浏览器中访问: ${url}`);
            }
        });
    }, 1000);
}

// 创建服务器
async function createServer() {
    const port = await findAvailablePort();
    
    const server = http.createServer((req, res) => {
        // 设置CORS头部
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
        
        // 处理OPTIONS请求
        if (req.method === 'OPTIONS') {
            res.writeHead(200);
            res.end();
            return;
        }
        
        // 获取请求路径
        let filePath = req.url === '/' ? '/index.html' : req.url;
        filePath = path.join(__dirname, filePath);
        
        // 获取文件扩展名
        const ext = path.extname(filePath);
        const contentType = mimeTypes[ext] || 'text/plain';
        
        // 检查文件是否存在
        fs.access(filePath, fs.constants.F_OK, (err) => {
            if (err) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end('404 - 文件未找到');
                return;
            }
            
            // 读取并返回文件
            fs.readFile(filePath, (err, data) => {
                if (err) {
                    res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
                    res.end('500 - 服务器内部错误');
                    return;
                }
                
                res.writeHead(200, { 'Content-Type': contentType });
                res.end(data);
            });
        });
        
        // 日志记录
        console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    });
    
    server.listen(port, () => {
        console.log('='.repeat(50));
        console.log('🎉 百宝箱工具服务器启动成功!');
        console.log('='.repeat(50));
        console.log(`📱 本地访问地址: http://localhost:${port}`);
        console.log(`🌐 局域网访问地址: http://你的IP地址:${port}`);
        console.log('='.repeat(50));
        console.log('💡 使用说明:');
        console.log('   1. 浏览器会自动打开网站');
        console.log('   2. 现在可以使用所有功能（翻译、OCR等）');
        console.log('   3. 按 Ctrl+C 停止服务器');
        console.log('='.repeat(50));
        
        openBrowser();
    });
    
    // 优雅关闭
    process.on('SIGINT', () => {
        console.log('\n🔴 服务器已停止');
        console.log('感谢使用百宝箱工具!');
        server.close();
        process.exit(0);
    });
}

// 检查Node.js版本
if (process.version < 'v10.0.0') {
    console.log('❌ 需要Node.js 10.0.0或更高版本');
    process.exit(1);
}

// 启动服务器
createServer().catch(error => {
    console.error('❌ 启动服务器时出错:', error.message);
    console.log('\n可能的解决方案:');
    console.log('1. 检查是否安装了Node.js');
    console.log('2. 确保端口8000未被占用');
    console.log('3. 以管理员权限运行');
    process.exit(1);
}); 