// OneDrive MCP OAuth Flow Test Script
const axios = require('axios');

// 配置
const BASE_URL = 'http://localhost:3000';

// 颜色输出
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

log('=== OneDrive MCP OAuth Flow 测试 ===', 'cyan');

async function testOAuthFlow() {
  try {
    // 步骤1: 获取授权URL
    log('\n步骤 1: 获取授权URL...', 'blue');
    const authResponse = await axios.get(`${BASE_URL}/api/oauth/authorize`);
    
    if (authResponse.data.success) {
      log('✓ 授权URL获取成功', 'green');
      log(`授权URL: ${authResponse.data.data.authorizationUrl}`, 'yellow');
      log(`State: ${authResponse.data.data.state}`, 'yellow');
    } else {
      log('✗ 授权URL获取失败', 'red');
      log(JSON.stringify(authResponse.data, null, 2));
      return;
    }

    // 在开发环境中，我们使用模拟回调
    if (authResponse.data.data.authorizationUrl.includes('mock-success')) {
      log('\n检测到开发环境，使用模拟回调...', 'blue');
      
      // 步骤2: 模拟OAuth回调
      log('\n步骤 2: 模拟OAuth回调...', 'blue');
      const mockCallbackUrl = `${BASE_URL}/api/oauth/mock-success?state=${authResponse.data.data.state}`;
      
      try {
        // 由于这是重定向，我们直接调用回调端点
        const callbackResponse = await axios.get(`${BASE_URL}/api/oauth/callback?code=mock-auth-code-123&state=${authResponse.data.data.state}`);
        
        if (callbackResponse.data.success) {
          log('✓ OAuth回调处理成功', 'green');
          log(`Access Token: ${callbackResponse.data.data.accessToken.substring(0, 20)}...`, 'yellow');
          log(`Refresh Token: ${callbackResponse.data.data.refreshToken.substring(0, 20)}...`, 'yellow');
          
          // 保存令牌用于后续测试
          const accessToken = callbackResponse.data.data.accessToken;
          
          // 步骤3: 测试令牌状态
          log('\n步骤 3: 测试令牌状态...', 'blue');
          const statusResponse = await axios.get(`${BASE_URL}/api/oauth/status`, {
            headers: {
              'Authorization': `Bearer ${accessToken}`
            }
          });
          
          if (statusResponse.data.success) {
            log('✓ 令牌状态获取成功', 'green');
            log(`认证状态: ${statusResponse.data.data.authenticated ? '已认证' : '未认证'}`, 'yellow');
            log(`过期时间: ${statusResponse.data.data.expiresAt}`, 'yellow');
          } else {
            log('✗ 令牌状态获取失败', 'red');
            log(JSON.stringify(statusResponse.data, null, 2));
            return;
          }
          
          // 步骤4: 测试OneDrive API
          log('\n步骤 4: 测试OneDrive API...', 'blue');
          try {
            const filesResponse = await axios.get(`${BASE_URL}/api/files`, {
              headers: {
                'Authorization': `Bearer ${accessToken}`
              }
            });
            
            if (filesResponse.data.success) {
              log('✓ OneDrive API调用成功', 'green');
              log(`文件数量: ${filesResponse.data.data.files.length}`, 'yellow');
              
              if (filesResponse.data.data.files.length > 0) {
                log('示例文件:', 'yellow');
                filesResponse.data.data.files.slice(0, 3).forEach((file, index) => {
                  log(`  ${index + 1}. ${file.name} ${file.folder ? '(文件夹)' : `(${file.size} bytes)`}`, 'yellow');
                });
              }
            } else {
              log('✗ OneDrive API调用失败', 'red');
              log(JSON.stringify(filesResponse.data, null, 2));
            }
          } catch (error) {
            log('✗ OneDrive API调用错误', 'red');
            if (error.response) {
              log(JSON.stringify(error.response.data, null, 2));
            } else {
              log(error.message);
            }
          }
          
          // 步骤5: 测试MCP协议
          log('\n步骤 5: 测试MCP协议...', 'blue');
          try {
            // 先获取工具列表
            const toolsResponse = await axios.get(`${BASE_URL}/mcp/tools`);
            
            if (toolsResponse.data.success) {
              log('✓ MCP工具列表获取成功', 'green');
              log(`可用工具数量: ${toolsResponse.data.data.tools.length}`, 'yellow');
              
              toolsResponse.data.data.tools.forEach((tool, index) => {
                log(`  ${index + 1}. ${tool.name}: ${tool.description}`, 'yellow');
              });
            } else {
              log('✗ MCP工具列表获取失败', 'red');
              log(JSON.stringify(toolsResponse.data, null, 2));
            }
          } catch (error) {
            log('✗ MCP协议测试错误', 'red');
            if (error.response) {
              log(JSON.stringify(error.response.data, null, 2));
            } else {
              log(error.message);
            }
          }
          
        } else {
          log('✗ OAuth回调处理失败', 'red');
          log(JSON.stringify(callbackResponse.data, null, 2));
        }
      } catch (error) {
        log('✗ OAuth回调错误', 'red');
        if (error.response) {
          log(JSON.stringify(error.response.data, null, 2));
        } else {
          log(error.message);
        }
      }
    } else {
      log('\n生产环境OAuth流程，请在浏览器中访问以下URL完成授权:', 'blue');
      log(authResponse.data.data.authorizationUrl, 'yellow');
      log('授权完成后，请使用返回的访问令牌测试API。', 'blue');
    }
    
  } catch (error) {
    log('\n✗ 测试过程中发生错误', 'red');
    if (error.response) {
      log(`状态码: ${error.response.status}`, 'red');
      log(JSON.stringify(error.response.data, null, 2));
    } else {
      log(error.message, 'red');
    }
  }
}

// 运行测试
testOAuthFlow();