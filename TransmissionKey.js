var asn = require('asn1.js');

var TransmissionHeaders = asn.define('TransmissionHeaders', function () {
    this.seq().obj(
        /**
         * 加密算法
         */
        this.key('algorithm').charstr(),
        /**
         * 解密秘钥
         */
        this.key('key').octstr(),
        /**
         * iv值
         */
        this.key('iv').octstr(),
        /**
         * 附加的携带数据
         */
        this.key('data').octstr(),
    );
});

var TransmissionData = asn.define('TransmissionData', function () {
    this.seq().obj(
        this.key('headersCiphertext').octstr(),
        this.key('bodyCiphertext').octstr(),
    );
});

function decodeCiphertext(transmissionDataPlaintext, headersDecryptor, bodyDecryptor) {
    let transmissionData;
    try {
        transmissionData = TransmissionData.decode(transmissionDataPlaintext, 'der');
        transmissionDataPlaintext = undefined;
    } catch (e) {
        throw new Error('TransmissionData format error!');
    }

    let headersPlaintext;
    try {
        headersPlaintext = headersDecryptor(transmissionData.headersCiphertext);
        transmissionData.headersCiphertext = undefined;
    } catch (e) {
        throw new Error('Unable to decrypt headersCiphertext!');
    }

    let headers;
    try {
        headers = TransmissionHeaders.decode(headersPlaintext, 'der');
        headersPlaintext = undefined;
    } catch (e) {
        throw new Error('headersPlaintext data format error!');
    }

    try {
        return bodyDecryptor(transmissionData.bodyCiphertext, headers);
    } catch (e) {
        throw new Error('Unable to decrypt bodyCiphertext!');
    }
}

function encodePlaintext(headers, bodyPlaintext, headersEncryptor, bodyEncryptor) {
    let bodyCiphertext = bodyEncryptor(bodyPlaintext, headers);
    let headersPlaintext = TransmissionHeaders.encode(headers, 'der');
    return TransmissionData.encode({
        headersCiphertext: headersEncryptor(headersPlaintext),
        bodyCiphertext: bodyCiphertext,
    }, 'der');
}

module.exports = {
    TransmissionData,
    TransmissionHeaders,
    decodeCiphertext,
    encodePlaintext,
};