import bot, { Command, deleteMessage } from "../bot";
import axios, {AxiosBasicCredentials, AxiosRequestConfig} from "axios";
//@ts-ignore
import { CallbackQuery, Message, InlineKeyboardButton } from "node-telegram-bot-api";

export const command = new Command(
    /^\/bili/,
    '\/bilibili 录播控制',
    handler,
    false,
    '录播控制',
    callback
)
const BURL = process.env.BURL;
const auth: AxiosBasicCredentials = { username: process.env.BUSERNAME || '', password: process.env.BPASSWORD || '', };
const config1: AxiosRequestConfig = { headers: { 'accept': 'text/plain' },auth,};
const config2: AxiosRequestConfig = { headers: { 'accept': 'text/plain', 'Content-Type': 'text/json' },auth, };
const config3: AxiosRequestConfig = { headers: { 'accept': 'text/plain', 'Content-Type': 'application/json-patch+json' }, auth, };

async function handler(msg: Message) {
    deleteMessage(msg, 15)

    if (msg.from.id === parseInt(process.env.HOSTID)) {
        let local = msg.text.split(" ")[1];
        switch (local) {
            case 'help'://帮助
                help(msg.from.id)
                break;
            case 'list'://列表
                roomlist(msg.from.id)
                break;
            case 'start'://开始
                roomdefault(msg.from.id, 'start', Number(msg.text.split(" ")[2]))
                break;
            case 'stop'://停止
                roomdefault(msg.from.id, 'stop', Number(msg.text.split(" ")[2]))
                break;
            case 'split'://切片*Tips：cut和slice的区别，对视频流时通常slice是提取中间的一段而源不变，slice一般用于平面的切割切片，cut用于从物体中间和侧面切开
                roomdefault(msg.from.id, 'split', Number(msg.text.split(" ")[2]))
                break;
            case 'add'://增加
                roomadd(msg.from.id,Number(msg.text.split(" ")[2]), !!msg.text.split(" ")[3])
                //msg.text.split(" ")[3]为空的话就是false
                break;
            case 'delete'://删除
                roomdelete(msg.from.id, Number(msg.text.split(" ")[2]))
                break;
            case 'roomrefresh'://刷新
                roomdefault(msg.from.id, 'refresh', Number(msg.text.split(" ")[2]))
                break;
            case 'roomread'://统计
                readjson(msg.from.id, '/room', `/${msg.text.split(" ")[2]}`, '')
                break;
            case 'roomconfig'://房间配置
                readjson(msg.from.id, '/room', `/${msg.text.split(" ")[2]}`, '/config')
                break;
            case 'default'://默认设置
                readjson(msg.from.id, '/config', '/default', '')
                break;
            case 'global'://全局设置
                readjson(msg.from.id, '/config', '/global', '')
                break;
            case 'roomset'://设置配置
                set(msg.from.id, msg.text.split(" ")[2], msg.text.split(" ")[3], msg.text.split(" ")[4], Number(msg.text.split(" ")[5]))
                break;
            case 'set'://全局设置
                set(msg.from.id, msg.text.split(" ")[2], msg.text.split(" ")[3], msg.text.split(" ")[4], Number())
                break;
            default:
                axios.get(`${BURL}/api/room`, config1)
                    .then(response => {
                        //打印列表
                        let an_jian = [
                            [
                                {
                                    text: '增加',
                                    callback_data: `bilibilicontrol add`
                                }
                            ]
                        ]
                        let row = []
                        response.data.forEach((room: { streaming: boolean; recording: boolean; name: string; roomId: number; }, index:number) => {
                            row.push({
                                text: `${room.streaming === true ? (room.recording === true ? '✓' : '✗') : ''} ${room.name}`,
                                callback_data: `bilibilicontrol ${room.name} ${room.roomId}`
                            })

                            // 每添加两个按键，就将该行按键添加到按键列表
                            if ((index + 1) % 2 === 0) {
                                an_jian.push(row)
                                row = []
                            }
                        })

                        // 如果最后还有剩余的按键，则添加到列表中
                        if (row.length > 0) {
                            an_jian.push(row)
                        }

                        bot.sendMessage(msg.from.id, '<b>BililiveRecorder_API</b> 更多用法：<code>/bili help</code>', {
                            reply_markup: {
                                inline_keyboard: an_jian
                            },
                            parse_mode: 'HTML'
                        }).then(res => { deleteMessage(res, 60) })
                    }).catch(error => { console.error(error); });
                break;
        }


    } else {
        bot.sendMessage(msg.from.id, '今天天气真不错').then(res => { deleteMessage(res, 60) })
    }
}

