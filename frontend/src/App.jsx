import React, { useState, useEffect } from 'react';
import { Plus, Bell, Settings, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import SplashScreen from './components/SplashScreen';
import TaskCard from './components/TaskCard';
import TaskModal from './components/TaskModal';
import StatsCard from './components/StatsCard';
import { useTaskSync } from './hooks/useTaskSync';
import { useNotifications } from './hooks/useNotifications';
import { useAccelerometer } from './hooks/useAccelerometer';
import { logger } from './utils/logger';

function App() {
  const [showSplash, setShowSplash] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState({ total: 0, completed: 0, pending: 0, highPriority: 0 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(undefined);
  const [filter, setFilter] = useState('all');
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  const { 
    getTasks, 
    addTask, 
    updateTask, 
    deleteTask, 
    getStats,
    clearAndReinitDB,
    syncWithServer,
    isOnline, 
    isSyncing, 
    isLoading, 
    syncError, 
    lastSyncTime 
  } = useTaskSync();
  
  const { 
    requestPermission, 
    showTaskNotification, 
    scheduleTaskReminder,
    permission: notificationPermission 
  } = useNotifications();

  const { 
    isSupported: accelSupported,
    shakeDetected,
    startListening: startAccel,
    stopListening: stopAccel,
    requestPermission: requestAccelPermission
  } = useAccelerometer();

  // Registrar Service Worker solo una vez al montar el componente
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then((registration) => {
          logger.info('Service Worker registered successfully');
        })
        .catch((registrationError) => {
          logger.error('Service Worker registration failed:', registrationError);
        });
    }
  }, []); // Array de dependencias vacío para ejecutar solo una vez

  // Timeout fallback para splash screen
  useEffect(() => {
    const splashTimeout = setTimeout(() => {
      if (showSplash) {
        logger.warn('Splash screen timeout reached, hiding splash');
        setShowSplash(false);
      }
    }, 5000); // 5 segundos máximo

    return () => clearTimeout(splashTimeout);
  }, [showSplash]);

  // Solicitar permisos de notificación por separado
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  // Inicialización única de la aplicación
  useEffect(() => {
    if (!isLoading && !isInitialized) {
      setIsInitialized(true);
      
      const initAndLoad = async () => {
        try {
          logger.info('Initializing application...');
          await initializeApp();
          await loadData();
          // Ocultar splash screen después de cargar datos exitosamente
          setTimeout(() => setShowSplash(false), 1000);
        } catch (error) {
          logger.error('Failed to initialize app:', error);
          // Ocultar splash incluso si falla la carga
          setTimeout(() => setShowSplash(false), 2000);
        }
      };
      
      initAndLoad();
    }
  }, [isLoading, isInitialized]);

  // Configuración del acelerómetro - solo cuando la app esté lista
  useEffect(() => {
    if (accelSupported && !showSplash && isInitialized) {
      requestAccelPermission().then(granted => {
        if (granted) {
          startAccel();
        }
      });
      
      return () => {
        stopAccel();
      };
    }
  }, [accelSupported, showSplash, isInitialized]);

  // Actualizar estadísticas cuando cambien las tareas
  useEffect(() => {
    if (tasks.length >= 0) { // Solo si tenemos datos válidos
      updateStatsFromTasks(tasks);
    }
  }, [tasks.length]); // Solo recalcular si cambia la cantidad de tareas

  useEffect(() => {
    if (shakeDetected && !showSplash && isOnline && !isSyncing) {
      showTaskNotification('📊 Estadísticas actualizadas', 'info');
      
      // Usar la función de sincronización manual que ya tiene debounce
      handleManualSync();
    }
  }, [shakeDetected, showSplash, showTaskNotification, isOnline, isSyncing]);

  // Función para limpiar datos inconsistentes al iniciar
  const initializeApp = async () => {
    const lastCleanup = localStorage.getItem('lastCleanup');
    const now = Date.now();
    
    // Limpiar cada 24 horas o en primera carga
    if (!lastCleanup || (now - parseInt(lastCleanup)) > 24 * 60 * 60 * 1000) {
      logger.info('Performing database cleanup');
      await clearAndReinitDB();
      localStorage.setItem('lastCleanup', now.toString());
    }
  };

  const loadData = async () => {
    // Evitar llamadas concurrentes
    if (isLoadingData) {
      logger.debug('LoadData already in progress, skipping');
      return;
    }
    
    setIsLoadingData(true);
    try {
      logger.debug('Starting loadData');
      const [taskList, statsData] = await Promise.all([
        getTasks(),
        getStats()
      ]);
      setTasks(taskList);
      setStats(statsData);
      logger.debug(`LoadData complete: ${taskList.length} tasks loaded`);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setIsLoadingData(false);
    }
  };

  const updateStatsFromTasks = (taskList) => {
    const total = taskList.length;
    const completed = taskList.filter(t => t.completed).length;
    const highPriority = taskList.filter(t => t.priority === 'high' && !t.completed).length;
    
    setStats({
      total,
      completed,
      pending: total - completed,
      highPriority
    });
  };

  const handleManualSync = () => {
    const lastSync = localStorage.getItem('lastManualSync');
    const now = Date.now();
    
    if (isSyncing) {
      logger.debug('Sync already in progress');
      return;
    }
    
    if (lastSync && (now - parseInt(lastSync)) < 3000) {
      logger.debug('Manual sync too frequent, ignoring');
      showTaskNotification('Sincronización muy frecuente', 'info');
      return;
    }
    
    syncWithServer();
    localStorage.setItem('lastManualSync', now.toString());
  };

  const handleAddTask = async (taskData) => {
    try {
      const newTask = await addTask(taskData);
      
      if (!newTask.serverCreated) {
        await loadData();
      } else {
        setTasks(prevTasks => {
          const updatedTasks = [...prevTasks, newTask];
          updateStatsFromTasks(updatedTasks);
          return updatedTasks;
        });
      }
      
      showTaskNotification(taskData.title, 'created');
      
      if (taskData.priority === 'high') {
        scheduleTaskReminder(taskData.title, 60); //1 hour reminder
      }

      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }
    } catch (error) {
      console.error('Error adding task:', error);
      
      if (error.message.includes('object store')) {
        try {
          await clearAndReinitDB();
          showTaskNotification('Base de datos reinicializada', 'info');
        } catch (reinitError) {
          console.error('Error reinitializing DB:', reinitError);
        }
      }
      
      showTaskNotification('Error al agregar tarea', 'info');
    }
  };

  const handleUpdateTask = async (taskData) => {
    if (!editingTask) return;

    try {
      await updateTask(editingTask.id, taskData);
      
      // Actualizar directamente el estado en lugar de recargar todo
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(task => 
          task.id === editingTask.id ? { ...task, ...taskData } : task
        );
        updateStatsFromTasks(updatedTasks);
        return updatedTasks;
      });
      
      showTaskNotification(taskData.title, 'info');
    } catch (error) {
      console.error('Error updating task:', error);
      showTaskNotification('Error al actualizar tarea', 'info');
    }
  };

  const handleToggleComplete = async (id) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      const newCompletedStatus = !task.completed;
      await updateTask(id, { completed: newCompletedStatus });
      
      // Actualizar directamente el estado
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.map(t => 
          t.id === id ? { ...t, completed: newCompletedStatus } : t
        );
        updateStatsFromTasks(updatedTasks);
        return updatedTasks;
      });

      if (newCompletedStatus) {
        showTaskNotification(task.title, 'success');
        
        if ('vibrate' in navigator) {
          navigator.vibrate([100, 50, 100]);
        }
      }
    } catch (error) {
      console.error('Error toggling task:', error);
      showTaskNotification('Error al actualizar tarea', 'info');
    }
  };

  const handleDeleteTask = async (id) => {
    try {
      await deleteTask(id);
      
      // Actualizar directamente el estado
      setTasks(prevTasks => {
        const updatedTasks = prevTasks.filter(t => t.id !== id);
        updateStatsFromTasks(updatedTasks);
        return updatedTasks;
      });
      
      showTaskNotification('Tarea eliminada correctamente', 'info');
    } catch (error) {
      console.error('Error deleting task:', error);
      showTaskNotification('Error al eliminar tarea', 'info');
    }
  };

  const openEditModal = (task) => {
    setEditingTask(task);
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTask(undefined);
  };

  const filteredTasks = tasks.filter(task => {
    switch (filter) {
      case 'pending': return !task.completed;
      case 'completed': return task.completed;
      default: return true;
    }
  });


  if (showSplash) {
    return <SplashScreen onComplete={() => setShowSplash(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">TaskTracker</h1>
              <div className="flex items-center space-x-2">
                {isOnline ? (
                  <Wifi className="w-5 h-5 text-green-500" />
                ) : (
                  <WifiOff className="w-5 h-5 text-red-500" />
                )}
                <span className={`text-sm ${isOnline ? 'text-green-600' : 'text-red-600'}`}>
                  {isOnline ? 'En línea' : 'Sin conexión'}
                </span>
                {isSyncing && (
                  <div className="flex items-center space-x-1">
                    <RefreshCw className="w-4 h-4 text-blue-500 animate-spin" />
                    <span className="text-xs text-blue-600">Sincronizando...</span>
                  </div>
                )}
                {shakeDetected && (
                  <div className="flex items-center space-x-1">
                    <span className="text-xs text-purple-600 animate-pulse">📳 Movimiento detectado</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {isOnline && (
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing}
                  className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
                  title="Sincronizar con servidor"
                >
                  <RefreshCw className={`w-5 h-5 ${isSyncing ? 'animate-spin' : ''}`} />
                </button>
              )}
            </div>
          </div>

          {/* Sync Status */}
          {syncError && (
            <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-700">
                Error de sincronización: {syncError}
              </p>
            </div>
          )}

          {lastSyncTime && isOnline && (
            <div className="mt-2">
              <p className="text-xs text-gray-500">
                Última sincronización: {lastSyncTime.toLocaleTimeString()}
              </p>
            </div>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-6">
        <StatsCard stats={stats} />

        {/* Filters and Add Button - Fixed for mobile */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div className="flex flex-wrap gap-2">
            {(['all', 'pending', 'completed']).map((filterOption) => (
              <button
                key={filterOption}
                onClick={() => setFilter(filterOption)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors flex-shrink-0 ${
                  filter === filterOption
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-gray-600 hover:bg-gray-100'
                }`}
              >
                {filterOption === 'all' && 'Todas'}
                {filterOption === 'pending' && 'Pendientes'}
                {filterOption === 'completed' && 'Completadas'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-sm w-full sm:w-auto"
          >
            <Plus className="w-5 h-5" />
            <span>Nueva Tarea</span>
          </button>
        </div>

        {/* Tasks List */}
        <div className="space-y-3">
          {isLoading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-500">Cargando tareas...</p>
            </div>
          ) : filteredTasks.length > 0 ? (
            filteredTasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onToggleComplete={handleToggleComplete}
                onEdit={openEditModal}
                onDelete={handleDeleteTask}
              />
            ))
          ) : (
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <Plus className="w-12 h-12 mx-auto" />
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {filter === 'all' && 'No tienes tareas aún'}
                {filter === 'pending' && 'No hay tareas pendientes'}
                {filter === 'completed' && 'No hay tareas completadas'}
              </h3>
              <p className="text-gray-500 mb-4">
                {filter === 'all' && 'Crea tu primera tarea para comenzar'}
                {filter === 'pending' && '¡Felicidades! Has completado todas tus tareas'}
                {filter === 'completed' && 'Aún no has completado ninguna tarea'}
              </p>
              {filter !== 'completed' && (
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Crear primera tarea
                </button>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Task Modal */}
      <TaskModal
        isOpen={isModalOpen}
        onClose={closeModal}
        onSave={editingTask ? handleUpdateTask : handleAddTask}
        task={editingTask}
      />
    </div>
  );
}

export default App;