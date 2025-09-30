import React, { useState, useRef, useEffect } from "react";
import { X, Camera, Upload, RotateCcw } from "lucide-react";
import { useCamera } from "../hooks/useCamera";
import { logger } from "../utils/logger";

const TaskModal = ({ isOpen, onClose, onSave, task }) => {
  // IMPORTANTE: Todos los hooks deben estar al inicio, antes de cualquier return
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [photo, setPhoto] = useState("");
  const [showCamera, setShowCamera] = useState(false);

  const videoRef = useRef(null);

  // useCamera DEBE estar aquí, no después de ningún condicional
  const {
    startCamera,
    stopCamera,
    capturePhoto,
    switchCamera,
    isSupported,
    hasMultipleCameras,
    isBackCamera,
    error: cameraError,
  } = useCamera();

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description);
      setPriority(task.priority);

      if (task.photo) {
        setPhoto(task.photo);
      } else if (task.image && task.image.data) {
        setPhoto(`data:image/jpeg;base64,${task.image.data}`);
      } else {
        setPhoto("");
      }
    } else {
      setTitle("");
      setDescription("");
      setPriority("medium");
      setPhoto("");
    }
  }, [task]);

  useEffect(() => {
    return () => {
      if (showCamera) {
        stopCamera();
      }
    };
  }, [showCamera, stopCamera]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    const taskData = {
      title: title.trim(),
      description: description.trim(),
      priority,
      completed: task?.completed || false,
    };

    if (photo) {
      taskData.image = {
        data: photo,
        type: "image/jpeg",
      };
    }

    onSave(taskData);
    handleClose();
  };

  const handleClose = () => {
    try {
      if (showCamera && videoRef.current) {
        const stream = videoRef.current.srcObject;
        if (stream) {
          const tracks = stream.getTracks();
          tracks.forEach((track) => track.stop());
        }
        videoRef.current.srcObject = null;
      }

      stopCamera();
      setShowCamera(false);
      onClose();
    } catch (error) {
      logger.error("Error closing camera:", error);
      onClose();
    }
  };

  const handleCameraStart = async () => {
    try {
      logger.dev("Attempting to start camera...");

      // Primero mostramos el video element
      setShowCamera(true);

      // Esperamos a que el DOM se actualice
      await new Promise((resolve) => setTimeout(resolve, 100));

      logger.dev("Video ref available:", !!videoRef.current);

      if (!videoRef.current) {
        logger.error("Video ref not available");
        alert(
          "Error: Elemento de video no disponible. Intenta recargar la página."
        );
        setShowCamera(false);
        return;
      }

      const stream = await startCamera();
      logger.dev("Stream received:", !!stream);

      if (!stream) {
        logger.error("Failed to get stream, camera error:", cameraError);
        alert(
          `Error de cámara: ${cameraError || "No se pudo acceder a la cámara"}`
        );
        setShowCamera(false);
        return;
      }

      videoRef.current.srcObject = stream;

      videoRef.current.onloadedmetadata = () => {
        logger.dev("Video metadata loaded, attempting to play...");
        videoRef.current.play().catch((err) => {
          logger.error("Error playing video:", err);
        });
      };

      try {
        await videoRef.current.play();
        logger.dev("Video playing successfully");
      } catch (playError) {
        logger.dev(
          "Immediate play failed, waiting for metadata:",
          playError.message
        );
      }
    } catch (error) {
      logger.error("Error in handleCameraStart:", error);
      alert("Error al iniciar la cámara. Por favor verifica los permisos.");
      setShowCamera(false);
    }
  };

  const handleCapture = async () => {
    if (!videoRef.current) {
      logger.error("Video ref not available for capture");
      return;
    }

    try {
      logger.dev("Capturing photo...");
      const photoResult = await capturePhoto(videoRef.current, {
        maxWidth: 1280,
        maxHeight: 720,
        quality: 0.8,
        addTimestamp: false,
      });

      logger.dev("Photo result:", photoResult ? "success" : "failed");

      if (photoResult) {
        setPhoto(photoResult.data);
        stopCamera();
        setShowCamera(false);
      } else {
        alert("Error al capturar la foto. Intenta de nuevo.");
      }
    } catch (error) {
      logger.error("Error capturing photo:", error);
      alert("Error al capturar la foto.");
    }
  };

  const handleSwitchCamera = async () => {
    if (hasMultipleCameras && videoRef.current) {
      const stream = await switchCamera();
      if (stream && videoRef.current) {
        videoRef.current.srcObject = stream;

        videoRef.current.onloadedmetadata = () => {
          videoRef.current.play().catch((err) => {
            logger.error("Error playing video after switch:", err);
          });
        };
      }
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhoto(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  // Ahora sí podemos hacer el return condicional
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            {task ? "Editar Tarea" : "Nueva Tarea"}
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="mb-4">
            <label
              htmlFor="title"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Título *
            </label>
            <input
              type="text"
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Escribe el título de la tarea"
              required
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="description"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Descripción
            </label>
            <textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Descripción opcional"
            />
          </div>

          <div className="mb-4">
            <label
              htmlFor="priority"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Prioridad
            </label>
            <select
              id="priority"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Baja</option>
              <option value="medium">Media</option>
              <option value="high">Alta</option>
            </select>
          </div>

          {/* Photo Section */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Foto (opcional)
            </label>

            {photo && !showCamera && (
              <div className="mb-3">
                <img
                  src={photo}
                  alt="Preview"
                  className="w-full h-32 object-cover rounded-lg border"
                />
                <button
                  type="button"
                  onClick={() => setPhoto("")}
                  className="mt-2 text-sm text-red-600 hover:text-red-800"
                >
                  Eliminar foto
                </button>
              </div>
            )}

            {showCamera ? (
              <div className="mb-3">
                <div className="relative">
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-48 object-cover rounded-lg border bg-black"
                  />

                  {/* Camera Controls Overlay */}
                  <div className="absolute top-2 right-2 flex space-x-2">
                    {hasMultipleCameras && (
                      <button
                        type="button"
                        onClick={handleSwitchCamera}
                        className="p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-70 transition-all"
                        title={`Cambiar a cámara ${
                          isBackCamera ? "frontal" : "trasera"
                        }`}
                      >
                        <RotateCcw className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Camera Info */}
                  <div className="absolute bottom-2 left-2">
                    <span className="text-xs text-white bg-black bg-opacity-50 px-2 py-1 rounded">
                      {isBackCamera ? "Cámara trasera" : "Cámara frontal"}
                    </span>
                  </div>
                </div>

                {cameraError && (
                  <div className="mt-2 p-2 bg-red-50 border border-red-200 rounded text-sm text-red-700">
                    {cameraError}
                  </div>
                )}

                <div className="flex space-x-2 mt-3">
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
                  >
                    📸 Capturar Foto
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      stopCamera();
                      setShowCamera(false);
                    }}
                    className="flex-1 bg-gray-600 text-white py-3 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex space-x-2">
                {isSupported && (
                  <button
                    type="button"
                    onClick={handleCameraStart}
                    className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Cámara</span>
                  </button>
                )}

                <label className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors cursor-pointer">
                  <Upload className="w-4 h-4" />
                  <span>Subir</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>
            )}
          </div>

          <div className="flex space-x-4">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {task ? "Actualizar" : "Crear"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default TaskModal;
