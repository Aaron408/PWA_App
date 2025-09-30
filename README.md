# 📱 PWA Task Tracker

Una Progressive Web App (PWA) completa para gestión de tareas con funcionalidades offline, sincronización en tiempo real y capacidades físicas del dispositivo.

## 🚀 Características

### ✨ Funcionalidades Core
- **Gestión completa de tareas**: Crear, editar, eliminar y completar tareas
- **Trabajo offline**: Funciona sin conexión a internet usando IndexedDB
- **Sincronización automática**: Sincroniza datos cuando se restablece la conexión
- **Interfaz responsiva**: Diseño optimizado para móviles y escritorio
- **Tiempo real**: Actualizaciones instantáneas entre dispositivos

### 🔧 Características PWA
- **Service Worker**: Cache inteligente y trabajo offline
- **Web App Manifest**: Instalable como aplicación nativa
- **Push Notifications**: Notificaciones en tiempo real
- **Splash Screen**: Pantalla de carga personalizada

### 📱 Integración con Hardware
- **Cámara**: Captura y adjunta fotos a las tareas
- **Vibración**: Feedback háptico en acciones importantes
- **Acelerómetro**: Detección de movimientos (shake to sync)
- **Notificaciones Push**: Alertas y recordatorios

### 🎯 Características Avanzadas
- **Filtros inteligentes**: Por estado, prioridad y fecha
- **Estadísticas**: Dashboard con métricas de productividad
- **Prioridades**: Sistema de clasificación de tareas (alta, media, baja)
- **Búsqueda**: Encuentra tareas por título o descripción
- **Modo oscuro**: Interfaz adaptable según preferencias del sistema

## 🛠️ Stack Tecnológico

### Frontend
- **React 18**: Framework principal con hooks modernos
- **Vite**: Build tool y desarrollo rápido
- **Tailwind CSS**: Framework de estilos utility-first
- **Lucide React**: Iconografía moderna
- **IndexedDB**: Base de datos local para offline
- **Service Workers**: Cache y sincronización background

### Backend
- **Node.js**: Runtime del servidor
- **Express.js**: Framework web minimalista
- **CORS**: Manejo de políticas de origen cruzado
- **Base64**: Procesamiento de imágenes
- **Vercel**: Deployment serverless

### DevOps & Deployment
- **Vercel**: Hosting para frontend y backend
- **GitHub**: Control de versiones
- **PowerShell/Bash**: Scripts de deployment automatizado

## 📂 Estructura del Proyecto

```
PWA_App/
├── frontend/                 # Aplicación React PWA
│   ├── public/
│   │   ├── manifest.json    # Web App Manifest
│   │   ├── sw.js           # Service Worker
│   │   └── icons/          # Iconos PWA
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   │   ├── SplashScreen.jsx
│   │   │   ├── TaskCard.jsx
│   │   │   ├── TaskModal.jsx
│   │   │   └── StatsCard.jsx
│   │   ├── hooks/          # Custom hooks
│   │   │   ├── useTaskSync.js
│   │   │   ├── useIndexedDB.js
│   │   │   ├── useCamera.js
│   │   │   ├── useNotifications.js
│   │   │   └── useAccelerometer.js
│   │   ├── services/       # API services
│   │   │   └── api.js
│   │   ├── utils/          # Utilidades
│   │   │   ├── logger.js
│   │   │   └── dbUtils.js
│   │   └── types/          # Definiciones de tipos
│   │       └── Task.js
│   ├── vercel.json         # Configuración Vercel
│   └── package.json
├── backend/                 # API REST Node.js
│   ├── api/
│   │   └── index.js        # Función serverless
│   ├── index.js            # Servidor Express
│   ├── vercel.json         # Configuración Vercel
│   └── package.json
└── README.md
```

## 🚦 Instalación y Configuración

### Prerrequisitos
- Node.js 18+ y npm
- Cuenta en Vercel (para deployment)
- Git

### 1. Clonar el Repositorio
```bash
git clone https://github.com/Aaron408/PWA_App.git
cd PWA_App
```

### 2. Configurar Backend
```bash
cd backend
npm install

# Desarrollo local
npm start  # Servidor en http://localhost:3001
```

### 3. Configurar Frontend
```bash
cd ../frontend
npm install

# Crear archivo de entorno
cp .env.example .env

# Editar .env con la URL del backend
# VITE_API_URL=http://localhost:3001/api  # Para desarrollo
# VITE_API_URL=https://tu-backend.vercel.app/api  # Para producción
```

### 4. Desarrollo Local
```bash
# Terminal 1: Backend
cd backend && npm start

# Terminal 2: Frontend  
cd frontend && npm run dev
```

La aplicación estará disponible en `http://localhost:5173`

## 🌐 Deployment

### Deploy Automático con Vercel

