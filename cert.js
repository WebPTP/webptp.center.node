const crypto = require('crypto');

let publicKeyHex = process.env.publicKeyHex || undefined;
let privateKeyHex = process.env.privateKeyHex || undefined;

if (!publicKeyHex || !privateKeyHex) {
    // 生成RSA密钥对
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // 密钥长度
    });
    // 将公钥和私钥以Base64编码保存
    publicKeyHex = publicKey.export({ type: 'spki', format: 'der' }).toString('hex');
    privateKeyHex = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('hex');
    // 输出生成的秘钥
    console.log("已生成秘钥:" 
        + "\r\n - 公钥: [%s]"
        + "\r\n - 私钥: [%s]", publicKeyHex, privateKeyHex);
}

// 加载Base64编码的公钥和私钥
const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyHex, 'hex'),
    format: 'der',
    type: 'spki',
});
const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyHex, 'hex'),
    format: 'der',
    type: 'pkcs8',
});

module.exports = {
    publicKey,
    privateKey,
};