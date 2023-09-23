
const http = require('http')

/**
 * 身份验证
 * @param {URL} url 请求链接
 * @param {(res: boolean, code?: number, message?: string) => void} callback 回调函数
 */
function serverAuth(url, callback) {
    callback(true);
}

/**
 * 身份验证
 * @param {URL} url 请求链接
 * @param {http.IncomingMessage} req 
 * @param {http.ServerResponse<http.IncomingMessage>} res 
 */
function clientAuth(url, req, res) {
    return true;
}

module.exports = {
    serverAuth,
    clientAuth,
}