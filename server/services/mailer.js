"use strict";

function getMailerConfig() {
  return {
    host: process.env.SMTP_HOST || "",
    port: Number(process.env.SMTP_PORT || 587),
    secure: String(process.env.SMTP_SECURE || "false").toLowerCase() === "true",
    user: process.env.SMTP_USER || "",
    pass: process.env.SMTP_PASS || "",
    from: process.env.SMTP_FROM || process.env.SMTP_USER || "no-reply@wms.local",
    adminEmail: process.env.ADMIN_EMAIL || "admin@wms.local",
  };
}

function createTransport() {
  let nodemailer;
  try {
    nodemailer = require("nodemailer");
  } catch (error) {
    return {
      enabled: false,
      reason: "nodemailer package is not installed",
    };
  }

  const config = getMailerConfig();
  if (!config.host || !config.port) {
    return {
      enabled: false,
      reason: "SMTP_HOST and SMTP_PORT must be configured",
    };
  }

  return {
    enabled: true,
    transporter: nodemailer.createTransport({
      host: config.host,
      port: config.port,
      secure: config.secure,
      auth: config.user ? { user: config.user, pass: config.pass } : undefined,
    }),
    config,
  };
}

function buildExpiryEmail({ alerts, warningDays, now = new Date() }) {
  const expired = alerts.filter((item) => item.status === "EXPIRED");
  const expiringSoon = alerts.filter((item) => item.status === "EXPIRING_SOON");
  const lines = [
    `Expiry notification generated at ${now.toISOString()}`,
    `Warning window: ${warningDays} day(s)`,
    "",
    `Expired items: ${expired.length}`,
    `Expiring soon items: ${expiringSoon.length}`,
    "",
    "Items:",
  ];

  for (const item of alerts) {
    lines.push(
      `- ${item.productName} (${item.productSku}) | Status: ${item.status} | Expiry: ${new Date(item.expiryDate).toISOString().slice(0, 10)} | Days: ${item.daysUntilExpiry} | Qty: ${item.quantity} | Rack: ${item.rackLocation} | Lot: ${item.lotNumber} | LP: ${item.serialNumber}`
    );
  }

  return {
    subject: `Expiry alert: ${expired.length} expired, ${expiringSoon.length} expiring within ${warningDays} day(s)`,
    text: lines.join("\n"),
  };
}

async function sendAdminExpiryAlert({ alerts, warningDays = 30, now = new Date() }) {
  const transport = createTransport();
  if (!transport.enabled) {
    return {
      sent: false,
      reason: transport.reason,
    };
  }

  if (!alerts.length) {
    return {
      sent: false,
      reason: "No alerts to send",
    };
  }

  const message = buildExpiryEmail({ alerts, warningDays, now });
  const info = await transport.transporter.sendMail({
    from: transport.config.from,
    to: transport.config.adminEmail,
    subject: message.subject,
    text: message.text,
  });

  return {
    sent: true,
    messageId: info.messageId || null,
    accepted: info.accepted || [],
    rejected: info.rejected || [],
    to: transport.config.adminEmail,
    subject: message.subject,
  };
}

module.exports = {
  getMailerConfig,
  buildExpiryEmail,
  sendAdminExpiryAlert,
};
