# Law Analytics - Sistema de Scraping y Actualizaciones

Sistema para el scraping automático de tasas financieras, normativas legales y datos previsionales, con notificaciones por email y API REST.

## Características

- Scraping de tasas desde múltiples fuentes (BCRA, BNA, CPACF)
- Scraping de normativas legales desde Infoleg
- Actualización automática de categorías basadas en movilidad previsional
- Notificaciones por email sobre actualizaciones
- API REST para consulta de datos
- Panel de administración para gestión de tareas
- Sistema de tareas programadas configurables
- Registro detallado de actividades
- Análisis estadístico de datos y uso del sistema

## Requisitos previos

- Node.js 14.x o superior
- MongoDB 4.x o superior (compatible con Mongoose 8.11.0)
- AWS CLI configurado para acceso a SecretsManager y SES
- Credenciales de CPACF para acceso a tasas

## Instalación

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/your-username/law-analytics.git
   cd law-analytics
   ```

2. Instalar dependencias:
   ```bash
   npm install
   ```

3. Configurar variables de entorno (o usar AWS SecretsManager):
   ```bash
   cp .env.example .env
   # Editar .env con los valores apropiados
   ```

4. Iniciar la aplicación:
   ```bash
   npm start
   ```

## Estructura del proyecto

```
server/
├── config/                  # Configuraciones (DB, AWS, etc.)
├── controllers/             # Controladores para las rutas
├── middlewares/             # Middlewares de Express
├── models/                  # Modelos de MongoDB
├── routes/                  # Rutas organizadas por dominio
├── services/                # Lógica de negocio
│   ├── scrapers/            # Servicios de scraping separados por fuente
│   ├── aws_ses/             # Servicios de email con AWS SES
│   ├── stats/               # Servicios de análisis estadístico
│   ├── file_manager/        # Gestión de archivos 
│   └── tasks/               # Tareas programadas
├── utils/                   # Utilidades generales
├── tests/                   # Tests unitarios y de integración
│   ├── unit/                # Tests unitarios
│   └── integration/         # Tests de integración
└── files/                   # Archivos temporales y de procesamiento
```

## Tareas programadas

La aplicación incluye varias tareas programadas que se ejecutan automáticamente:

| Tarea | Descripción | Programación |
|-------|-------------|--------------|
| `bcra-tasa-pasiva` | Descarga y procesa tasa pasiva BCRA | Diario 9:00 AM |
| `bcra-cer` | Descarga y procesa CER | Diario 9:05 AM |
| `bcra-icl` | Descarga y procesa ICL | Diario 9:10 AM |
| `bna-tasa-pasiva` | Descarga y procesa tasa pasiva BNA | Diario 9:20 AM |
| `bna-tasa-activa` | Actualiza tasa activa BNA | Diario 9:18 AM |
| `cpacf-tasa-activa-bna` | Scraping de tasa activa BNA desde CPACF | Diario 11:58 AM |
| `cpacf-tasa-pasiva-bna` | Scraping de tasa pasiva BNA desde CPACF | Diario 11:59 AM |
| `cpacf-tasa-acta-2658` | Scraping de tasa acta 2658 desde CPACF | Diario 12:00 PM |
| `cpacf-tasa-acta-2764` | Scraping de tasa acta 2764 desde CPACF | Diario 12:01 PM |
| `infoleg-normativas` | Actualiza normativas desde Infoleg | Diario 9:25 AM |
| `actualizar-categorias` | Actualiza categorías según movilidad | Diario 9:30 AM |

## API REST

La API incluye los siguientes endpoints:

### Tasas

- `GET /api/tasas/consulta` - Consulta tasas por rango de fechas y campo específico
  - Parámetros:
    - `fechaDesde` (obligatorio): Fecha inicial del rango (formatos aceptados: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD)
    - `fechaHasta` (obligatorio): Fecha final del rango (formatos aceptados: YYYY-MM-DD, DD/MM/YYYY, DD-MM-YYYY, YYYY/MM/DD)
    - `campo` (obligatorio): Campo a consultar (tasaPasivaBNA, tasaPasivaBCRA, tasaActivaBNA, cer, icl, tasaActivaCNAT2601, tasaActivaCNAT2658, tasaActivaCNAT2764, tasaActivaTnaBNA)
    - `completo` (opcional): Booleano (true/false) que determina si se devuelve el rango completo o solo los extremos

- `GET /api/tasas/listado` - Obtiene listado de tasas disponibles
  - No requiere parámetros
  - Requiere autenticación

- `POST /api/tasas/update` - Actualiza información de tasas
  - Parámetros:
    - `tasaId` (obligatorio): ID de la tasa a actualizar
    - `fechaDesde` (obligatorio): Fecha inicial en formato YYYY-MM-DD
    - `fechaHasta` (obligatorio): Fecha final en formato YYYY-MM-DD
    - `tipoTasa` (obligatorio): Tipo de tasa a actualizar
  - Requiere autenticación de administrador

### Tareas programadas

- `GET /api/tasks` - Obtiene lista de tareas programadas
  - No requiere parámetros
  - Requiere autenticación de administrador

- `POST /api/tasks/:taskId/execute` - Ejecuta una tarea inmediatamente
  - Path params:
    - `taskId` (obligatorio): ID de la tarea a ejecutar
  - Requiere autenticación de administrador

- `POST /api/tasks/:taskId/stop` - Detiene una tarea
  - Path params:
    - `taskId` (obligatorio): ID de la tarea a detener
  - Requiere autenticación de administrador

- `POST /api/tasks/:taskId/start` - Inicia una tarea detenida
  - Path params:
    - `taskId` (obligatorio): ID de la tarea a iniciar
  - Requiere autenticación de administrador

- `POST /api/tasks/initialize` - Inicializa todas las tareas
  - No requiere parámetros
  - Requiere autenticación de administrador

- `POST /api/tasks/stop-all` - Detiene todas las tareas
  - No requiere parámetros
  - Requiere autenticación de administrador

### Estadísticas

- `GET /api/stats/dashboard` - Obtiene estadísticas del dashboard
  - No requiere parámetros
  - Requiere autenticación

- `GET /api/stats/dashboard/:userId` - Obtiene estadísticas del dashboard para un usuario específico
  - Path params:
    - `userId` (obligatorio): ID del usuario
  - Requiere autenticación

- `GET /api/stats/analytics` - Obtiene análisis estadísticos generales
  - No requiere parámetros
  - Requiere autenticación

- `GET /api/stats/analytics/:userId` - Obtiene análisis estadísticos para un usuario específico
  - Path params:
    - `userId` (obligatorio): ID del usuario
  - Requiere autenticación

- `GET /api/stats/category/:category` - Obtiene estadísticas por categoría
  - Path params:
    - `category` (obligatorio): Categoría de análisis (folders, financial, activity, tasks, notifications, matters)
  - Requiere autenticación

- `GET /api/stats/:userId/category/:category` - Obtiene estadísticas por categoría para un usuario específico
  - Path params:
    - `userId` (obligatorio): ID del usuario
    - `category` (obligatorio): Categoría de análisis (folders, financial, activity, tasks, notifications, matters)
  - Requiere autenticación

- `POST /api/stats/generate` - Genera nuevas estadísticas
  - No requiere parámetros
  - Requiere autenticación

- `POST /api/stats/generate/:userId` - Genera nuevas estadísticas para un usuario específico
  - Path params:
    - `userId` (obligatorio): ID del usuario
  - Requiere autenticación

- `POST /api/stats/generate-all` - Genera estadísticas para todos los usuarios
  - No requiere parámetros
  - Requiere autenticación de administrador

### Usuarios y autenticación

- `POST /api/login` - Inicia sesión
  - Body params:
    - `email` (obligatorio): Email del usuario
    - `password` (obligatorio): Contraseña del usuario

- `GET /api/home` - Página principal (requiere autenticación)
  - No requiere parámetros

- `GET /api/users/dashboard` - Dashboard de usuarios (requiere autenticación)
  - No requiere parámetros

## Pruebas

Ejecutar pruebas unitarias:

```bash
npm test
```

Ejecutar pruebas específicas:

```bash
npm test -- --grep "BCRA Service"
```

Ejecutar pruebas unitarias:

```bash
npm run test:unit
```

Ejecutar pruebas de integración:

```bash
npm run test:integration
```

Ejecutar el linter:

```bash
npm run lint
```

## Configuración de Puppeteer

### Instalación optimizada

Para evitar que cada instalación de Puppeteer descargue su propia copia de Chromium (lo que puede resultar en múltiples copias redundantes), recomendamos instalar Puppeteer usando la siguiente configuración:

```bash
# Evitar la descarga automática de Chromium
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true npm install puppeteer
```

Esta configuración requiere que tengas una instalación global de Chromium en tu sistema que será utilizada por Puppeteer.

### Configuración con PM2

Si estás utilizando PM2 (como se recomienda para este proyecto), la configuración de Chromium se gestiona a través del archivo `ecosystem.config.js`:

```javascript
module.exports = {
  apps: [
    {
      name: 'law-analytics',
      script: './app.js',
      // ... otras configuraciones
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
        CHROMIUM_PATH: '/usr/bin/chromium-browser'  // Ruta a tu instalación de Chromium
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3000,
        CHROMIUM_PATH: '/usr/bin/chromium-browser'  // Ruta a tu instalación de Chromium
      },
      // ... resto de configuración
    },
  ],
};
```

### Iniciar la aplicación con PM2

```bash
# Usar configuración predeterminada (desarrollo)
pm2 start ecosystem.config.js

