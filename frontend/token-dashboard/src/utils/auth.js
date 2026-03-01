// 简单的认证状态管理
const AUTH_KEY = 'oaeas_auth';

export const auth = {
  // 保存登录状态
  login: (userData) => {
    localStorage.setItem(AUTH_KEY, JSON.stringify(userData));
  },
  
  // 退出登录
  logout: () => {
    localStorage.removeItem(AUTH_KEY);
  },
  
  // 获取当前用户
  getUser: () => {
    const data = localStorage.getItem(AUTH_KEY);
    return data ? JSON.parse(data) : null;
  },
  
  // 获取token
  getToken: () => {
    const user = auth.getUser();
    return user?.token;
  },
  
  // 检查是否登录
  isLoggedIn: () => {
    return !!auth.getToken();
  }
};

export default auth;
