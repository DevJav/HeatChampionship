// pm2 process file: `pm2 start ecosystem.config.cjs` (after `npm run build`).
// Next reads .env itself; PORT and HOSTNAME here pick where it listens.
module.exports = {
  apps: [
    {
      name: "heat",
      cwd: __dirname,
      script: "node_modules/next/dist/bin/next",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
        // Only reachable from this machine (the Cloudflare tunnel connects locally);
        // use 0.0.0.0 to also serve it on the home network
        HOSTNAME: "127.0.0.1",
      },
      // One process: SQLite and uploaded photos live on this machine
      instances: 1,
      exec_mode: "fork",
      autorestart: true,
      max_memory_restart: "600M",
    },
    {
      // Nightly back-up (scripts/backup.mjs): runs once when pm2 starts, then at 04:30
      name: "heat-backup",
      cwd: __dirname,
      script: "scripts/backup.mjs",
      cron_restart: "30 4 * * *",
      autorestart: false,
    },
  ],
};
