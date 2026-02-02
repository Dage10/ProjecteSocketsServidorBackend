const crypto = require('crypto');

function verificarPassword(password, salt, hashBD) {
    const passwordSalt = password + salt.toString('hex').toUpperCase();
    const hash = crypto
        .createHash('sha512')
        .update(passwordSalt)
        .digest('hex')
        .toUpperCase();

    return hash === hashBD;
}

module.exports = verificarPassword;