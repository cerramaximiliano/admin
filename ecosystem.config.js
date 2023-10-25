module.exports = {
    apps: [
      {
        name: 'adminla',
        script: 'index.js',
        env: {
          PORT: 3000
        },
        exec_mode: 'fork',
        instances: 1,
        kill_timeout: 4000,
        listen_timeout: 5000,
        wait_ready: true,
      },
    ],
  };