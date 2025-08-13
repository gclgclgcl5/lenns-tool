#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
百宝箱工具本地服务器启动脚本
双击运行此文件，然后在浏览器中访问 http://localhost:8000
"""

import http.server
import socketserver
import webbrowser
import os
import sys
import threading
import time

def open_browser():
    """延迟打开浏览器"""
    time.sleep(1)
    webbrowser.open('http://localhost:8000')

def main():
    # 设置端口
    PORT = 8000
    
    # 切换到脚本所在目录
    os.chdir(os.path.dirname(os.path.abspath(__file__)))
    
    # 创建HTTP请求处理器
    class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
        def end_headers(self):
            # 添加CORS头部，允许跨域请求
            self.send_header('Access-Control-Allow-Origin', '*')
            self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
            self.send_header('Access-Control-Allow-Headers', 'Content-Type')
            super().end_headers()
        
        def log_message(self, format, *args):
            # 自定义日志格式
            print(f"[{self.address_string()}] {format % args}")
    
    # 检查端口是否被占用
    def is_port_in_use(port):
        import socket
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            return s.connect_ex(('localhost', port)) == 0
    
    # 寻找可用端口
    while is_port_in_use(PORT) and PORT < 8010:
        PORT += 1
    
    if PORT >= 8010:
        print("❌ 端口8000-8009都被占用，请手动关闭其他服务后重试")
        input("按回车键退出...")
        return
    
    try:
        # 创建服务器
        with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
            print("="*50)
            print("🎉 百宝箱工具服务器启动成功!")
            print("="*50)
            print(f"📱 本地访问地址: http://localhost:{PORT}")
            print(f"🌐 局域网访问地址: http://你的IP地址:{PORT}")
            print("="*50)
            print("💡 使用说明:")
            print("   1. 浏览器会自动打开网站")
            print("   2. 现在可以使用所有功能（翻译、OCR等）")
            print("   3. 按 Ctrl+C 停止服务器")
            print("="*50)
            
            # 在新线程中打开浏览器
            browser_thread = threading.Thread(target=open_browser)
            browser_thread.daemon = True
            browser_thread.start()
            
            # 启动服务器
            httpd.serve_forever()
            
    except KeyboardInterrupt:
        print("\n")
        print("🔴 服务器已停止")
        print("感谢使用百宝箱工具!")
    except Exception as e:
        print(f"❌ 启动服务器时出错: {e}")
        print("\n可能的解决方案:")
        print("1. 检查是否安装了Python 3")
        print("2. 确保端口8000未被占用")
        print("3. 以管理员权限运行")
        input("按回车键退出...")

if __name__ == "__main__":
    main() 