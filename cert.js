const crypto = require('crypto');

let publicKeyBase64 = undefined;
let privateKeyBase64 = undefined;

if (!publicKeyBase64 || !privateKeyBase64) {
    // 生成RSA密钥对
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
        modulusLength: 2048, // 密钥长度
    });
    // 将公钥和私钥以Base64编码保存
    publicKeyBase64 = publicKey.export({ type: 'spki', format: 'der' }).toString('base64');
    privateKeyBase64 = privateKey.export({ type: 'pkcs8', format: 'der' }).toString('base64');
    // 输出生成的秘钥
    console.log("已生成秘钥:" 
        + "\r\n - 公钥: %s"
        + "\r\n - 私钥: %s", publicKeyBase64, privateKeyBase64);
}

// 加载Base64编码的公钥和私钥
const publicKey = crypto.createPublicKey({
    key: Buffer.from(publicKeyBase64, 'base64'),
    format: 'der',
    type: 'spki',
});
const privateKey = crypto.createPrivateKey({
    key: Buffer.from(privateKeyBase64, 'base64'),
    format: 'der',
    type: 'pkcs8',
});



// 计算秘钥的SHA256值
const publicKeySha256Hex = crypto.createHash('sha256')
    .update(Buffer.from(publicKeyBase64, 'base64'))
    .digest('hex');
const privateKeySha256Hex = crypto.createHash('sha256')
    .update(Buffer.from(privateKeyBase64, 'base64'))
    .digest('hex');

// PEM格式
const publicKeyPem = publicKey.export({ type: 'spki', format: 'pem' }).toString();

// // 使用加载的公钥加密数据
// const encryptedData = crypto.publicEncrypt(publicKey, Buffer.from(data, 'utf8'));
// // 使用加载的私钥解密数据
// const decryptedData = crypto.privateDecrypt(privateKey, encryptedData);

module.exports = {
    publicKey,
    privateKey,
    publicKeyBase64,
    privateKeyBase64,
    publicKeySha256Hex,
    privateKeySha256Hex,
    publicKeyPem,
};