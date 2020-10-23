// 开始标识符
const PACKET_START = 0x3;
// 整个数据包长度
const TOTAL_LENGTH = 4;
// 序列号长度
const SEQ_LEN = 4;
// 表示一个协议包
class Packet {
    constructor() {
        this.length = 0;
        this.seq = 0;
        this.data = null;
    }
    set(field, value) {
        this[field] = value;
    }
    get(field) {
        return this[field];
    }
}
// 状态集
const PARSE_STATE = {
  PARSE_INIT: 0,
  PARSE_HEADER: 1,
  PARSE_DATA: 2,
  PARSE_END: 3,
};

class StateSwitcher {
    constructor(options) {
        this.options = options;
    }

    [PARSE_STATE.PARSE_INIT](data) {
        // 数据不符合预期
        if (data[0] !== PACKET_START) {
            // 跳过部分数据，找到开始标记
            const position = data.indexOf(PACKET_START);
            // 没有开始标记，说明这部分数据无效，丢弃
            if (position === -1) {
                return false;
            }
            // 否则返回有效数据部分，继续解析
            return [PARSE_STATE.PACKET_START, data.slice(position)];
        }
        // 保存当前正在解析的数据包
        this.packet = new Packet();
        // 跳过开始标记的字节数，进入解析协议头阶段
        return [PARSE_STATE.PARSE_HEADER, data.slice(Buffer.from([PACKET_START]).byteLength)];
    } 

    [PARSE_STATE.PARSE_HEADER](data) {
        // 数据不够头部的大小则等待数据到来
        if (data.length < TOTAL_LENGTH + SEQ_LEN) {
          return false;
        }
        // 有效数据包的长度 = 整个数据包长度 - 头部长度
        this.packet.set('length', data.readUInt32BE() - (TOTAL_LENGTH + SEQ_LEN));
        // 序列号
        this.packet.set('seq', data.readUInt32BE(TOTAL_LENGTH));
        // 解析完头部了，跳过去
        data = data.slice(TOTAL_LENGTH + SEQ_LEN);
        // 进入解析数据阶段
        return [PARSE_STATE.PARSE_DATA, data];
    }

    [PARSE_STATE.PARSE_DATA](data) {
        const len = this.packet.get('length');
        // 数据部分的长度小于协议头中定义的长度，则继续等待
        if (data.length < len) {
            return false;
        }
        // 截取数据部分
        this.packet.set('data', data.slice(0, len));
        // 解析完数据了，完成一个包的解析，跳过数据部分
        data = data.slice(len);
        typeof this.options.cb === 'function' && this.options.cb(this.packet);
        this.packet = null;
        // 解析完一个数据包，进入结束标记阶段
        return [PARSE_STATE.PARSE_INIT, data];
    }
}

function seq() {
   return ~~(Math.random() * Math.pow(2, 31))
}

function packet(data, sequnce) {
    // 转成buffer
    const bufferData = Buffer.from(data, 'utf-8');
    // 开始标记长度
    const startFlagLength = Buffer.from([PACKET_START]).byteLength;
    // 序列号
    const _seq = sequnce || seq();
    // 分配一个buffer存储数据
    let buffer = Buffer.allocUnsafe(startFlagLength + TOTAL_LENGTH + SEQ_LEN);
    // 设计开始标记
    buffer[0] = 0x3;
    // 写入总长度字段的值
    buffer.writeUIntBE(TOTAL_LENGTH + SEQ_LEN + bufferData.byteLength, 1, TOTAL_LENGTH);
    // 写入序列号的值
    buffer.writeUIntBE(_seq, startFlagLength + TOTAL_LENGTH, SEQ_LEN);
    // 把协议元数据和数据组装到一起
    buffer = Buffer.concat([buffer, bufferData], buffer.byteLength + bufferData.byteLength);
    return buffer;
}

const { FSM } = require('../tiny-fsm');
const fsm = new FSM({
    StateSwitcher,
    initState: PARSE_STATE.PARSE_INIT,
    endState: PARSE_STATE.PARSE_END,
    cb: function() {
        console.log(...arguments);
    }
});
const data = packet('1');
let i = 0;

while(i < data.byteLength) {
    fsm.run(data.slice(i++, i));
}