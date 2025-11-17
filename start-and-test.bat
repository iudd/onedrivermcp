@echo off
echo 启动OneDrive MCP服务器...
echo.
echo 正在构建项目...
call npm run build
echo.
echo 正在启动服务器...
echo 服务器将在 http://localhost:3000 上运行
echo.
echo 用户认证信息:
echo 邮箱: user@example.com
echo 密码: password
echo.
echo 按Ctrl+C停止服务器
echo.
start /B node dist/server.js
timeout 5
echo.
echo 正在测试认证功能...
node test-auth.js
echo.
echo 测试完成! 您可以继续使用服务器或按Ctrl+C停止。
pause