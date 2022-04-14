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
        fs.writeFileSync("tigang.json", JSON.stringify([]), { encoding: 'utf-8' })
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
    scheduleJob({ hour: 10, minute: 30 }, async () => {
        const notisyList = JSON.parse(fs.readFileSync("tigang.json", { encoding: 'utf-8' }))
        for (const _vo of Object.keys(notisyList)) {
            await bot.sendVideo(_vo, 'BAACAgEAAxkBAAMkYlUpaHYyuyPyeODLy3YZR8V0iMkAAlwCAAKYnwhGPbbdsQinJ8sjBA', {
                caption: '提肛小助手提醒您:每日提肛,远离痔疮.\n起来走动走动,让肚子为午饭腾点儿位置.'
            })
        }
    })
    scheduleJob({ hour: 15 }, async () => {
        const notisyList = JSON.parse(fs.readFileSync("tigang.json", { encoding: 'utf-8' }))
        for (const _vo of Object.keys(notisyList)) {
            await bot.sendVideo(_vo, 'BAACAgEAAxkBAAMkYlUpaHYyuyPyeODLy3YZR8V0iMkAAlwCAAKYnwhGPbbdsQinJ8sjBA', {
                caption: '提肛小助手提醒您:每日提肛,远离痔疮.\n三点了,起身走动下,喝杯温水休息一会儿.'
            })
        }
    })
    scheduleJob({ hour: 21, minute: 30 }, async () => {
        const notisyList = JSON.parse(fs.readFileSync("tigang.json", { encoding: 'utf-8' }))
        for (const _vo of Object.keys(notisyList)) {
            await bot.sendVideo(_vo, 'BAACAgEAAxkBAAMkYlUpaHYyuyPyeODLy3YZR8V0iMkAAlwCAAKYnwhGPbbdsQinJ8sjBA', {
                caption: '提肛小助手提醒您:每日提肛,远离痔疮.\n躺在床上也不许偷懒,跟着节奏夹紧~~放松~~夹紧~~放松~~.'
            })
        }
    })
}
async function handler(msg: Message) {

    const inline_keyboard = [
        [
            {
                text: '开启',
                callback_data: `tigang_setting_${msg.from?.id}_${msg.chat.id}`
            },
            {
                text: '关闭',
                callback_data: `tigang_cancel_${msg.from?.id}_${msg.chat.id}`
            }
        ]
    ]
    if (msg.chat.type === 'private') {
        await bot.sendMessage(msg.chat.id, `我将会每天三次通过私聊提醒你多喝水,做提肛.`, {
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
            await bot.sendMessage(msg.from?.id, `我将会每天三次提醒你多喝水,做提肛.`, {
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
                        notisyList = [...notisyList, args[3]]
                        fs.writeFileSync("tigang.json", JSON.stringify(notisyList), { encoding: 'utf-8' })
                        let reply = await bot.sendMessage(query.from.id, '好的,我将会准时提醒你的.')
                        deleteMessage(query.message, 2)
                        deleteMessage(reply, 5)
                    }
                    break;
                case 'cancel':
                    if (String(query.from.id) === args[2]) {
                        notisyList = notisyList.filter(item => item !== args[3])
                        fs.writeFileSync("tigang.json", JSON.stringify(notisyList), { encoding: 'utf-8' })
                        let reply = await bot.sendMessage(query.from.id, '没有我的提醒,也要记得每天坚持提肛,多喝热水,确保痔疮远离你哟.')
                        deleteMessage(query.message, 2)
                        deleteMessage(reply, 5)
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