async function callback(query: CallbackQuery) {
    const { data, message } = query
    //console.log(JSON.stringify(query, null, 2))
    const args = data?.split(" ")
    let reply: Message
    let keyboard: InlineKeyboardButton[][];
    try {
        if (query.from.id === parseInt(process.env.HOSTID)) {
            switch (args[1]) {
                case 'add':
                    reply = await bot.sendMessage(query.from.id, `请输入要增加的房间ID`, {
                        reply_markup: {
                            force_reply: true
                        },
                        parse_mode: 'Markdown',
                        disable_web_page_preview: true
                    })

                    let listen:number = bot.onReplyToMessage(reply.chat.id, reply.message_id, handlerAdd)
                    setTimeout(() => {
                        deleteMessage(reply, 1)
                        bot.removeReplyListener(listen)
                    }, 30 * 1000)
                    break;
                case 'delete':
                    deleteMessage(query.message, 0)
                    roomdelete(query.from.id, Number(args[2]))
                    break;
                case 'start':
                    roomdefault(query.from.id, 'start', Number(args[2]))
                    break;
                case 'stop':
                    roomdefault(query.from.id, 'stop', Number(args[2]))
                    break;
                case 'auto_on':
                    set(query.from.id, 'autoRecord', 'true', '', Number(args[2]))
                    break;
                case 'auto_off':
                    set(query.from.id, 'autoRecord', 'false', '', Number(args[2]))
                    break;
                default:
                    keyboard = [
                        [
                            {
                                text: '开始',
                                callback_data: `bilibilicontrol start ${args[2]}`
                            },
                            {
                                text: '停止',
                                callback_data: `bilibilicontrol stop ${args[2]}`
                            }
                        ],
                        [
                            {
                                text: 'Auto on',
                                callback_data: `bilibilicontrol auto_on ${args[2]}`
                            },
                            {
                                text: 'Auto off',
                                callback_data: `bilibilicontrol auto_off ${args[2]}`
                            }
                        ],
                        [
                            {
                                text: '删除',
                                callback_data: `bilibilicontrol delete ${args[2]}`
                            }
                        ]
                    ]
                    await bot.sendMessage(query.from.id, `name: ${args[1]}`, {
                        reply_markup: {
                            inline_keyboard: keyboard
                        }
                    }).then(res => { deleteMessage(res, 15) })

                    //await bot.sendMessage(query.from.id, `${args[3]}-${args[4]}`)
                    break;
            }

        }
    } catch (error) {

    }

}


async function handlerAdd(msg: Message) {
    deleteMessage(msg.reply_to_message, 2)
    deleteMessage(msg, 2)
    //console.log(`add:${msg}`)
    const data = { roomId: msg.text, autoRecord: 'false' };
    axios.post(`${BURL}/api/room`, data, config2).then((response) => {
        bot.sendMessage(msg.from.id, response.status === 200 ? '成功' : '失败').then(res => { deleteMessage(res, 15) })
        //console.log(response.status);
    }).catch(error => { console.error(error); });
}


function help(id:number) {
    bot.sendMessage(id, `
<code>/bili help</code>
*显示帮助\n
<code>/bili list</code> 
*显示房间列表\n
<code>/bili start </code> &lt;RoomId&gt;
*开始录制\n
<code>/bili stop </code> &lt;RoomId&gt;
*停止录制\n
<code>/bili split </code> &lt;RoomId&gt;
*手动分段\n
<code>/bili add </code> &lt;RoomId AutoRecord&gt;
*增加房间 "AutoRecord"有值即为true\n
<code>/bili delete </code> &lt;RoomId&gt;
*删除房间\n
<code>/bili roomrefresh </code> &lt;RoomId&gt;
*刷新房间\n
<code>/bili roomread </code> &lt;RoomId&gt;
*读取房间统计信息\n
<code>/bili roomconfig </code> &lt;RoomId&gt;
*读取房间配置\n
<code>/bili roomset </code> &lt;setname hasValue value RoomId&gt;
*设置房间配置\n
<code>/bili default</code>
*显示默认设置\n
<code>/bili global</code> 
*显示全局设置\n
<code>/bili set</code> &lt;setname hasValue value&gt;
*全局设置
    `, { parse_mode: "HTML" }).then(res => { deleteMessage(res, 300) })
}

function roomlist(id:number) {
    axios.get(`${BURL}/api/room`, config1)
        .then(response => {
            //打印列表
            let message = '';
            response.data.forEach((room: { autoRecord: boolean; roomId: any; recording: boolean; streaming: boolean; name: any; }) => {
                message += `${room.autoRecord === true ? '✔' : '✘'}roomId: <code>${room.roomId}</code>${room.recording === true ? '✔' : '✘'}\n${room.streaming === true ? '✔' : '✘'}name: <a href="https://live.bilibili.com/${room.roomId}">${room.name}</a>\n\n`;
            });
            bot.sendMessage(id, message, { parse_mode: "HTML", disable_web_page_preview: true }).then(res => { deleteMessage(res, 300) })
        }).catch(error => { console.error(error); });
}

