"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.verifyToken = exports.generateToken = void 0;
var jsonwebtoken_1 = require("jsonwebtoken");
var generateToken = function (payload) {
    var secret = process.env.JWT_SECRET || 'secret';
    var expiresIn = process.env.JWT_EXPIRES_IN || '24h';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return jsonwebtoken_1.default.sign(payload, secret, { expiresIn: expiresIn });
};
exports.generateToken = generateToken;
var verifyToken = function (token) {
    try {
        return jsonwebtoken_1.default.verify(token, process.env.JWT_SECRET || 'secret');
    }
    catch (_a) {
        return null;
    }
};
exports.verifyToken = verifyToken;
