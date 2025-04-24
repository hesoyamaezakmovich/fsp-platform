import React from 'react';
import { Link } from 'react-router-dom';

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
    <Link to={`/competitions/${competition.id}`} className="block">
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
    </Link>
  );
};

export default CompetitionCard;