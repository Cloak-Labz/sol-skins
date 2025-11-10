"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateNonce = generateNonce;
exports.getCurrentTimestamp = getCurrentTimestamp;
exports.generateRequestNonce = generateRequestNonce;
function generateNonce() {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === 'x' ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}
function getCurrentTimestamp() {
    return Date.now();
}
function generateRequestNonce() {
    return {
        nonce: generateNonce(),
        timestamp: getCurrentTimestamp(),
    };
}
//# sourceMappingURL=nonce.js.map