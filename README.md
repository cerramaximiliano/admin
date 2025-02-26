## Descripción General
Law Analytics es una aplicación web enfocada en servicios legales que ofrece herramientas para cálculos jurídicos, seguimiento de tasas de interés y envío automatizado de correos electrónicos con actualizaciones. El sistema está diseñado específicamente para profesionales del derecho en Argentina.

---

## Características Principales

### **Gestión de Tasas e Índices**
- Sincronización automática de tasas desde fuentes oficiales (**BCRA, BNA, CPACF**).
- Seguimiento de múltiples tipos de tasas:
  - **Tasa Pasiva BCRA**
  - **Tasa Pasiva BNA**
  - **Tasa Activa BNA**
  - **Tasa Activa CNAT 2601**
  - **Tasa Activa CNAT 2658**
  - **Tasa Activa CNAT 2764**
  - **CER (Coeficiente de Estabilización de Referencia)**
  - **ICL (Índice de Contratos de Locación)**
- Verificación automática de datos faltantes y corrección.

### **Sistema de Correos Electrónicos**
- Envío de informes automáticos sobre actualizaciones de tasas.
- Gestión de promociones por email para usuarios.
- Plantillas de correo para diferentes propósitos:
  - **Verificación de cuentas**
  - **Reseteo de contraseñas**
  - **Resultados de cálculos**
  - **Actualizaciones de tasas e índices**
  - **Actualizaciones normativas**
  - **Promociones segmentadas**

### **Datos Legales y Financieros**
- Información de categorías impositivas.
- Datos previsionales.
- Escalas salariales (**comercio, servicio doméstico**).
- Normativas legales actualizadas.

### **Scraping Web Automatizado**
- Extracción de información desde sitios oficiales.
- Procesamiento automático de archivos **PDF, XLS y páginas web**.
- Actualización diaria de tasas e índices.

### **Seguridad y Autenticación**
- Sistema de autenticación basado en **JWT**.
- Almacenamiento seguro de credenciales en **AWS Secrets Manager**.
- Control de acceso a endpoints mediante **middleware**.

### **Programación de Tareas**
- Sistema de tareas programadas mediante **node-cron**.
- Verificaciones periódicas de datos.
- Actualizaciones automáticas de la base de datos.

---

## **Arquitectura Técnica**

### **Backend**
- **Node.js con Express**.
- **MongoDB** como base de datos principal.
- **Mongoose** para modelado de datos.
- **Autenticación mediante JWT**.
- **Logger con Pino** para registro de eventos.

### **Servicios AWS**
- **SES (Simple Email Service)** para envío de correos.
- **Secrets Manager** para gestión segura de credenciales.
- **S3** (implícito) para almacenamiento de archivos.

### **Herramientas de Scraping**
- **Puppeteer** para navegación headless.
- **Cheerio** para parsing de HTML.
- **XLSX** para procesamiento de archivos Excel.
- **PDF-Parse** para extracción de datos de archivos PDF.

---

## **Modelos de Datos**
El sistema cuenta con varios modelos de datos, incluyendo:

- **Usuarios**: gestión de cuentas y permisos.
- **Tasas**: diferentes tipos de tasas de interés y fechas.
- **Promociones**: usuarios y campañas de email marketing.
- **Categorías**: información sobre categorías impositivas.
- **Datos Previsionales**: información sobre haberes previsionales.
- **Normas**: registro de normativas legales actualizadas.
- **Estadísticas**: datos de uso y estadísticas del sistema.

---

## **Instalación**

1. **Clonar el repositorio**
   ```bash
   git clone https://github.com/tuusuario/law-analytics-backend.git
   cd law-analytics-backend
   ```

2. **Instalar dependencias**
   ```bash
   npm install
   ```

3. **Configurar variables de entorno** (AWS credentials, MongoDB URL, etc.).

4. **Iniciar el servidor**
   ```bash
   node server/server.js
   ```

---

## **Configuración**
El sistema utiliza **AWS Secrets Manager** para recuperar configuraciones sensibles, que se almacenan localmente como **variables de entorno** en tiempo de ejecución. Las principales configuraciones incluyen:

- **Credenciales de base de datos (MongoDB)**.
- **Claves de API para AWS SES**.
- **Semilla para generación de JWT**.
- **Configuración de caducidad de tokens**.

---

## **Tareas Programadas**
El sistema incluye múltiples tareas programadas que se ejecutan automáticamente:

- **Actualizaciones diarias de tasas** (9:00 AM Argentina).
- **Verificación de datos faltantes**.
- **Scraping de sitios web oficiales**.
- **Envío de correos con actualizaciones**.
- **Campañas de email marketing (configurables)**.

---

## **Endpoints API**

### **Autenticación**
- `POST /login` → Iniciar sesión.
- `GET /home` → Acceso a la página principal (requiere autenticación).

### **Tasas**
- `GET /tasas` → Descarga de archivos de tasas.
- `GET /tasasdashboard` → Panel de control de tasas.

### **Usuarios**
- `GET /usersdashboard` → Panel de control de usuarios.

### **Email Marketing**
- `POST /emailpromotion` → Registro de emails para promociones.
- `POST /emailpromotion-erase` → Eliminación de emails de promociones.
- `GET /emailusers` → Listado de usuarios para promociones.

### **Archivos**
- `GET /filesnames` → Obtener nombres de archivos.
- `GET /logger` → Acceso a logs del sistema.
- `GET /logger-app` → Acceso a logs de la aplicación.

### **Mantenimiento**
- Verificación regular de tareas cron.
- Monitoreo de logs para detectar errores.
- Actualización manual de tasas en caso de fallos en el scraping automático.
- Comprobación periódica de la integridad de la base de datos.

---

## **Requisitos del Sistema**

- **Node.js** 12+
- **MongoDB** 4+
- **Cuenta AWS** con acceso a SES y Secrets Manager.
- **Memoria**: Mínimo 2GB RAM.
- **Sistema operativo**: Linux (preferido), Windows o macOS.

---

## **Licencia**
Todos los derechos reservados © **Law Analytics**.