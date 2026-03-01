import React from 'react';
import { Navigate } from 'react-router-dom';
import auth from '../utils/auth';

// 受保护的路由组件
function ProtectedRoute({ children }) {
  if (!auth.isLoggedIn()) {
    // 未登录，重定向到登录页
    return <Navigate to="/login" replace />;
  }
  
  return children;
}

export default ProtectedRoute;
