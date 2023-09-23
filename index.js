const http = require('http');
const WebSocket = require('ws');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const authentication = require('./authentication');
const { serverMap, ServerInfo, ClientInfo } = require('./manager');
const cert = require('./cert');
const { decodeCiphertext } = require('./TransmissionKey');

const PORT = process.env.PORT || 3000;
const BODY_DATA_LIMIT = 1 * 1024 * 1024;
const CLIENT_TIMEOUT = 60;
const SHOW_SERVERS = process.env.SHOW_SERVERS !== 'T';

function headersDecryptor(headersCiphertext) {
    return crypto.privateDecrypt(cert.privateKey, headersCiphertext);
}

function bodyDecryptor(bodyCiphertext, headers) {
    let iv = headers.iv;
    if (iv.length == 0) {
        iv = null;
    }
    const decipher = crypto.createDecipheriv(headers.algorithm, headers.key, iv);
    return Buffer.concat([decipher.update(bodyCiphertext), decipher.final()]);
}

// 创建HTTP服务器
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (req.method === "POST") {
        if (url.pathname.endsWith("/link")) {
            if (!authentication.clientAuth(url, req, res)) {
                return;
            }
            // 接收请求体数据
            let bodyData = Buffer.alloc(0);
            let bodyDataSize = 0;
            req.on('data', (chunk) => {
                bodyDataSize += chunk.length;
                if (bodyDataSize > BODY_DATA_LIMIT) {
                    // 请求实体过大
                    bodyData = undefined;
                    res.writeHead(413, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        code: 413,
                        message: 'Request entity too large',
                    }));
                    req.destroy(); // 关闭请求连接
                    return;
                }
                bodyData = Buffer.concat([bodyData, chunk]);
            });
            req.on('end', () => {
                let data;
                try {
                    let dataStr = decodeCiphertext(bodyData, headersDecryptor, bodyDecryptor);
                    data = JSON.parse(dataStr);
                } catch (e) {
                    res.writeHead(500, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        code: 500,
                        message: '' + e,
                    }));
                    return;
                }
                const server = serverMap[data.code];
                if (!server) {
                    // 服务器不存在或者不在线
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({
                        code: 200,
                        server: false,
                        url: null,
                    }));
                    return;
                }
                const client = new ClientInfo();
                client.id = uuidv4();
                client.response = res;
                client.timeout = setTimeout(() => {
                    client.close();
                }, 1000 * CLIENT_TIMEOUT);
                server.addClient(client, data);
                res.writeHead(200, { 'Content-Type': 'application/json' });

                res.on('close', () => {
                    console.log("HTTP 关闭!" + client.id)
                    client.close();
                })

            });
            return;
        }
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            code: 404,
            message: '404',
        }));
        return;
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    let serversInfo;
    if (SHOW_SERVERS) {
        serversInfo = {
            online: Object.keys(serverMap),
            count: 0,
        };
        serversInfo.count = serversInfo.online.length;
    } else {
        serversInfo = null;
    }
    res.end(JSON.stringify({
        code: 200,
        message: 'WebPTP Center 1.0.0',
        servers: serversInfo
    }));
});

// 创建WebSocket服务器
const wss = new WebSocket.Server({
    server,
    verifyClient: function (info, callback) {
        const url = new URL(info.req.url, `http://${info.req.headers.host}`);
        authentication.serverAuth(url, callback);
    },
});

// 处理WebSocket连接
wss.on('connection', (ws, req) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const serverCode = url.searchParams.get('code');
    if (!serverCode) {
        console.log("url.searchParams: ", serverCode, url.searchParams)
        ws.send(JSON.stringify({
            message: 'Not find serverCode!',
        }))
        ws.close();
        return;
    }
    let server = serverMap[serverCode];
    if (server) {
        server.close();
        server = undefined;
        return;
    }
    server = new ServerInfo();
    server.ws = ws;
    server.code = serverCode;
    server.clientMap = {};
    server.lastUpdateTime = new Date().getTime();
    serverMap[serverCode] = server;

    ws.on('message', (message, isBinary) => {
        if (isBinary) {
            ws.close();
        }
        try {
            const data = JSON.parse(message);
            const clientId = data.id;
            server.responseData(clientId, message);
        } catch (e) {
            console.error("[WS][Server]Error: " + e);
        }
    });
    ws.on('close', () => {
        server.close();
    })
});

// 启动服务器
server.listen(PORT, () => {
    console.log(`Server listening on port ${PORT}`);
});