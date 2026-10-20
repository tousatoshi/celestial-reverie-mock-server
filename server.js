const fs = require('fs');
const path = require('path');
const express = require('express');
const http = require('http');
const https = require('https');
const { WebSocketServer } = require('ws');
const cors = require('cors');

const envFile = path.join(__dirname, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf-8').split('\n').forEach(function (line) {
    const m = line.trim().match(/^([A-Z_]+)\s*=\s*(.+)$/);
    if (m) process.env[m[1]] = m[2].trim().replace(/^['"]|['"]$/g, '');
  });
}

const { store, genUniqueAudioName } = require('./data/store');
const { callLLMForReplies, isLLMConfigured, getLLMConfigStatus, getOrLoadSystemPrompt } = require('./services/llm');
const { callFishAudio } = require('./services/tts');

const { router: authRouter } = require('./routes/auth');
const chatRouter = require('./routes/chat');
const audioRouter = require('./routes/audio');
const goodsRouter = require('./routes/goods');
const inventoryRouter = require('./routes/inventory');
const taskRouter = require('./routes/task');
const historyRouter = require('./routes/history');
const miscRouter = require('./routes/misc');

const app = express();
const PORT = parseInt(process.env.PORT, 10) || 7001;
const VOICE_PORT = parseInt(process.env.VOICE_PORT || '28888', 10);

app.use(cors());

