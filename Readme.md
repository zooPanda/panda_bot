# 使用
```shell
git clone https://github.com/zooPanda/panda_bot.git
```
修改 `ecosystem.config.js` 中的BOTTOKEN

```shell
yarn start
or
npm start
```


## 命令

### /start
开始使用，可以知道机器人都有哪些指令。

### /icommand
机器人相关指令
 `/icommand reboot` => 重启机器人

 `/icommand install <github的raw地址,例如 `https://raw.githubusercontent.com/zooPanda/panda_bot/dev/src/command/tigang.ts`>` => 安装插件

 `/icommand uninstall <插件名称,例如 start>` => 删除插件