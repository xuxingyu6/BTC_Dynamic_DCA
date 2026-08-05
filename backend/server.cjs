/**
 * Vercel Services 入口（Express 运行时要求应用默认导出）。
 *
 * 构建完成后 dist/app.js 已存在（CommonJS，具名导出 app），
 * 这里统一转成 Vercel 期望的默认导出，兼容 module.exports 与 default。
 */
const { app } = require('./dist/app.js');

module.exports = app;
module.exports.default = app;
