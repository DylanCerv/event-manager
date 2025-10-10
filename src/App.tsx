import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { UserProvider } from './contexts/UserContext';
import { EventProvider } from './contexts/EventContext';
import { Navigation } from './components/Navigation';
import { Login } from './pages/Login';
import { SuperAdmin } from './pages/SuperAdmin';
import { Home } from './pages/Home';
import { Events } from './pages/Events';
import { EventManagement } from './pages/EventManagement';
import { Eventbook } from './pages/Eventbook';
import { EventbookWall } from './pages/EventbookWall';
import { Usuarios } from './pages/Usuarios';
import Creadores from './pages/Creadores';
import { Requests } from './pages/Requests';
import { Feedback } from './pages/Feedback';
import { Roles } from './pages/Roles';
import { CommunicationsCenter } from './pages/CommunicationsCenter';
import { AccessControlDashboard } from './pages/AccessControlDashboard';
import { AccessControlEventManagement } from './pages/AccessControlEventManagement';
import { InvitationView } from './pages/InvitationView';
import { Configuraciones } from './pages/Configuraciones';
import { Moderador } from './pages/Moderador';
import { ModeradorEventBook } from './pages/ModeradorEventBook';
import CreatorDashboard from './pages/creator/CreatorDashboard';

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, role } = useAuth();

  if (!user) {
    return <Navigate to="/" replace />;
  }
  
  // Handle CREATOR user routing
  if (role?.name === 'CREATOR') {
    if (!window.location.pathname.startsWith('/creator')) {
      return <Navigate to="/creator" replace />;
    }
  }
  
  // Handle ACCESS_CONTROL user routing
  if (role?.name === 'ACCESS_CONTROL') {
    if (!window.location.pathname.startsWith('/access-control')) {
      return <Navigate to="/access-control" replace />;
    }
  }
  
  // Handle MODERATOR user routing
  if (role?.name === 'MODERATOR') {
    if (!window.location.pathname.startsWith('/moderador')) {
      return <Navigate to="/moderador" replace />;
    }
  }
  
  // Redirect other users away from CREATOR dashboard
  if (role?.name !== 'CREATOR' && window.location.pathname.startsWith('/creator')) {
    const redirectPath = role?.name === 'SUPER_ADMIN' ? '/super-admin' : 
                        role?.name === 'ACCESS_CONTROL' ? '/access-control' :
                        role?.name === 'MODERATOR' ? '/moderador' : '/home';
    return <Navigate to={redirectPath} replace />;
  }
  
  // Redirect other users away from ACCESS_CONTROL dashboard
  if (role?.name !== 'ACCESS_CONTROL' && window.location.pathname.startsWith('/access-control')) {
    const redirectPath = role?.name === 'SUPER_ADMIN' ? '/super-admin' : 
                        role?.name === 'CREATOR' ? '/creator' :
                        role?.name === 'MODERATOR' ? '/moderador' : '/home';
    return <Navigate to={redirectPath} replace />;
  }
  
  // Redirect other users away from MODERATOR dashboard
  if (role?.name !== 'MODERATOR' && window.location.pathname.startsWith('/moderador')) {
    const redirectPath = role?.name === 'SUPER_ADMIN' ? '/super-admin' : 
                        role?.name === 'CREATOR' ? '/creator' :
                        role?.name === 'ACCESS_CONTROL' ? '/access-control' : '/home';
    return <Navigate to={redirectPath} replace />;
  }
  
  // Redirect other users away from ACCESS_CONTROL management page
  if (role?.name !== 'ACCESS_CONTROL' && window.location.pathname === '/access-control/gestionar') {
    const redirectPath = role?.name === 'SUPER_ADMIN' ? '/super-admin' : 
                        role?.name === 'CREATOR' ? '/creator' :
                        role?.name === 'MODERATOR' ? '/moderador' : '/home';
    return <Navigate to={redirectPath} replace />;
  }
  
  return <>{children}</>;
}

function AppRoutes() {
  const { role } = useAuth();
  return (
    <div className="min-h-screen bg-gray-100">
      {role?.name !== 'CREATOR' && <Navigation />}
      <Routes>
        <Route path="/" element={<Login />} />
        {/* Super Admin Routes */}
        <Route
          path="/super-admin"
          element={
            <ProtectedRoute>
              <SuperAdmin />
            </ProtectedRoute>
          }
        />
        <Route
          path="/usuarios"
          element={
            <ProtectedRoute>
              <Usuarios />
            </ProtectedRoute>
          }
        />
        <Route
          path="/communications"
          element={
            <ProtectedRoute>
              <CommunicationsCenter />
            </ProtectedRoute>
          }
        />
        <Route
          path="/creadores"
          element={
            <ProtectedRoute>
              <Creadores />
            </ProtectedRoute>
          }
        />
        <Route
          path="/configuraciones"
          element={
            <ProtectedRoute>
              <Configuraciones />
            </ProtectedRoute>
          }
        />
        {/* Access Control Routes */}
        <Route
          path="/access-control"
          element={
            <ProtectedRoute>
              <AccessControlDashboard />
            </ProtectedRoute>
          }
        />
        <Route
          path="/access-control/gestionar/:eventId"
          element={
            <ProtectedRoute>
              <AccessControlEventManagement />
            </ProtectedRoute>
          }
        />
        {/* Moderator Routes */}
        <Route
          path="/moderador"
          element={
            <ProtectedRoute>
              <Moderador />
            </ProtectedRoute>
          }
        />
        <Route
          path="/moderador/eventbook/:id"
          element={
            <ProtectedRoute>
              <ModeradorEventBook />
            </ProtectedRoute>
          }
        />
        {/* Admin Routes */}
        <Route
          path="/home"
          element={
            <ProtectedRoute>
              <Home />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events"
          element={
            <ProtectedRoute>
              <Events />
            </ProtectedRoute>
          }
        />
        <Route
          path="/events/:id"
          element={
            <ProtectedRoute>
              <EventManagement />
            </ProtectedRoute>
          }
        />
        <Route
          path="/eventbook"
          element={
            <ProtectedRoute>
              <Eventbook/>
            </ProtectedRoute>
          }
        />
        <Route
          path="/eventbook/:id"
          element={
            <ProtectedRoute>
              <EventbookWall />
            </ProtectedRoute>
          }
        />
        {/* Ruta pública para EventBook sin autenticación */}
        <Route
          path="/:userSlug/:eventSlug"
          element={<EventbookWall />}
        />
        <Route
          path="/requests"
          element={
            <ProtectedRoute>
              <Requests />
            </ProtectedRoute>
          }
        />
        <Route
          path="/feedback"
          element={
            <ProtectedRoute>
              <Feedback />
            </ProtectedRoute>
          }
        />
        <Route
          path="/roles"
          element={
            <ProtectedRoute>
              <Roles />
            </ProtectedRoute>
          }
        />
        {/* Creator Routes */}
        <Route
          path="/creator/*"
          element={
            <ProtectedRoute>
              <CreatorDashboard />
            </ProtectedRoute>
          }
        />
        {/* Guest Invitation Route - No authentication required */}
        <Route
          path="/invitation/:qrCode"
          element={<InvitationView />}
        />
      </Routes>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <UserProvider>
          <EventProvider>
            <AppRoutes />
          </EventProvider>
        </UserProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;