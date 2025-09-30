import { useState, useEffect, useCallback } from 'react';

export const useNotifications = () => {
  const [permission, setPermission] = useState('default');
  const [isSupported, setIsSupported] = useState(false);
  const [registrationSupported, setRegistrationSupported] = useState(false);

  useEffect(() => {
    setIsSupported('Notification' in window);
    setRegistrationSupported('serviceWorker' in navigator);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }
  }, []);

  const requestPermission = useCallback(async () => {
    if (!isSupported) return false;

    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    }
  }, [isSupported]);

  const showNotification = useCallback((title, options = {}) => {
    if (permission === 'granted' && isSupported) {
      const notification = new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        tag: 'pwa-task',
        renotify: true,
        requireInteraction: false,
        silent: false,
        ...options
      });

      if ('vibrate' in navigator && !options.silent) {
        navigator.vibrate([200, 100, 200]);
      }

      if (!options.requireInteraction) {
        setTimeout(() => {
          if (notification) {
            notification.close();
          }
        }, options.autoClose || 5000);
      }

      return notification;
    }
    return null;
  }, [permission, isSupported]);

  const showTaskNotification = useCallback((taskTitle, type = 'info') => {
    const notificationTypes = {
      success: {
        title: '✅ Tarea Completada',
        body: `Has completado: ${taskTitle}`,
        icon: '/icon-192x192.png',
        tag: 'task-success'
      },
      reminder: {
        title: '⏰ Recordatorio de Tarea',
        body: `No olvides: ${taskTitle}`,
        icon: '/icon-192x192.png',
        tag: 'task-reminder',
        requireInteraction: true
      },
      created: {
        title: '📝 Nueva Tarea Creada',
        body: `Tarea agregada: ${taskTitle}`,
        icon: '/icon-192x192.png',
        tag: 'task-created'
      },
      overdue: {
        title: '🚨 Tarea Vencida',
        body: `Tarea vencida: ${taskTitle}`,
        icon: '/icon-192x192.png',
        tag: 'task-overdue',
        requireInteraction: true
      },
      info: {
        title: 'ℹ️ Información',
        body: taskTitle,
        icon: '/icon-192x192.png',
        tag: 'task-info'
      }
    };

    const config = notificationTypes[type] || notificationTypes.info;
    return showNotification(config.title, config);
  }, [showNotification]);

  const scheduleNotification = useCallback((title, body, delay) => {
    setTimeout(() => {
      showNotification(title, { body });
    }, delay);
  }, [showNotification]);

  const scheduleTaskReminder = useCallback((taskTitle, delayMinutes) => {
    const delay = delayMinutes * 60 * 1000;
    
    setTimeout(() => {
      showTaskNotification(taskTitle, 'reminder');
    }, delay);
  }, [showTaskNotification]);

  const sendPushNotification = useCallback(async (title, body, data = {}) => {
    if (!registrationSupported || permission !== 'granted') {
      return false;
    }

    try {
      const registration = await navigator.serviceWorker.ready;
      
      if (registration && registration.showNotification) {
        await registration.showNotification(title, {
          body,
          icon: '/icon-192x192.png',
          badge: '/icon-192x192.png',
          tag: 'pwa-push',
          data,
          actions: [
            {
              action: 'view',
              title: 'Ver Detalles'
            },
            {
              action: 'dismiss',
              title: 'Cerrar'
            }
          ]
        });

        if ('vibrate' in navigator) {
          navigator.vibrate([300, 200, 300]);
        }

        return true;
      }
    } catch (error) {
      console.error('Error sending push notification:', error);
      return showNotification(title, { body, data });
    }

    return false;
  }, [registrationSupported, permission, showNotification]);

  return {
    permission,
    isSupported,
    registrationSupported,
    requestPermission,
    showNotification,
    showTaskNotification,
    scheduleNotification,
    scheduleTaskReminder,
    sendPushNotification
  };
};