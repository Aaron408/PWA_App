import { useState, useEffect, useCallback } from 'react';
import { useIndexedDB } from './useIndexedDB';
import { apiService } from '../services/api';
import { logger } from '../utils/logger';

export const useTaskSync = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState(null);
  const [lastSyncTime, setLastSyncTime] = useState(null);
  
  const { 
    addTask: addTaskLocal, 
    getTasks: getTasksLocal, 
    updateTask: updateTaskLocal, 
    deleteTask: deleteTaskLocal,
    clearAndReinitDB,
    isLoading: isLocalLoading 
  } = useIndexedDB();

  const checkServerConnection = useCallback(async () => {
    if (!isOnline) return false;
    
    try {
      await apiService.healthCheck();
      return true;
    } catch (error) {
      logger.debug('Server not available:', error.message);
      return false;
    }
  }, [isOnline]);

  const syncWithServer = useCallback(async () => {
    if (isSyncing || !isOnline) return;
    
    setIsSyncing(true);
    setSyncError(null);
    
    try {
      const serverAvailable = await checkServerConnection();
      if (!serverAvailable) {
        logger.debug('Server not available, staying in offline mode');
        setIsSyncing(false);
        return;
      }

      const localTasks = await getTasksLocal();
      const unsyncedTasks = localTasks.filter(task => !task.synced);
      
      if (unsyncedTasks.length > 0) {
        logger.info(`Syncing ${unsyncedTasks.length} local tasks with server`);
        
        // Sync each task individually using existing endpoints
        for (const task of unsyncedTasks) {
          try {
            if (task.isNew) {
              // Create new task on server
              const serverTask = await apiService.createTask({
                title: task.title,
                description: task.description,
                completed: task.completed,
                priority: task.priority,
                image: task.image || task.photo
              });
              
              // Update local task with server ID and mark as synced
              await updateTaskLocal(task.id, { 
                serverCreated: true,
                synced: true 
              });
            } else {
              // Update existing task on server (if it has a server ID)
              if (task.serverId) {
                await apiService.updateTask(task.serverId, {
                  title: task.title,
                  description: task.description,
                  completed: task.completed,
                  priority: task.priority,
                  image: task.image || task.photo
                });
              }
              
              // Mark as synced
              await updateTaskLocal(task.id, { synced: true });
            }
          } catch (taskError) {
            logger.error(`Failed to sync task ${task.id}:`, taskError);
            // Continue with other tasks even if one fails
          }
        }
        
        logger.info('Sync completed');
        setLastSyncTime(new Date());
      } else {
        const serverTasks = await apiService.getTasks();
        logger.debug(`Fetched ${serverTasks.length} tasks from server`);
        setLastSyncTime(new Date());
      }
      
    } catch (error) {
      console.error('Sync failed:', error);
      setSyncError(error.message);
    } finally {
      setIsSyncing(false);
    }
  }, [isSyncing, isOnline, getTasksLocal, updateTaskLocal, checkServerConnection]);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      syncWithServer();
    };
    
    const handleOffline = () => setIsOnline(false);
    
    const handleSWMessage = (event) => {
      if (event.data && event.data.type === 'BACKGROUND_SYNC') {
        logger.debug('Received background sync message from SW');
        syncWithServer();
      }
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    navigator.serviceWorker?.addEventListener('message', handleSWMessage);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      navigator.serviceWorker?.removeEventListener('message', handleSWMessage);
    };
  }, [syncWithServer]);

  const getTasks = async () => {
    try {
      const localTasks = await getTasksLocal();
      
      if (isOnline && !isSyncing) {
        const serverAvailable = await checkServerConnection();
        if (serverAvailable) {
          try {
            const serverTasks = await apiService.getTasks();
            logger.debug(`Fetched ${serverTasks.length} tasks from server, ${localTasks.length} tasks locally`);
            
            // Si el servidor tiene tareas, usar esas como fuente principal
            if (serverTasks && serverTasks.length > 0) {
              // Solo agregar tareas locales que definitivamente no están en el servidor
              const pendingLocalTasks = localTasks.filter(localTask => {
                // Solo incluir tareas locales que no se han sincronizado Y no tienen timestamp muy reciente
                return !localTask.synced && 
                       !localTask.serverCreated && 
                       !serverTasks.some(serverTask => serverTask.title === localTask.title);
              });
              
              logger.debug(`Adding ${pendingLocalTasks.length} pending local tasks to ${serverTasks.length} server tasks`);
              return [...serverTasks, ...pendingLocalTasks];
            } else {
              // Si el servidor está vacío, usar tareas locales
              logger.debug('Server empty, using local tasks');
              return localTasks;
            }
          } catch (error) {
            logger.debug('Server fetch failed, using local data:', error.message);
          }
        }
      }
      
      return localTasks;
    } catch (error) {
      console.error('Error getting tasks:', error);
      return [];
    }
  };

  const addTask = async (taskData) => {
    try {
      const newTask = await addTaskLocal({
        ...taskData,
        synced: false,
        isNew: true  // Marcar como nueva tarea para sync posterior
      });

      if (isOnline) {
        const serverAvailable = await checkServerConnection();
        if (serverAvailable) {
          try {
            const serverTask = await apiService.createTask(taskData);
            logger.info('Task created successfully on server:', serverTask.id);
            
            // Eliminar la tarea local temporal y crear una nueva con datos del servidor
            await deleteTaskLocal(newTask.id);
            
            // Agregar la tarea del servidor a la base de datos local
            const finalTask = await addTaskLocal({
              ...serverTask,
              synced: true,
              serverCreated: true,
              isNew: false
            });
            
            return finalTask;
          } catch (error) {
            logger.debug('Server add failed, keeping local:', error.message);
          }
        }
      }

      return newTask;
    } catch (error) {
      console.error('Error adding task:', error);
      throw error;
    }
  };

  const updateTask = async (id, taskData) => {
    try {
      logger.debug(`Updating task with ID: ${id} (type: ${typeof id})`);
      
      // First check if it's a server task (can be updated directly)
      if (isOnline) {
        try {
          await apiService.updateTask(id, taskData);
          logger.debug(`Task ${id} updated successfully on server`);
          
          // Also update locally if the task exists there
          try {
            await updateTaskLocal(id, { ...taskData, synced: true });
            logger.debug(`Task ${id} also updated locally`);
          } catch (localError) {
            // It's OK if it doesn't exist locally - server update was successful
            logger.debug(`Task ${id} not found locally, but server update succeeded`);
          }
          return;
        } catch (serverError) {
          logger.debug(`Server update failed for task ${id}, trying local only:`, serverError.message);
        }
      }
      
      // Fallback: try to update only locally
      try {
        await updateTaskLocal(id, { ...taskData, synced: false });
        logger.debug(`Task ${id} updated locally only`);
      } catch (localError) {
        logger.error(`Failed to update task ${id} both on server and locally:`, localError.message);
        throw new Error(`Task ${id} not found anywhere`);
      }
    } catch (error) {
      console.error('Error updating task:', error);
      throw error;
    }
  };

  const deleteTask = async (id) => {
    try {
      if (isOnline) {
        const serverAvailable = await checkServerConnection();
        if (serverAvailable) {
          try {
            await apiService.deleteTask(id);
          } catch (error) {
            logger.debug('Server delete failed, deleting locally:', error.message);
          }
        }
      }

      await deleteTaskLocal(id);
    } catch (error) {
      console.error('Error deleting task:', error);
      throw error;
    }
  };

  const getStats = async () => {
    try {
      if (isOnline) {
        const serverAvailable = await checkServerConnection();
        if (serverAvailable) {
          try {
            return await apiService.getStats();
          } catch (error) {
            logger.debug('Server stats failed, calculating locally:', error.message);
          }
        }
      }

      const tasks = await getTasksLocal();
      const total = tasks.length;
      const completed = tasks.filter(t => t.completed).length;
      const pending = total - completed;
      const highPriority = tasks.filter(t => t.priority === 'high' && !t.completed).length;

      return {
        total,
        completed,
        pending,
        highPriority,
        completionRate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return { total: 0, completed: 0, pending: 0, highPriority: 0, completionRate: 0 };
    }
  };

  return {
    getTasks,
    addTask,
    updateTask,
    deleteTask,
    getStats,
    clearAndReinitDB,
    
    syncWithServer,
    
    isOnline,
    isSyncing,
    isLoading: isLocalLoading,
    syncError,
    lastSyncTime
  };
};