import { CallbackQuery, InlineKeyboardButton, InlineKeyboardMarkup, Message } from "node-telegram-bot-api";
import bot, { Command, deleteMessage } from "../bot";
import fs from "fs"
//@ts-ignore
import { isValidCron } from "cron-validator"
//@ts-ignore
import { cancelJob, scheduleJob } from "node-schedule"

try {
    let doc = JSON.parse(fs.readFileSync("reminder.json", { encoding: 'utf-8' }))
    for (const id of Object.keys(doc)) {
        doc[id] = doc[id].filter(item => typeof item.cron !== 'undefined')
        for (const task of doc[id]) {
            let _task = scheduleJob(`${id}_${task.msg_id}`, task.cron, async () => {
                switch (task.type) {
                    case 'string':
                        await bot.sendMessage(id, `提醒事项:\n\n ${task.content}`)
                        break;
                    case 'photo':
                        await bot.sendPhoto(id, task.file_id, { caption: `*提醒小助手:*\n有件事儿你需要留意一下.`, parse_mode: 'Markdown' })
                        break;
                    default:
                        await bot.sendDocument(id, task.file_id, { caption: `*提醒小助手:*\n有件事儿你需要留意一下.`, parse_mode: 'Markdown' })
                        break;
                }
            })
            if (!_task) {
                doc[id] = doc[id].filter(item => item.msg_id !== task.msg_id)
            }
        }
    }
    writeFile(doc)
    scheduleJob('check', '5 4 * * *', () => {
        let docs = readFile()
        for (const id of Object.keys(docs)) {
            docs[id] = docs[id].filter(item => typeof item.cron !== 'undefined')
            for (const task of docs[id]) {
                if (!isValidCron(task.cron, { alias: true, allowBlankDay: true })) {
                    if (new Date(task.cron).getTime() < Date.now()) {
                        docs[id] = docs[id].filter(item => item.msg_id !== task.msg_id)
                    }
                }
            }
        }
        writeFile(docs)
    })
} catch (error) {
    console.log(error.message);
    if (error.message.includes("no such file or directory")) {
        fs.writeFileSync("reminder.json", JSON.stringify({}), { encoding: 'utf-8' })
    }
}



export const command = new Command(
    /^\/reminder/,
    '\/reminder 提醒小助手',
    handler,
    true,
    '提醒小助手',
    callback
)

async function handler(msg: Message) {
    let reply: Message
    switch (msg.chat.type) {
        case 'private':
            reply = await bot.sendMessage(msg.chat.id, `提醒助手为您服务:\n`, {
                reply_markup: {
                    inline_keyboard:
                        [
                            [
                                {
                                    text: '添加',
                                    callback_data: `reminder_add`
                                },
                                {
                                    text: '查看',
                                    callback_data: 'reminder_list'
                                }
                            ],
                            [
                                {
                                    text: '取消',
                                    callback_data: 'reminder_cancel'
                                }
                            ]
                        ]
                }
            })
            break;

        default:
            reply = await bot.sendMessage(msg.chat.id, `提醒助手仅支持个人提醒,请通过私聊启用.`, { reply_markup: { inline_keyboard: [[{ text: '前往私聊', url: `https://t.me/${process.env.BOTID}` }]] } })
            deleteMessage(reply, 10)
            break;
    }
    deleteMessage(msg, 10)
}

