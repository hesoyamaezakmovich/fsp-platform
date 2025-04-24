// src/components/AnalyticsDashboard.jsx - Реализация сценария 10: Аналитика достижений и соревнований
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';

const AnalyticsDashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState({
    totalCompetitions: 0,
    totalUsers: 0,
    totalTeams: 0,
    totalApplications: 0,
  });
  const [competitions, setCompetitions] = useState([]);
  const [users, setUsers] = useState([]);
  const [applications, setApplications] = useState([]);
  const [error, setError] = useState(null);
  
  // Фильтры
  const [filters, setFilters] = useState({
    disciplineId: '',
    regionId: '',
    competitionType: '',
    applicationStatus: '',
    dateFrom: '',
    dateTo: '',
    searchQuery: '',
  });

  // Список для фильтров
  const [disciplines, setDisciplines] = useState([]);
  const [regions, setRegions] = useState([]);
  
  // Активная вкладка для отображения данных
  const [activeTab, setActiveTab] = useState('competitions');

  // Состояния для модального окна предпросмотра
  const [showPreview, setShowPreview] = useState(false);
  const [previewData, setPreviewData] = useState([]);
  const [previewHeaders, setPreviewHeaders] = useState([]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data?.user) {
        setUser(data.user);
        
        // Проверяем, имеет ли пользователь роль admin
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('role')
          .eq('id', data.user.id)
          .single();
          
        if (userError) {
          console.error('Ошибка при проверке роли:', userError);
          setError('У вас нет прав доступа к этой странице');
          return;
        }
        
        if (userData.role !== 'fsp_admin') {
          setError('Доступ к аналитике имеют только администраторы ФСП');
          return;
        }
      } else {
        setError('Необходимо войти в систему');
      }
    };
    
    fetchUser();
  }, []);

  useEffect(() => {
    // Загрузка справочников для фильтров
    const fetchReferenceData = async () => {
      try {
        // Загрузка дисциплин
        const { data: disciplinesData, error: disciplinesError } = await supabase
          .from('disciplines')
          .select('id, name');
          
        if (disciplinesError) throw disciplinesError;
        setDisciplines(disciplinesData || []);
        
        // Загрузка регионов
        const { data: regionsData, error: regionsError } = await supabase
          .from('regions')
          .select('id, name');
          
        if (regionsError) throw regionsError;
        setRegions(regionsData || []);
      } catch (error) {
        console.error('Ошибка при загрузке справочных данных:', error.message);
      }
    };
    
    fetchReferenceData();
  }, []);

  useEffect(() => {
    // Загрузка статистики дашборда
    const fetchDashboardStats = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        // Получение количества соревнований
        const { count: competitionsCount, error: competitionsError } = await supabase
          .from('competitions')
          .select('id', { count: 'exact', head: true });
          
        if (competitionsError) throw competitionsError;
        
        // Получение количества пользователей
        const { count: usersCount, error: usersError } = await supabase
          .from('users')
          .select('id', { count: 'exact', head: true });
          
        if (usersError) throw usersError;
        
        // Получение количества команд
        const { count: teamsCount, error: teamsError } = await supabase
          .from('teams')
          .select('id', { count: 'exact', head: true });
          
        if (teamsError) throw teamsError;
        
        // Получение количества заявок
        const { count: applicationsCount, error: applicationsError } = await supabase
          .from('applications')
          .select('id', { count: 'exact', head: true });
          
        if (applicationsError) throw applicationsError;
        
        setDashboardData({
          totalCompetitions: competitionsCount,
          totalUsers: usersCount,
          totalTeams: teamsCount,
          totalApplications: applicationsCount,
        });
      } catch (error) {
        console.error('Ошибка при загрузке статистики:', error.message);
        setError('Не удалось загрузить статистические данные');
      } finally {
        setLoading(false);
      }
    };
    
    fetchDashboardStats();
  }, [user]);

  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters({
      ...filters,
      [name]: value,
    });
  };

  const resetFilters = () => {
    setFilters({
      disciplineId: '',
      regionId: '',
      competitionType: '',
      applicationStatus: '',
      dateFrom: '',
      dateTo: '',
      searchQuery: '',
    });
  };

  const applyFilters = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      if (activeTab === 'competitions') {
        // Формируем запрос для соревнований
        let query = supabase
          .from('competitions')
          .select(`
            id,
            name,
            type,
            status,
            registration_start_date,
            registration_end_date,
            start_date,
            end_date,
            discipline_id,
            region_id,
            disciplines(name),
            regions(name)
          `);
        
        // Добавляем фильтры
        if (filters.disciplineId) {
          query = query.eq('discipline_id', filters.disciplineId);
        }
        
        if (filters.regionId) {
          query = query.eq('region_id', filters.regionId);
        }
        
        if (filters.competitionType) {
          query = query.eq('type', filters.competitionType);
        }
        
        if (filters.dateFrom) {
          query = query.gte('start_date', filters.dateFrom);
        }
        
        if (filters.dateTo) {
          query = query.lte('end_date', filters.dateTo);
        }
        
        if (filters.searchQuery) {
          query = query.ilike('name', `%${filters.searchQuery}%`);
        }
        
        // Сортировка по дате начала (от ближайших к дальним)
        query = query.order('start_date', { ascending: true });
        
        const { data, error } = await query;
        
        if (error) throw error;
        setCompetitions(data || []);
      } else if (activeTab === 'users') {
        // Формируем запрос для пользователей
        let query = supabase
          .from('users')
          .select(`
            id,
            full_name,
            email,
            role,
            region_id,
            created_at,
            regions(name)
          `);
        
        // Добавляем фильтры
        if (filters.regionId) {
          query = query.eq('region_id', filters.regionId);
        }
        
        if (filters.searchQuery) {
          query = query.or(`full_name.ilike.%${filters.searchQuery}%,email.ilike.%${filters.searchQuery}%`);
        }
        
        // Сортировка по дате регистрации (от новых к старым)
        query = query.order('created_at', { ascending: false });
        
        const { data, error } = await query;
        
        if (error) throw error;
        setUsers(data || []);
      } else if (activeTab === 'applications') {
        // Формируем запрос для заявок
        let query = supabase
          .from('applications')
          .select(`
            id,
            competition_id,
            applicant_user_id,
            applicant_team_id,
            application_type,
            status,
            submitted_at,
            competitions(
              name,
              discipline_id,
              region_id,
              disciplines(name),
              regions(name)
            ),
            users!applications_applicant_user_id_fkey(full_name, email, region_id, regions(name)),
            teams(name, captain_user_id, users(full_name, email))
          `);
        
        // Добавляем фильтры
        if (filters.applicationStatus) {
          query = query.eq('status', filters.applicationStatus);
        }
        
        if (filters.dateFrom) {
          query = query.gte('submitted_at', filters.dateFrom);
        }
        
        if (filters.dateTo) {
          query = query.lte('submitted_at', filters.dateTo);
        }
        
        // Более сложные фильтры через JOIN
        if (filters.disciplineId || filters.regionId || filters.searchQuery) {
          // Эти фильтры требуют дополнительной обработки на стороне клиента
          const { data, error } = await query;
          
          if (error) throw error;
          
          let filteredData = data || [];
          
          // Фильтрация по дисциплине
          if (filters.disciplineId) {
            filteredData = filteredData.filter(app => 
              app.competitions?.discipline_id === parseInt(filters.disciplineId)
            );
          }
          
          // Фильтрация по региону
          if (filters.regionId) {
            filteredData = filteredData.filter(app => {
              // Проверяем регион соревнования
              const competitionRegionId = app.competitions?.region_id;
              
              // Проверяем регион пользователя (если индивидуальная заявка)
              const userRegionId = app.users?.region_id;
              
              return competitionRegionId === parseInt(filters.regionId) || 
                     userRegionId === parseInt(filters.regionId);
            });
          }
          
          // Фильтрация по поисковому запросу
          if (filters.searchQuery) {
            const searchLower = filters.searchQuery.toLowerCase();
            filteredData = filteredData.filter(app => {
              // Ищем в названии соревнования
              const competitionName = app.competitions?.name || '';
              
              // Ищем в имени пользователя
              const userName = app.users?.full_name || '';
              
              // Ищем в имени команды
              const teamName = app.teams?.name || '';
              
              return competitionName.toLowerCase().includes(searchLower) ||
                     userName.toLowerCase().includes(searchLower) ||
                     teamName.toLowerCase().includes(searchLower);
            });
          }
          
          setApplications(filteredData);
        } else {
          // Если нет сложных фильтров, просто выполняем запрос
          const { data, error } = await query.order('submitted_at', { ascending: false });
          
          if (error) throw error;
          setApplications(data || []);
        }
      }
      
    } catch (error) {
      console.error('Ошибка при применении фильтров:', error.message);
      setError('Не удалось получить данные с указанными фильтрами');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('ru-RU');
  };

  // Функция для подготовки данных предпросмотра
  const preparePreviewData = () => {
    let headers = [];
    let data = [];
    
    if (activeTab === 'competitions') {
      headers = ['ID', 'Название', 'Тип', 'Статус', 'Дисциплина', 'Регион', 'Дата начала', 'Дата окончания'];
      
      data = competitions.map(comp => [
        comp.id,
        comp.name,
        comp.type,
        comp.status,
        comp.disciplines?.name || '',
        comp.regions?.name || '',
        formatDate(comp.start_date),
        formatDate(comp.end_date)
      ]);
    } else if (activeTab === 'users') {
      headers = ['ID', 'Имя', 'Email', 'Роль', 'Регион', 'Дата регистрации'];
      
      data = users.map(user => [
        user.id,
        user.full_name,
        user.email,
        user.role,
        user.regions?.name || '',
        formatDate(user.created_at)
      ]);
    } else if (activeTab === 'applications') {
      headers = ['ID', 'Соревнование', 'Тип заявки', 'Статус', 'Заявитель', 'Дата подачи'];
      
      data = applications.map(app => {
        let applicantName = '';
        
        if (app.application_type === 'индивидуальная') {
          applicantName = app.users?.full_name || app.users?.email || '';
        } else {
          applicantName = app.teams?.name || '';
        }
        
        return [
          app.id,
          app.competitions?.name || '',
          app.application_type,
          app.status,
          applicantName,
          formatDate(app.submitted_at)
        ];
      });
    }
    
    setPreviewHeaders(headers);
    setPreviewData(data.slice(0, 10)); // Показываем только первые 10 строк для предпросмотра
    setShowPreview(true);
  };

  // Улучшенная функция экспорта CSV
  const exportToCSV = () => {
    let data = [];
    let headers = [];
    let filename = '';
    
    // Функция для экранирования специальных символов в CSV
    const escapeCSV = (value) => {
      if (value === null || value === undefined) return '';
      
      const stringValue = String(value);
      
      // Если значение содержит запятую, кавычки или перенос строки, оборачиваем его в кавычки
      if (stringValue.includes(',') || stringValue.includes('"') || stringValue.includes('\n') || stringValue.includes('\r')) {
        // Экранируем кавычки, удваивая их
        return `"${stringValue.replace(/"/g, '""')}"`;
      }
      
      return stringValue;
    };
    
    // Подготовка данных в зависимости от активной вкладки
    if (activeTab === 'competitions') {
      headers = ['ID', 'Название', 'Тип', 'Статус', 'Дисциплина', 'Регион', 'Дата начала', 'Дата окончания'];
      filename = 'competitions.csv';
      
      data = competitions.map(comp => [
        comp.id,
        comp.name,
        comp.type,
        comp.status,
        comp.disciplines?.name || '',
        comp.regions?.name || '',
        formatDate(comp.start_date),
        formatDate(comp.end_date)
      ]);
    } else if (activeTab === 'users') {
      headers = ['ID', 'Имя', 'Email', 'Роль', 'Регион', 'Дата регистрации'];
      filename = 'users.csv';
      
      data = users.map(user => [
        user.id,
        user.full_name,
        user.email,
        user.role,
        user.regions?.name || '',
        formatDate(user.created_at)
      ]);
    } else if (activeTab === 'applications') {
      headers = ['ID', 'Соревнование', 'Тип заявки', 'Статус', 'Заявитель', 'Дата подачи'];
      filename = 'applications.csv';
      
      data = applications.map(app => {
        let applicantName = '';
        
        if (app.application_type === 'индивидуальная') {
          applicantName = app.users?.full_name || app.users?.email || '';
        } else {
          applicantName = app.teams?.name || '';
        }
        
        return [
          app.id,
          app.competitions?.name || '',
          app.application_type,
          app.status,
          applicantName,
          formatDate(app.submitted_at)
        ];
      });
    }
    
    // Кодировка CSV с поддержкой кириллицы: BOM для UTF-8
    const BOM = '\uFEFF';
    
    // Создаем CSV-строку с правильным экранированием значений
    const csvRows = [
      headers.map(header => escapeCSV(header)).join(','),
      ...data.map(row => row.map(cell => escapeCSV(cell)).join(','))
    ];
    
    const csvContent = BOM + csvRows.join('\r\n');
    
    // Создаем Blob с правильной кодировкой и скачиваем
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    // Создаем ссылку для скачивания
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    
    // Очищаем ресурсы
    document.body.removeChild(link);
    URL.revokeObjectURL(url); // Освобождаем ресурсы браузера
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white">
        <Navbar user={user} />
        <div className="container mx-auto px-4 py-8">
          <div className="bg-red-900 text-white p-4 rounded-lg">
            <h2 className="text-xl font-bold mb-2">Ошибка</h2>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-6">Аналитика соревнований и достижений</h1>
        
        {/* Карточки со статистикой */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Всего соревнований</h3>
            <p className="text-2xl font-bold">{dashboardData.totalCompetitions}</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Всего пользователей</h3>
            <p className="text-2xl font-bold">{dashboardData.totalUsers}</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Всего команд</h3>
            <p className="text-2xl font-bold">{dashboardData.totalTeams}</p>
          </div>
          
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            <h3 className="text-gray-400 text-sm">Всего заявок</h3>
            <p className="text-2xl font-bold">{dashboardData.totalApplications}</p>
          </div>
        </div>
        
        {/* Вкладки */}
        <div className="mb-6">
          <div className="border-b border-gray-700">
            <nav className="flex -mb-px">
              <button
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'competitions' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('competitions')}
              >
                Соревнования
              </button>
              <button
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'users' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('users')}
              >
                Пользователи
              </button>
              <button
                className={`mr-2 py-2 px-4 border-b-2 font-medium text-sm ${
                  activeTab === 'applications' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300 hover:border-gray-300'
                }`}
                onClick={() => setActiveTab('applications')}
              >
                Заявки
              </button>
            </nav>
          </div>
        </div>
        
        {/* Фильтры */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6">
          <h2 className="text-lg font-semibold mb-4">Фильтры</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
            {/* Универсальные фильтры */}
            <div>
              <label className="block text-gray-300 text-sm mb-1">Поиск</label>
              <input
                type="text"
                name="searchQuery"
                value={filters.searchQuery}
                onChange={handleFilterChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                placeholder="Введите для поиска..."
              />
            </div>
            
            {/* Фильтры в зависимости от вкладки */}
            {(activeTab === 'competitions' || activeTab === 'applications') && (
              <div>
                <label className="block text-gray-300 text-sm mb-1">Дисциплина</label>
                <select
                  name="disciplineId"
                  value={filters.disciplineId}
                  onChange={handleFilterChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Все дисциплины</option>
                  {disciplines.map(discipline => (
                    <option key={discipline.id} value={discipline.id}>
                      {discipline.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {(activeTab === 'competitions' || activeTab === 'applications' || activeTab === 'users') && (
              <div>
                <label className="block text-gray-300 text-sm mb-1">Регион</label>
                <select
                  name="regionId"
                  value={filters.regionId}
                  onChange={handleFilterChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Все регионы</option>
                  {regions.map(region => (
                    <option key={region.id} value={region.id}>
                      {region.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            
            {activeTab === 'competitions' && (
              <div>
                <label className="block text-gray-300 text-sm mb-1">Тип соревнования</label>
                <select
                  name="competitionType"
                  value={filters.competitionType}
                  onChange={handleFilterChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Все типы</option>
                  <option value="открытое">Открытое</option>
                  <option value="региональное">Региональное</option>
                  <option value="федеральное">Федеральное</option>
                </select>
              </div>
            )}
            
            {activeTab === 'applications' && (
              <div>
                <label className="block text-gray-300 text-sm mb-1">Статус заявки</label>
                <select
                  name="applicationStatus"
                  value={filters.applicationStatus}
                  onChange={handleFilterChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="">Все статусы</option>
                  <option value="на_рассмотрении">На рассмотрении</option>
                  <option value="одобрена">Одобрена</option>
                  <option value="отклонена">Отклонена</option>
                  <option value="формируется">Формируется</option>
                </select>
              </div>
            )}
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Дата начала</label>
              <input
                type="date"
                name="dateFrom"
                value={filters.dateFrom}
                onChange={handleFilterChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-gray-300 text-sm mb-1">Дата окончания</label>
              <input
                type="date"
                name="dateTo"
                value={filters.dateTo}
                onChange={handleFilterChange}
                className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          
          <div className="flex justify-end space-x-4">
            <button
              onClick={resetFilters}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
            >
              Сбросить
            </button>
            <button
              onClick={applyFilters}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
            >
              Применить фильтры
            </button>
          </div>
        </div>
        
        {/* Кнопки экспорта и предпросмотра */}
        <div className="flex justify-end mb-4 space-x-4">
          <button
            onClick={preparePreviewData}
            className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-md transition"
          >
            Предпросмотр данных
          </button>
          <button
            onClick={exportToCSV}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
          >
            Выгрузить в CSV
          </button>
        </div>
        
        {/* Таблица данных */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-4 mb-6 overflow-x-auto">
          {loading ? (
            <div className="text-center py-8">
              <div className="text-lg text-gray-400">Загрузка данных...</div>
            </div>
          ) : (
            <>
              {/* Таблица соревнований */}
              {activeTab === 'competitions' && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Соревнования {competitions.length > 0 && `(${competitions.length})`}</h2>
                  
                  {competitions.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      Соревнования не найдены
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Название
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Тип
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Дисциплина
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Регион
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Даты проведения
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Статус
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {competitions.map(competition => (
                          <tr key={competition.id} className="hover:bg-gray-700">
                            <td className="px-4 py-3">
                              {competition.name}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                competition.type === 'открытое' ? 'bg-green-900 text-green-300' :
                                competition.type === 'региональное' ? 'bg-yellow-900 text-yellow-300' :
                                'bg-blue-900 text-blue-300'
                              }`}>
                                {competition.type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {competition.disciplines?.name || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {competition.regions?.name || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(competition.start_date)} - {formatDate(competition.end_date)}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                competition.status === 'открыта_регистрация' ? 'bg-green-900 text-green-300' :
                                competition.status === 'идет_соревнование' ? 'bg-blue-900 text-blue-300' :
                                competition.status === 'завершено' ? 'bg-gray-700 text-gray-300' :
                                'bg-yellow-900 text-yellow-300'
                              }`}>
                                {competition.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <Link 
                                to={`/competitions/${competition.id}`}
                                className="text-blue-500 hover:text-blue-400"
                              >
                                Подробнее
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
              
              {/* Таблица пользователей */}
              {activeTab === 'users' && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Пользователи {users.length > 0 && `(${users.length})`}</h2>
                  
                  {users.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      Пользователи не найдены
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Имя
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Email
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Роль
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Регион
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Дата регистрации
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {users.map(user => (
                          <tr key={user.id} className="hover:bg-gray-700">
                            <td className="px-4 py-3">
                              {user.full_name || 'Не указано'}
                            </td>
                            <td className="px-4 py-3">
                              {user.email}
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                user.role === 'fsp_admin' ? 'bg-red-900 text-red-300' :
                                user.role === 'regional_rep' ? 'bg-blue-900 text-blue-300' :
                                'bg-green-900 text-green-300'
                              }`}>
                                {user.role === 'fsp_admin' ? 'Админ ФСП' :
                                 user.role === 'regional_rep' ? 'Региональный представитель' :
                                 'Спортсмен'}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {user.regions?.name || '-'}
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(user.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
              
              {/* Таблица заявок */}
              {activeTab === 'applications' && (
                <>
                  <h2 className="text-lg font-semibold mb-4">Заявки {applications.length > 0 && `(${applications.length})`}</h2>
                  
                  {applications.length === 0 ? (
                    <div className="text-center py-6 text-gray-400">
                      Заявки не найдены
                    </div>
                  ) : (
                    <table className="min-w-full divide-y divide-gray-700">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Соревнование
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Тип заявки
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Заявитель
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Статус
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Дата подачи
                          </th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Действия
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-700">
                        {applications.map(app => (
                          <tr key={app.id} className="hover:bg-gray-700">
                            <td className="px-4 py-3">
                              {app.competitions?.name || '-'}
                              <div className="text-xs text-gray-400">
                                {app.competitions?.disciplines?.name || '-'}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                app.application_type === 'индивидуальная' ? 'bg-purple-900 text-purple-300' : 'bg-blue-900 text-blue-300'
                              }`}>
                                {app.application_type}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {app.application_type === 'индивидуальная' 
                                ? (app.users?.full_name || app.users?.email || '-')
                                : (app.teams?.name || '-')
                              }
                              <div className="text-xs text-gray-400">
                                {app.application_type === 'командная' && app.teams?.users
                                  ? `Капитан: ${app.teams.users.full_name || app.teams.users.email || '-'}`
                                  : ''
                                }
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                app.status === 'одобрена' ? 'bg-green-900 text-green-300' :
                                app.status === 'на_рассмотрении' ? 'bg-yellow-900 text-yellow-300' :
                                app.status === 'отклонена' ? 'bg-red-900 text-red-300' :
                                'bg-gray-700 text-gray-300'
                              }`}>
                                {app.status}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              {formatDate(app.submitted_at)}
                            </td>
                            <td className="px-4 py-3">
                              <Link 
                                to={`/competitions/${app.competition_id}`}
                                className="text-blue-500 hover:text-blue-400"
                              >
                                К соревнованию
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Модальное окно предпросмотра */}
      {showPreview && (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-lg max-w-4xl w-full p-6 mx-4 max-h-[90vh] overflow-auto">
            <h3 className="text-xl font-semibold mb-4">Предпросмотр данных для экспорта</h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-700">
                <thead>
                  <tr>
                    {previewHeaders.map((header, index) => (
                      <th 
                        key={index} 
                        className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase tracking-wider"
                      >
                        {header}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-700">
                  {previewData.map((row, rowIndex) => (
                    <tr key={rowIndex} className="hover:bg-gray-700">
                      {row.map((cell, cellIndex) => (
                        <td key={cellIndex} className="px-4 py-3">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            <div className="mt-4 text-sm text-gray-400">
              Показаны первые {previewData.length} записей из {activeTab === 'competitions' 
                ? competitions.length 
                : activeTab === 'users' 
                  ? users.length 
                  : applications.length}.
            </div>
            
            <div className="flex justify-end space-x-4 mt-6">
              <button
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
              >
                Закрыть
              </button>
              <button
                onClick={exportToCSV}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
              >
                Экспортировать в CSV
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AnalyticsDashboard;