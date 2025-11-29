# Documentación Técnica - MayaApp

## 1. Descripción General

**MayaApp** es una aplicación web educativa tipo Duolingo diseñada para enseñar el idioma Maya Yucateco (yua) a hablantes de español. La aplicación utiliza una metodología gamificada con ejercicios interactivos, sistema de vidas, puntos de experiencia (XP) y progreso por unidades.

### Objetivo
Facilitar el aprendizaje del Maya Yucateco mediante una experiencia interactiva y motivadora, preservando y promoviendo esta lengua indígena.

---

## 2. Arquitectura del Sistema

### 2.1 Arquitectura General
La aplicación sigue una arquitectura **cliente-servidor** con separación clara entre frontend y backend:

```
┌─────────────────────────────────────────┐
│           FRONTEND (Expo)               │
│  - React Native Web                     │
│  - TypeScript                           │
│  - Expo Router                          │
└──────────────┬──────────────────────────┘
               │ HTTP/REST API
               │ (axios)
┌──────────────▼──────────────────────────┐
│           BACKEND (FastAPI)             │
│  - Python 3.x                           │
│  - FastAPI Framework                    │
│  - MongoDB (Motor)                      │
└──────────────┬──────────────────────────┘
               │
┌──────────────▼──────────────────────────┐
│         BASE DE DATOS                   │
│  - MongoDB                              │
│  - Colecciones: users, progress        │
└─────────────────────────────────────────┘
```

### 2.2 Puertos y Configuración
- **Frontend**: `http://localhost:8081`
- **Backend**: `http://127.0.0.1:8001`
- **MongoDB**: `mongodb://127.0.0.1:27017`

---

## 3. Stack Tecnológico

### 3.1 Frontend

#### Frameworks y Librerías Principales
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **Expo** | Latest | Framework principal para React Native Web |
| **React Native** | Latest | UI Components multiplataforma |
| **TypeScript** | Latest | Tipado estático |
| **Expo Router** | Latest | Navegación basada en archivos |
| **Axios** | Latest | Cliente HTTP para API calls |
| **Expo AV** | Latest | Reproducción de audio |
| **AsyncStorage** | Latest | Almacenamiento local |
| **Expo Linear Gradient** | Latest | Gradientes visuales |
| **Expo Image Picker** | Latest | Selección de imágenes de perfil |

#### Dependencias Adicionales
- `@react-native-async-storage/async-storage`: Persistencia de datos
- `@expo/vector-icons`: Iconografía (Ionicons)
- `buffer`: Polyfill para manejo de datos binarios (audio)
- `react-native-safe-area-context`: Manejo de áreas seguras

#### Estructura de Carpetas Frontend
```
frontend/
├── app/
│   ├── (tabs)/              # Navegación por pestañas
│   │   ├── index.tsx        # Pantalla de inicio/cursos
│   │   ├── dictionary.tsx   # Diccionario Maya-Español
│   │   └── profile.tsx      # Perfil de usuario
│   ├── lesson/
│   │   └── [id].tsx         # Pantalla de lección dinámica
│   ├── index.tsx            # Pantalla de bienvenida
│   ├── login.tsx            # Inicio de sesión
│   ├── signup.tsx           # Registro
│   └── _layout.tsx          # Layout raíz
├── components/
│   ├── HeartsGame.tsx       # Mini-juego para recuperar vidas
│   └── TipsModal.tsx        # Modal de consejos
├── contexts/
│   └── AuthContext.tsx      # Contexto de autenticación
├── types/
│   └── index.ts             # Definiciones TypeScript
└── utils/
    └── api.ts               # Configuración de Axios
```

### 3.2 Backend

#### Frameworks y Librerías Principales
| Tecnología | Versión | Propósito |
|------------|---------|-----------|
| **FastAPI** | Latest | Framework web asíncrono |
| **Motor** | Latest | Driver asíncrono de MongoDB |
| **Pydantic** | Latest | Validación de datos |
| **Passlib** | Latest | Hashing de contraseñas (bcrypt) |
| **Python-Jose** | Latest | Manejo de JWT |
| **Python-dotenv** | Latest | Variables de entorno |
| **Uvicorn** | Latest | Servidor ASGI |
| **Requests** | Latest | Cliente HTTP (proxy de audio) |

#### Estructura de Carpetas Backend
```
backend/
├── server.py              # Aplicación principal
├── .env                   # Variables de entorno
├── requirements.txt       # Dependencias Python
├── create_user.py         # Script de utilidad
└── test_connection.py     # Script de prueba
```

### 3.3 Base de Datos

#### MongoDB
**Colecciones:**