async function callback(query: CallbackQuery) {
    const { data, message } = query

    let args = data?.split("_")

    let reply: Message

    if (args[1]) {
        switch (args[1]) {
            case 'add':
                reply = await bot.sendMessage(query.from.id, `请回复需要我提醒你的内容\n\n*注意:*\n文本信息请参照官网关于[markdown格式的说明](https://core.telegram.org/bots/api#markdown-style)\n图片、视频仅支持一个文件,请勿同时回复多张照片或多个视频\n文件、表情添加后无法单个删除,只能清空,请谨慎添加.`, {
                    reply_markup: {
                        force_reply: true
                    },
                    parse_mode: 'Markdown',
                    disable_web_page_preview: true
                })

                let listen = bot.onReplyToMessage(reply.chat.id, reply.message_id, handlerAdd)
                setTimeout(() => {
                    deleteMessage(reply, 1)
                    bot.removeReplyListener(listen)
                }, 30 * 1000)
                break;
            case 'list':
                let doc = readFile()
                if (args[3]) {
                    let list = doc[query.from.id].filter(item => item.type === args[2])
                    let key: number
                    let item = list.find((item, k) => {
                        key = k
                        return item.msg_id === args[3]
                    })
                    let keyboard: InlineKeyboardButton[][];
                    if (key === 0) {
                        keyboard = [
                            [
                                {
                                    text: `删除`,
                                    callback_data: `reminder_del_${list[0].msg_id}`
                                },
                                {
                                    text: '下一个',
                                    callback_data: `reminder_list_${args[2]}_${list[1].msg_id}`
                                }
                            ],
                            [
                                {
                                    text: '取消',
                                    callback_data: 'reminder_cancel'
                                }
                            ]
                        ]
                    } else if (key === list.length - 1) {
                        keyboard = [
                            [
                                {
                                    text: '上一个',
                                    callback_data: `reminder_list_${args[2]}_${list[key - 1].msg_id}`
                                },
                                {
                                    text: `删除`,
                                    callback_data: `reminder_del_${list[key].msg_id}`
                                }
                            ],
                            [
                                {
                                    text: '取消',
                                    callback_data: 'reminder_cancel'
                                }
                            ]
                        ]
                    } else {
                        keyboard = [
                            [
                                {
                                    text: '上一个',
                                    callback_data: `reminder_list_${args[2]}_${list[key - 1].msg_id}`
                                },
                                {
                                    text: `删除`,
                                    callback_data: `reminder_del_${list[0].msg_id}`
                                },
                                {
                                    text: '下一个',
                                    callback_data: `reminder_list_${args[2]}_${list[key + 1].msg_id}`
                                }
                            ],
                            [
                                {
                                    text: '取消',
                                    callback_data: 'reminder_cancel'
                                }
                            ]
                        ]
                    }
                    switch (args[2]) {
                        case 'video':
                            await bot.editMessageMedia({
                                media: item.file_id,
                                type: 'video',
                                caption: item.cron
                            },
                                {
                                    chat_id: query.from.id,
                                    message_id: query.message.message_id,
                                    reply_markup: {
                                        inline_keyboard: keyboard
                                    }
                                })

                            break;
                        case 'photo':
                            await bot.editMessageMedia(
                                {
                                    media: item.file_id,
                                    type: 'photo',
                                    caption: item.cron
                                },
                                {
                                    chat_id: query.from.id,
                                    message_id: query.message.message_id,
                                    reply_markup: {
                                        inline_keyboard: keyboard
                                    }
                                }
                            )
                            break;
                        default:
                            await bot.editMessageText(`
                            提醒文本: *${item.content}*\n定时信息: \`${isValidCron(item.cron, { alias: true, allowBlankDay: true }) ? item.cron : new Date(item.cron).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')}\``, {
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: keyboard
                                },
                                chat_id: query.from.id,
                                message_id: query.message.message_id
                            })
                            break;
                    }

                } else if (args[2]) {
                    let list = doc[query.from.id].filter(item => item.type === args[2])
                    if (!list.length) {
                        return await bot.sendMessage(query.from.id, '当前分类没有提醒事项').then(res => {
                            deleteMessage(res)
                            deleteMessage(message)
                        })
                    }
                    let keyboard: InlineKeyboardButton[][]
                    if (list.length === 1) {
                        keyboard = [
                            [
                                {
                                    text: '删除',
                                    callback_data: `reminder_del_${list[0].msg_id}`
                                }
                            ],
                            [
                                {
                                    text: '取消',
                                    callback_data: 'reminder_cancel'
                                }
                            ]
                        ]
                    } else {
                        keyboard = [
                            [
                                {
                                    text: `删除`,
                                    callback_data: `reminder_del_${list[0].msg_id}`
                                },
                                {
                                    text: '下一个',
                                    callback_data: `reminder_list_${args[2]}_${list[1].msg_id}`
                                }
                            ],
                            [
                                {
                                    text: '取消',
                                    callback_data: 'reminder_cancel'
                                }
                            ]
                        ]
                    }
                    switch (args[2]) {
                        case 'string':
                            await bot.sendMessage(query.from.id, `
                            提醒文本: *${list[0].content}*\n定时信息: \`${isValidCron(list[0].cron, { alias: true, allowBlankDay: true }) ? list[0].cron : new Date(list[0].cron).toLocaleString('zh-CN', { hour12: false }).replace(/\//g, '-')}\``, {
                                parse_mode: 'Markdown',
                                reply_markup: {
                                    inline_keyboard: keyboard
                                }
                            })
                            break;
                        case 'photo':
                            await bot.sendPhoto(query.from.id, list[0].file_id, {
                                caption: list[0].cron,
                                reply_markup: {
                                    inline_keyboard: keyboard
                                }
                            })
                            break;

                        default:
                            await bot.sendDocument(query.from.id, list[0].file_id, {
                                caption: list[0].cron,
                                reply_markup: {
                                    inline_keyboard: keyboard
                                }
                            })

                            break;
                    }
                    deleteMessage(message, 2)

                } else {
                    if (doc[query.from.id] && doc[query.from.id].length) {
                        await bot.sendMessage(query.from.id, `请选择要查看的类型`, {
                            reply_markup: {
                                inline_keyboard: [
                                    [
                                        {
                                            text: '文本',
                                            callback_data: 'reminder_list_string'
                                        },
                                        {
                                            text: '图片',
                                            callback_data: 'reminder_list_photo'
                                        },
                                        {
                                            text: '视频',
                                            callback_data: 'reminder_list_video'
                                        }
                                    ],
                                    [
                                        {
                                            text: '清空其余提醒',
                                            callback_data: 'reminder_clear'
                                        },
                                        {
                                            text: '取消',
                                            callback_data: 'reminder_cancel'
                                        }
                                    ]
                                ]
                            }
                        }).then(() => {
                            deleteMessage(message, 1)
                        })
                    } else {
                        await bot.sendMessage(query.from.id, '当前尚未设置提醒').then(res => {
                            deleteMessage(res, 5)
                            deleteMessage(message, 5)
                        })
                    }
                }
                break;
            case 'clear':
                let docss = readFile()
                let del = docss[query.from.id].filter(item => item.type === 'file')
                docss[query.from.id] = docss[query.from.id].filter(item => item.type !== 'file')
                writeFile(docss)
                del.map(item => {
                    cancelJob(`${query.from.id}_${item.msg_id}`)
                })
                await bot.sendMessage(query.from.id, '删除成功').then(res => {
                    deleteMessage(res, 2)
                    deleteMessage(message, 2)
                })
                break;

            case 'del':
                let docs = readFile()
                docs[query.from.id] = docs[query.from.id].filter(item => item.msg_id !== args[2])
                writeFile(docs)
                await bot.sendMessage(query.from.id, '删除成功').then(res => {
                    deleteMessage(res, 2)
                    deleteMessage(message, 2)
                })
                break;
            default:
                deleteMessage(message, 1)
                break;
        }
    }
}

