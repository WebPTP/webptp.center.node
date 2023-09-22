var express = require('express');
var router = express.Router();
const crypto = require('crypto');

var cert = require('../cert');

function getServerCode(serverId) {
    return crypto.createHash('sha256')
        .update(cert.publicKeySha256Hex + "-" + serverId + "-" + cert.privateKeySha256Hex)
        .digest('hex');
}

function getWsId(ws) {
    return ws._socket.remoteAddress + ':' + ws._socket.remotePort;
}

// 所有服务数据
const serverMap = {};

/* 响应证书 */
router.get('/', function (req, res, next) {
    let serverCount = 0;
    let clientCount = 0;
    let server;
    let client;
    for (let serverId in serverMap) {
        serverCount++;
        server = serverMap[serverId];
        for (let clientId in server.clients) {
            client = server.clients[clientId];
            clientCount++;
        }
    }

    res.render('link', {
        serverCount,
        clientCount,
        crypto: "rsa",
        modulusLength: 2048,
        publicKey: {
            format: 'pem',
            type: 'spki',
            key: cert.publicKeyPem
        },
    });
});

/* 服务端 */
router.ws('/server', function (ws, req) {
    if (!req.query.sid) {
        ws.send(JSON.stringify({
            type: "handshake",
            serverCode: null,
            error: `Missing URL parameter: 'sid'`
        }));
        ws.close();
        return;
    }
    const serverCode = getServerCode(req.query.sid);
    if (serverMap[serverCode]) {
        ws.send(JSON.stringify({
            type: "handshake",
            serverCode: null,
            error: `Server already exists: '${req.query.sid}'`
        }));
        ws.close();
        return;
    }
    serverMap[serverCode] = {
        id: getWsId(ws),
        ws: ws,
        clients: {},
        createTime: new Date().getTime(),
    };
    ws.send(JSON.stringify({
        type: "handshake",
        serverCode: serverCode,
        error: null
    }));
    ws.on('close', function() {
        if (!serverMap[serverCode]) {
            return;
        }
        const server = serverMap[serverCode];
        for (let clientId in server.clients) {
            server.clients[clientId]?.ws.close();
        }
        delete serverMap[serverCode];
    });
    ws.on('message', (data, isBinary) => {
        if (isBinary) {
            ws.send(JSON.stringify({
                type: "message",
                error: `The server cannot receive any binary data!`
            }));
            ws.close();
            return;
        }
        const server = serverMap[serverCode];
        if (!server) {
            ws.send(JSON.stringify({
                type: "message",
                error: `The server closed!`
            }));
            ws.close();
            return;
        }
        let request;
        try {
            request = JSON.parse(data);
        } catch(e) {
            ws.send(JSON.stringify({
                type: "message",
                error: `Exception parsing JSON data!`
            }));
            ws.close();
            return;
        }
        if (request.type === 'heartbeat') {
            ws.send(JSON.stringify({
                type: "heartbeat"
            }));
            return;
        }
        if (request.type === 'client-handshake') {
            if (!request.clientId) {
                ws.send(JSON.stringify({
                    type: request.type,
                    error: `Missing JSON parameter attribute 'clientId'!`
                }));
                return;
            }
            const client = server.clients[request.clientId];
            if (!client) {
                ws.send(JSON.stringify({
                    type: request.type,
                    clientId: request.clientId,
                    error: `Not find client: ${request.clientId}`
                }));
                return;
            }
            try {
                client.ws.send(JSON.stringify(request), () => {
                    client.ws.close();
                });
            } catch(e) {
                console.log("[ws][Error]", e)
                ws.send(JSON.stringify({
                    type: request.type,
                    clientId: request.clientId,
                    error: `Exception send: ${request.clientId} | ${e}`
                }));
            }
        }
    });
});

/* 客户端 */
router.ws('/client', function (ws, req) {
    if (!req.query.code) {
        ws.send(JSON.stringify({
            type: "handshake",
            serverOnline: null,
            error: `Missing URL parameter: 'code'`
        }));
        ws.close();
        return;
    }
    const serverCode = req.query.code;
    const server = serverMap[serverCode];
    const serverOnline = !!server;
    const wsId = getWsId(ws) + "-" + crypto.randomUUID();
    ws.send(JSON.stringify({
        type: "handshake",
        serverOnline: serverOnline,
        error: null
    }));
    if (!serverOnline) {
        ws.close();
        return;
    }
    server.clients[wsId] = {
        id: wsId,
        ws: ws,
        createTime: new Date().getTime(),
    };
    ws.on('close', () => {
        delete server.clients[wsId];
    });
    try {
        server.ws.send(JSON.stringify({
            type: 'client-handshake',
            clientId: wsId,
        }));
    } catch(e) {
        console.log("Error: ", e);
    }
});

module.exports = router;
