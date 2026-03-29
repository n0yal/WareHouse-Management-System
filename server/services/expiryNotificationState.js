"use strict";

const fs = require("fs");
const path = require("path");

const stateFilePath = path.join(process.cwd(), ".runtime", "expiry-alert-state.json");

function ensureStateDir() {
  fs.mkdirSync(path.dirname(stateFilePath), { recursive: true });
}

function loadState() {
  try {
    const content = fs.readFileSync(stateFilePath, "utf8");
    const parsed = JSON.parse(content);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (error) {
    return {};
  }
}

function saveState(state) {
  ensureStateDir();
  fs.writeFileSync(stateFilePath, JSON.stringify(state, null, 2));
}

function toExpiryDayKey(alert) {
  const date = new Date(alert.expiryDate);
  return Number.isNaN(date.getTime()) ? "invalid-date" : date.toISOString().slice(0, 10);
}

function shouldNotifyAlert(alert, state = loadState()) {
  const previous = state[alert.id];
  const expiryDay = toExpiryDayKey(alert);

  if (!previous) {
    return true;
  }

  return previous.status !== alert.status || previous.expiryDay !== expiryDay;
}

function markAlertsNotified(alerts, notifiedAt = new Date(), state = loadState()) {
  const nextState = { ...state };

  for (const alert of alerts) {
    nextState[alert.id] = {
      status: alert.status,
      expiryDay: toExpiryDayKey(alert),
      notifiedAt: notifiedAt.toISOString(),
    };
  }

  saveState(nextState);
  return nextState;
}

module.exports = {
  stateFilePath,
  loadState,
  saveState,
  shouldNotifyAlert,
  markAlertsNotified,
};
