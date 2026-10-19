// 把 async 路由包起来：异常统一转交 Express 错误处理，避免未处理的 rejection
module.exports = function wrap(fn) {
    return function (req, res, next) {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
