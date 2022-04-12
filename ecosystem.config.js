module.exports = {
  apps: [{
    script: './dist/bot.js',
    watch: './dist',
    env: {
      BOTTOKEN: ''//机器人Token
    }
  }],
};
