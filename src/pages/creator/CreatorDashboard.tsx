import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import CreatorNavbar from '../../components/CreatorNavbar';
import CreatorHome from './CreatorHome';
import CreatorUsers from './CreatorUsers';
import CreatorRequests from './CreatorRequests';
import CreatorCommissions from './CreatorCommissions';

export default function CreatorDashboard() {
  const { user } = useAuth();
  const location = useLocation();

  if (!user || user.role !== 'CREATOR') {
    return <Navigate to="/login" />;
  }

  const isHomePage = location.pathname === '/creator' || location.pathname === '/creator/' || location.pathname === '/creator/home';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with CreatorNavbar */}
      <CreatorNavbar />

      <main>
        <div className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
          <div className="px-4 py-6 sm:px-0">
            {/* Welcome Section - Only show on Home page */}
            {isHomePage && (
              <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
                <div className="flex items-center space-x-4">
                  <div>
                    <h1 className="text-3xl font-bold text-gray-900">
                      Bienvenido, {user?.name}
                    </h1>
                    <p className="text-gray-500 mt-1">
                      Panel de control para creadores • {new Date().toLocaleDateString('es-ES', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Content */}
            <Routes>
              <Route path="/" element={<CreatorHome />} />
              <Route path="/home" element={<CreatorHome />} />
              <Route path="/users" element={<CreatorUsers />} />
              <Route path="/requests" element={<CreatorRequests />} />
              <Route path="/commissions" element={<CreatorCommissions />} />
              <Route path="*" element={<Navigate to="/creator/home" />} />
            </Routes>
          </div>
        </div>
      </main>
    </div>
  );
}
