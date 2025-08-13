@echo off
chcp 65001 >nul
title 百宝箱工具服务器

echo.
echo ================================================
echo           🎉 百宝箱工具服务器启动器
echo ================================================
echo.

:: 检查Python是否安装
python --version >nul 2>&1
if errorlevel 1 (
    echo ❌ 未检测到Python，正在尝试python3...
    python3 --version >nul 2>&1
    if errorlevel 1 (
        echo.
        echo ❌ 错误：未安装Python或Python不在系统PATH中
        echo.
        echo 💡 解决方案：
        echo    1. 下载并安装Python: https://python.org
        echo    2. 安装时勾选"Add Python to PATH"
        echo    3. 或者使用Node.js版本：双击"启动服务器.js"
        echo.
        pause
        exit /b 1
    ) else (
        set PYTHON_CMD=python3
    )
) else (
    set PYTHON_CMD=python
)

echo ✅ Python已安装，正在启动服务器...
echo.

:: 启动Python服务器
%PYTHON_CMD% 启动服务器.py

if errorlevel 1 (
    echo.
    echo ❌ 服务器启动失败
    echo.
    echo 💡 其他启动方式：
    echo    1. 双击"启动服务器.py"文件
    echo    2. 使用Node.js版本：node 启动服务器.js
    echo    3. 直接打开"index.html"（功能受限）
    echo.
    pause
)

exit /b 0 