function readFile() {
    try {
        return JSON.parse(fs.readFileSync("reminder.json", { encoding: 'utf-8' }))
    } catch (error) {
        console.log(error.messsage);
        return null
    }
}

function writeFile(doc: object) {
    fs.writeFileSync("reminder.json", JSON.stringify(doc), { encoding: 'utf-8' })
}

async function handlerAdd(msg: Message) {
    deleteMessage(msg.reply_to_message, 2)
    let doc = readFile()
    if (doc) {
        let task: object
        let type: string
        if (msg.animation || msg.audio || msg.document || msg.sticker) {
            type = 'file'
        } else if (msg.video) {
            type = 'video'
        } else if (msg.photo) {
            type = 'photo'
        } else {
            type = 'string'
        }
        if (type === 'string') {
            task = {
                type,
                content: msg.text,
                msg_id: String(msg.message_id)
            }
        } else {
            let pics = msg.photo
            task = {
                type,
                file_id: msg.animation?.file_id || msg.audio?.file_id || msg.document?.file_id || msg.sticker?.file_id || msg.video?.file_id || pics[pics.length].file_id,
                msg_id: String(msg.message_id)
            }
        }
        if (Object.keys(doc).includes(String(msg.chat.id))) {
            doc[msg.chat.id].push(task)
        } else {
            doc[msg.chat.id] = [task]
        }
        writeFile(doc)
        const reply = await bot.sendMessage(msg.chat.id, `请回复需要提醒你的时间,可选格式:\n\n年-月-日 时:分\n5位cron格式 若不知道什么是cron格式请到[这里](https://crontab.guru/)了解\n\nid:${msg.message_id}`, { parse_mode: 'Markdown', disable_web_page_preview: true, reply_markup: { force_reply: true } })
        deleteMessage(msg)
        bot.onReplyToMessage(reply.chat.id, reply.message_id, handlerAddCron)
    } else {
        await bot.sendMessage(msg.chat.id, '出现了无法预料的故障,请联系管理员.')
    }
}

