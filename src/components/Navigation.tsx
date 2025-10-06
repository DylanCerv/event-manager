import React from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogOut, Home, Calendar, MessageSquare, InboxIcon, MessageCircle, Users, Radio, Shield, User, Menu, X, Settings, Crown, HelpCircle } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';
import { RewardsModal } from './RewardsModal';
import { SupportModal } from './SupportModal';

export function Navigation() {
  const { user, role, logout } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = React.useState(false);
  const [isSupportModalOpen, setIsSupportModalOpen] = React.useState(false);

  if (!user) return null;

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
  };

  // Función para truncar nombre de empresa
  const truncateCompanyName = (company: string, maxLength = 15) => {
    if (!company) return 'Admin';
    return company.length > maxLength ? company.slice(0, maxLength) + '...' : company;
  };

  const toggleProfileDropdown = () => {
    setIsProfileDropdownOpen(!isProfileDropdownOpen);
    // Cerrar menu mobile cuando se abre el dropdown de perfil
    if (!isProfileDropdownOpen) {
      setIsMobileMenuOpen(false);
    }
  };

  const closeProfileDropdown = () => {
    setIsProfileDropdownOpen(false);
  };

  const openRewardsModal = () => {
    setIsRewardsModalOpen(true);
    setIsProfileDropdownOpen(false);
    // Cerrar menu mobile cuando se abre modal de premios
    setIsMobileMenuOpen(false);
  };

  const closeRewardsModal = () => {
    setIsRewardsModalOpen(false);
  };

  const openSupportModal = () => {
    setIsSupportModalOpen(true);
    setIsProfileDropdownOpen(false);
    // Cerrar menu mobile cuando se abre modal de soporte
    setIsMobileMenuOpen(false);
  };

  const closeSupportModal = () => {
    setIsSupportModalOpen(false);
  };

  // Navigation items for Super Admin
  const superAdminNavItems = [
    { to: '/super-admin', icon: Home, label: 'Dashboard' },
    { to: '/requests', icon: InboxIcon, label: 'Solicitudes' },
    { to: '/usuarios', icon: Users, label: 'Usuarios' },
    { to: '/creadores', icon: User, label: 'Creadores' },
    { to: '/communications', icon: Radio, label: 'Comunicaciones' },
    { to: '/configuraciones', icon: Settings, label: 'Configuraciones' },
  ];  

  // Navigation items for Admin
  const adminNavItems = [
    { to: '/home', icon: Home, label: 'Home' },
    { to: '/events', icon: Calendar, label: 'Eventos' },
    { to: '/requests', icon: InboxIcon, label: 'Solicitudes' },
    { to: '/eventbook', icon: MessageSquare, label: 'Eventbook' },
    { to: '/feedback', icon: MessageCircle, label: 'Feedback' },
    { to: '/roles', icon: Shield, label: 'Roles' },
  ];

  // Navigation items for Access Control
  const accessControlNavItems = [
    { to: '/access-control', icon: Shield, label: 'Control de Acceso' },
  ];

  // Navigation items for Moderator
  const moderatorNavItems = [
    { to: '/moderador', icon: Crown, label: 'Moderador' },
  ];

  const getNavItems = () => {
    if (role?.name == 'SUPER_ADMIN') return superAdminNavItems;
    if (role?.name == 'ACCESS_CONTROL') return accessControlNavItems;
    if (role?.name == 'MODERATOR') return moderatorNavItems;
    return adminNavItems;
  };

  const navItems = getNavItems();

  const NavItem = ({ to, icon: Icon, label, onClick }: { to: string; icon: any; label: string; onClick?: () => void }) => (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        `inline-flex items-center px-3 py-2 border-b-2 text-sm font-medium transition-colors duration-200 ${
          isActive
            ? 'border-indigo-500 text-gray-900'
            : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
        }`
      }
    >
      <Icon className="h-5 w-5 mr-2" />
      {label}
    </NavLink>
  );

  const MobileNavItem = ({ to, icon: Icon, label }: { to: string; icon: any; label: string }) => (
    <NavLink
      to={to}
      onClick={closeMobileMenu}
      className={({ isActive }) =>
        `flex items-center px-4 py-3 text-base font-medium transition-colors duration-200 ${
          isActive
            ? 'bg-indigo-50 border-r-4 border-indigo-500 text-indigo-700'
            : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
        }`
      }
    >
      <Icon className="h-6 w-6 mr-3" />
      {label}
    </NavLink>
  );

  return (
    <nav className="bg-white shadow-lg relative">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16 items-center">
          {/* Desktop Navigation */}
          <div className="hidden lg:flex space-x-8">
            {navItems.map((item) => (
              <NavItem key={item.to} {...item} />
            ))}
          </div>

          {/* Mobile Menu Button */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={toggleMobileMenu}
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
              aria-expanded="false"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isMobileMenuOpen ? (
                <X className="block h-6 w-6" aria-hidden="true" />
              ) : (
                <Menu className="block h-6 w-6" aria-hidden="true" />
              )}
            </button>
          </div>

          {/* User Info and Logout */}
          <div className="flex items-center space-x-4 relative">
            {/* Profile Section - Hidden for Access Control and Moderator users */}
            {role?.name !== 'ACCESS_CONTROL' && role?.name !== 'MODERATOR' && (
              <>
                <button
                  onClick={toggleProfileDropdown}
                  className="flex items-center space-x-2 text-sm text-gray-700 hidden sm:flex hover:text-gray-900 transition-colors"
                >
                  <div className="flex-shrink-0">
                    {user.profile_photo ? (
                      <img 
                        src={user.profile_photo} 
                        alt="Perfil" 
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                        <User className="h-4 w-4 text-indigo-600" />
                      </div>
                    )}
                  </div>
                  
                  <span>
                    {role?.name === 'SUPER_ADMIN' ? 'Super Admin' : 
                     truncateCompanyName(user.company || 'Mi Empresa')}
                  </span>
                </button>
                
                <UserProfileDropdown
                  user={user}
                  isOpen={isProfileDropdownOpen}
                  onClose={closeProfileDropdown}
                  onViewRewards={openRewardsModal}
                  onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
                />
              </>
            )}
            
            {/* Support Button - For Admin, Access Control and Moderator users */}
            {['ADMIN', 'ACCESS_CONTROL', 'MODERATOR'].includes(role?.name as string) && (
              <button
                onClick={openSupportModal}
                className="inline-flex items-center p-2 border border-transparent rounded-md text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
                title="Centro de Soporte"
              >
                <HelpCircle className="h-5 w-5" />
              </button>
            )}
            
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rewards Modal - Hidden for Access Control users */}
      {role?.name !== 'ACCESS_CONTROL' && (
        <RewardsModal
          isOpen={isRewardsModalOpen}
          onClose={closeRewardsModal}
          userPoints={(() => {
            try {
              const userPoints = JSON.parse(localStorage.getItem('userPoints') || '{}');
              return userPoints[user.id] || 0;
            } catch {
              return 0;
            }
          })()}
        />
      )}

      {/* Support Modal - For Admin, Access Control and Moderator users */}
      {['ADMIN', 'ACCESS_CONTROL', 'MODERATOR'].includes(role?.name as string) && (
        <SupportModal
          isOpen={isSupportModalOpen}
          onClose={closeSupportModal}
          user={user}
        />
      )}

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="lg:hidden">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black bg-opacity-25 z-40"
            onClick={closeMobileMenu}
          />
          
          {/* Mobile Menu Panel */}
          <div className="absolute top-0 left-0 right-0 bg-white shadow-xl z-50 border-t border-gray-200">
            {/* Close Button Header */}
            <div className="flex justify-between items-center px-4 py-3 border-b border-gray-200">
              <span className="text-lg font-medium text-gray-900">Menú</span>
              <button
                onClick={closeMobileMenu}
                className="p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-indigo-500 transition-colors duration-200"
              >
                <span className="sr-only">Cerrar menú</span>
                <X className="h-6 w-6" aria-hidden="true" />
              </button>
            </div>
            <div className="pt-2 pb-3 space-y-1">
              {/* Mobile Navigation Items */}
              {navItems.map((item) => (
                <MobileNavItem key={item.to} {...item} />
              ))}
              
              {/* Mobile User Info - Hidden for Access Control and Moderator users */}
              {role?.name !== 'ACCESS_CONTROL' && role?.name !== 'MODERATOR' && (
                <div className="border-t border-gray-200 pt-4 pb-3">
                  <button 
                    onClick={toggleProfileDropdown}
                    className="flex items-center px-4 w-full hover:bg-gray-50 transition-colors rounded-md"
                  >
                    <div className="flex-shrink-0">
                      {(user as any).profilePhoto ? (
                        <img 
                          src={(user as any).profilePhoto} 
                          alt="Perfil" 
                          className="h-10 w-10 rounded-full object-cover"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                          <User className="h-6 w-6 text-indigo-600" />
                        </div>
                      )}
                    </div>
                    <div className="ml-3 flex-1 text-left">
                      <div className="text-base font-medium text-gray-800">
                        {role?.name === 'SUPER_ADMIN' ? 'Super Admin' : 
                         role?.name === 'MODERATOR' ? 'Moderador' : 
                         truncateCompanyName((user as any).company, 6)}
                      </div>
                      <div className="text-sm text-gray-500">
                        {(user as any).firstName} {(user as any).lastName}
                      </div>
                    </div>
                  </button>
                </div>
              )}
              <div className="mt-3 px-4 space-y-2">
                {/* Support Button Mobile - For Admin, Access Control and Moderator users */}
                {['ADMIN', 'ACCESS_CONTROL', 'MODERATOR'].includes(role?.name as string) && (
                  <button
                    onClick={() => {
                      openSupportModal();
                      closeMobileMenu();
                    }}
                    className="w-full flex items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200"
                  >
                    <HelpCircle className="h-5 w-5 mr-3" />
                    Soporte
                  </button>
                )}
                <button
                  onClick={() => {
                    logout();
                    closeMobileMenu();
                  }}
                  className="w-full flex items-center px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors duration-200"
                >
                  <LogOut className="h-5 w-5 mr-3" />
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}