# O específicamente para entorno de producción
pm2 start ecosystem.config.js --env production
```

### Configuración sin PM2

Si no estás utilizando PM2, debes asegurarte de establecer la variable de entorno `CHROMIUM_PATH` antes de iniciar la aplicación:

```bash
# Linux/macOS
export CHROMIUM_PATH=/usr/bin/chromium-browser
node app.js

# Windows
set CHROMIUM_PATH=C:\Ruta\A\chromium.exe
node app.js
```

### Solución de problemas

#### Encontrar la ruta correcta de Chromium

Para encontrar la ruta correcta a tu instalación de Chromium:

```bash
# En sistemas Linux
which chromium-browser
# o
which chromium

# En macOS
which chromium

# En Windows, verificar la ubicación de instalación
# Típicamente en:
# C:\Program Files\Chromium\Application\chrome.exe
# o
# C:\Program Files (x86)\Chromium\Application\chrome.exe
```

#### Errores comunes

- **Error `kill EACCES`**: Este error ocurre cuando el usuario que ejecuta la aplicación no tiene permisos para manipular el proceso de Chromium. Para resolverlo:
  - Usa la versión de Chromium que viene con Puppeteer (sin establecer `PUPPETEER_SKIP_CHROMIUM_DOWNLOAD`)
  - Asegúrate de que el usuario tenga permisos adecuados para ejecutar Chromium
  - Considera usar la aplicación con un usuario con más privilegios

- **Error `Failed to launch the browser process`**: Verifica que la ruta especificada en `CHROMIUM_PATH` sea correcta y que Chromium esté instalado.

### Verificación de instalación

Para verificar que Puppeteer puede acceder correctamente a Chromium, puedes ejecutar este script de prueba:

```javascript
// test-puppeteer.js
const puppeteer = require('puppeteer');

