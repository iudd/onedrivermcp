const axios = require('axios');

// 测试数据
const testEmail = 'user@example.com';
const testPassword = 'password';
const baseURL = 'http://localhost:3001'; // 服务器在3001端口运行

async function testAuthFlow() {
  try {
    console.log('开始测试认证流程...\n');
    
    // 1. 测试登录
    console.log('1. 测试用户登录...');
    const loginResponse = await axios.post(`${baseURL}/auth/login`, {
      email: testEmail,
      password: testPassword
    });
    
    if (loginResponse.data.success) {
      const { accessToken, refreshToken, user } = loginResponse.data.data;
      console.log('✅ 登录成功!');
      console.log('用户信息:', user);
      console.log('访问令牌:', accessToken.substring(0, 20) + '...');
      console.log('刷新令牌:', refreshToken.substring(0, 20) + '...\n');
      
      // 2. 测试验证令牌
      console.log('2. 测试验证访问令牌...');
      const verifyResponse = await axios.post(`${baseURL}/auth/verify`, {
        token: accessToken
      });
      
      if (verifyResponse.data.success) {
        console.log('✅ 令牌验证成功!');
        console.log('用户信息:', verifyResponse.data.data.user);
        console.log('过期时间:', new Date(verifyResponse.data.data.expiresAt * 1000).toLocaleString() + '\n');
      }
      
      // 3. 测试获取当前用户信息
      console.log('3. 测试获取当前用户信息...');
      const meResponse = await axios.get(`${baseURL}/auth/me`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`
        }
      });
      
      if (meResponse.data.success) {
        console.log('✅ 获取用户信息成功!');
        console.log('用户信息:', meResponse.data.data.user);
        console.log('');
      }
      
      // 4. 测试刷新令牌
      console.log('4. 测试刷新访问令牌...');
      const refreshResponse = await axios.post(`${baseURL}/auth/refresh`, {
        refreshToken
      });
      
      if (refreshResponse.data.success) {
        console.log('✅ 刷新令牌成功!');
        console.log('新访问令牌:', refreshResponse.data.data.accessToken.substring(0, 20) + '...');
        console.log('');
      }
      
      // 5. 测试登出
      console.log('5. 测试用户登出...');
      const logoutResponse = await axios.post(`${baseURL}/auth/logout`, {
        refreshToken
      });
      
      if (logoutResponse.data.success) {
        console.log('✅ 登出成功!');
      }
      
      console.log('\n所有认证测试通过! 🎉');
    }
  } catch (error) {
    console.error('测试失败:', error.response?.data || error.message);
    console.log('\n请确保服务器在运行，并且端口号正确。');
  }
}

// 运行测试
testAuthFlow();