// 邮件发送：有 SMTP 配置则真实发信；否则开发模式（验证码打印日志 + 接口回传，便于本地/答辩演示）
const nodemailer = require('nodemailer');
const config = require('./config');
const log = require('./logger');

let transporter = null;

function transport() {
    if (!config.mail.enabled) return null;
    if (!transporter) {
        transporter = nodemailer.createTransport({
            host: config.mail.host,
            port: config.mail.port,
            secure: config.mail.secure,
            auth: { user: config.mail.user, pass: config.mail.pass }
        });
    }
    return transporter;
}

function buildMail(code, scene) {
    const title = scene === 'register' ? '注册邮箱验证码' : '重置密码验证码';
    const text = `【宇宙探索】你的${title}是 ${code}，10 分钟内有效。若非本人操作请忽略本邮件。`;
    const html = `<div style="font-family:system-ui,sans-serif;line-height:1.8;color:#111">
  <h2 style="margin:0 0 12px">宇宙探索 · ${title}</h2>
  <p>你的验证码是：</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:6px;color:#1a5fd0">${code}</p>
  <p>验证码 10 分钟内有效，请勿转发给他人。</p>
  <p style="color:#888;font-size:12px">若非本人操作，请忽略本邮件。</p>
</div>`;
    return { subject: `【宇宙探索】${title}`, text, html };
}

/**
 * 发送验证码邮件
 * @returns {Promise<{ok:boolean, dev:boolean, code?:string}>} dev=true 表示未配置 SMTP，验证码仅日志/接口返回
 */
async function sendCodeMail(to, code, scene = 'reset') {
    const tr = transport();
    const { subject, text, html } = buildMail(code, scene);
    if (!tr) {
        log.warn('mail_dev_mode', { to, scene, code, note: '未配置 SMTP，验证码仅在日志与接口返回中可见' });
        return { ok: true, dev: true, code };
    }
    try {
        await tr.sendMail({ from: config.mail.from, to, subject, text, html });
        log.info('mail_sent', { to, scene });
        return { ok: true, dev: false };
    } catch (e) {
        log.error('mail_failed', { to, scene, message: e.message });
        throw e;
    }
}

module.exports = { sendCodeMail, mailEnabled: () => config.mail.enabled };
