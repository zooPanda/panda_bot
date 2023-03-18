import TelegramBot, { BotCommand, Message } from "node-telegram-bot-api";
import fs from "fs";
import path from "path";
import { spawn } from "child_process";

// 实例化Bot
const bot = new TelegramBot(process.env.BOTTOKEN, { polling: true })
bot.getMe().then(res => {
    process.env.BOTID = res.username
})

export default bot

init()
async function init() {
    const commandDir = __dirname + '/command'
    console.log(`\nBot启动\n\n----------开始加载命令-----------`);
    const myCommand: BotCommand[] = []
    // 循环命令文件夹下的所有文件    
    for (const vo of fs.readdirSync(commandDir)) {
        let _path = path.parse(vo)
        // 如果文件后缀不是js则跳过
        if (_path.ext !== '.js' && process.env.DEV !== 'true') {
            continue;
        }
        // 确保不是文件夹
        if (!fs.lstatSync(commandDir + '/' + vo).isDirectory()) {
            try {
                // 导入模块
                const { command }: { command: Command } = await import(`${commandDir}/${_path.base}`)
                // 判断是否需要注册到命令菜单中
                if (command.isCommand) {
                    myCommand.push({ command: _path.name.toLocaleLowerCase(), description: command.commandDesc })
                }
                // 监听消息
                bot.onText(command.reg, command.handler)
                // 判断是否需要做回调查询处理
                if (command.callback) {
                    // 回调查询的data须以名称开头一致
                    bot.on('callback_query', query => {
                        if (query.data?.indexOf(_path.name) === 0) {
                            command.callback(query)
                        }
                    })
                }
                console.log(`- 加载命令模块 '${_path.name}' 成功.`);
            } catch (error) {
                console.log(error.message);
                if (error.message.includes('Cannot find module')) {
                    let module = error.message.match(/\'(.*)\'/)
                    let install = spawn('yarn', ['add', module[1]])
                    install.on("exit", () => {
                        spawn("tsc")
                    })
                }
                console.log(`- 加载命令模块 '${_path.name}' 时出错了.`);
            }
        }
    }
    console.log(`\n----------命令加载完毕----------`);

    // 设置命令
    await bot.setMyCommands(myCommand)
        .then(res => {
            if (res) {
                console.log(`设置命令成功`);
            }
        })
        .catch(err => {
            console.log(`设置命令失败:${err.message}`);
        })

    let setting = getSetting()
    if (setting.reboot) {
        await bot.sendMessage(process.env.HOSTID, '重启完毕.')
        setting.reboot = false
        fs.writeFileSync("bot.json", JSON.stringify(setting), { encoding: 'utf-8' })
    }
}

export function getSetting() {
    try {
        return JSON.parse(fs.readFileSync("bot.json", { encoding: 'utf-8' }))
    } catch (error) {
        return null
    }
}
export function writeSetting(setting) {
    try {
        fs.writeFileSync("bot.json", JSON.stringify(setting), { encoding: 'utf-8' })
        return true
    } catch (error) {
        return null
    }
}

export class Command {
    reg: RegExp
    des: string
    handler: (msg: TelegramBot.Message, match: RegExpExecArray | null) => void
    isCommand: boolean
    commandDesc: string
    callback: (query: TelegramBot.CallbackQuery) => void
    /**
     * 构建命令
     * @param reg 匹配正则表达式
     * @param des 命令描述
     * @param handler 处理函数
     * @param isCommand 是否需要注册到命令列表
     * @param commandDesc 命令列表描述
     * @param cb 回调查讯处理函数
     */
    constructor(reg: RegExp, des: string, handler: (msg: TelegramBot.Message, match: RegExpExecArray | null) => void, isCommand: boolean, commandDesc?: string, cb?: (query: TelegramBot.CallbackQuery) => void) {
        this.reg = reg
        this.des = des
        this.handler = handler
        this.isCommand = isCommand
        this.commandDesc = commandDesc
        this.callback = cb
    }
}

/**
 * 延迟删除消息
 * @param msg 需要删除的消息
 * @param times 延迟 单位:s
 */
export const deleteMessage = (msg: Message, times: number = 10) => {
    return setTimeout(async () => {
        try {
            await bot.deleteMessage(msg.chat.id, `${msg.message_id}`)
        } catch (error) {
            console.log(error.message);
        }
    }, times * 1000)
}
