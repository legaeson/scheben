module.exports = {
  apps: [{
    name: 'kraspesok',
    script: 'server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 2000
    },
    max_memory_restart: '300M',
    restart_delay: 3000,
    max_restarts: 10,
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss'
  }]
};
