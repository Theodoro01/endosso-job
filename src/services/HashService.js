const crypto = require('crypto');

class HashService {
  generate(input) {
    return crypto.createHash('sha256').update(input).digest('hex');
  }
}

module.exports = HashService;