1. **users**
```javascript
{
  _id: ObjectId,
  email: String (único),
  username: String,
  password: String (hash bcrypt),
  xp: Number (default: 0),
  lives: Number (default: 5),
  streak: Number (default: 0),
  last_activity: DateTime,
  created_at: DateTime
}
```

2. **progress**
```javascript
{
  _id: ObjectId,
  user_id: String,
  lesson_id: String,
  completed: Boolean,
  score: Number,
  attempts: Number,
  completed_at: DateTime
}
```

---

## 4. Funcionalidades Principales

### 4.1 Sistema de Autenticación
- **Registro de usuarios**: Email, username, contraseña
- **Inicio de sesión**: JWT tokens (válidos por 30 días)
- **Persistencia**: Tokens almacenados en AsyncStorage
- **Seguridad**: Contraseñas hasheadas con bcrypt

### 4.2 Sistema de Lecciones

#### Tipos de Ejercicios
1. **Translate**: Traducción de palabras/frases
2. **Multiple Choice**: Selección múltiple
3. **Matching**: Emparejar palabras Maya-Español

#### Estructura de Contenido
- **5 Unidades** temáticas:
  1. Saludos (5 lecciones)
  2. Números (3 lecciones)
  3. Colores (3 lecciones)
  4. Familia (3 lecciones)
  5. Verbos Comunes (6 lecciones)
- **Total**: 20 lecciones

#### Mecánicas de Juego
- **Sistema de vidas**: 5 corazones máximo
- **XP por lección**: 10-15 puntos
- **Niveles**: Basados en XP (100 XP = 1 nivel)
- **Racha (Streak)**: Días consecutivos de actividad
- **Desbloqueo secuencial**: Completar lección anterior para desbloquear siguiente

### 4.3 Diccionario Interactivo

#### Características
- **Búsqueda en tiempo real**: Filtrado por Maya o Español
- **Categorías**: Saludos, Números, Colores, Familia, Verbos
- **Audio TTS**: Pronunciación mediante Microsoft Azure AI Speech
- **Traductor en vivo**: Microsoft Translator API (Español → Maya)

#### Integración con Microsoft Azure
```typescript
// Endpoint de audio (proxy backend)
POST /api/speak
{
  text: string,
  api_key: string,
  region: string
}
```

### 4.4 Sistema de Gamificación

#### Elementos
- **Vidas (Hearts)**: 
  - Máximo 5
  - Se pierde 1 por respuesta incorrecta
  - Recuperación mediante mini-juego o revisión de lecciones
  
- **Experiencia (XP)**:
  - Ganancia por completar lecciones
  - Visualización de nivel actual
  
- **Progreso**:
  - Porcentaje de lecciones completadas
  - Barra de progreso visual
  
- **Racha (Streak)**:
  - Contador de días consecutivos
  - Reseteo si pasa más de 1 día sin actividad

### 4.5 Perfil de Usuario

#### Información Mostrada
- Foto de perfil (personalizable)
- Nombre de usuario y email
- Nivel actual
- Estadísticas:
  - Días seguidos (racha)
  - Vidas restantes
  - XP total
  - Lecciones completadas

### 4.6 Mini-Juego de Corazones

Juego simple de memoria/reflejos para recuperar 1 vida:
- Clic en corazones que aparecen aleatoriamente
- Límite de tiempo
- Máximo 1 vida recuperable por juego

---

## 5. API Endpoints

### 5.1 Autenticación
```
POST /api/auth/signup
POST /api/auth/login
GET  /api/auth/me
```

### 5.2 Lecciones
```
GET  /api/lessons
GET  /api/lessons/{lesson_id}
POST /api/lessons/{lesson_id}/complete
POST /api/lessons/review
POST /api/lessons/lose-life
```

### 5.3 Usuario
```
GET  /api/user/stats
POST /api/user/gain-life
```

### 5.4 Contenido
```
GET  /api/dictionary
GET  /api/tips/{unit}
POST /api/speak (proxy de audio)
```

---

## 6. Flujo de Usuario

### 6.1 Onboarding
1. Usuario accede a pantalla de bienvenida
2. Opciones: "Comenzar" (registro) o "Ya tengo cuenta" (login)
3. Registro/Login
4. Redirección a pantalla de cursos

### 6.2 Experiencia de Aprendizaje
1. Usuario ve unidades y lecciones
2. Selecciona lección desbloqueada
3. Completa ejercicios secuencialmente
4. Recibe feedback inmediato (correcto/incorrecto)
5. Gana/pierde vidas según respuestas
6. Al finalizar: gana XP y desbloquea siguiente lección

### 6.3 Feedback de Ejercicios
- **Respuesta correcta**: 
  - Barra verde con ✓
  - Mensaje "¡Correcto!"
  - Botón "Continuar" (verde)
  
