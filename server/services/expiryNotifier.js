"use strict";

const { fetchExpiryAlerts } = require("./expiryAlerts");
const { sendAdminExpiryAlert } = require("./mailer");
const { loadState, shouldNotifyAlert, markAlertsNotified } = require("./expiryNotificationState");

let schedulerStarted = false;
let schedulerTimer = null;
let schedulerInterval = null;

async function runExpiryNotificationCycle({ warningDays, force = false, now = new Date() } = {}) {
  const effectiveWarningDays = Number.isFinite(Number(warningDays))
    ? Number(warningDays)
    : Number(process.env.EXPIRY_WARNING_DAYS || 30);

  const alerts = await fetchExpiryAlerts({ warningDays: effectiveWarningDays, now });
  if (!alerts.length) {
    return {
      sent: false,
      reason: "no_alerts",
      warningDays: effectiveWarningDays,
      alerts: [],
    };
  }

  const state = loadState();
  const alertsToNotify = force ? alerts : alerts.filter((alert) => shouldNotifyAlert(alert, state));
  if (!alertsToNotify.length) {
    return {
      sent: false,
      reason: "already_notified",
      warningDays: effectiveWarningDays,
      alerts,
    };
  }

  const mailResult = await sendAdminExpiryAlert({
    alerts: alertsToNotify,
    warningDays: effectiveWarningDays,
    now,
  });

  if (mailResult.sent) {
    markAlertsNotified(alertsToNotify, now, state);
  }

  return {
    ...mailResult,
    warningDays: effectiveWarningDays,
    alerts,
    notifiedAlerts: alertsToNotify,
  };
}

function getDailyScheduleConfig() {
  const hour = Math.max(0, Math.min(23, parseInt(process.env.EXPIRY_EMAIL_HOUR || "8", 10) || 8));
  const minute = Math.max(0, Math.min(59, parseInt(process.env.EXPIRY_EMAIL_MINUTE || "0", 10) || 0));
  return { hour, minute };
}

function msUntilNextRun(now = new Date()) {
  const { hour, minute } = getDailyScheduleConfig();
  const next = new Date(now);
  next.setHours(hour, minute, 0, 0);
  if (next <= now) {
    next.setDate(next.getDate() + 1);
  }
  return next.getTime() - now.getTime();
}

function scheduleDailyExpiryNotifications() {
  if (schedulerStarted) {
    return;
  }

  schedulerStarted = true;
  const delay = msUntilNextRun();

  schedulerTimer = setTimeout(async () => {
    try {
      await runExpiryNotificationCycle();
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown error";
      console.error(`[expiry-email] Scheduled run failed: ${detail}`);
    }

    schedulerInterval = setInterval(async () => {
      try {
        await runExpiryNotificationCycle();
      } catch (error) {
        const detail = error instanceof Error ? error.message : "Unknown error";
        console.error(`[expiry-email] Scheduled run failed: ${detail}`);
      }
    }, 24 * 60 * 60 * 1000);
  }, delay);

  if (typeof schedulerTimer.unref === "function") {
    schedulerTimer.unref();
  }
}

module.exports = {
  runExpiryNotificationCycle,
  scheduleDailyExpiryNotifications,
  msUntilNextRun,
};