#### Backend
```bash
cd backend
vercel --prod
# Sigue las instrucciones para configurar el proyecto
```

#### Frontend
```bash
cd frontend
# Actualizar VITE_API_URL en .env con la URL del backend deployado
vercel --prod
```

### Deploy Manual
Usa los scripts incluidos:

**Windows (PowerShell):**
```powershell
./deploy.ps1
```

**Linux/Mac (Bash):**
```bash
./deploy.sh
```

## 🔧 Configuración

### Variables de Entorno

#### Frontend (.env)
```env
VITE_API_URL=https://tu-backend.vercel.app/api
VITE_LOG_LEVEL=info  # debug, info, warn, error
VITE_APP_ENV=production
```

#### Backend
```env
PORT=3001
NODE_ENV=production
ALLOWED_ORIGINS=https://tu-frontend.vercel.app
```

### Service Worker
El Service Worker se registra automáticamente y proporciona:
- Cache de recursos estáticos
- Funcionalidad offline
- Sincronización en background
- Push notifications

## 📖 API Endpoints

### Base URL
- Desarrollo: `http://localhost:3001/api`
- Producción: `https://pwa-task-tracker-backend.vercel.app/api`

### Endpoints Disponibles

#### Health Check
```http
GET /health
```

#### Tareas
```http
GET    /tasks           # Obtener todas las tareas
POST   /tasks           # Crear nueva tarea
PUT    /tasks/:id       # Actualizar tarea
DELETE /tasks/:id       # Eliminar tarea
```

#### Estadísticas
```http
GET /stats              # Obtener estadísticas de tareas
```

### Ejemplo de Uso
```javascript
// Crear nueva tarea
const response = await fetch('/api/tasks', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    title: 'Nueva tarea',
    description: 'Descripción de la tarea',
    priority: 'high',
    image: 'data:image/jpeg;base64,...'  // Opcional
  })
});
```

## 🧪 Características Técnicas

### Offline-First Architecture
- **IndexedDB**: Almacenamiento persistente local
- **Service Worker**: Intercepción de requests y cache
- **Sincronización inteligente**: Merge automático al reconectar
- **Fallback robusto**: Funciona siempre, con o sin internet

### Optimizaciones de Performance
- **Code splitting**: Carga lazy de componentes
- **Caching estratégico**: Cache de resources y API calls
- **Debouncing**: Prevención de llamadas excesivas
- **Optimistic updates**: UI responsiva con rollback

### Seguridad
- **CORS configurado**: Origins permitidos específicos
- **Validación de datos**: Sanitización en frontend y backend
- **Rate limiting**: Prevención de spam y abuse
- **HTTPS**: Comunicación encriptada

## 🎮 Uso de la Aplicación

### Gestión Básica
1. **Crear tarea**: Click en el botón "+" 
2. **Editar tarea**: Click en cualquier tarea existente
3. **Completar tarea**: Click en el checkbox
4. **Eliminar tarea**: Swipe o botón de eliminar
5. **Filtrar tareas**: Usar los botones de filtro (Todas, Pendientes, Completadas)

### Características Avanzadas
- **Agregar foto**: Use el botón de cámara en el modal de tarea
- **Cambiar prioridad**: Seleccione alta, media o baja al crear/editar
- **Sincronizar manualmente**: Click en el botón de sync o sacuda el dispositivo
- **Ver estadísticas**: Panel automático en la parte superior

### Trabajo Offline
- Todas las operaciones funcionan sin internet
- Los cambios se sincronizan automáticamente al reconectar
- Indicador visual del estado de conexión
- Cache inteligente de la interfaz

## 🤝 Contribución

### Para Contribuir
1. Fork del repositorio
2. Crear branch para feature: `git checkout -b feature/nueva-caracteristica`
3. Commit cambios: `git commit -m 'Add: nueva característica'`
4. Push al branch: `git push origin feature/nueva-caracteristica`
5. Crear Pull Request

### Standards de Código
- **ESLint**: Linting automático configurado
- **Prettier**: Formateo de código consistente
- **Commits semánticos**: Usar prefijos (Add, Fix, Update, etc.)
- **Componentes funcionales**: Hooks sobre class components

## 📝 Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

**Aaron** - [@Aaron408](https://github.com/Aaron408)

## 🙏 Agradecimientos

- React Team por el excelente framework
- Vercel por el hosting gratuito
- Lucide por los iconos modernos
- Tailwind CSS por el sistema de estilos
- La comunidad open source por las herramientas

## 📞 Soporte

Si tienes problemas o preguntas:
1. Revisa la [documentación](#-instalación-y-configuración)
2. Busca en [Issues existentes](https://github.com/Aaron408/PWA_App/issues)
3. Crea un [nuevo Issue](https://github.com/Aaron408/PWA_App/issues/new)

---

⭐ **¡Si te gusta este proyecto, dale una estrella en GitHub!** ⭐