async function handlerAddCron(msg: Message) {
    if (msg.text) {
        const msg_id = msg.reply_to_message.text.match(/\d+/g)
        if (isValidCron(msg.text, { alias: true, allowBlankDay: true })) {
            await handlerAddCronTask(msg.chat.id, msg_id[1], msg.text)
            deleteMessage(msg)
        } else {
            await handlerAddCronTask(msg.chat.id, msg_id[1], new Date(msg.text))
            deleteMessage(msg)
        }
        deleteMessage(msg.reply_to_message)
    }
}

async function handlerAddCronTask(chat_id: number, msg_id: string, time: string | Date) {
    let doc = readFile()
    let key: number
    doc[chat_id].map((item: { msg_id: string, type: string, file_id?: string, content?: string }, k: number) => {
        if (item.msg_id === msg_id) {
            return key = k
        }
    })
    doc[chat_id][key]['cron'] = time
    writeFile(doc)
    let job = scheduleJob(`${chat_id}_${msg_id}`, time, async () => {
        let task = doc[chat_id][key]
        switch (task.type) {
            case 'string':
                await bot.sendMessage(chat_id, task.content)
                break;
            case 'photo':
                await bot.sendPhoto(chat_id, task.file_id, { caption: `*提醒小助手:*\n有件事儿你需要留意一下.`, parse_mode: 'Markdown' })
                break;
            default:
                await bot.sendDocument(chat_id, task.file_id, { caption: `*提醒小助手:*\n有件事儿你需要留意一下.`, parse_mode: 'Markdown' })
                break;
        }
    })
    if (job) {
        await bot.sendMessage(chat_id, `添加成功,该任务下次提醒你的时间是:${new Date(job.nextInvocation()).toLocaleString("zh-CN", { hour12: false, timeZone: 'asia/shanghai' }).replace(/\//g, "-")}`)
            .then(res => {
                deleteMessage(res)
            })
    } else {
        await bot.sendMessage(chat_id, `无效的时间,请检查是否符合要求的时间格式或时间是否已经过期.`).then(res => {
            deleteMessage(res)
        })
    }
}