- **Respuesta incorrecta**:
  - Barra roja con ✗
  - Mensaje "Incorrecto"
  - Muestra respuesta correcta
  - Pierde 1 vida
  - Botón "Continuar" (rojo)

---

## 7. Seguridad

### 7.1 Autenticación
- **JWT Tokens**: HS256 algorithm
- **Expiración**: 30 días
- **Storage**: AsyncStorage (frontend)
- **Headers**: Bearer token en Authorization

### 7.2 Contraseñas
- **Hashing**: bcrypt
- **Validación**: Pydantic models
- **No se almacenan en texto plano**

### 7.3 CORS
- **Configuración**: Allow all origins (desarrollo)
- **Producción**: Debe restringirse a dominios específicos

### 7.4 API Keys
- **Microsoft Translator**: Almacenada en frontend (⚠️ riesgo de seguridad)
- **Recomendación**: Mover a variables de entorno del backend

---

## 8. Limitaciones Actuales

### 8.1 Técnicas
1. **Escalabilidad de contenido**: 
   - Lecciones hardcodeadas en `server.py`
   - Difícil agregar nuevo contenido sin modificar código
   
2. **Audio estático**: 
   - Dependencia de API externa (Microsoft)
   - Sin caché de audio generado
   - Requiere conexión a internet
   
3. **Sin modo offline**: 
   - Requiere conexión constante al backend
   - No hay persistencia local de lecciones
   
4. **Seguridad de API Keys**:
   - Microsoft Translator key expuesta en frontend
   - Vulnerable a extracción y uso no autorizado

5. **Sin recuperación de contraseña**:
   - No hay flujo de "olvidé mi contraseña"
   
6. **Validación de email limitada**:
   - No hay verificación de email real
   - Cualquier formato válido es aceptado

### 8.2 Funcionales
1. **Contenido limitado**: Solo 20 lecciones
2. **Sin sistema de amigos/social**
3. **Sin tablas de clasificación (leaderboards)**
4. **Sin notificaciones push**
5. **Sin sistema de logros/badges**
6. **Sin práctica personalizada** basada en errores
7. **Sin modo de repaso espaciado** (spaced repetition)

### 8.3 UX/UI
1. **Sin animaciones avanzadas** entre transiciones
2. **Sin sonidos de feedback** (solo visual)
3. **Sin modo oscuro/claro** (solo oscuro)
4. **Sin accesibilidad** (screen readers, etc.)
5. **Sin soporte multiidioma** en la interfaz

---

## 9. Mejoras Propuestas

### 9.1 Corto Plazo (1-2 meses)

#### Alta Prioridad
1. **Mover API keys al backend**
   - Crear variables de entorno
   - Proxy todas las llamadas a APIs externas
   
2. **Implementar recuperación de contraseña**
   - Endpoint de reset
   - Envío de emails (SendGrid/Mailgun)
   
3. **Caché de audio**
   - Almacenar audio generado en servidor
   - Reducir llamadas a Microsoft API
   
4. **Validación de email**
   - Enviar código de verificación
   - Confirmar email antes de activar cuenta

#### Media Prioridad
5. **Agregar más contenido**
   - Expandir a 50+ lecciones
   - Nuevas unidades: Comida, Tiempo, Lugares
   
6. **Mejorar feedback visual**
   - Animaciones de celebración
   - Sonidos de correcto/incorrecto
   
7. **Sistema de logros**
   - Badges por hitos
   - Trofeos especiales

### 9.2 Mediano Plazo (3-6 meses)

8. **Modo offline**
   - Descargar lecciones
   - Sincronización cuando hay conexión
   
9. **Práctica adaptativa**
   - Algoritmo que detecta palabras difíciles
   - Ejercicios personalizados
   
10. **Sistema social**
    - Agregar amigos
    - Ver progreso de amigos
    - Competencias semanales
    
11. **Leaderboards**
    - Rankings globales
    - Rankings por país/región
    
12. **Notificaciones push**
    - Recordatorios diarios
    - Alertas de racha en riesgo

### 9.3 Largo Plazo (6-12 meses)

13. **Versión móvil nativa**
    - iOS App Store
    - Google Play Store
    
14. **Reconocimiento de voz**
    - Ejercicios de pronunciación
    - Feedback en tiempo real
    
15. **Modo conversación**
    - Chatbot con IA
    - Práctica de diálogos
    
16. **Contenido generado por comunidad**
    - Usuarios pueden crear lecciones
    - Sistema de moderación
    
17. **Certificaciones**
    - Exámenes de nivel
    - Certificados descargables

---

