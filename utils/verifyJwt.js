
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const client = jwksClient({
  jwksUri: process.env.COGNITO_JWKS_URI,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) callback(err);
    console.log(key);
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

exports.verifyToken = (token) => {
  const cleanToken = token.replace('Bearer ', '');
  return new Promise((resolve, reject) => {
    jwt.verify(cleanToken, getKey, {
      algorithms: ['RS256'],
    }, (err, decoded) => {
      if (err) reject(err);
      else resolve(decoded);
    });
  });
};
