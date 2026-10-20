const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const envFile = path.join(__dirname, '../.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(function (line) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) return;
    const m = trimmed.match(/^([A-Za-z0-9_]+)\s*=\s*(.+)$/);
    if (m && !process.env[m[1]]) {
      process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
    }
  });
}

const EventEmitter = require('events');
const chatEventEmitter = new EventEmitter();
chatEventEmitter.setMaxListeners(50);

const store = {
  users: {},
  sessions: {},
  chatHistories: {},
  voiceCache: {},
  inventories: {},
  tasks: {},
  goods: {},
  mail: {},
  queue: {},
  ghostPresence: {},
  eventLogs: [],
  conversationContexts: {},
  activeWsSockets: new Set(),
  pendingAudioMap: new Map(),
  audioFileMapping: new Map(),
  chatEventEmitter
};

function now() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

function genToken() {
  return uuidv4().replace(/-/g, '').slice(0, 32);
}

function nextNumericId() {
  const base = Math.floor(Date.now() / 1000) % 200000000;
  const rand = Math.floor(Math.random() * 10);
  return base * 10 + rand;
}

function genUniqueAudioName() {
  const ts = Date.now();
  const rand = Math.floor(Math.random() * 90000) + 10000;
  return `voice_${ts}_${rand}.mp3`;
}

module.exports = {
  store,
  now,
  genToken,
  nextNumericId,
  genUniqueAudioName
};