## 10. Consideraciones de Despliegue

### 10.1 Desarrollo
```bash
# Frontend
cd frontend
npm install
npx expo start --web

# Backend
cd backend
pip install -r requirements.txt
uvicorn server:app --reload --host 127.0.0.1 --port 8001
```

### 10.2 Producción

#### Frontend (Vercel/Netlify)
```bash
cd frontend
npx expo export:web
# Deploy carpeta web-build/
```

#### Backend (Railway/Render/Heroku)
```bash
# Dockerfile recomendado
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001"]
```

#### Base de Datos (MongoDB Atlas)
- Cluster gratuito M0
- Configurar IP whitelist
- Actualizar MONGO_URL en variables de entorno

### 10.3 Variables de Entorno Requeridas

**Backend (.env)**
```
MONGO_URL=mongodb+srv://...
DB_NAME=mayaapp_production
SECRET_KEY=<generar_clave_segura>
```

**Frontend (.env)**
```
EXPO_PUBLIC_BACKEND_URL=https://api.mayaapp.com
```

---

## 11. Métricas y Analítica (Recomendado)

### 11.1 Métricas de Usuario
- Usuarios activos diarios (DAU)
- Usuarios activos mensuales (MAU)
- Tasa de retención (D1, D7, D30)
- Tiempo promedio de sesión
- Lecciones completadas por usuario

### 11.2 Métricas de Aprendizaje
- Tasa de éxito por ejercicio
- Palabras más difíciles
- Tiempo promedio por lección
- Tasa de abandono por lección

### 11.3 Herramientas Sugeridas
- **Google Analytics**: Tracking web
- **Mixpanel**: Eventos de usuario
- **Sentry**: Monitoreo de errores
- **LogRocket**: Replay de sesiones

---

## 12. Testing (Pendiente de Implementar)

### 12.1 Frontend
- **Unit Tests**: Jest + React Testing Library
- **E2E Tests**: Playwright/Cypress
- **Coverage objetivo**: >80%

### 12.2 Backend
- **Unit Tests**: pytest
- **Integration Tests**: TestClient de FastAPI
- **Coverage objetivo**: >85%

### 12.3 Casos de Prueba Críticos
1. Flujo completo de registro → login → lección → logout
2. Pérdida de vidas y recuperación
3. Desbloqueo secuencial de lecciones
4. Cálculo correcto de XP y niveles
5. Persistencia de progreso

---

## 13. Documentación de Código

### 13.1 Convenciones
- **TypeScript**: Interfaces para todos los tipos
- **Python**: Type hints en funciones
- **Comentarios**: Solo para lógica compleja
- **Naming**: camelCase (TS), snake_case (Python)

### 13.2 Archivos Clave

#### Frontend
- `app/_layout.tsx`: Configuración de navegación
- `contexts/AuthContext.tsx`: Lógica de autenticación
- `app/lesson/[id].tsx`: Motor de lecciones
- `utils/api.ts`: Cliente HTTP configurado

#### Backend
- `server.py`: Toda la lógica del backend
  - Líneas 1-110: Configuración e imports
  - Líneas 111-750: Contenido de lecciones
  - Líneas 751-900: Diccionario y tips
  - Líneas 901-1000: Autenticación
  - Líneas 1001-1200: Endpoints de lecciones

---

## 14. Licencia y Créditos

### 14.1 Tecnologías de Terceros
- **Expo**: MIT License
- **FastAPI**: MIT License
- **MongoDB**: Server Side Public License
- **Microsoft Translator API**: Servicio comercial

### 14.2 Contenido Educativo
- Vocabulario Maya Yucateco: Dominio público
- Ejercicios: Creación original

---

## 15. Contacto y Soporte

### 15.1 Repositorio
```
GitHub: [URL del repositorio]
```

### 15.2 Reporte de Bugs
- Crear issue en GitHub
- Incluir: pasos para reproducir, screenshots, logs

### 15.3 Contribuciones
- Fork del repositorio
- Crear branch: `feature/nueva-funcionalidad`
- Pull request con descripción detallada

---

## 16. Changelog

### v1.0.0 (2025-01-28)
- ✅ Sistema de autenticación completo
- ✅ 20 lecciones en 5 unidades
- ✅ Diccionario con 30+ palabras
- ✅ Sistema de vidas y XP
- ✅ Audio TTS para pronunciación
- ✅ Traductor en tiempo real
- ✅ Mini-juego de corazones
- ✅ Sistema de perfil de usuario
- ✅ Progreso persistente en MongoDB

---

**Última actualización**: 28 de Noviembre, 2025
**Versión del documento**: 1.0
**Autor**: Equipo de Desarrollo MayaApp
