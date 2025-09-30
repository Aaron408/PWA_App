import { useState, useEffect, useCallback, useRef } from 'react';

export const useAccelerometer = () => {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] = useState('unknown');
  const [isListening, setIsListening] = useState(false);
  const [acceleration, setAcceleration] = useState({ x: 0, y: 0, z: 0 });
  const [shakeDetected, setShakeDetected] = useState(false);
  
  const lastUpdate = useRef(Date.now());
  const lastAcceleration = useRef({ x: 0, y: 0, z: 0 });
  const shakeThreshold = useRef(15);

  useEffect(() => {
    const checkSupport = () => {
      if (typeof DeviceMotionEvent !== 'undefined') {
        setIsSupported(true);
        
        if (typeof DeviceMotionEvent.requestPermission === 'function') {
          setPermission('prompt');
        } else {
          setPermission('granted');
        }
      } else {
        setIsSupported(false);
        setPermission('denied');
      }
    };

    checkSupport();
  }, []);

  const requestPermission = async () => {
    if (!isSupported) {
      return false;
    }

    try {
      if (typeof DeviceMotionEvent.requestPermission === 'function') {
        const response = await DeviceMotionEvent.requestPermission();
        setPermission(response);
        return response === 'granted';
      } else {
        setPermission('granted');
        return true;
      }
    } catch (error) {
      console.error('Error requesting accelerometer permission:', error);
      setPermission('denied');
      return false;
    }
  };

  const handleDeviceMotion = useCallback((event) => {
    const currentTime = Date.now();
    
    if (currentTime - lastUpdate.current < 100) {
      return;
    }

    const accel = event.accelerationIncludingGravity || event.acceleration || {};
    const x = accel.x || 0;
    const y = accel.y || 0;
    const z = accel.z || 0;

    setAcceleration({ x, y, z });

    const deltaX = Math.abs(x - lastAcceleration.current.x);
    const deltaY = Math.abs(y - lastAcceleration.current.y);
    const deltaZ = Math.abs(z - lastAcceleration.current.z);
    
    const totalDelta = deltaX + deltaY + deltaZ;

    if (totalDelta > shakeThreshold.current) {
      setShakeDetected(true);
      
      if ('vibrate' in navigator) {
        navigator.vibrate(200);
      }

      setTimeout(() => setShakeDetected(false), 1000);
    }

    lastAcceleration.current = { x, y, z };
    lastUpdate.current = currentTime;
  }, []);

  const startListening = useCallback(async () => {
    if (!isSupported || permission !== 'granted') {
      const hasPermission = await requestPermission();
      if (!hasPermission) {
        return false;
      }
    }

    try {
      window.addEventListener('devicemotion', handleDeviceMotion);
      setIsListening(true);
      return true;
    } catch (error) {
      console.error('Error starting accelerometer:', error);
      return false;
    }
  }, [isSupported, permission, handleDeviceMotion]);

  const stopListening = useCallback(() => {
    window.removeEventListener('devicemotion', handleDeviceMotion);
    setIsListening(false);
  }, [handleDeviceMotion]);

  const setShakeThreshold = useCallback((threshold) => {
    shakeThreshold.current = threshold;
  }, []);

  const getOrientation = () => {
    const { x, y, z } = acceleration;
    
    if (Math.abs(z) > Math.abs(x) && Math.abs(z) > Math.abs(y)) {
      return z > 0 ? 'face-up' : 'face-down';
    } else if (Math.abs(x) > Math.abs(y)) {
      return x > 0 ? 'landscape-left' : 'landscape-right';
    } else {
      return y > 0 ? 'portrait' : 'portrait-upside-down';
    }
  };

  const getMovementIntensity = () => {
    const { x, y, z } = acceleration;
    return Math.sqrt(x * x + y * y + z * z);
  };

  useEffect(() => {
    return () => {
      if (isListening) {
        stopListening();
      }
    };
  }, [isListening, stopListening]);

  return {
    isSupported,
    permission,
    isListening,
    acceleration,
    shakeDetected,
    requestPermission,
    startListening,
    stopListening,
    setShakeThreshold,
    getOrientation,
    getMovementIntensity
  };
};