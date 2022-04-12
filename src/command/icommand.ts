import fs from "fs"
import { spawn } from "child_process";
import { Message } from "node-telegram-bot-api";
import bot, { Command, deleteMessage, getSetting, writeSetting } from "../bot";
import path from "path";
import axios from "axios";


export const command = new Command(
    /^\/icommand/,
    '\/icommand 机器人相关命令',
    hanlder,
    false
)
async function hanlder(msg: Message) {

    if (msg.chat.type === 'private' && String(msg.from?.id) === process.env.HOSTID) {
        let setting = getSetting()
        const { text } = msg
        if (text) {
            let args = text.split(" ")
            console.log(args);

            if (args) {
                switch (args[1]) {
                    case 'reboot':
                        setting.reboot = true
                        writeSetting(setting)
                        spawn('tsc')
                        break;
                    case 'uninstall':
                        if (args[2]) {
                            fs.unlink(path.resolve(__dirname, `../../src/command/${args[2]}.ts`), async (err) => {
                                if (err) {
                                    return await bot.sendMessage(msg.chat.id, '删除失败,请确认插件名称是否正确.')
                                }
                                await bot.sendMessage(msg.chat.id, '删除成功,重启Bot.')
                                setting.reboot = true
                                writeSetting(setting)
                                fs.unlink(`${__dirname}/${args[2]}.js`, () => { })
                            })
                        } else {
                            let reply = await bot.sendMessage(msg.chat.id, '请输入需要删除的插件名称')
                            deleteMessage(msg, 5)
                            deleteMessage(reply, 5)
                        }
                        break;

                    case 'install':
                        if (args[2]) {
                            let _path = path.parse(args[2])
                            let targetDir = path.resolve(__dirname, '../../src/command')
                            try {
                                const { data } = await axios.get(args[2])
                                if (data) {
                                    fs.writeFileSync(targetDir + '/' + _path.base, data, { encoding: 'utf-8' })
                                    setting.reboot = true
                                    writeSetting(setting)
                                    spawn('tsc')
                                } else {
                                    await bot.sendMessage(msg.chat.id, '获取插件失败').then(res => {
                                        deleteMessage(msg, 5)
                                        deleteMessage(res, 5)
                                    })
                                }
                            } catch (error) {
                                if (error.isAxiosError) {
                                    await bot.sendMessage(msg.chat.id, '获取插件失败').then(res => {
                                        deleteMessage(msg, 5)
                                        deleteMessage(res, 5)
                                    })
                                }
                            }
                        } else {
                            await bot.sendMessage(msg.chat.id, '请附上需要安装的插件地址,例如GitHub上的raw地址.').then(res => {
                                deleteMessage(msg, 5)
                                deleteMessage(res, 5)
                            })
                        }
                        break;
                    default:
                        let reply = await bot.sendMessage(msg.chat.id, '/icommand <reboot|install|uninstall> <args>')
                        deleteMessage(msg, 5)
                        deleteMessage(reply, 5)
                        break;
                }
            }
        }
    }
}