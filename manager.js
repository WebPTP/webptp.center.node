
/**
 * @type {Object.<string, ServerInfo>} 所有服务器Map
 */
const serverMap = {};

class ServerInfo {
    /**
     * @type {WebSocket}
     */
    ws;
    /**
     * @type {string}
     */
    code;
    /**
     * @type {Object.<string, ClientInfo>}
     */
    clientMap;
    /**
     * @type {number}
     */
    lastUpdateTime;

    close() {
        this.ws.close();
        Object.keys(this.clientMap).forEach(id => {
            this.clientMap[id].close();
        });
        this.clientMap = {};
        delete serverMap[this.code];
    }

    addClient(client, clientRequestData) {
        client.serverCode = this.code;
        this.clientMap[client.id] = client;
        this.ws.send(JSON.stringify({
            id: client.id,
            data: clientRequestData
        }))
    }

    responseData(clientId, data) {
        const client = this.clientMap[clientId];
        if (!client) {
            return false;
        }
        client.response.write(data, () => {
            client.close();
        });
    }
}

class ClientInfo {
    serverCode;
    response;
    timeout;
    /**
     * @type {string}
     */
    id;

    close() {
        if (this.timeout) {
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
        try {
            this.response.end();
        } catch (e) {
        }
        const server = serverMap[this.serverCode];
        if (server) {
            delete server.clientMap[this.id];
        }
    }
}

module.exports = {
    serverMap,
    ServerInfo,
    ClientInfo,
};

