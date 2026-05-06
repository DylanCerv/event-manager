import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Home, FileText, LogOut, User, DollarSign, Menu, X, Users } from 'lucide-react';
import { UserProfileDropdown } from './UserProfileDropdown';
import { RewardsModal } from './RewardsModal';
import { getPointTransactionsAPI } from '../endpoints/points';

export default function CreatorNavbar() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);
  const [isProfileDropdownOpen, setIsProfileDropdownOpen] = React.useState(false);
  const [isRewardsModalOpen, setIsRewardsModalOpen] = React.useState(false);
  const [creatorPoints, setCreatorPoints] = React.useState<number>(0);

  React.useEffect(() => {
    if (!user?.id) return;
    if (!isRewardsModalOpen) return;
    getPointTransactionsAPI(String(user.id))
      .then((resp) => {
        const txs = resp?.data || [];
        const balance = txs.reduce((sum: number, t: any) => sum + (Number(t.points) || 0), 0);
        setCreatorPoints(balance);
      })
      .catch(() => setCreatorPoints(0));
  }, [isRewardsModalOpen, user?.id]);

  const navigation = [
    { name: 'Home', href: '/creator/home', icon: Home },
    { name: 'Usuarios', href: '/creator/users', icon: Users },
    { name: 'Solicitudes', href: '/creator/requests', icon: FileText },
    { name: 'Comisiones', href: '/creator/commissions', icon: DollarSign },
  ];

  const isActive = (href: string) => {
    return location.pathname === href || (href === '/creator/home' && location.pathname === '/creator');
  };

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  const closeMobileMenu = () => {
    setIsMobileMenuOpen(false);
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

  // Función para truncar nombre de empresa
  const truncateCompanyName = (company: string, maxLength = 15) => {
    if (!company) return 'Creador';
    return company.length > maxLength ? company.slice(0, maxLength) + '...' : company;
  };

  if (!user) return null;

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            {/* Mobile Menu Button - Moved to left */}
            <div className="lg:hidden flex items-center mr-4">
              <button
                onClick={toggleMobileMenu}
                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-purple-500 transition-colors duration-200"
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

            {/* Navigation Links */}
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              {navigation.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium transition-colors duration-200 ${
                      isActive(item.href)
                        ? 'border-purple-500 text-purple-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Icon className="h-4 w-4 mr-2" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Desktop Navigation - User Profile and Logout */}
          <div className="hidden lg:flex items-center space-x-4">
            <div className="relative">
              <button
                onClick={toggleProfileDropdown}
                className="flex items-center space-x-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
              >
                {/* Profile Photo */}
                <div className="flex-shrink-0">
                  {user.profile_photo ? (
                    <img 
                      src={user.profile_photo} 
                      alt="Perfil" 
                      className="h-8 w-8 rounded-full object-cover"
                    />
                  ) : (
                    <div className="h-8 w-8 rounded-full bg-purple-100 flex items-center justify-center">
                      <User className="h-4 w-4 text-purple-600" />
                    </div>
                  )}
                </div>
                
                {/* User Name */}
                <span>
                  {truncateCompanyName(user.name || 'Creador')}
                </span>
              </button>
              
              {/* Profile Dropdown */}
              <UserProfileDropdown
                user={user}
                isOpen={isProfileDropdownOpen}
                onClose={closeProfileDropdown}
                onViewRewards={openRewardsModal}
                onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
              />
            </div>
            
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>

          {/* Mobile Logout Button - Right side */}
          <div className="lg:hidden flex items-center">
            <button
              onClick={logout}
              className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
            >
              <LogOut className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
      </div>

      {/* Rewards Modal */}
      <RewardsModal
        isOpen={isRewardsModalOpen}
        onClose={closeRewardsModal}
        userPoints={creatorPoints}
        userType="Creadores"
      />

      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="sm:hidden">
          <div className="pt-2 pb-3 space-y-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  to={item.href}
                  onClick={closeMobileMenu}
                  className={`block pl-3 pr-4 py-2 border-l-4 text-base font-medium transition-colors duration-200 ${
                    isActive(item.href)
                      ? 'bg-purple-50 border-purple-500 text-purple-700'
                      : 'border-transparent text-gray-600 hover:text-gray-800 hover:bg-gray-50 hover:border-gray-300'
                  }`}
                >
                  <div className="flex items-center">
                    <Icon className="h-4 w-4 mr-3" />
                    {item.name}
                  </div>
                </Link>
              );
            })}
          </div>

            {/* Mobile Profile Section */}
          <div className="pt-4 pb-3 border-t border-gray-200">
            <button
              onClick={toggleProfileDropdown}
              className="flex items-center px-4 w-full text-left hover:bg-gray-50 py-2 rounded-md mx-2"
            >
              <div className="flex-shrink-0">
                {user.profile_photo ? (
                  <img 
                    src={user.profile_photo} 
                    alt="Perfil" 
                    className="h-10 w-10 rounded-full object-cover"
                  />
                ) : (
                  <div className="h-10 w-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <User className="h-5 w-5 text-purple-600" />
                  </div>
                )}
              </div>
              <div className="ml-3">
                <div className="text-base font-medium text-gray-800">
                  {user.name || 'Creador'}
                </div>
                <div className="text-sm text-gray-500">
                  Panel de creador
                </div>
              </div>
            </button>
            <div className="mt-3 space-y-1">
              <button
                onClick={() => {
                  logout();
                  closeMobileMenu();
                }}
                className="block px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100 w-full text-left"
              >
                <div className="flex items-center">
                  <LogOut className="h-4 w-4 mr-3" />
                  Logout
                </div>
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Profile Dropdown - FUERA del menú móvil */}
      <UserProfileDropdown
        user={user}
        isOpen={isProfileDropdownOpen}
        onClose={closeProfileDropdown}
        onViewRewards={openRewardsModal}
        onCloseMobileMenu={() => setIsMobileMenuOpen(false)}
      />
    </nav>
  );
}
