/**
 * 
 * @param {*} state 状态和处理函数的集合
 * @param {*} initState 初始化状态
 * @param {*} endState 结束状态
 */
function getMachine(state, initState, endState) {
    // 保存初始化状态
    let ret = initState;
    let buffer;
    return function(data) {
        if (ret === endState) {
            return;
        }
        if (data) {
            buffer = buffer ? Buffer.concat([buffer, data]) : data;
        }
        // 还没结束，继续执行
        while(ret !== endState) {
            if (!state[ret]) {
                return;
            }
            /*
                执行状态处理函数，返回[下一个状态, 剩下的数据]，
            */
            const result = state[ret](buffer);
            // 如果下一个状态是-1或者返回的数据是空说明需要更多的数据才能继续解析
            if (result[0] === -1) {
                return;
            }
            // 记录下一个状态和数据
            [ret, buffer] = result;
            if (!buffer.length) {
                return;
            }
        }
    }
}
