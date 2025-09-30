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

  const checkServerConnection = async () => {
    if (!isOnline) return false;
    
    try {
      await apiService.healthCheck();
      return true;
    } catch (error) {
      logger.debug('Server not available:', error.message);
      return false;
    }
  };

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
        
        const syncResult = await apiService.syncTasks(unsyncedTasks);
        
        if (syncResult.success) {
          for (const task of unsyncedTasks) {
            await updateTaskLocal(task.id, { synced: true });
          }
          
          logger.info('Sync completed successfully');
          setLastSyncTime(new Date());
        }
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
  }, [isSyncing, isOnline, getTasksLocal, updateTaskLocal]);

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
            return serverTasks.length > 0 ? serverTasks : localTasks;
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
        synced: false
      });

      if (isOnline) {
        const serverAvailable = await checkServerConnection();
        if (serverAvailable) {
          try {
            const serverTask = await apiService.createTask(taskData);
            await updateTaskLocal(newTask.id, {
              ...serverTask,
              synced: true
            });
            return { ...newTask, ...serverTask, synced: true };
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
      await updateTaskLocal(id, {
        ...taskData,
        synced: false
      });

      if (isOnline) {
        const serverAvailable = await checkServerConnection();
        if (serverAvailable) {
          try {
            await apiService.updateTask(id, taskData);

            await updateTaskLocal(id, { synced: true });
          } catch (error) {
            logger.debug('Server update failed, keeping local changes:', error.message);
          }
        }
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