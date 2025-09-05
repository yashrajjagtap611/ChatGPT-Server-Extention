import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider as MuiThemeProvider, CssBaseline, Box } from '@mui/material';
import { ThemeProvider } from '@emotion/react';
import { theme } from './theme';
import { isAuthenticated, getCurrentUserInfo } from './services/api';
import Navigation from './components/Navigation';
import ProtectedRoute from './components/ProtectedRoute';
import { SessionManager } from './components/SessionManager';

// Lazy load components
const Login = React.lazy(() => import('./pages/Login'));
const Register = React.lazy(() => import('./pages/Register'));
const Dashboard = React.lazy(() => import('./pages/Dashboard'));
const CookieManager = React.lazy(() => import('./pages/CookieManager'));
const UserStats = React.lazy(() => import('./pages/UserStats'));
const Settings = React.lazy(() => import('./pages/Settings'));
const AdminPanel = React.lazy(() => import('./pages/AdminPanel'));
const Users = React.lazy(() => import('./pages/Users'));
const WebsitePermissions = React.lazy(() => import('./pages/WebsitePermissions'));

const App: React.FC = () => {
  const [isAuth, setIsAuth] = useState<boolean>(false);
  const [userInfo, setUserInfo] = useState<{ username: string; isAdmin: boolean } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const checkAuth = () => {
      const authenticated = isAuthenticated();
      const user = getCurrentUserInfo();
      setIsAuth(authenticated);
      setUserInfo(user);
      setLoading(false);
    };

    checkAuth();
    
    // Listen for storage changes (login/logout)
    const handleStorageChange = () => {
      checkAuth();
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <MuiThemeProvider theme={theme}>
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <Box 
            display="flex" 
            justifyContent="center" 
            alignItems="center" 
            minHeight="100vh"
            bgcolor="background.default"
          >
            <div>Loading...</div>
          </Box>
        </ThemeProvider>
      </MuiThemeProvider>
    );
  }

  return (
    <MuiThemeProvider theme={theme}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <BrowserRouter>
          <SessionManager>
            <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
              {isAuth && <Navigation userInfo={userInfo} />}
              <Box component="main" sx={{ flexGrow: 1, bgcolor: 'background.default' }}>
              <React.Suspense fallback={
                <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
                  <div>Loading...</div>
                </Box>
              }>
                <Routes>
                  <Route path="/login" element={
                    isAuth ? <Navigate to="/dashboard" replace /> : <Login />
                  } />
                  <Route path="/register" element={
                    isAuth ? <Navigate to="/dashboard" replace /> : <Register />
                  } />
                  <Route path="/dashboard" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <Dashboard />
                    </ProtectedRoute>
                  } />
                  <Route path="/cookies" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <CookieManager />
                    </ProtectedRoute>
                  } />
                  <Route path="/stats" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <UserStats />
                    </ProtectedRoute>
                  } />
                  <Route path="/settings" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <Settings />
                    </ProtectedRoute>
                  } />
                  <Route path="/admin" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <AdminPanel />
                    </ProtectedRoute>
                  } />
                  <Route path="/users" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <Users />
                    </ProtectedRoute>
                  } />
                  <Route path="/permissions" element={
                    <ProtectedRoute isAuthenticated={isAuth}>
                      <WebsitePermissions />
                    </ProtectedRoute>
                  } />
                  <Route path="/" element={
                    isAuth ? <Navigate to="/dashboard" replace /> : <Navigate to="/login" replace />
                  } />
                </Routes>
              </React.Suspense>
              </Box>
            </Box>
          </SessionManager>
        </BrowserRouter>
      </ThemeProvider>
    </MuiThemeProvider>
  );
};

export default App;
