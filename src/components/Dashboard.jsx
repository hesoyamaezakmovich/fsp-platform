// src/components/Dashboard.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

// Компонент карточки соревнования
const CompetitionCard = ({ competition }) => {
  const getCompetitionStatus = () => {
    if (competition.status && competition.status !== 'опубликовано' && competition.status !== 'черновик') {
      return competition.status;
    }
    
    const now = new Date();
    const regStart = new Date(competition.registration_start_date);
    const regEnd = new Date(competition.registration_end_date);
    const compStart = new Date(competition.start_date);
    const compEnd = new Date(competition.end_date);
    
    if (now < regStart) return 'скоро_открытие';
    if (now >= regStart && now <= regEnd) return 'открыта_регистрация';
    if (now > regEnd && now < compStart) return 'регистрация_закрыта';
    if (now >= compStart && now <= compEnd) return 'идет_соревнование';
    return 'завершено';
  };

  const status = getCompetitionStatus();

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 sm:p-5 hover:shadow-lg transition h-full flex flex-col">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
        <h3 className="text-lg font-semibold text-white mb-2 sm:mb-0">{competition.name}</h3>
        <span className={`px-2 py-1 rounded-full text-xs inline-block sm:inline mt-1 sm:mt-0 ${
          status === 'открыта_регистрация' ? 'bg-green-900 text-green-300' :
          status === 'идет_соревнование' ? 'bg-blue-900 text-blue-300' :
          status === 'завершено' ? 'bg-gray-700 text-gray-300' :
          'bg-yellow-900 text-yellow-300'
        }`}>
          {status === 'открыта_регистрация' ? 'Регистрация открыта' :
          status === 'идет_соревнование' ? 'Идет соревнование' :
          status === 'завершено' ? 'Завершено' :
          status === 'регистрация_закрыта' ? 'Регистрация закрыта' :
          'Скоро открытие'}
        </span>
      </div>
      
      {/* Фиксируем высоту описания на 2 строки */}
      <div className="mt-2 min-h-[20px] line-clamp-2">
        <p className="text-gray-400 text-sm">
          {competition.description || 'Нет описания'}
        </p>
      </div>
      
      <div className="mt-4 text-sm text-gray-500 flex-grow">
        <div className="flex flex-col sm:flex-row sm:justify-between">
          <span>Начало регистрации:</span>
          <span className="text-gray-400">
            {new Date(competition.registration_start_date).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
          <span>Конец регистрации:</span>
          <span className="text-gray-400">
            {new Date(competition.registration_end_date).toLocaleDateString('ru-RU')}
          </span>
        </div>
        <div className="flex flex-col sm:flex-row sm:justify-between mt-1">
          <span>Начало соревнования:</span>
          <span className="text-gray-400">
            {new Date(competition.start_date).toLocaleDateString('ru-RU')}
          </span>
        </div>
      </div>
      
      <div className="mt-4 flex flex-col sm:flex-row sm:justify-between sm:items-center">
        <div className="flex flex-wrap gap-2 mb-2 sm:mb-0">
          <span className={`px-2 py-1 bg-gray-700 rounded-full text-xs ${
            competition.type === 'открытое' ? 'text-green-400' :
            competition.type === 'региональное' ? 'text-yellow-400' :
            'text-blue-400'
          }`}>
            {competition.type === 'открытое' ? 'Открытое' :
            competition.type === 'региональное' ? 'Региональное' :
            'Федеральное'}
          </span>
          <span className="px-2 py-1 bg-gray-700 rounded-full text-xs text-purple-400">
            {competition.discipline_name || 'Общее программирование'}
          </span>
        </div>
      </div>
    </div>
  );
};

// Основной компонент Dashboard
const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Получение текущего пользователя
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);

        // Получаем данные о пользователе, включая роль
        if (data?.user) {
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('role')
            .eq('id', data.user.id)
            .single();

          if (!userError && userData) {
            setUserRole(userData.role);
          }
        }
      } catch (error) {
        console.error('Ошибка при получении пользователя:', error.message);
      }
    };
    
    fetchUser();
  }, []);
  
  useEffect(() => {
    // Загрузка ближайших соревнований
    const fetchCompetitions = async () => {
      try {
        const { data, error } = await supabase
          .from('competitions')
          .select(`
            id,
            name,
            description,
            type,
            status,
            registration_start_date,
            registration_end_date,
            start_date,
            end_date,
            disciplines(name)
          `)
          .order('registration_start_date', { ascending: false })
          .limit(6);
          
        if (error) throw error;
        
        // Преобразование данных для отображения
        const formattedCompetitions = data.map(comp => ({
          ...comp,
          discipline_name: comp.disciplines?.name
        }));
        
        setCompetitions(formattedCompetitions);
      } catch (error) {
        console.error('Ошибка при загрузке соревнований:', error.message);
      } finally {
        setLoading(false);
      }
    };
    
    fetchCompetitions();
  }, []);
  
  // Загрузка
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Используем общий компонент навигации */}
      <Navbar user={user} />
      
      {/* Основной контент */}
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-0">Панель управления</h1>
          
          <Link
            to="/competitions/create"
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition w-full sm:w-auto text-center"
          >
            Создать соревнование
          </Link>
        </div>
        
        {/* Ближайшие соревнования */}
        <div className="mb-8 sm:mb-10">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4">
            <h2 className="text-lg sm:text-xl font-semibold mb-2 sm:mb-0">Ближайшие соревнования</h2>
            <Link to="/competitions" className="text-blue-500 hover:text-blue-400">
              Все соревнования →
            </Link>
          </div>
          
          {loading ? (
            <div className="text-center py-10">
              <div className="text-lg text-gray-400">Загрузка соревнований...</div>
            </div>
          ) : competitions.length === 0 ? (
            <div className="text-center py-10 bg-gray-800 rounded-lg">
              <div className="text-lg text-gray-400">Нет доступных соревнований</div>
              <Link
                to="/competitions/create"
                className="mt-4 inline-block px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
              >
                Создать соревнование
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
              {competitions.map(competition => (
                <CompetitionCard 
                  key={competition.id} 
                  competition={competition} 
                />
              ))}
            </div>
          )}
        </div>
        
        {/* Информационные карточки */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold">Мои заявки</h3>
            <p className="text-gray-400 mt-2">Просмотр и управление вашими заявками на соревнования</p>
            <Link
              to="/applications"
              className="mt-4 inline-block text-blue-500 hover:text-blue-400"
            >
              Перейти к заявкам →
            </Link>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold">Мои команды</h3>
            <p className="text-gray-400 mt-2">Управление командами и приглашениями</p>
            <Link
              to="/teams"
              className="mt-4 inline-block text-blue-500 hover:text-blue-400"
            >
              Перейти к командам →
            </Link>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
            <h3 className="text-lg font-semibold">Мой профиль</h3>
            <p className="text-gray-400 mt-2">Обновите личные данные и настройки профиля</p>
            <Link
              to="/profile"
              className="mt-4 inline-block text-blue-500 hover:text-blue-400"
            >
              Перейти в профиль →
            </Link>
          </div>
          
          {userRole === 'fsp_admin' && (
            <div className="bg-gray-800 border border-gray-700 rounded-lg p-5">
              <h3 className="text-lg font-semibold">Аналитика и отчеты</h3>
              <p className="text-gray-400 mt-2">Просмотр статистики соревнований, пользователей и заявок</p>
              <Link
                to="/analytics"
                className="mt-4 inline-block text-blue-500 hover:text-blue-400"
              >
                Перейти к аналитике →
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;