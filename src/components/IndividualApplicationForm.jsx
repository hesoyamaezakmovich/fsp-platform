// src/components/IndividualApplicationForm.jsx
import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { canApplyToRegionalCompetition } from '../utils/roleUtils';

const IndividualApplicationForm = ({ competitionId, user, onSuccess, onCancel }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [additionalInfo, setAdditionalInfo] = useState('');
  const [userDetails, setUserDetails] = useState(null);
  const [competition, setCompetition] = useState(null);

  // Загрузка данных пользователя и соревнования
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        
        // Загружаем данные пользователя
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select(`
            id,
            full_name,
            email,
            role,
            region_id,
            regions(id, name)
          `)
          .eq('id', user.id)
          .single();
          
        if (userError) throw userError;
        setUserDetails(userData);
        
        // Загружаем данные соревнования
        const { data: competitionData, error: compError } = await supabase
          .from('competitions')
          .select('id, type, region_id, regions(id, name)')
          .eq('id', competitionId)
          .single();
        
        if (compError) throw compError;
        setCompetition(competitionData);
        
      } catch (err) {
        console.error('Ошибка при загрузке данных:', err.message);
        setError('Не удалось загрузить необходимые данные. Попробуйте позже.');
      } finally {
        setLoading(false);
      }
    };
    
    if (user && competitionId) {
      fetchData();
    }
  }, [user, competitionId]);

  // Проверка возможности подачи заявки
  const canApply = () => {
    if (!competition || !userDetails) return false;
    
    // Для регионального соревнования проверяем регион пользователя
    if (competition.type === 'региональное') {
      return canApplyToRegionalCompetition(
        userDetails.region_id, 
        competition.region_id,
        userDetails.role
      );
    }
    
    // Для открытого соревнования - все могут подавать
    return true;
  };

  // Отправка заявки
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!canApply()) {
      setError('Вы не можете подать заявку на это соревнование. Проверьте регион.');
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Проверка на существующие заявки
      const { data: existingApplication, error: checkError } = await supabase
        .from('applications')
        .select('id')
        .eq('competition_id', competitionId)
        .eq('applicant_user_id', user.id)
        .maybeSingle();
      
      if (checkError && checkError.code !== 'PGRST116') throw checkError;
      
      if (existingApplication) {
        throw new Error('Вы уже подали заявку на это соревнование.');
      }
      
      // Создание новой заявки
      const { error: insertError } = await supabase
        .from('applications')
        .insert([
          {
            competition_id: competitionId,
            applicant_user_id: user.id,
            applicant_team_id: null,
            application_type: 'индивидуальная',
            submitted_by_user_id: user.id,
            status: 'на_рассмотрении',
            submitted_at: new Date().toISOString(),
            additional_data: additionalInfo ? JSON.stringify({ notes: additionalInfo }) : null
          }
        ]);
        
      if (insertError) throw insertError;
      
      alert('Ваша заявка успешно отправлена!');
      onSuccess();
      
    } catch (err) {
      console.error('Ошибка при подаче заявки:', err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
      <h2 className="text-lg font-semibold mb-4">Подача индивидуальной заявки</h2>
      
      {loading && !userDetails ? (
        <div className="text-center py-4">
          <p className="text-gray-400">Загрузка...</p>
        </div>
      ) : error && !canApply() ? (
        <div className="p-4 bg-red-900 text-white rounded-md">
          <p>{error}</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit}>
          {/* Информация о пользователе */}
          <div className="mb-4 p-4 bg-gray-700 rounded-md">
            <p className="font-medium text-white">{userDetails?.full_name || 'Неизвестно'}</p>
            <p className="text-sm text-gray-300 mt-1">Email: {userDetails?.email || 'Неизвестно'}</p>
            <p className="text-sm text-gray-300 mt-1">
              Регион: {userDetails?.regions?.name || 'Не указан'}
            </p>
            
            {/* Предупреждение для региональных соревнований */}
            {competition?.type === 'региональное' && userDetails?.region_id !== competition?.region_id && (
              <div className="mt-3 p-2 bg-red-900 text-red-100 text-sm rounded">
                <p>Внимание! Вы не можете участвовать в данном региональном соревновании, так как ваш регион не соответствует региону соревнования.</p>
              </div>
            )}
          </div>
          
          {/* Дополнительная информация */}
          <div className="mb-4">
            <label className="block text-gray-300 mb-1">Дополнительная информация (необязательно)</label>
            <textarea
              value={additionalInfo}
              onChange={(e) => setAdditionalInfo(e.target.value)}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
              placeholder="Опишите ваш опыт, навыки или другую информацию, которая может быть полезна организаторам"
              rows="3"
            />
          </div>
          
          {/* Вывод ошибок */}
          {error && (
            <div className="mb-4 p-3 bg-red-900 text-white rounded">
              <p>{error}</p>
            </div>
          )}
          
          {/* Кнопки управления */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-white rounded-md transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition"
              disabled={loading || !canApply()}
            >
              {loading ? 'Отправка...' : 'Отправить заявку'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default IndividualApplicationForm;