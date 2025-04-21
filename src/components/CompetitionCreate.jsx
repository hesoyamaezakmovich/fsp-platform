// src/components/CompetitionCreate.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Link, useNavigate } from 'react-router-dom';

// Компонент для навигационной панели (можно вынести в отдельный файл)
const Navbar = ({ user }) => {
  const [userProfile, setUserProfile] = useState(null);
  
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
  
  return (
    <nav className="bg-gray-800 border-b border-gray-700">
      <div className="container mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/dashboard" className="text-xl font-bold text-blue-500">ФСП</Link>
            
            <div className="ml-10 flex space-x-4">
              <Link to="/dashboard" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Главная
              </Link>
              <Link to="/competitions" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Соревнования
              </Link>
              <Link to="/teams" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
                Команды
              </Link>
            </div>
          </div>
          
          <div className="flex items-center">
            <Link to="/profile" className="text-gray-300 hover:text-white px-3 py-2 rounded-md">
              {userProfile?.full_name || user.email}
            </Link>
            <button
              onClick={handleLogout}
              className="ml-4 bg-red-600 hover:bg-red-700 text-white px-3 py-1 rounded-md text-sm"
            >
              Выйти
            </button>
          </div>
        </div>
      </div>
    </nav>
  );
};

// Основной компонент создания соревнования
const CompetitionCreate = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [disciplines, setDisciplines] = useState([]);
  const [regions, setRegions] = useState([]);
  const [error, setError] = useState(null);
  
  // Состояние формы
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    discipline_id: '',
    type: 'открытое', // По умолчанию - открытое соревнование
    region_id: null, // Для региональных соревнований
    registration_start_date: '',
    registration_end_date: '',
    start_date: '',
    end_date: '',
    max_participants_or_teams: '',
    status: 'черновик'
  });
  
  // Загрузка пользователя и необходимых данных
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    
    fetchUser();
  }, []);
  
  // Загрузка справочных данных (дисциплины и регионы)
  useEffect(() => {
    const fetchData = async () => {
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
        console.error('Ошибка при загрузке данных:', error.message);
        setError('Не удалось загрузить необходимые данные. Попробуйте позже.');
      }
    };
    
    fetchData();
  }, []);
  
  // Обработчик изменения полей формы
  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Особая обработка для поля type
    if (name === 'type' && value !== 'региональное') {
      setFormData({
        ...formData,
        [name]: value,
        region_id: null // Сбрасываем регион для открытых и федеральных соревнований
      });
    } else {
      setFormData({
        ...formData,
        [name]: value
      });
    }
  };
  
  // Обработчик отправки формы
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    try {
      // Проверка обязательных полей
      const requiredFields = [
        'name', 'discipline_id', 'type', 
        'registration_start_date', 'registration_end_date',
        'start_date', 'end_date'
      ];
      
      // Если тип "региональное", то регион обязателен
      if (formData.type === 'региональное' && !formData.region_id) {
        throw new Error('Необходимо выбрать регион для регионального соревнования');
      }
      
      // Проверка всех обязательных полей
      for (const field of requiredFields) {
        if (!formData[field]) {
          throw new Error(`Поле "${field}" обязательно для заполнения`);
        }
      }
      
      // Отправка данных в базу
      const { data, error } = await supabase
        .from('competitions')
        .insert([
          {
            name: formData.name,
            description: formData.description,
            discipline_id: formData.discipline_id,
            type: formData.type,
            region_id: formData.region_id,
            registration_start_date: formData.registration_start_date,
            registration_end_date: formData.registration_end_date,
            start_date: formData.start_date,
            end_date: formData.end_date,
            max_participants_or_teams: formData.max_participants_or_teams || null,
            organizer_user_id: user.id,
            status: formData.status,
            created_at: new Date()
          }
        ])
        .select();
        
      if (error) throw error;
      
      // Перенаправление на страницу созданного соревнования
      alert('Соревнование успешно создано!');
      navigate(`/competitions/${data[0].id}`);
      
    } catch (error) {
      console.error('Ошибка при создании соревнования:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };
  
  // Валидация дат
  const validateDates = () => {
    const regStart = new Date(formData.registration_start_date);
    const regEnd = new Date(formData.registration_end_date);
    const compStart = new Date(formData.start_date);
    const compEnd = new Date(formData.end_date);
    
    if (regEnd <= regStart) {
      return 'Дата окончания регистрации должна быть позже даты начала регистрации';
    }
    
    if (compStart <= regStart) {
      return 'Дата начала соревнования должна быть позже даты начала регистрации';
    }
    
    if (compEnd <= compStart) {
      return 'Дата окончания соревнования должна быть позже даты начала соревнования';
    }
    
    return null;
  };
  
  // Показ индикатора загрузки
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Навигация */}
      <Navbar user={user} />
      
      {/* Основной контент */}
      <div className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Создание соревнования</h1>
          
          <Link
            to="/competitions"
            className="text-gray-300 hover:text-white"
          >
            ← Вернуться к списку
          </Link>
        </div>
        
        {/* Форма создания соревнования */}
        <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
          <form onSubmit={handleSubmit}>
            {/* Основная информация */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Основная информация</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Название соревнования *</label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Введите название"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Дисциплина *</label>
                  <select
                    name="discipline_id"
                    value={formData.discipline_id}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="">Выберите дисциплину</option>
                    {disciplines.map(discipline => (
                      <option key={discipline.id} value={discipline.id}>
                        {discipline.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <div className="mt-4">
                <label className="block text-gray-300 mb-1">Описание</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                  rows="4"
                  placeholder="Введите описание соревнования"
                ></textarea>
              </div>
            </div>
            
            {/* Тип соревнования */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Тип соревнования</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Тип *</label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    required
                  >
                    <option value="открытое">Открытое</option>
                    <option value="региональное">Региональное</option>
                    <option value="федеральное">Федеральное</option>
                  </select>
                </div>
                
                {formData.type === 'региональное' && (
                  <div>
                    <label className="block text-gray-300 mb-1">Регион *</label>
                    <select
                      name="region_id"
                      value={formData.region_id || ''}
                      onChange={handleChange}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Выберите регион</option>
                      {regions.map(region => (
                        <option key={region.id} value={region.id}>
                          {region.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
                
                <div>
                  <label className="block text-gray-300 mb-1">Максимум участников/команд</label>
                  <input
                    type="number"
                    name="max_participants_or_teams"
                    value={formData.max_participants_or_teams}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    placeholder="Без ограничений"
                    min="1"
                  />
                </div>
              </div>
            </div>
            
            {/* Даты */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Даты</h2>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-300 mb-1">Начало регистрации *</label>
                  <input
                    type="datetime-local"
                    name="registration_start_date"
                    value={formData.registration_start_date}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Конец регистрации *</label>
                  <input
                    type="datetime-local"
                    name="registration_end_date"
                    value={formData.registration_end_date}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Начало соревнования *</label>
                  <input
                    type="datetime-local"
                    name="start_date"
                    value={formData.start_date}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-gray-300 mb-1">Конец соревнования *</label>
                  <input
                    type="datetime-local"
                    name="end_date"
                    value={formData.end_date}
                    onChange={handleChange}
                    className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              {/* Валидация дат */}
              {formData.registration_start_date && formData.registration_end_date && 
               formData.start_date && formData.end_date && validateDates() && (
                <div className="mt-2 p-2 bg-red-900 text-white text-sm rounded">
                  {validateDates()}
                </div>
              )}
            </div>
            
            {/* Статус соревнования */}
            <div className="mb-6">
              <h2 className="text-lg font-semibold mb-4">Статус публикации</h2>
              
              <div className="flex items-center space-x-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="черновик"
                    checked={formData.status === 'черновик'}
                    onChange={handleChange}
                    className="form-radio text-blue-500"
                  />
                  <span className="ml-2">Сохранить как черновик</span>
                </label>
                
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="опубликовано"
                    checked={formData.status === 'опубликовано'}
                    onChange={handleChange}
                    className="form-radio text-blue-500"
                  />
                  <span className="ml-2">Опубликовать сразу</span>
                </label>
              </div>
            </div>
            
            {/* Кнопки действий */}
            <div className="flex justify-end space-x-4 mt-8">
              <Link
                to="/competitions"
                className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
              >
                Отмена
              </Link>
              
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                disabled={loading}
              >
                {loading ? 'Создание...' : 'Создать соревнование'}
              </button>
            </div>
            
            {/* Показ ошибок */}
            {error && (
              <div className="mt-4 p-3 bg-red-900 text-white rounded">
                <p className="font-semibold">Ошибка:</p>
                <p>{error}</p>
              </div>
            )}
          </form>
        </div>
      </div>
    </div>
  );
};

export default CompetitionCreate;