(async () => {
  console.log('Ruta de Chromium configurada:', process.env.CHROMIUM_PATH);
  
  try {
    const browser = await puppeteer.launch({
      executablePath: process.env.CHROMIUM_PATH,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    
    console.log('Puppeteer iniciado correctamente');
    const version = await browser.version();
    console.log('Versión del navegador:', version);
    
    await browser.close();
    console.log('Navegador cerrado correctamente');
  } catch (error) {
    console.error('Error al iniciar Puppeteer:', error);
  }
})();
```

Ejecútalo con:

```bash
node test-puppeteer.js
```

## Configuración

La configuración se maneja a través de variables de entorno y el archivo `config/index.js`. Las variables críticas se pueden almacenar en AWS SecretsManager.

### Variables de entorno importantes

- `NODE_ENV`: Entorno de ejecución (development, production)
- `PORT`: Puerto en el que se ejecutará la aplicación
- `MONGODB_URI`: URI de conexión a MongoDB
- `JWT_SECRET`: Secreto para generar tokens JWT
- `AWS_REGION`: Región de AWS para los servicios de SecretsManager y SES
- `AWS_ACCESS_KEY_ID`: ID de clave de acceso a AWS
- `AWS_SECRET_ACCESS_KEY`: Clave secreta de acceso a AWS
- `CHROMIUM_PATH`: Ruta al ejecutable de Chromium
- `CPACF_USER`: Usuario para acceder a CPACF
- `CPACF_PASSWORD`: Contraseña para acceder a CPACF

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.