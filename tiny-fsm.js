/**
 * @options
 * @param {*} StateSwitcher 状态和处理函数的集合
 * @param {*} initState 初始化状态
 * @param {*} endState 结束状态
 * @param {*} cb 解析到一个数据包时执行的回调
 */
class FSM {
    constructor(options) {
        this.options = options;
        // 状态处理机，定义了状态转移集合
        this.stateSwitcher = new options.StateSwitcher({cb: options.cb});
        // 当前状态
        this.state = options.initState;
        // 结束状态
        this.endState = options.endState;
        // 当前待解析的数据
        this.buffer = null;
    }

    run(data) {
        // 没有数据或者解析结束了直接返回
        if (this.state === this.endState || !data || !data.byteLength) {
            return;
        }
        // 保存待解析的数据
        this.buffer = this.buffer ? Buffer.concat([this.buffer, data]) : data;
        // 还没结束，并且还有数据可以处理则继续执行
        while(this.state !== this.endState && this.buffer && this.buffer.length) {
            // 执行状态处理函数，返回[下一个状态, 剩下的数据]
            const result = this.stateSwitcher[this.state](this.buffer);
            // 如果返回false则说明需要更多的数据才能继续解析，并保持当前状态
            if (!result) {
                return;
            }
            // 记录下一个状态和数据
            [this.state, this.buffer] = result;
        }
    
    }
}

module.exports = {
    FSM,
}
