// src/components/CompetitionDetails.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';

const CompetitionDetails = () => {
  const { id } = useParams();
  const [competition, setCompetition] = useState(null);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [userTeams, setUserTeams] = useState([]);
  const [showTeamApplicationModal, setShowTeamApplicationModal] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState('');
  const [teamMembers, setTeamMembers] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState(null);

  // Получение текущего пользователя
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    
    fetchUser();
  }, []);

  // Загрузка данных соревнования
  useEffect(() => {
    const fetchCompetition = async () => {
      try {
        setLoading(true);
        
        // Получаем данные соревнования
        const { data: competitionData, error: competitionError } = await supabase
          .from('competitions')
          .select(`
            *,
            disciplines(name),
            regions(name),
            users(full_name, email)
          `)
          .eq('id', id)
          .single();
          
        if (competitionError) throw competitionError;
        
        setCompetition(competitionData);
        
        // Проверяем, подал ли пользователь уже заявку
        if (user) {
          // Проверка индивидуальной заявки
          const { data: individualApplication } = await supabase
            .from('applications')
            .select('id, status')
            .eq('competition_id', id)
            .eq('applicant_user_id', user.id)
            .maybeSingle();
          
          // Получаем команды пользователя (где он капитан)
          const { data: teamsData, error: teamsError } = await supabase
            .from('teams')
            .select('id, name')
            .eq('captain_user_id', user.id);
            
          if (teamsError) throw teamsError;
          setUserTeams(teamsData || []);
          
          // Проверяем заявки от команд пользователя
          if (teamsData && teamsData.length > 0) {
            const teamIds = teamsData.map(team => team.id);
            
            const { data: teamApplications } = await supabase
              .from('applications')
              .select('id, applicant_team_id, status')
              .eq('competition_id', id)
              .in('applicant_team_id', teamIds)
              .maybeSingle();
              
            if (teamApplications) {
              setApplicationStatus(teamApplications.status);
              setSelectedTeamId(teamApplications.applicant_team_id);
            } else if (individualApplication) {
              setApplicationStatus(individualApplication.status);
            }
          } else if (individualApplication) {
            setApplicationStatus(individualApplication.status);
          }
        }
      } catch (error) {
        console.error('Ошибка при загрузке соревнования:', error.message);
        setError('Не удалось загрузить данные соревнования. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    if (id) {
      fetchCompetition();
    }
  }, [id, user]);

  // Загрузка участников команды при выборе команды
  useEffect(() => {
    const fetchTeamMembers = async () => {
      if (!selectedTeamId) {
        setTeamMembers([]);
        return;
      }
      
      try {
        const { data: membersData, error: membersError } = await supabase
          .from('team_members')
          .select(`
            user_id,
            users(id, full_name, email)
          `)
          .eq('team_id', selectedTeamId);
          
        if (membersError) throw membersError;
        
        setTeamMembers(membersData?.map(member => member.users) || []);
      } catch (error) {
        console.error('Ошибка при загрузке участников команды:', error.message);
        setError('Не удалось загрузить участников команды. Попробуйте позже.');
      }
    };
    
    fetchTeamMembers();
  }, [selectedTeamId]);

  // Проверка, является ли пользователь капитаном команды
  const isTeamCaptain = (teamId) => {
    // Получим команду из списка команд пользователя
    const selectedTeam = userTeams.find(team => team.id === teamId);
    
    // Выведем отладочную информацию (потом можно удалить)
    console.log('Проверка капитана для команды:', teamId);
    console.log('Пользователь:', user?.id);
    console.log('Команда найдена:', selectedTeam);
    
    // Проверяем, найдена ли команда и является ли пользователь ее капитаном
    return selectedTeam !== undefined;
  };

  // Обработчик изменения выбранной команды
  const handleTeamChange = (e) => {
    setSelectedTeamId(e.target.value);
  };

  // Отправка заявки от команды
  const submitTeamApplication = async () => {
    if (!selectedTeamId) {
      setError('Выберите команду для участия в соревновании');
      return;
    }
    
    try {
      setLoading(true);
      
      // Получаем информацию о выбранной команде
      const { data: teamData, error: teamError } = await supabase
        .from('teams')
        .select('captain_user_id')
        .eq('id', selectedTeamId)
        .single();
        
      if (teamError) throw teamError;
      
      // Проверяем, является ли пользователь капитаном команды напрямую
      if (teamData.captain_user_id !== user.id) {
        throw new Error('Вы не являетесь капитаном выбранной команды');
      }
      
      // Проверяем, есть ли участники в команде
      if (teamMembers.length === 0) {
        throw new Error('В команде должен быть хотя бы один участник');
      }
      
      // Проверяем, не подана ли уже заявка от этой команды
      const { data: existingApp, error: checkError } = await supabase
        .from('applications')
        .select('id')
        .eq('competition_id', id)
        .eq('applicant_team_id', selectedTeamId)
        .maybeSingle();
        
      if (checkError) throw checkError;
      
      if (existingApp) {
        throw new Error('От этой команды уже подана заявка на это соревнование');
      }
      
      // Создаем новую заявку
      const { data, error } = await supabase
        .from('applications')
        .insert([
          {
            competition_id: id,
            applicant_team_id: selectedTeamId,
            applicant_user_id: null,
            application_type: 'командная',
            submitted_by_user_id: user.id,
            status: 'на_рассмотрении',
            submitted_at: new Date().toISOString()
          }
        ])
        .select();
        
      if (error) throw error;
      
      setApplicationStatus('на_рассмотрении');
      setShowTeamApplicationModal(false);
      alert('Заявка успешно отправлена!');
      
    } catch (error) {
      console.error('Ошибка при отправке заявки:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  // Показать индикатор загрузки
  if (loading && !competition) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  // Показать сообщение об ошибке
  if (error && !competition) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  // Форматирование даты
  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleString('ru-RU');
  };

  // Определение текущего статуса соревнования
  const getCompetitionStatus = () => {
    if (!competition) return '';
    
    const now = new Date();
    const regStart = new Date(competition.registration_start_date);
    const regEnd = new Date(competition.registration_end_date);
    const compStart = new Date(competition.start_date);
    const compEnd = new Date(competition.end_date);
    
    if (now < regStart) {
      return 'скоро_открытие';
    } else if (now >= regStart && now <= regEnd) {
      return 'открыта_регистрация';
    } else if (now > regEnd && now < compStart) {
      return 'регистрация_закрыта';
    } else if (now >= compStart && now <= compEnd) {
      return 'идет_соревнование';
    } else {
      return 'завершено';
    }
  };

  // Проверка, может ли пользователь подать заявку
  const canApply = () => {
    if (!user || !competition) return false;
    
    const status = getCompetitionStatus();
    return status === 'открыта_регистрация' && !applicationStatus;
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar user={user} />
      
      <div className="container mx-auto px-4 py-8">
        {competition && (
          <>
            <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold">{competition.name}</h1>
                <div className="flex flex-wrap gap-2 mt-2">
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    competition.type === 'открытое' ? 'bg-green-900 text-green-300' :
                    competition.type === 'региональное' ? 'bg-yellow-900 text-yellow-300' :
                    'bg-blue-900 text-blue-300'
                  }`}>
                    {competition.type}
                  </span>
                  
                  <span className="px-2 py-1 bg-purple-900 text-purple-300 rounded-full text-xs">
                    {competition.disciplines?.name || 'Общая дисциплина'}
                  </span>
                  
                  <span className={`px-2 py-1 rounded-full text-xs ${
                    getCompetitionStatus() === 'открыта_регистрация' ? 'bg-green-900 text-green-300' :
                    getCompetitionStatus() === 'идет_соревнование' ? 'bg-blue-900 text-blue-300' :
                    getCompetitionStatus() === 'завершено' ? 'bg-gray-700 text-gray-300' :
                    'bg-yellow-900 text-yellow-300'
                  }`}>
                    {getCompetitionStatus() === 'открыта_регистрация' ? 'Регистрация открыта' :
                     getCompetitionStatus() === 'идет_соревнование' ? 'Идет соревнование' :
                     getCompetitionStatus() === 'завершено' ? 'Завершено' :
                     getCompetitionStatus() === 'регистрация_закрыта' ? 'Регистрация закрыта' :
                     'Скоро открытие'}
                  </span>
                </div>
              </div>
              
              <div className="mt-4 md:mt-0">
                <Link
                  to="/competitions"
                  className="text-gray-300 hover:text-white mr-4"
                >
                  ← К списку соревнований
                </Link>

                {competition && user && competition.organizer_user_id === user.id && (
  <div className="mt-8 bg-gray-800 border border-gray-700 rounded-lg p-6">
    <h2 className="text-xl font-semibold mb-4">Управление соревнованием</h2>
    <div className="flex flex-wrap gap-3">
      <Link
        to={`/competitions/${id}/applications`}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
      >
        Просмотр и управление заявками
      </Link>
      
      <Link
        to={`/competitions/${id}/edit`}
        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
      >
        Редактировать соревнование
      </Link>
    </div>
  </div>
)}


                
                {canApply() && (
                  <button
                    onClick={() => setShowTeamApplicationModal(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
                  >
                    Подать заявку командой
                  </button>
                )}
                
                {applicationStatus && (
                  <div className="mt-2 md:mt-0 md:ml-2 inline-block px-3 py-1 rounded-md bg-gray-800 text-sm">
                    Статус заявки: <span className="font-semibold">{applicationStatus}</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="md:col-span-2">
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 mb-6">
                  <h2 className="text-xl font-semibold mb-4">Описание</h2>
                  <p className="text-gray-300 whitespace-pre-line">{competition.description || 'Описание отсутствует'}</p>
                </div>
                
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-xl font-semibold mb-4">Детали соревнования</h2>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-400 mb-1">Организатор:</p>
                      <p>{competition.users?.full_name || competition.users?.email || 'Не указан'}</p>
                    </div>
                    
                    {competition.type === 'региональное' && (
                      <div>
                        <p className="text-gray-400 mb-1">Регион:</p>
                        <p>{competition.regions?.name || 'Не указан'}</p>
                      </div>
                    )}
                    
                    {competition.max_participants_or_teams && (
                      <div>
                        <p className="text-gray-400 mb-1">Максимум участников/команд:</p>
                        <p>{competition.max_participants_or_teams}</p>
                      </div>
                    )}
                    
                    <div>
                      <p className="text-gray-400 mb-1">Статус соревнования:</p>
                      <p>{competition.status}</p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div>
                <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
                  <h2 className="text-lg font-semibold mb-4">Даты</h2>
                  
                  <div className="space-y-3">
                    <div>
                      <p className="text-gray-400 mb-1">Регистрация:</p>
                      <p className="text-green-400">{formatDate(competition.registration_start_date)}</p>
                      <p className="text-red-400 mt-1">{formatDate(competition.registration_end_date)}</p>
                    </div>
                    
                    <div>
                      <p className="text-gray-400 mb-1">Проведение:</p>
                      <p className="text-green-400">{formatDate(competition.start_date)}</p>
                      <p className="text-red-400 mt-1">{formatDate(competition.end_date)}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Модальное окно подачи командной заявки */}
            {showTeamApplicationModal && (
              <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50">
                <div className="bg-gray-800 rounded-lg max-w-lg w-full p-6 mx-4">
                  <h3 className="text-xl font-semibold mb-4">Подать заявку командой</h3>
                  
                  {error && (
                    <div className="mb-4 p-3 bg-red-900 text-white rounded-md">
                      {error}
                    </div>
                  )}
                  
                  <div className="mb-4">
                    <label className="block text-gray-300 mb-1">Выберите команду *</label>
                    <select
                      value={selectedTeamId}
                      onChange={handleTeamChange}
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      required
                    >
                      <option value="">Выберите команду</option>
                      {userTeams.map(team => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  {selectedTeamId && (
                    <div className="mb-6">
                      <label className="block text-gray-300 mb-2">Участники команды:</label>
                      {teamMembers.length > 0 ? (
                        <ul className="bg-gray-700 rounded-md p-3">
                          {teamMembers.map(member => (
                            <li key={member.id} className="mb-1">
                              {member.full_name || member.email}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-yellow-400">У этой команды нет участников. Добавьте участников в профиле команды.</p>
                      )}
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => setShowTeamApplicationModal(false)}
                      className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
                    >
                      Отмена
                    </button>
                    
                    <button
                      onClick={submitTeamApplication}
                      disabled={loading || !selectedTeamId || teamMembers.length === 0}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Отправка...' : 'Отправить заявку на модерацию'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default CompetitionDetails;