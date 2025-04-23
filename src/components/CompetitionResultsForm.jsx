// src/components/CompetitionResultsForm.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';

const CompetitionResultsForm = () => {
  const { id } = useParams(); // ID соревнования
  const [user, setUser] = useState(null);
  const [competition, setCompetition] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Получение текущего пользователя
  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  // Загрузка данных соревнования и участников
  useEffect(() => {
    const fetchCompetitionAndParticipants = async () => {
      if (!id || !user) return;

      try {
        setLoading(true);

        // Получение данных соревнования
        const { data: competitionData, error: competitionError } = await supabase
          .from('competitions')
          .select(`
            *,
            disciplines(name),
            regions(name)
          `)
          .eq('id', id)
          .single();

        if (competitionError) {
          console.error('Ошибка загрузки соревнования:', competitionError);
          throw new Error(`Ошибка загрузки соревнования: ${competitionError.message}`);
        }

        if (competitionData.organizer_user_id !== user.id) {
          throw new Error('У вас нет прав для управления результатами этого соревнования');
        }

        if (competitionData.status !== 'завершено') {
          throw new Error('Соревнование еще не завершено. Ввод результатов доступен только для завершенных соревнований.');
        }

        setCompetition(competitionData);

        // Получение одобренных заявок
        const { data: applicationsData, error: applicationsError } = await supabase
          .from('applications')
          .select(`
            id,
            application_type,
            applicant_user_id,
            applicant_team_id,
            users!applications_applicant_user_id_fkey(id, full_name, email, region_id, regions!users_region_id_fkey(name)),
            teams!applicant_team_id(id, name, captain_user_id, users!teams_captain_user_id_fkey(id, full_name, email, region_id, regions!users_region_id_fkey(name)))
          `)
          .eq('competition_id', id)
          .eq('status', 'одобрена');

        if (applicationsError) {
          console.error('Ошибка загрузки заявок:', applicationsError);
          throw new Error(`Ошибка загрузки заявок: ${applicationsError.message}`);
        }

        // Формирование списка участников
        const participantsList = applicationsData.map(app => {
          if (app.application_type === 'командная') {
            return {
              id: app.id,
              type: 'team',
              team_id: app.applicant_team_id,
              name: app.teams?.name,
              captain: app.teams?.users?.full_name || app.teams?.users?.email,
            };
          } else {
            return {
              id: app.id,
              type: 'individual',
              user_id: app.applicant_user_id,
              name: app.users?.full_name || app.users?.email,
            };
          }
        });

        setParticipants(participantsList);

        // Инициализация результатов
        setResults(
          participantsList.map(participant => ({
            application_id: participant.id,
            type: participant.type,
            user_id: participant.user_id || null,
            team_id: participant.team_id || null,
            place: '',
            score: '',
            result_data: '',
          }))
        );
      } catch (error) {
        console.error('Ошибка:', error.message);
        setError(error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompetitionAndParticipants();
  }, [id, user]);

  // Обработчик изменения полей результатов
  const handleResultChange = (applicationId, field, value) => {
    setResults(prevResults =>
      prevResults.map(result =>
        result.application_id === applicationId
          ? { ...result, [field]: value }
          : result
      )
    );
  };

  // Обработчик сохранения результатов
  const handleSaveResults = async () => {
    try {
      setLoading(true);

      // Подготовка данных для вставки
      const resultsToInsert = results.map(result => ({
        competition_id: id,
        user_id: result.user_id,
        team_id: result.team_id,
        place: result.place ? parseInt(result.place, 10) : null,
        score: result.score ? parseFloat(result.score) : null,
        result_data: result.result_data ? { details: result.result_data } : null,
        recorded_at: new Date().toISOString(),
        recorded_by_user_id: user.id,
      }));

      // Вставка результатов в таблицу competition_results
      const { error: insertError } = await supabase
        .from('competition_results')
        .insert(resultsToInsert);

      if (insertError) {
        console.error('Ошибка при сохранении результатов:', insertError);
        throw new Error(`Не удалось сохранить результаты: ${insertError.message}`);
      }

      // Обновление статуса соревнования
      const { error: updateError } = await supabase
        .from('competitions')
        .update({ status: 'результаты_опубликованы' })
        .eq('id', id);

      if (updateError) {
        console.error('Ошибка при обновлении статуса соревнования:', updateError);
        throw new Error(`Не удалось обновить статус соревнования: ${updateError.message}`);
      }

      alert('Результаты успешно сохранены!');
    } catch (error) {
      console.error('Ошибка:', error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl text-red-500">{error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl sm:text-3xl font-bold mb-6">
          Ввод результатов: {competition?.name}
        </h1>

        {participants.length === 0 ? (
          <div className="text-center py-10 bg-gray-800 rounded-lg">
            <p className="text-lg text-gray-400">
              Нет одобренных участников для ввода результатов.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {participants.map(participant => (
              <div
                key={participant.id}
                className="bg-gray-800 border border-gray-700 rounded-lg p-5"
              >
                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start">
                  <div>
                    <h3 className="text-lg font-semibold">
                      {participant.name} ({participant.type === 'team' ? 'Команда' : 'Индивидуальный участник'})
                    </h3>
                    {participant.type === 'team' && (
                      <p className="text-sm text-gray-400">
                        Капитан: {participant.captain}
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-gray-300 mb-1">Место</label>
                    <input
                      type="number"
                      value={
                        results.find(r => r.application_id === participant.id)?.place || ''
                      }
                      onChange={e =>
                        handleResultChange(participant.id, 'place', e.target.value)
                      }
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      placeholder="Введите место"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Баллы</label>
                    <input
                      type="number"
                      step="0.01"
                      value={
                        results.find(r => r.application_id === participant.id)?.score || ''
                      }
                      onChange={e =>
                        handleResultChange(participant.id, 'score', e.target.value)
                      }
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      placeholder="Введите баллы"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-300 mb-1">Дополнительно</label>
                    <input
                      type="text"
                      value={
                        results.find(r => r.application_id === participant.id)?.result_data || ''
                      }
                      onChange={e =>
                        handleResultChange(participant.id, 'result_data', e.target.value)
                      }
                      className="w-full p-2 bg-gray-700 border border-gray-600 rounded focus:outline-none focus:border-blue-500"
                      placeholder="Дополнительная информация"
                    />
                  </div>
                </div>
              </div>
            ))}
            <div className="mt-6">
              <button
                onClick={handleSaveResults}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md transition"
                disabled={loading}
              >
                {loading ? 'Сохранение...' : 'Сохранить результаты'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompetitionResultsForm;