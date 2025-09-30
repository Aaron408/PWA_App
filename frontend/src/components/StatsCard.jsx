import React from 'react';
import { CheckSquare, Clock, AlertCircle, TrendingUp } from 'lucide-react';

const StatsCard = ({ stats }) => {
  const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

  const statItems = [
    {
      icon: TrendingUp,
      label: 'Total',
      value: stats.total,
      color: 'text-blue-600 bg-blue-50'
    },
    {
      icon: CheckSquare,
      label: 'Completadas',
      value: stats.completed,
      color: 'text-green-600 bg-green-50'
    },
    {
      icon: Clock,
      label: 'Pendientes',
      value: stats.pending,
      color: 'text-orange-600 bg-orange-50'
    },
    {
      icon: AlertCircle,
      label: 'Alta prioridad',
      value: stats.highPriority,
      color: 'text-red-600 bg-red-50'
    }
  ];

  return (
    <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Estadísticas</h2>
        <div className="text-right">
          <div className="text-2xl font-bold text-blue-600">{completionRate}%</div>
          <div className="text-sm text-gray-500">Completado</div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statItems.map((item, index) => (
          <div key={index} className="text-center">
            <div className={`inline-flex p-3 rounded-full ${item.color} mb-2`}>
              <item.icon className="w-5 h-5" />
            </div>
            <div className="font-semibold text-lg text-gray-900">{item.value}</div>
            <div className="text-sm text-gray-500">{item.label}</div>
          </div>
        ))}
      </div>

      {stats.total > 0 && (
        <div className="mt-4">
          <div className="flex justify-between text-sm text-gray-600 mb-1">
            <span>Progreso</span>
            <span>{stats.completed}/{stats.total}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500"
              style={{ width: `${completionRate}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default StatsCard;