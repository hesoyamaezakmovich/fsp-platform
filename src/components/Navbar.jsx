import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { canCreateCompetition } from '../utils/roleUtils';

const Navbar = ({ user }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) return;

      try {
        const { data, error } = await supabase
          .from('users')
          .select('full_name, role, region_id')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        setUserProfile(data);
        setUserRole(data.role);
      } catch (error) {
        console.error('Ошибка при загрузке профиля:', error.message);
      }
    };

    fetchUserProfile();
  }, [user]);

  const handleLogout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) throw error;
      window.location.href = '/login';
    } catch (error) {
      console.error('Ошибка при выходе:', error.message);
    }
  };

  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  const toggleDropdown = () => {
    setDropdownOpen(!dropdownOpen);
  };

  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center h-16">
          {/* Логотип (остается слева) */}
          <Link to="/dashboard" className="text-xl font-bold text-blue-500">
            <img src="/image/logo.png" alt="Logo" width="80" height="80" />
          </Link>

          {/* Центрированные навигационные ссылки */}
          <div className="flex-1 flex justify-center">
            <div className="hidden md:flex space-x-4">
              <Link to="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Главная
              </Link>
              <Link to="/competitions" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Соревнования
              </Link>
              <Link to="/teams" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Мои команды
              </Link>
              {userRole && canCreateCompetition(userRole) && (
                <Link to="/admin-panel" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Панель управления
                </Link>
              )}
              {userRole === 'fsp_admin' && (
                <Link to="/analytics" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                  Аналитика
                </Link>
              )}
            </div>
          </div>

          <div className="md:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="text-gray-300 hover:text-white p-2"
              aria-label="Открыть меню"
            >
              {menuOpen ? (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>

          <div className="hidden md:flex items-center space-x-4">
            <div className="flex items-center">
              <div className="relative">
                <div className="flex items-center cursor-pointer" onClick={toggleDropdown}>
                  <img
                    src="../profile.png"
                    className="flex-shrink-0 rounded-full overflow-hidden object-cover w-10 h-10 z-10"
                    alt="Профиль"
                  />
                  <svg
                    className="ml-2 w-4 h-4 text-gray-400 hover:text-gray-600 transition-colors"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                  >
                    <path
                      fillRule="evenodd"
                      d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>

                {dropdownOpen && (
                  <div className="absolute top-full right-0 mt-2 bg-gray-700 rounded-lg shadow-lg p-4 flex flex-col items-center z-20 min-w-[200px] space-y-3">
                    <img
                      src="../profile.png"
                      className="rounded-full overflow-hidden object-cover w-16 h-16 mb-2"
                      alt="Профиль"
                    />
                    <span className="text-white text-sm font-medium text-center">
                      {userProfile?.full_name}
                    </span>
                    <span className="text-white text-sm font-medium text-center">
                      {user?.email}
                    </span>
                    <div className="w-full space-y-2">
                      <Link
                        to="/profile"
                        className="block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition text-center"
                        onClick={() => setDropdownOpen(false)}
                      >
                        К профилю
                      </Link>
                      <button
                        onClick={handleLogout}
                        className="w-full px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md transition text-sm"
                      >
                        Выйти
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {menuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
              <Link
                to="/dashboard"
                className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Главная
              </Link>
              <Link
                to="/competitions"
                className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Соревнования
              </Link>
              <Link
                to="/teams"
                className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Мои команды
              </Link>
              {userRole && canCreateCompetition(userRole) && (
                <Link
                  to="/admin-panel"
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Панель управления
                </Link>
              )}
              {userRole === 'fsp_admin' && (
                <Link
                  to="/analytics"
                  className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                  onClick={() => setMenuOpen(false)}
                >
                  Аналитика
                </Link>
              )}
              <Link
                to="/profile"
                className="block text-gray-300 hover:text-white px-3 py-2 rounded-md"
                onClick={() => setMenuOpen(false)}
              >
                Профиль
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-left mt-2 bg-red-600 hover:bg-red-700 text-white px-3 py-2 rounded-md text-sm"
              >
                Выйти
              </button>
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;