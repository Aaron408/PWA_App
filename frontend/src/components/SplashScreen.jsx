import React, { useEffect, useState } from 'react';
import { CheckSquare } from 'lucide-react';

const SplashScreen = ({ onComplete }) => {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
      setTimeout(onComplete, 500);
    }, 2000);

    return () => clearTimeout(timer);
  }, [onComplete]);

  return (
    <div className="fixed inset-0 bg-gradient-to-br from-blue-600 to-blue-800 flex items-center justify-center z-50">
      <div className="text-center">
        <div className="mb-8 transform transition-all duration-1000 animate-bounce">
          <CheckSquare className="w-24 h-24 text-white mx-auto mb-4" />
        </div>
        
        <h1 className="text-4xl md:text-5xl font-bold text-white mb-2 animate-fade-in">
          TaskTracker
        </h1>
        
        <p className="text-blue-100 text-lg mb-8 animate-fade-in-delay">
          Gestiona tus tareas con facilidad
        </p>
        
        <div className="w-16 mx-auto">
          <div className="bg-white bg-opacity-30 rounded-full h-1 overflow-hidden">
            <div 
              className={`bg-white h-full rounded-full transition-all duration-2000 ease-out ${
                isLoading ? 'w-0' : 'w-full'
              }`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;