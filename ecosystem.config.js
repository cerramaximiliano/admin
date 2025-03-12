module.exports = {
    apps: [
      {
        name: 'law-analytics',
        script: './server/app.js',
        instances: 'max',
        exec_mode: 'cluster',
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        env: {
          NODE_ENV: 'development',
          PORT: 3000
        },
        env_production: {
          NODE_ENV: 'production',
          PORT: 8080
        },
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: './logs/error.log',
        out_file: './logs/out.log',
        merge_logs: true
      },
      {
        name: 'law-analytics-tasks',
        script: './server/services/tasks/scheduler.js',
        instances: 1,
        exec_mode: 'fork',
        autorestart: true,
        watch: false,
        env: {
          NODE_ENV: 'development'
        },
        env_production: {
          NODE_ENV: 'production'
        },
        time: true,
        log_date_format: 'YYYY-MM-DD HH:mm:ss',
        error_file: './logs/tasks-error.log',
        out_file: './logs/tasks-out.log',
        merge_logs: true
      }
    ],
  
    deploy: {
      production: {
        user: 'usuario',
        host: 'servidor-produccion',
        ref: 'origin/main',
        repo: 'git@github.com:your-username/law-analytics.git',
        path: '/home/usuario/law-analytics',
        'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env production',
        env: {
          NODE_ENV: 'production'
        }
      },
      staging: {
        user: 'usuario',
        host: 'servidor-staging',
        ref: 'origin/staging',
        repo: 'git@github.com:your-username/law-analytics.git',
        path: '/home/usuario/law-analytics-staging',
        'post-deploy': 'npm install && pm2 reload ecosystem.config.js --env staging',
        env: {
          NODE_ENV: 'staging'
        }
      }
    }
  };