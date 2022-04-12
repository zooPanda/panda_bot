import fs from "fs";
import { Message } from "node-telegram-bot-api";
import bot, { Command, deleteMessage } from "../bot";
import path from "path";


export const command = new Command(
    /^\/start/,
    '\/start 开始命令',
    async (msg: Message) => {
        if (msg.chat.type === 'private') {
            let reply = ''
            await bot.getMe().then(res => {
                reply += `你好呀,我叫 ${res.first_name} \n你可以通过以下指令向我提出需求\n`
            })
            for (const vo of fs.readdirSync(__dirname)) {
                let _path = path.parse(vo)
                if (_path.ext === '.js') {
                    if (!fs.lstatSync(__dirname + '/' + vo).isDirectory()) {
                        const { command }: { command: Command } = await import(`${__dirname}/${_path.base}`)
                        reply += `\n使用 ` + command.des
                    }
                }
            }
            let reply_id = await bot.sendMessage(msg.chat.id, reply, { parse_mode: 'Markdown' })
            deleteMessage(msg, 5)
            deleteMessage(reply_id, 15)
        }
    },
    true,
    '开始'
)