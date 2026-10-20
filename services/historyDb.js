const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const DB_PATH = path.join(__dirname, '../data/history.db');
const DEFAULT_UID = String(process.env.DEFAULT_USER_ID || '');

let dbInstance = null;

function formatDateTime(date = new Date()) {
  const pad = n => String(n).padStart(2, '0');
  const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function getDb() {
  if (!dbInstance) {
    const dataDir = path.dirname(DB_PATH);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    dbInstance = new sqlite3.Database(DB_PATH);
    initTables();
  }
  return dbInstance;
}

function initTables() {
  const db = dbInstance;
  db.serialize(() => {

    db.run(`
      CREATE TABLE IF NOT EXISTS chat_turns (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id TEXT NOT NULL,
        request_id INTEGER NOT NULL,
        user_content TEXT NOT NULL,
        user_nickname TEXT DEFAULT '调查员',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        del_flag TEXT DEFAULT '0'
      )
    `);

    db.run(`
      CREATE TABLE IF NOT EXISTS chat_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        turn_id INTEGER NOT NULL,
        user_id TEXT NOT NULL,
        request_id INTEGER NOT NULL,
        message_id INTEGER NOT NULL,
        speaker INTEGER DEFAULT 1,
        content TEXT NOT NULL,
        expression TEXT DEFAULT 'Normal',
        thought TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        model_index INTEGER DEFAULT 0,
        like_type TEXT DEFAULT '0',
        FOREIGN KEY(turn_id) REFERENCES chat_turns(id) ON DELETE CASCADE
      )
    `);

    db.run(`CREATE INDEX IF NOT EXISTS idx_turns_user_time ON chat_turns(user_id, created_at)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_turn_id ON chat_messages(turn_id)`);

    db.run(`UPDATE chat_messages SET speaker = 1 WHERE speaker = 2`, function(err) {
      if (!err && this.changes > 0) {
        console.log(`[History-DB] 数据热升级：已将 ${this.changes} 条历史角色消息 speaker 修正为 1 (对齐客户端气泡渲染强契约)`);
      }
    });

    initMaxRequestId();
  });
}

let currentChatReqId = null;

function initMaxRequestId() {
  return new Promise((resolve) => {
    const db = getDb();
    db.get(`SELECT MAX(request_id) as maxId, COUNT(*) as cnt FROM chat_turns WHERE del_flag = '0'`, (err, row) => {
      const maxId = row ? row.maxId : 0;
      const cnt = row ? row.cnt : 0;
      currentChatReqId = Math.max(100000 + cnt * 10, maxId || 100000);
      console.log(`[History-DB] 初始化全局单调自增 requestID 游标: ${currentChatReqId}`);
      resolve(currentChatReqId);
    });
  });
}

function getNextTurnRequestId() {
  if (currentChatReqId === null || currentChatReqId < 100000) {
    currentChatReqId = 100200;
  }
  currentChatReqId += 10;
  return currentChatReqId;
}

function ensureInitialHistoryForUser(userId) {
  return new Promise((resolve) => {
    const db = getDb();
    const uidStr = String(userId || DEFAULT_UID);
    db.get(`SELECT COUNT(*) as count FROM chat_turns WHERE user_id = ? AND del_flag = '0'`, [uidStr], async (err, row) => {
      if (err || (row && row.count > 0)) {
        return resolve(false);
      }

      console.log(`[History-DB] 用户 [${uidStr}] 尚无历史记录，动态注入初遇历史剧情对白...`);
      const now = new Date();
      const t1 = new Date(now.getTime() - 15 * 60 * 1000);
      const t2 = new Date(now.getTime() - 5 * 60 * 1000);

      try {
        await recordChatTurn(uidStr, 100000, '晚上好，蕾伊。', [
          {
            content: '晚上好呀。今晚的夜空很清澈，星光刚好落在这里。',
            expression: 'Smile',
            thought: '调查员来了呢。'
          }
        ], formatDateTime(t1));

        await recordChatTurn(uidStr, 100010, '今晚的天台有些冷吗？', [
          {
            content: '微风吹过来的感觉刚刚好。能这样安静地坐着看着远方的城市，心情很平静呢。',
            expression: 'Smile',
            thought: ''
          },
          {
            content: '调查员如果觉得冷的话，要不要靠近一点？',
            expression: 'Normal',
            thought: '稍微有点害羞呢。'
          }
        ], formatDateTime(t2));

        console.log(`[History-DB] 成功为用户 [${uidStr}] 注入初遇温馨剧情对白`);
        resolve(true);
      } catch (insertErr) {
        console.error(`[History-DB] 注入初遇剧情异常:`, insertErr.message);
        resolve(false);
      }
    });
  });
}

function recordChatTurn(userId, requestId, userContent, replies = [], createdAt = null) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const nowStr = createdAt || formatDateTime();
    const numericReqId = typeof requestId === 'number' && requestId > 0 ? requestId : (parseInt(requestId, 10) || getNextTurnRequestId());
    const uidStr = String(userId || DEFAULT_UID);

    db.run(
      `INSERT INTO chat_turns (user_id, request_id, user_content, user_nickname, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?)`,
      [uidStr, numericReqId, userContent, '调查员', nowStr, nowStr],
      function (err) {
        if (err) {
          console.error('[History-DB] 插入 chat_turns 失败:', err.message);
          return reject(err);
        }
        const turnId = this.lastID;
        const replyList = Array.isArray(replies) ? replies : [replies];

        if (replyList.length === 0) {
          return resolve(turnId);
        }

        const stmt = db.prepare(
          `INSERT INTO chat_messages (turn_id, user_id, request_id, message_id, speaker, content, expression, thought, created_at, model_index) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        replyList.forEach((rep, idx) => {
          const content = typeof rep === 'string' ? rep : (rep.content || rep.dialogue || '');
          const expr = typeof rep === 'object' ? (rep.expression || 'Normal') : 'Normal';
          const thought = typeof rep === 'object' ? (rep.thought || '') : '';
          const msgId = numericReqId * 10 + (idx + 1);

          stmt.run([turnId, uidStr, numericReqId, msgId, 1, content, expr, thought, nowStr, idx]);
        });

        stmt.finalize(stmtErr => {
          if (stmtErr) {
            console.error('[History-DB] 批量插入 chat_messages 失败:', stmtErr.message);
            return reject(stmtErr);
          }
          console.log(`[History-DB] 成功归档聊天对话 (TurnID: ${turnId}, ReqID: ${numericReqId}, 回复数: ${replyList.length}, speaker: 1)`);
          resolve(turnId);
        });
      }
    );
  });
}

function getActiveDaysByYear(userId, year) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const uidStr = String(userId || DEFAULT_UID);
    const targetYear = String(year || new Date().getFullYear());

    db.all(
      `SELECT DISTINCT strftime('%m', created_at) as month, strftime('%d', created_at) as day
       FROM chat_turns
       WHERE user_id = ? AND strftime('%Y', created_at) = ? AND del_flag = '0'
       ORDER BY month, day`,
      [uidStr, targetYear],
      (err, rows) => {
        if (err) {
          console.error('[History-DB] 查询活跃日期失败:', err.message);
          return reject(err);
        }

        const result = {};
        for (let m = 1; m <= 12; m++) {
          result[String(m)] = [];
        }

        (rows || []).forEach(r => {
          const m = parseInt(r.month, 10);
          const d = parseInt(r.day, 10);
          if (m >= 1 && m <= 12 && !result[String(m)].includes(d)) {
            result[String(m)].push(d);
          }
        });

        const now = new Date();
        if (String(now.getFullYear()) === targetYear) {
          const curMonth = String(now.getMonth() + 1);
          const curDay = now.getDate();
          if (!result[curMonth].includes(curDay)) {
            result[curMonth].push(curDay);
            result[curMonth].sort((a, b) => a - b);
          }
        }

        resolve(result);
      }
    );
  });
}

async function getHistoryDetails(userId, { startTime = '', endTime = '', page = 1, limit = 1000 } = {}) {
  const uidStr = String(userId || DEFAULT_UID);

  await ensureInitialHistoryForUser(uidStr);

  return new Promise((resolve, reject) => {
    const db = getDb();
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.max(1, parseInt(limit, 10) || 1000);
    const offset = (pageNum - 1) * limitNum;

    let whereClause = `WHERE t.user_id = ? AND t.del_flag = '0'`;
    const params = [uidStr];

    if (startTime && startTime.trim()) {
      whereClause += ` AND t.created_at >= ?`;
      params.push(startTime.trim());
    }
    if (endTime && endTime.trim()) {
      whereClause += ` AND t.created_at <= ?`;
      params.push(endTime.trim());
    }

    db.get(
      `SELECT COUNT(*) as total FROM chat_turns t ${whereClause}`,
      params,
      (err, countRow) => {
        if (err) {
          console.error('[History-DB] 查询总数失败:', err.message);
          return reject(err);
        }
        const total = countRow ? countRow.total : 0;
        if (total === 0) {
          return resolve({ total: 0, rows: [] });
        }

        const queryParams = [...params, limitNum, offset];
        db.all(
          `SELECT t.id, t.user_id, t.request_id, t.user_content, t.user_nickname, t.created_at, t.updated_at, t.del_flag
           FROM chat_turns t
           ${whereClause}
           ORDER BY t.created_at ASC
           LIMIT ? OFFSET ?`,
          queryParams,
          (turnErr, turnRows) => {
            if (turnErr) {
              console.error('[History-DB] 查询轮次失败:', turnErr.message);
              return reject(turnErr);
            }

            if (!turnRows || turnRows.length === 0) {
              return resolve({ total, rows: [] });
            }

            turnRows.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime() || a.id - b.id);

            const turnIds = turnRows.map(r => r.id);
            const placeholders = turnIds.map(() => '?').join(',');

            db.all(
              `SELECT m.id, m.turn_id, m.user_id, m.request_id, m.message_id, m.speaker, m.content, m.expression, m.thought, m.created_at, m.model_index, m.like_type
               FROM chat_messages m
               WHERE m.turn_id IN (${placeholders})
               ORDER BY m.turn_id ASC, m.model_index ASC`,
              turnIds,
              (msgErr, msgRows) => {
                if (msgErr) {
                  console.error('[History-DB] 查询消息明细失败:', msgErr.message);
                  return reject(msgErr);
                }

                const msgMap = new Map();
                (msgRows || []).forEach(m => {
                  if (!msgMap.has(m.turn_id)) {
                    msgMap.set(m.turn_id, []);
                  }
                  msgMap.get(m.turn_id).push(m);
                });

                const rows = turnRows.map((t, turnIdx) => {
                  const sortedTurnReqId = 100000 + (offset + turnIdx) * 10;
                  const rawReplies = msgMap.get(t.id) || [];

                  const formattedReplies = rawReplies.map((m, repIdx) => ({
                    messageId: sortedTurnReqId * 10 + (repIdx + 1),
                    requestId: sortedTurnReqId,
                    userId: parseInt(m.user_id, 10) || (DEFAULT_UID ? parseInt(DEFAULT_UID, 10) : 10001),
                    speaker: 1,
                    currentSpeaker: 'Rei',
                    isHistoryData: true,
                    content: m.content,
                    expression: m.expression || 'Normal',
                    thought: m.thought || '',
                    createTime: m.created_at,
                    likeType: m.like_type || '0',
                    modelIndex: repIdx
                  }));

                  return {
                    requestId: sortedTurnReqId,
                    userId: parseInt(t.user_id, 10) || (DEFAULT_UID ? parseInt(DEFAULT_UID, 10) : 10001),
                    content: t.user_content,
                    nickName: t.user_nickname || '调查员',
                    speaker: 0,
                    currentSpeaker: 'User',
                    mode: '1',
                    isHistoryData: true,
                    createTime: t.created_at,
                    updateTime: t.updated_at,
                    delFlag: t.del_flag || '0',
                    userModelMessagesList: formattedReplies
                  };
                });

                resolve({ total, rows });
              }
            );
          }
        );
      }
    );
  });
}

function getRecentChatHistory(userId, maxTurns = 10) {
  return new Promise((resolve) => {
    const db = getDb();
    const uidStr = String(userId || DEFAULT_UID);
    const limitNum = Math.max(1, parseInt(maxTurns, 10) || 10);

    db.all(
      `SELECT id, user_content, created_at
       FROM chat_turns
       WHERE user_id = ? AND del_flag = '0'
       ORDER BY created_at DESC
       LIMIT ?`,
      [uidStr, limitNum],
      (turnErr, turnRows) => {
        if (turnErr) {
          console.error('[History-DB] 查询近期对话轮次失败:', turnErr.message);
          return resolve([]);
        }
        if (!turnRows || turnRows.length === 0) {
          return resolve([]);
        }

        turnRows.reverse();
        const turnIds = turnRows.map(r => r.id);
        const placeholders = turnIds.map(() => '?').join(',');

        db.all(
          `SELECT turn_id, content
           FROM chat_messages
           WHERE turn_id IN (${placeholders})
           ORDER BY turn_id ASC, model_index ASC`,
          turnIds,
          (msgErr, msgRows) => {
            if (msgErr) {
              console.error('[History-DB] 查询近期角色回复失败:', msgErr.message);
              return resolve([]);
            }

            const replyMap = new Map();
            (msgRows || []).forEach(m => {
              if (!replyMap.has(m.turn_id)) {
                replyMap.set(m.turn_id, []);
              }
              if (m.content && m.content.trim()) {
                replyMap.get(m.turn_id).push(m.content.trim());
              }
            });

            const messages = [];
            turnRows.forEach(t => {
              if (t.user_content && t.user_content.trim()) {
                messages.push({ role: 'user', content: t.user_content.trim() });
              }
              const replies = replyMap.get(t.id) || [];
              if (replies.length > 0) {
                messages.push({ role: 'assistant', content: replies.join(' ') });
              }
            });

            resolve(messages);
          }
        );
      }
    );
  });
}

function clearUserHistory(userId) {
  return new Promise((resolve, reject) => {
    const db = getDb();
    const uidStr = String(userId || DEFAULT_UID);
    db.run(`DELETE FROM chat_turns WHERE user_id = ?`, [uidStr], err => {
      if (err) return reject(err);
      resolve(true);
    });
  });
}

module.exports = {
  getDb,
  formatDateTime,
  recordChatTurn,
  ensureInitialHistoryForUser,
  getRecentChatHistory,
  getActiveDaysByYear,
  getHistoryDetails,
  clearUserHistory,
  getNextTurnRequestId,
  DB_PATH
};
