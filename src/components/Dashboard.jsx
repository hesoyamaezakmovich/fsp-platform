import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Navbar from './Navbar';
import CompetitionCard from './CompetitionCard';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [competitions, setCompetitions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const { data } = await supabase.auth.getUser();
        setUser(data?.user || null);

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
          .limit(3);

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

    fetchCompetitions();
  }, []);

  // Компонент Hero
  const Hero = () => (
    <section className="bg-gray-900 text-white py-16 sm:py-20">
      <div className="container mx-auto px-4">
        <div className="flex flex-col md:flex-row items-center">
          <div className="md:w-1/2 mb-10 md:mb-0">
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold mb-6 leading-tight">
              Развивайтесь в <span className="text-blue-500">спортивном программировании</span>
            </h1>
            <p className="text-base sm:text-lg mb-8 text-gray-300 max-w-lg">
              Присоединяйтесь к сообществу программистов, участвуйте в соревнованиях,
              совершенствуйте навыки алгоритмического мышления и решения сложных задач.
            </p>
            <div className="flex flex-col sm:flex-row gap-4">
              <Link
                to="/competitions"
                className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors text-center"
              >
                Соревнования
              </Link>
              <Link
                to="/teams"
                className="border border-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-800 transition-colors text-center"
              >
                Создать команду
              </Link>
            </div>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <img
              src="/image/friend.png"
              alt="Программирование"
              className="w-full max-w-md rounded-lg shadow-xl"
            />
          </div>
        </div>
      </div>
    </section>
  );

  // Компонент UserTypeCard
  const UserTypeCard = ({ emoji, title, description }) => (
    <div className="bg-gray-800 border border-gray-700 rounded-lg p-6 flex items-start space-x-4 hover:shadow-md transition-shadow">
      <div>
        <h3 className="text-lg sm:text-xl font-semibold text-white mb-2">
          <span className="mr-2">{emoji}</span>{title}
        </h3>
        <p className="text-gray-400">{description}</p>
      </div>
    </div>
  );

  // Компонент UserTypes
  const UserTypes = () => (
    <section className="py-12 sm:py-16 bg-gray-800">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-center text-white mb-10 wurk">
          Кто участвует в соревнованиях?
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
          <UserTypeCard
            emoji="👩‍🎓"
            title="Учащиеся"
            description="Студенты и школьники, желающие улучшить свои навыки программирования и алгоритмического мышления."
          />
          <UserTypeCard
            emoji="👨‍💻"
            title="Разработчики"
            description="Профессиональные программисты, которые хотят поддерживать свои навыки решения сложных задач."
          />
          <UserTypeCard
            emoji="🔬"
            title="Исследователи"
            description="Ученые и исследователи в области компьютерных наук, заинтересованные в сложных алгоритмических задачах."
          />
        </div>
      </div>
    </section>
  );

  // Компонент DisciplineCard
  const DisciplineCard = ({ title, description, imageSrc }) => (
    <div className="bg-gray-800 rounded-lg p-6 sm:p-8 border border-gray-700 transition-transform hover:scale-[1.02] flex flex-col space-y-4">
      <img
        src={`/image/${imageSrc}`}
        alt={title}
        className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-lg"
      />
      <div>
        <h3 className="text-lg sm:text-xl font-bold text-white mb-2">{title}</h3>
        <p className="text-gray-400 text-sm sm:text-base leading-relaxed mt-2">{description}</p>
      </div>
    </div>
  );

  // Компонент Disciplines
  const Disciplines = () => (
    <section className="py-12 sm:py-16 bg-gray-900">
      <div className="container mx-auto px-4">
        <h2 className="text-2xl sm:text-3xl font-bold text-white text-center mb-6">
          Дисциплины спортивного программирования
        </h2>
        <p className="text-gray-400 text-center max-w-2xl mx-auto mb-10 sm:mb-12">
          Федерация спортивного программирования проводит соревнования по различным направлениям программирования,
          каждое из которых развивает уникальные навыки.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <DisciplineCard
            title="Продуктовое программирование (хакатон)"
            description="Создание программных продуктов (приложений, сайтов, сервисов), отвечающих заданным требованиям и выполняющих определенные прикладные задачи."
            imageSrc="1.png"
          />
          <DisciplineCard
            title="Программирование алгоритмическое"
            description="Решение группы задач путем написания наиболее оптимальных программных алгоритмов в условиях ограниченного времени."
            imageSrc="2.png"
          />
          <DisciplineCard
            title="Программирование систем информационной безопасности"
            description="Комплекс соревнований в области кибербезопасности, включающий в себя поиск и устранение системных уязвимостей, отработку кибератак и защиты от них."
            imageSrc="3.png"
          />
          <DisciplineCard
            title="Программирование робототехники"
            description="Написание кода и поведенческих алгоритмов для автономных роботов, соревнующихся по определенным правилам."
            imageSrc="4.png"
          />
          <DisciplineCard
            title="Программирование БАС"
            description="Написание кода для автономного полета дрона или роя дронов, а также выполнения ими поставленных задач в условиях соревновательного полигона."
            imageSrc="5.png"
          />
        </div>
      </div>
    </section>
  );

  // Компонент Competitions
  const Competitions = () => (
    <section className="py-12 sm:py-16 bg-gray-800">
      <div className="container mx-auto px-4">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-8 sm:mb-10">
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4 sm:mb-0">Ближайшие соревнования</h2>
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
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {competitions.map(competition => (
              <CompetitionCard key={competition.id} competition={competition} />
            ))}
          </div>
        )}
      </div>
    </section>
  );

  // Компонент Footer
  const Footer = () => (
    <footer className="bg-gray-900 text-gray-400 py-10 sm:py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8">
          <div>
            <Link to="/" className="text-white font-bold text-lg sm:text-xl flex items-center mb-4">
              ФСП
            </Link>
            <p className="mb-4 text-sm sm:text-base">
              Федерация спортивного программирования объединяет талантливых программистов и проводит соревнования по различным дисциплинам.
            </p>
          </div>
          <div>
            <h3 className="text-white font-semibold text-base sm:text-lg mb-4">Меню</h3>
            <ul className="space-y-2 text-sm sm:text-base">
              <li><Link to="/" className="hover:text-blue-500 transition-colors">Главная</Link></li>
              <li><Link to="/competitions" className="hover:text-blue-500 transition-colors">Соревнования</Link></li>
              <li><Link to="/teams" className="hover:text-blue-500 transition-colors">Мои команды</Link></li>
              <li><Link to="https://fsp-russia.ru/" className="hover:text-blue-500 transition-colors">О федерации</Link></li>
              <li><Link to="https://vk.com/russiafsp" className="hover:text-blue-500 transition-colors">Новости</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-base sm:text-lg mb-4">Дисциплины</h3>
            <ul className="space-y-2 text-sm sm:text-base">
              <li><Link to="/disciplines/algorithmic" className="hover:text-blue-500 transition-colors">Алгоритмическое программирование</Link></li>
              <li><Link to="/disciplines/product" className="hover:text-blue-500 transition-colors">Продуктовое программирование</Link></li>
              <li><Link to="/disciplines/security" className="hover:text-blue-500 transition-colors">Информационная безопасность</Link></li>
              <li><Link to="/disciplines/robotics" className="hover:text-blue-500 transition-colors">Робототехника</Link></li>
              <li><Link to="/disciplines/drones" className="hover:text-blue-500 transition-colors">Программирование БАС</Link></li>
            </ul>
          </div>
          <div>
            <h3 className="text-white font-semibold text-base sm:text-lg mb-4">Контакты</h3>
            <ul className="space-y-4 text-sm sm:text-base">
              <li className="flex items-start">
                <span>125047, г. Москва, 2-я Брестская, д.8</span>
              </li>
              <li className="flex items-center">
                <span>+7 (499) 678-03-05</span>
              </li>
              <li className="flex items-center">
                <span>info@fsp-russia.ru</span>
              </li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 mt-8 sm:mt-12 pt-6 sm:pt-8 text-center">
          <p className="text-sm sm:text-base mb-2">© 2025 Федерация спортивного программирования. Все права защищены.</p>
          <p className="text-sm sm:text-base">
            Проект разработан <span className="text-blue-500 font-semibold">STABLE NORTH</span>
          </p>
        </div>
      </div>
    </footer>
  );

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center">
        <div className="text-xl">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar user={user} />
      <main>
        <Hero />
        <UserTypes />
        <Disciplines />
        <Competitions />
      </main>
      <Footer />
    </div>
  );
};

export default Dashboard;