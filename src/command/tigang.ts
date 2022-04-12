import bot, { Command, deleteMessage } from "../bot";
import fs from "fs"
//@ts-ignore
import { scheduleJob } from "node-schedule"
import { CallbackQuery, Message } from "node-telegram-bot-api";
try {
    fs.readFileSync("tigang.json", { encoding: 'utf-8' })
    updateSchedule()
} catch (error) {
    console.log(error.message);
    if (error.message.includes("no such file or directory")) {
        fs.writeFileSync("tigang.json", JSON.stringify({}), { encoding: 'utf-8' })
    }
}
export const command = new Command(
    /^\/tigang/,
    '\/tigang 提肛小助手',
    handler,
    true,
    '提肛小助手',
    cb
)

function updateSchedule() {
    const notisyList = JSON.parse(fs.readFileSync("tigang.json", { encoding: 'utf-8' }))
    for (const vo of Object.keys(notisyList)) {
        scheduleJob({ hour: 15, tz: notisyList[vo] }, async () => {
            await bot.sendVideo(vo, 'BAACAgEAAxkBAAMkYlUpaHYyuyPyeODLy3YZR8V0iMkAAlwCAAKYnwhGPbbdsQinJ8sjBA', {
                caption: '提肛小助手提醒您:每日提肛,远离痔疮.'
            })
        })
    }
}
async function handler(msg: Message) {

    const inline_keyboard = [
        [
            {
                text: '北京时间',
                callback_data: `tigang_setting_${msg.from?.id}_${msg.chat.id}_Etc/GMT-8`
            },
            {
                text: '美国东部时间',
                callback_data: `tigang_setting_${msg.from?.id}_${msg.chat.id}_Etc/GMT+4`
            }
        ],
        [
            {
                text: '日韩时间',
                callback_data: `tigang_setting_${msg.from?.id}_${msg.chat.id}_Etc/GMT-9`
            },
            {
                text: '东南亚时间',
                callback_data: `tigang_setting_${msg.from?.id}_${msg.chat.id}_Etc/GMT-7`
            }
        ],
        [
            {
                text: '英国时间',
                callback_data: `tigang_setting_${msg.from?.id}_${msg.chat.id}_Etc/GMT-1`
            },
            {
                text: '取消',
                callback_data: `tigang_cancel_${msg.from?.id}_${msg.chat.id}`
            }
        ]
    ]
    if (msg.chat.type === 'private') {
        await bot.sendMessage(msg.chat.id, `请选择你所在的时区,我将会在每天的15点通过私聊提醒你多喝水,做提肛.`, {
            reply_markup: {
                inline_keyboard
            }
        })
    }
    if (msg.chat.type === 'group' || msg.chat.type === 'supergroup') {
        const admins = await bot.getChatAdministrators(msg.chat.id)
        let isAdmin = admins.find(item => item.user.id === msg.from?.id)
        if (!isAdmin) {
            await bot.sendMessage(msg.chat.id, '非管理员无法管理群组提肛提醒,如需私人提醒,请通过私聊找我单独开启.', {
                reply_markup: {
                    inline_keyboard: [[{
                        text: '立即设置',
                        url: `https://t.me/${process.env.BOTID}`
                    }]]
                }
            }).then(res => {
                deleteMessage(msg, 15)
                deleteMessage(res, 15)
            })
        } else {
            await bot.sendMessage(msg.from?.id, `请选择你所在的时区,我将会在每天的15点通过私聊提醒你多喝水,做提肛.`, {
                reply_markup: {
                    inline_keyboard
                }
            }).catch(err => { })
            await bot.sendMessage(msg.chat.id, `请通过私聊进行设置.(若是第一次使用,请先私聊并发送/start)`, {
                reply_markup: {
                    inline_keyboard: [[{
                        text: '立即设置',
                        url: `https://t.me/${process.env.BOTID}`
                    }]]
                }
            }).then(res => {
                deleteMessage(res, 15)
                deleteMessage(msg, 15)
            })
        }
    }
}
async function cb(query: CallbackQuery) {
    const args = query.data?.split("_")
    let notisyList = JSON.parse(fs.readFileSync("tigang.json", { encoding: 'utf-8' }))
    try {
        if (args[1]) {
            switch (args[1]) {
                case 'setting':
                    if (String(query.from.id) === args[2]) {
                        notisyList[args[3]] = args[4]
                        fs.writeFileSync("tigang.json", JSON.stringify(notisyList), { encoding: 'utf-8' })
                        let reply = await bot.sendMessage(query.from.id, '好的,我将会准时提醒你的.')
                        deleteMessage(reply, 5)
                        updateSchedule()
                    }
                    break;
                case 'cancel':
                    if (String(query.from.id) === args[2]) {
                        delete notisyList[args[3]]
                        fs.writeFileSync("tigang.json", JSON.stringify(notisyList), { encoding: 'utf-8' })
                        let reply = await bot.sendMessage(query.from.id, '没有我的提醒,也要记得每天坚持提肛,多喝热水,确保痔疮远离你哟.')
                        deleteMessage({ message_id: query.message?.message_id, chat: query.message?.chat, date: query.message?.date }, 2)
                        deleteMessage(reply, 5)
                        updateSchedule()
                    }
                    break;

                default:
                    break;
            }
        }
    } catch (error) {
        console.log(error);
    }

}

