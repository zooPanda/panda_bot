module.exports = {
  apps: [{
    script: './dist/bot.js',
    watch: './dist',
    env: {
      BOTTOKEN: '',//机器人Token
      HOSTID:'',//bot所有者ID,包含数据写入权限,须特别注意.
    }
  }],
};
