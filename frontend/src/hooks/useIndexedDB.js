import { useState, useEffect } from 'react';
import { logger } from '../utils/logger';

export const useIndexedDB = () => {
  const [db, setDb] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const openDatabase = () => {
      return new Promise((resolve, reject) => {
        const request = indexedDB.open('TaskTrackerDB', 1);
        
        request.onerror = () => {
          console.error('Error opening database:', request.error);
          reject(request.error);
        };
        
        request.onsuccess = () => {
          logger.info('IndexedDB opened successfully');
          resolve(request.result);
        };
        
        request.onupgradeneeded = (event) => {
          logger.info('Upgrading IndexedDB schema...');
          const database = event.target.result;
          
          // Delete existing object store if it exists
          if (database.objectStoreNames.contains('tasks')) {
            database.deleteObjectStore('tasks');
          }
          
          // Create new object store
          const store = database.createObjectStore('tasks', { keyPath: 'id' });
          store.createIndex('completed', 'completed', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
          
          logger.info('IndexedDB schema upgraded successfully');
        };
      });
    };

    const initDatabase = async () => {
      try {
        const database = await openDatabase();
        setDb(database);
        setIsLoading(false);
      } catch (error) {
        console.error('Error setting up database:', error);
        setIsLoading(false);
      }
    };

    initDatabase();
  }, []);

  const addTask = async (task) => {
    if (!db) {
      throw new Error('Database not initialized');
    }

    // Verificar que el object store existe
    if (!db.objectStoreNames.contains('tasks')) {
      throw new Error('Tasks object store not found');
    }

    const newTask = {
      ...task,
      id: Date.now().toString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      synced: false
    };

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        const request = store.add(newTask);

        request.onsuccess = () => {
          logger.debug('Task added to IndexedDB:', newTask.id);
          resolve(newTask);
        };

        request.onerror = () => {
          console.error('Error adding task to IndexedDB:', request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error('Transaction error:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('Error in addTask:', error);
        reject(error);
      }
    });
  };

  const getTasks = async () => {
    if (!db) {
      console.warn('Database not initialized, returning empty array');
      return [];
    }

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['tasks'], 'readonly');
        const store = transaction.objectStore('tasks');
        const request = store.getAll();

        request.onsuccess = () => {
          const tasks = request.result || [];
          logger.debug('Retrieved tasks from IndexedDB:', tasks.length);
          
          // Limpiar y validar datos de tareas
          const validTasks = tasks.map(task => {
            const validatedTask = { ...task };
            
            // Validar createdAt
            if (!validatedTask.createdAt || isNaN(new Date(validatedTask.createdAt).getTime())) {
              validatedTask.createdAt = new Date().toISOString();
            }
            
            // Validar updatedAt
            if (!validatedTask.updatedAt || isNaN(new Date(validatedTask.updatedAt).getTime())) {
              validatedTask.updatedAt = validatedTask.createdAt;
            }
            
            // Asegurar que tiene todos los campos necesarios
            if (!validatedTask.id) {
              validatedTask.id = Date.now().toString();
            }
            
            if (typeof validatedTask.completed !== 'boolean') {
              validatedTask.completed = false;
            }
            
            if (!validatedTask.priority) {
              validatedTask.priority = 'medium';
            }
            
            return validatedTask;
          });
          
          resolve(validTasks);
        };

        request.onerror = () => {
          console.error('Error getting tasks from IndexedDB:', request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error('Transaction error in getTasks:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('Error in getTasks:', error);
        reject(error);
      }
    });
  };

  const updateTask = async (id, updates) => {
    if (!db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        
        const getRequest = store.get(id);
        
        getRequest.onsuccess = () => {
          const task = getRequest.result;
          if (task) {
            const updatedTask = {
              ...task,
              ...updates,
              updatedAt: new Date().toISOString(),
              synced: false
            };
            
            const putRequest = store.put(updatedTask);
            
            putRequest.onsuccess = () => {
              logger.debug('Task updated in IndexedDB:', id);
              resolve(updatedTask);
            };
            
            putRequest.onerror = () => {
              console.error('Error updating task in IndexedDB:', putRequest.error);
              reject(putRequest.error);
            };
          } else {
            reject(new Error('Task not found'));
          }
        };

        getRequest.onerror = () => {
          console.error('Error getting task for update:', getRequest.error);
          reject(getRequest.error);
        };

        transaction.onerror = () => {
          console.error('Transaction error in updateTask:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('Error in updateTask:', error);
        reject(error);
      }
    });
  };

  const deleteTask = async (id) => {
    if (!db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      try {
        const transaction = db.transaction(['tasks'], 'readwrite');
        const store = transaction.objectStore('tasks');
        const request = store.delete(id);

        request.onsuccess = () => {
          logger.debug('Task deleted from IndexedDB:', id);
          resolve();
        };

        request.onerror = () => {
          console.error('Error deleting task from IndexedDB:', request.error);
          reject(request.error);
        };

        transaction.onerror = () => {
          console.error('Transaction error in deleteTask:', transaction.error);
          reject(transaction.error);
        };
      } catch (error) {
        console.error('Error in deleteTask:', error);
        reject(error);
      }
    });
  };

  const clearAndReinitDB = async () => {
    try {
      if (db) {
        db.close();
      }
      
      // Eliminar la base de datos actual
      await new Promise((resolve, reject) => {
        const deleteRequest = indexedDB.deleteDatabase('TaskTrackerDB');
        deleteRequest.onsuccess = () => resolve();
        deleteRequest.onerror = () => reject(deleteRequest.error);
      });
      
      setDb(null);
      setIsLoading(true);
      
      // Reinicializar
      const database = await new Promise((resolve, reject) => {
        const request = indexedDB.open('TaskTrackerDB', 1);
        
        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);
        
        request.onupgradeneeded = (event) => {
          const database = event.target.result;
          const store = database.createObjectStore('tasks', { keyPath: 'id' });
          store.createIndex('completed', 'completed', { unique: false });
          store.createIndex('createdAt', 'createdAt', { unique: false });
          store.createIndex('priority', 'priority', { unique: false });
        };
      });
      
      setDb(database);
      setIsLoading(false);
      
      return database;
    } catch (error) {
      console.error('Error reinitializing database:', error);
      setIsLoading(false);
      throw error;
    }
  };

  return {
    addTask,
    getTasks,
    updateTask,
    deleteTask,
    clearAndReinitDB,
    isLoading,
    db
  };
};