app.use(function (req, res, next) {
  const clientIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress;
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url} <- ${clientIp}`);
  next();
});

app.use(function (req, res, next) {
  if (!req.url.startsWith('/starry') && !req.url.startsWith('/audio') && !req.url.startsWith('/ws')) {
    req.url = '/starry' + (req.url.startsWith('/') ? req.url : '/' + req.url);
  }
  next();
});

app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

app.use(authRouter);
app.use(chatRouter);
app.use(audioRouter);
app.use(goodsRouter);
app.use(inventoryRouter);
app.use(taskRouter);
app.use(historyRouter);
app.use(miscRouter);

function setupWebSocketServer(httpServer, portName) {
  const wss = new WebSocketServer({ noServer: true });

  httpServer.on('upgrade', function (request, socket, head) {
    console.log(`[${portName}-WS] 收到长连接 Upgrade: ${request.url}`);
    wss.handleUpgrade(request, socket, head, function (ws) {
      ws.isAlive = true;
      store.activeWsSockets.add(ws);

      ws.on('pong', function () { ws.isAlive = true; });

      ws.send(JSON.stringify({
        resultType: 'hello~',
        data: 'connected',
        requestId: 1,
        index: 0
      }));

      ws.on('message', function (data) {
        try {
          const str = data.toString();
          console.log(`[${portName}-WS] 收到消息: ${str.substring(0, 100)}`);

          if (str === 'Heartbeat' || str.includes('Heartbeat') || str.includes('heartbeat')) {
            ws.isAlive = true;
            ws.send(JSON.stringify({
              resultType: 'heartbeat',
              data: 'pong',
              requestId: 1,
              index: 0
            }));
            return;
          }

          let reqNumericId = 0;
          let resIndex = 0;
          try {
            const msg = JSON.parse(str);
            reqNumericId = typeof msg.requestId === 'number' ? msg.requestId : (parseInt(msg.requestId, 10) || 0);
            resIndex = typeof msg.index === 'number' ? msg.index : 0;
          } catch (e) { }

          ws.send(JSON.stringify({
            resultType: 'pong',
            data: 'ack',
            requestId: reqNumericId,
            index: resIndex
          }));
        } catch (e) {
          console.error(`[${portName}-WS] 处理消息异常: ${e.message}`);
        }
      });

      ws.on('close', function () {
        console.log(`[${portName}-WS] 连接断开`);
        store.activeWsSockets.delete(ws);
      });
    });
  });

  setInterval(function () {
    wss.clients.forEach(function (ws) {
      if (!ws.isAlive) return ws.terminate();
      ws.isAlive = false;
      ws.ping();
    });
  }, 30000);
}

async function runStartupSelfTest() {
  console.log("\n========================================");
  console.log("  [Self-Test] 正在自检 LLM 接口与 Fish Audio 语音接口...");
  console.log("========================================");

  getOrLoadSystemPrompt();

  const llmStatus = getLLMConfigStatus();
  if (!llmStatus.configured) {
    console.log("  [Self-Test] [提示] 未检测到大模型配置 (缺少 OPENAI_API_KEY)。");
    console.log("  [Self-Test] [提示] 若需要启用角色智能对白生成，请在 .env 文件中填写以下环境变量：");
    console.log("              - OPENAI_API_KEY  : 您的 OpenAI 或兼容接口密钥");
    console.log("              - OPENAI_API_BASE : 接口 Base URL (默认: https://api.openai.com/v1)");
    console.log("              - OPENAI_MODEL    : 使用的模型名称 (默认: gpt-4o-mini)");
    console.log("              当前服务将以内置离线对白语料模式运行。");
  }

  let llmOk = false;
  try {
    const t0 = Date.now();
    const res = await callLLMForReplies("你好呀，蕾伊！");
    const dur = Date.now() - t0;
    const list = Array.isArray(res) ? res : (res?.replies || []);
    if (llmStatus.configured) {
      console.log(`  [Self-Test] LLM 自检通过 (${dur}ms): 获得 ${list.length} 条回复，首句: "${list[0]?.dialogue}"`);
    } else {
      console.log(`  [Self-Test] LLM 离线语料模式自检就绪 (${dur}ms): 首句: "${list[0]?.dialogue}"`);
    }
    llmOk = true;
  } catch (e) {
    console.error(`  [Self-Test] LLM 自检失败: ${e.message}`);
  }

  let ttsOk = false;
  try {
    const t0 = Date.now();
    const testAudioName = genUniqueAudioName();
    const audioUrl = await callFishAudio("自检语音合成测试，欢迎来到 Celestial Reverie。", testAudioName);
    const dur = Date.now() - t0;
    console.log(`  [Self-Test] Fish-Audio 自检通过 (${dur}ms): ${audioUrl}`);
    ttsOk = true;
  } catch (e) {
    console.error(`  [Self-Test] Fish-Audio 自检失败: ${e.message}`);
  }

  console.log("========================================");
  console.log(`  [Self-Test] 自检报告看板:`);
  console.log(`  - LLM 接口:            ${llmOk ? '【SUCCESS ✓】' : '【FAILED ✗】'}`);
  console.log(`  - Fish Audio 智能语音:  ${ttsOk ? '【SUCCESS ✓】' : '【FAILED ✗】'}`);
  console.log("========================================\n");
}

const server7001 = http.createServer(app);
setupWebSocketServer(server7001, "7001");
server7001.listen(PORT, '0.0.0.0', function () {
  console.log("========================================");
  console.log("  CelestialReverie Mock Server v9 (Modular)");
  console.log(`  Port ${PORT} & ${VOICE_PORT} Ready`);
  console.log("========================================");
  runStartupSelfTest();
});

const server28888 = http.createServer(app);
setupWebSocketServer(server28888, "28888");
server28888.listen(VOICE_PORT, '0.0.0.0');

try {
  const httpsCert = fs.readFileSync(path.join(__dirname, 'cert.pem'));
  const httpsKey = fs.readFileSync(path.join(__dirname, 'key.pem'));
  const httpsServer = https.createServer({ key: httpsKey, cert: httpsCert }, function (req, res) {
    console.log(`[HTTPS] Blocked CDN request: ${req.method} ${req.url}`);
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'mock offline mode', code: 404 }));
  });
  httpsServer.listen(443, '0.0.0.0', function () {
    console.log('  HTTPS 拦截器已启动: port 443');
  });
} catch (e) {
  console.log(`[HTTPS] 443端口启动跳过或不可用: ${e.message}`);
}

module.exports = { app, store, server7001, server28888 };
