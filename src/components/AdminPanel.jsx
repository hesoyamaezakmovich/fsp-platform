import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import { useRole, canCreateCompetition } from '../utils/roleUtils';
import CompetitionCard from './CompetitionCard';

const AdminPanel = () => {
  const [user, setUser] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);
  const { roleData, loading: roleLoading } = useRole(user);

  useEffect(() => {
    const fetchUser = async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data?.user || null);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchCompetitions = async () => {
      if (!user) return;

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
          .eq('organizer_user_id', user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

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

    if (user) {
      fetchCompetitions();
    }
  }, [user]);

  if (!user || roleLoading) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  if (!roleData || !canCreateCompetition(roleData.role)) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Доступ запрещен</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar user={user} />
      <div className="container mx-auto px-4 py-6 sm:py-8">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 sm:mb-8">
          <h1 className="text-xl sm:text-2xl font-bold mb-4 sm:mb-0">Панель управления</h1>
          <Link
            to="/competitions/create"
            state={{ fromAdminPanel: true }} // Передаем состояние, чтобы указать, что пришли из AdminPanel
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md transition w-full sm:w-auto text-center"
          >
            Создать соревнование
          </Link>
        </div>

        <div className="mb-8 sm:mb-10">
          <h2 className="text-lg sm:text-xl font-semibold mb-4">Ваши соревнования</h2>
          
          {loading ? (
            <div className="text-center py-10">
              <div className="text-lg text-gray-400">Загрузка соревнований...</div>
            </div>
          ) : competitions.length === 0 ? (
            <div className="text-center py-10 bg-gray-800 rounded-lg">
              <div className="text-lg text-gray-400">Вы еще не создали ни одного соревнования</div>
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
      </div>
    </div>
  );
};

export default AdminPanel;