function roomdefault(id:number, action:string, RoomId:number) {
    const url = `${BURL}/api/room/${RoomId}/${action}`;
    axios.post(url, {}, config1)
        .then(response => {
            bot.sendMessage(id, response.status === 200 ? '成功' : '失败').then(res => { deleteMessage(res, 15) });
        }).catch(error => { console.error(error); });
}

function roomadd(id:number, RoomId:number, AutoRecord:boolean) {
    const data = { roomId: RoomId, autoRecord: AutoRecord };
    axios.post(`${BURL}/api/room`, data, config2).then((response) => {
        bot.sendMessage(id, response.status === 200 ? '成功' : '失败').then(res => { deleteMessage(res, 15) })
        //console.log(response.status);
    }).catch(error => { console.error(error); });
}

function roomdelete(id:number, RoomId:number) {
    let url = `${BURL}/api/room/${RoomId}`
    axios.delete(url, config1).then(response => {
        bot.sendMessage(id, response.status === 200 ? '成功' : '失败').then(res => { deleteMessage(res, 15) })
        //console.log(response.data);
    }).catch(error => { console.error(error); });
}

function readjson(id:number, path1:string, path2:string, path3:string) {
    axios.get(`${BURL}/api${path1}${path2}${path3}`, config1).then(response => {
        bot.sendMessage(id, `<pre>${JSON.stringify(response.data, null, 2)}</pre>`, { parse_mode: "HTML" }).then(res => { deleteMessage(res, 300) })
    }).catch(error => { console.error(error); });
}

function set(id:number, setname:string, hasValue:string, value:string, RoomId:number) {
    let configData:string;
    let url = ``
    switch (setname) {
        case 'help':
            bot.sendMessage(id, `
<code>/bili roomset help</code>
*显示帮助\n
<code>/bili roomset autoRecord </code>
&lt;true|false ' ' RoomId&gt;
*自动录制\n
<code>/bili roomset optionalRecordMode </code>
&lt;true|false 0|1 RoomId&gt;
*录制模式(标准/原始)\n
<code>/bili roomset optionalFlvProcessorSplitOnScriptTag </code>
&lt;true|false true|false RoomId&gt;
*标准模式修复设置\n
<code>/bili roomset optionalCuttingMode </code>
&lt;true|false 0|1|2 RoomId&gt;
*自动分段(不分段/时间/大小)\n
<code>/bili roomset optionalCuttingNumber </code>
&lt;true|false Number RoomId&gt;
*分段设置(分钟/MiB)\n
<code>/bili roomset optionalRecordDanmaku </code>
&lt;true|false true|false RoomId&gt;
*保存弹幕\n
<code>/bili roomset optionalRecordDanmakuRaw </code>
&lt;true|false true|false RoomId&gt;
*弹幕原始\n
<code>/bili roomset optionalRecordDanmakuSuperChat </code>
&lt;true|false true|false RoomId&gt;
*SuperChat\n
<code>/bili roomset optionalRecordDanmakuGift </code>
&lt;true|false true|false RoomId&gt;
*送礼信息\n
<code>/bili roomset optionalRecordDanmakuGuard </code>
&lt;true|false true|false RoomId&gt;
*舰长购买\n
<code>/bili roomset optionalSaveStreamCover </code>
&lt;true|false true|false RoomId&gt;
*封面\n
<code>/bili roomset optionalRecordingQuality </code>
&lt;true|false Number RoomId&gt;
*录制画质_80/150/250/400/401/10000/20000/30000
*流畅/高清/超清/蓝光/蓝光(杜比)/原画/4K/杜比\n
                `, { parse_mode: "HTML" }).then(res => { deleteMessage(res, 300) })
            return;
        case 'autoRecord':
            configData = `{"${setname}":${hasValue}}`
            break;
        default:
            configData = `{"${setname}":{"hasValue":${hasValue},"value":${value}}}`
            break;
    }
    if (RoomId === 0) {
        url = `${BURL}/api/config/global`
    } else {
        url = `${BURL}/api/room/${RoomId}/config`
    }
    //console.log(`:${RoomId}-${configData}`)
    axios.post(url, configData, config3)
        .then(response => {
            bot.sendMessage(id, response.status === 200 ? '成功' : '失败').then(res => { deleteMessage(res, 15) })
            //console.log(response.data);
        }).catch(error => {
            bot.sendMessage(id, error.response.status === 400 ? '请重新输入' : '').then(res => { deleteMessage(res, 15) })
            //console.error(error); 
        });

}
