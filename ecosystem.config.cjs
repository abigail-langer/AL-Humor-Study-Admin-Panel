module.exports = {
  apps: [
    {
      name: 'webapp',
      script: '/home/user/webapp/node_modules/.bin/next',
      args: 'dev -p 3000',
      cwd: '/home/user/webapp',
      env: {
        NODE_ENV: 'development',
        PORT: 3000,
      },
      watch: false,
      instances: 1,
      exec_mode: 'fork',
      min_uptime: '5s',
      max_restarts: 3,
    },
  ],
}
