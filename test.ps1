# 简单的 OneDrive MCP Server 测试脚本

Write-Host "=== OneDrive MCP Server 测试 ===" -ForegroundColor Green

# 1. 测试服务器状态
Write-Host "1. 服务器状态检查..." -ForegroundColor Yellow

try {
    $ProgressPreference = "SilentlyContinue"
    $response = Invoke-WebRequest -Uri "https://onedrivermcp.onrender.com/health" -TimeoutSec 10 -UseBasicParsing
    Write-Host "   服务器响应状态码: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "   服务器响应内容: $($response.Content)" -ForegroundColor Cyan
}
catch {
    Write-Host "   服务器状态检查失败: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        Write-Host "   HTTP 状态码: $($_.Exception.Response.StatusCode)" -ForegroundColor Yellow
    }
}

Write-Host "`n=== 测试完成 ===" -ForegroundColor Green