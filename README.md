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

## Requisitos previos

- Node.js 14.x o superior
- MongoDB 4.x o superior
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
│   ├── email/               # Servicios de email
│   └── tasks/               # Tareas programadas
├── utils/                   # Utilidades generales
├── tests/                   # Tests unitarios y de integración
│   ├── unit/                # Tests unitarios
│   └── integration/         # Tests de integración
├── views/                   # Plantillas de vistas EJS
└── app.js                   # Punto de entrada principal
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

- `GET /api/tasas/download?tasa=tipo` - Descarga y procesa una tasa específica
- `GET /api/tasas/dashboard` - Obtiene las tasas más recientes para el dashboard
- `GET /api/tasas/periodo?startDate=X&endDate=Y&tipo=Z` - Obtiene tasas para un período
- `GET /api/tasas/ultimos` - Obtiene los últimos valores registrados para cada tipo
- `GET /api/tasas/check/:tipo` - Verifica y actualiza fechas para una tasa

### Tareas programadas

- `GET /api/tasks` - Obtiene lista de tareas programadas
- `POST /api/tasks/:taskId/execute` - Ejecuta una tarea inmediatamente
- `POST /api/tasks/:taskId/stop` - Detiene una tarea
- `POST /api/tasks/:taskId/start` - Inicia una tarea detenida

### Usuarios y autenticación

- `POST /api/login` - Inicia sesión
- `GET /api/home` - Página principal (requiere autenticación)
- `GET /api/users/dashboard` - Dashboard de usuarios (requiere autenticación)

## Pruebas

Ejecutar pruebas unitarias:

```bash
npm test
```

Ejecutar pruebas específicas:

```bash
npm test -- --grep "BCRA Service"
```

## Configuración

La configuración se maneja a través de variables de entorno y el archivo `config/index.js`. Las variables críticas se pueden almacenar en AWS SecretsManager.

## Licencia

Este proyecto está licenciado bajo la Licencia MIT - ver el archivo LICENSE para más detalles.
