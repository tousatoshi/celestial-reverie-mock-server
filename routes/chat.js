const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { store, now, nextNumericId, genUniqueAudioName } = require('../data/store');
const { success } = require('../responses/templates');
const { callLLMForReplies } = require('../services/llm');
const { callFishAudio, generateStamps } = require('../services/tts');
const { recordChatTurn, getRecentChatHistory, getNextTurnRequestId } = require('../services/historyDb');
let directorModule = {};
try {
  directorModule = require('../services/characterDirector');
} catch (e) {
  console.warn('[Chat] characterDirector 模块未找到，启用纯对话安全兜底模式');
}

const ACTIONS = directorModule.ACTIONS || {
  Lookout: { id: 'Lookout', name: '天台远眺', keywords: [] }
};
const OUTFITS = directorModule.OUTFITS || {
  DEFAULT: 'CIVILIAN-UNIFORM-CAPTAIN-25',
  MAID: 'MAID-WHITE-26'
};
const setVirtualDayMode = directorModule.setVirtualDayMode || (() => {});
const getVirtualDayMode = directorModule.getVirtualDayMode || (() => true);
const isVirtualDayMode = directorModule.isVirtualDayMode || (() => true);
const setPreferredOutfit = directorModule.setPreferredOutfit || (() => {});
const getPreferredOutfit = directorModule.getPreferredOutfit || (() => OUTFITS.DEFAULT);
const getCurrentActionId = directorModule.getCurrentActionId || (() => 'Lookout');
const isBlockingAction = directorModule.isBlockingAction || (() => false);
const interruptBlockingAction = directorModule.interruptBlockingAction || (() => null);
const recognizeActionIntent = directorModule.recognizeActionIntent || (() => null);
const recognizeOutfitIntent = directorModule.recognizeOutfitIntent || (() => null);
const dispatchCharacterAction = directorModule.dispatchCharacterAction || (() => null);

const sessionChatHistory = new Map();

function mapExpressionToMood(expression) {
  if (!expression) return 'DEFAULT';
  const exp = String(expression).trim();
  const map = {

    'Happy': 'YUE',
    'Smile': 'YUE',
    'YUE': 'YUE',

    'Sad': 'CHEN',
    'CHEN': 'CHEN',

    'Angry': 'ZE',
    'ZE': 'ZE',

    'Shy': 'XIU',
    'XIU': 'XIU',

    'Sweat': 'XU',
    'XU': 'XU',

    'Confused': 'HUO',
    'HUO': 'HUO',

    'Think': 'THINK',
    'THINK': 'THINK',

    'Relaxed': 'QING',
    'QING': 'QING',

    'Proud': 'RAN',
    'RAN': 'RAN',

    'Cold': 'MO',
    'MO': 'MO',

    'Normal': 'DEFAULT',
    'DEFAULT': 'DEFAULT'
  };
  return map[exp] || 'DEFAULT';
}

function broadcastWs(packet) {
  const jsonStr = JSON.stringify(packet);
  let sentCount = 0;
  store.activeWsSockets.forEach(function (ws) {
    try {
      if (ws.readyState === 1) {
        ws.send(jsonStr);
        sentCount++;
      }
    } catch (e) {
      console.error("[WS-Broadcast] 单客户端推送异常:", e.message);
    }
  });
  console.log(`[WS-Broadcast] 推送 [${packet.resultType}] (reqId: ${packet.requestId}, index: ${packet.index}), 成功下发至 ${sentCount}/${store.activeWsSockets.size} 个客户端`);
}

router.all([
  '/modelServer/getTalkStrategy', '/starry/modelServer/getTalkStrategy'
], function (req, res) {
  const uid = req.userId || process.env.DEFAULT_USER_ID || (store.users && Object.keys(store.users)[0]) || "10001";
  const currentUser = store.users ? store.users[String(uid)] : null;
  const uname = (currentUser && currentUser.userName) || process.env.DEFAULT_USER_NAME || "调查员";
  res.json(success({
    userId: uid,
    userName: uname,
    creationTime: now(),
    modelVersion: "newapi-nemotron-free",
    framework: 'ASP-Astria-1.0',
    strategy: 'casual',
    personality: 'friendly',
    settings: { voiceEnabled: true, ttsEnabled: true },
    preferences: { theme: 'default', enableNotifications: true },
    weight: 1.0
  }));
});

router.post([
  '/modelServer/sendMessage', '/starry/modelServer/sendMessage',
  '/modelServer/sendUserMessages', '/starry/modelServer/sendUserMessages'
], async function (req, res) {
  const reqStartTime = Date.now();
  const b = req.body || {};
  console.log("[Chat-Request] 收到用户发言请求:", JSON.stringify(b));

  let userText = b.content || b.message || b.text || "";
  if (!userText && b.payloadJson) {
    try {
      const p = JSON.parse(b.payloadJson);
      userText = p.content || p.message || p.text || b.payloadJson;
    } catch (e) {
      userText = b.payloadJson;
    }
  }
  if (!userText) userText = "你好呀，蕾伊！";

  let reqNumericId = 0;
  if (typeof b.requestId === 'number' && b.requestId > 0) {
    reqNumericId = b.requestId;
  } else if (typeof b.requestId === 'string' && b.requestId.trim() !== '') {
    reqNumericId = parseInt(b.requestId, 10) || 0;
  }
  if (!reqNumericId || reqNumericId <= 0) {
    reqNumericId = getNextTurnRequestId();
  }
  const defaultUid = parseInt(process.env.DEFAULT_USER_ID || (store.users && Object.keys(store.users)[0]) || "10001", 10) || 10001;
  const uid = parseInt(b.userId || req.userId || defaultUid, 10) || defaultUid;

  res.json({
    code: 200,
    msg: 'ok',
    data: reqNumericId,
    requestId: reqNumericId,
    inQueue: false,
    confirmed: true,
    canEnter: true,
    position: 0,
    waitTime: 0,
    received: true,
    status: 0,
    success: true,
    isSuccess: true,
    userModelMessagesList: []
  });

  const userMsgNumericId = nextNumericId();
  const userMsgItem = {
    messageId: userMsgNumericId,
    requestId: reqNumericId,
    requestID: reqNumericId,
    userId: uid,
    speaker: 0,
    currentSpeaker: 'User',
    content: userText,
    expression: '',
    thought: '',
    MEUCode: 'HUO',
    VEU25Code: 'HUO',
    VECCode: 'HUO',
    nextBodyPose: 'GS-A00',
    sortNum: 1,
    index: 0,
    voice: '',
    createTime: new Date(reqStartTime).toISOString(),
    subContent: '',
    vocalLevel: '0',
    reference: '',
    starKey: '',
    starImpression: '',
    isHistoryData: true
  };
  if (!store.chatHistories[uid]) {
    store.chatHistories[uid] = [];
  }
  store.chatHistories[uid].push(userMsgItem);

  broadcastWs({
    resultType: 'thinking',
    data: { messageId: userMsgNumericId, requestId: reqNumericId, userId: uid },
    requestId: reqNumericId,
    index: 0
  });
  console.log(`[Chat] thinking 已下发，用户气泡已入库，客户端状态机已初始化`);

  (async function () {
    try {
      console.log(`[Chat] 正在为用户 [${uid}] 生成蕾伊的回复，用户输入: "${userText}"`);

      const userSessionHistory = sessionChatHistory.get(String(uid)) || [];
      const historyContext = userSessionHistory.slice(-20);
      if (historyContext.length === 0) {
        console.log(`[Chat-Context] 服务重启后首次对话，启动纯净上下文模式 (无历史消息干扰)`);
      } else {
        console.log(`[Chat-Context] 当前会话累计上下文: ${historyContext.length / 2} 轮 (${historyContext.length} 条消息)`);
      }

      const initialActionId = getCurrentActionId();
      const currentOutfit = getPreferredOutfit();
      const isDay = isVirtualDayMode();
      const runtimeContext = {
        actionId: initialActionId,
        actionName: ACTIONS[initialActionId]?.name || initialActionId,
        outfit: currentOutfit,
        outfitName: currentOutfit === OUTFITS.MAID ? '白色蕾丝女仆装 (MAID-WHITE-26)' : '默认舰长常服 (CIVILIAN-UNIFORM-CAPTAIN-25)',
        isDay: isDay,
        timeText: isDay ? '白天 (Day)' : '夜间 (Night)'
      };

      const llmResult = await callLLMForReplies(userText, historyContext, runtimeContext);
      let replies = [];
      let toolAction = null;
      let toolOutfit = null;

      if (Array.isArray(llmResult)) {
        replies = llmResult;
      } else if (llmResult?.replies && Array.isArray(llmResult.replies)) {
        replies = llmResult.replies;
        toolAction = llmResult.action || null;
        toolOutfit = llmResult.outfit || null;
      }
      if (!replies || replies.length === 0) {
        replies = [{ dialogue: "今天的天台风很舒服呢，调查员。", expression: "Smile" }];
      }

      if (replies.length > 3) replies = replies.slice(0, 3);
      console.log(`[Chat] 蕾伊生成回复完成 (${replies.length} 句):`, replies.map(r => r.dialogue).join(" | "));

      const userProfile = process.env.USERPROFILE || process.env.HOME || '';
      const clientMp3Dir = process.env.CLIENT_AUDIO_DIR || (userProfile ? path.join(userProfile, 'AppData', 'LocalLow', 'SingularDance', 'CelestialReverie', 'MP3Audios') : '');
      const host = req.headers.host || '106.12.163.121:7001';

      let targetAct = null;
      let targetOutfit = null;

      if (toolAction && ACTIONS[toolAction]) {
        targetAct = ACTIONS[toolAction];
        console.log(`[AI-Director] LLM Tool Call 显式指定动作: ${targetAct.id} (${targetAct.name})`);
      }
      if (toolOutfit) {
        if (toolOutfit === 'default') targetOutfit = OUTFITS.DEFAULT;
        else if (toolOutfit === 'maid') targetOutfit = OUTFITS.MAID;
        console.log(`[AI-Director] LLM Tool Call 显式指定换装: ${targetOutfit}`);
      }

      if (!targetAct) {
        targetAct = recognizeActionIntent(userText);
        if (targetAct) {
          console.log(`[AI-Director] 自然语言语义命中动作: ${targetAct.id} (${targetAct.name})`);
        }
      }
      if (!targetOutfit) {
        targetOutfit = recognizeOutfitIntent(userText);
        if (targetOutfit) {
          console.log(`[AI-Director] 自然语言语义命中换装: ${targetOutfit}`);
        }
      }

      const trimmed = userText.trim().toLowerCase();
      if (trimmed.startsWith('/day')) {
        setVirtualDayMode(true);
        targetAct = ACTIONS.Lookout;
      } else if (trimmed.startsWith('/night')) {
        setVirtualDayMode(false);
        targetAct = ACTIONS.Eat;
      } else if (trimmed.startsWith('/wake') || trimmed.startsWith('/leave')) {
        targetAct = ACTIONS.Lookout;
      } else if (trimmed.startsWith('/outfit')) {
        if (trimmed.includes('default') || trimmed.includes('main') || trimmed.includes('0')) {
          targetOutfit = OUTFITS.DEFAULT;
        } else if (trimmed.includes('maid') || trimmed.includes('1')) {
          targetOutfit = OUTFITS.MAID;
        } else {
          targetOutfit = (getPreferredOutfit() === OUTFITS.MAID) ? OUTFITS.DEFAULT : OUTFITS.MAID;
        }
      }

      if (targetOutfit) {
        setPreferredOutfit(targetOutfit);
      }

      const nowActionId = getCurrentActionId();
      if (isBlockingAction(nowActionId) && (targetAct || targetOutfit)) {
        const actToDispatch = targetAct ? targetAct.id : 'Lookout';
        console.log(`[AI-Director] 角色当前处于阻塞状态 [${nowActionId}]，执行即时打断并带出至 [${actToDispatch}]`);
        interruptBlockingAction(actToDispatch, targetOutfit);
        targetAct = null;
      }

      const ttsJobs = replies.map((item, idx) => {
        const subReqId = reqNumericId + idx;
        const audioFileName = `${subReqId}_0.mp3`;
        const voiceUrl = `http://${host}/audio/${audioFileName}`;

        console.log(`[Chat-TTS-Pipeline] 启动回复语音流水线 [${idx + 1}/${replies.length}]: "${item.dialogue.substring(0, 20)}..." -> ${audioFileName}`);
        const promise = callFishAudio(item.dialogue, audioFileName);

        store.pendingAudioMap.set(audioFileName, promise);
        store.pendingAudioMap.set(`${subReqId}_0.mp3`, promise);
        store.pendingAudioMap.set(`${subReqId}.mp3`, promise);
        store.pendingAudioMap.set(String(subReqId), promise);
        if (store.audioFileMapping) {
          store.audioFileMapping.set(String(subReqId), audioFileName);
        }
        if (idx === 0) {
          store.pendingAudioMap.set(`${reqNumericId}_0.mp3`, promise);
          store.pendingAudioMap.set(`${reqNumericId}.mp3`, promise);
          store.pendingAudioMap.set(String(reqNumericId), promise);
          if (store.audioFileMapping) {
            store.audioFileMapping.set(String(reqNumericId), audioFileName);
          }
        }

        return {
          idx,
          subReqId,
          audioFileName,
          voiceUrl,
          dialogue: item.dialogue,
          expression: item.expression || 'Smile',
          promise
        };
      });

      function waitForSentencePlayback(sentenceText, defaultDurationMs) {
        return new Promise((resolve) => {
          let resolved = false;
          const timer = setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (store.chatEventEmitter) {
                store.chatEventEmitter.removeListener('ghost_speech_responsed', onResponsed);
              }
              console.log(`[Chat-Pipeline] 当前句播放等待超时 (${defaultDurationMs}ms 兜底到期)，自动推进下一句`);
              resolve('timeout');
            }
          }, defaultDurationMs);

          function onResponsed() {
            if (!resolved) {
              resolved = true;
              clearTimeout(timer);
              if (store.chatEventEmitter) {
                store.chatEventEmitter.removeListener('ghost_speech_responsed', onResponsed);
              }
              console.log(`[Chat-Pipeline] 收到客户端语音播毕事件 (ghost_speech_responsed)，提前平滑推进下一句`);
              resolve('event');
            }
          }

          if (store.chatEventEmitter) {
            store.chatEventEmitter.on('ghost_speech_responsed', onResponsed);
          }
        });
      }

      let lastSubReqId = reqNumericId;
      let lastMsgNumericId = userMsgNumericId;

      for (let i = 0; i < ttsJobs.length; i++) {
        const job = ttsJobs[i];
        const isLast = (i === ttsJobs.length - 1);
        const subReqId = job.subReqId;
        const audioFileName = job.audioFileName;
        lastSubReqId = subReqId;

        const ttsStartWait = Date.now();
        try {
          await job.promise;
        } catch (ttsErr) {
          console.warn(`[Chat-TTS-Pipeline] 语音 [${i}] 合成异常: ${ttsErr.message}`);
        }
        console.log(`[Chat-TTS-Pipeline] 语音 [${i + 1}/${ttsJobs.length}] 已合成就绪 (等待耗时: ${Date.now() - ttsStartWait}ms)`);

        store.pendingAudioMap.delete(audioFileName);
        store.pendingAudioMap.delete(`${subReqId}_0.mp3`);
        store.pendingAudioMap.delete(`${subReqId}.mp3`);
        store.pendingAudioMap.delete(String(subReqId));

        try {
          if (fs.existsSync(clientMp3Dir)) {
            const localSource = path.join(__dirname, '..', 'audio', audioFileName);
            if (fs.existsSync(localSource)) {
              fs.copyFileSync(localSource, path.join(clientMp3Dir, audioFileName));
              fs.copyFileSync(localSource, path.join(clientMp3Dir, `${subReqId}.mp3`));
              if (i === 0) {
                fs.copyFileSync(localSource, path.join(clientMp3Dir, `${reqNumericId}_0.mp3`));
                fs.copyFileSync(localSource, path.join(clientMp3Dir, `${reqNumericId}.mp3`));
                fs.copyFileSync(localSource, path.join(clientMp3Dir, '0_0.mp3'));
                fs.copyFileSync(localSource, path.join(clientMp3Dir, 'http_temp.mp3'));
              }
              console.log(`[Chat-Audio] 语音 [${i}] 已直通同步至客户端本地目录: ${audioFileName}`);
            }
          }
        } catch (syncErr) {
          console.warn(`[Chat-Audio] 客户端持久化目录镜像跳过: ${syncErr.message}`);
        }

        const msgNumericId = nextNumericId();
        lastMsgNumericId = msgNumericId;
        const moodCode = mapExpressionToMood(job.expression);
        const msgItem = {
          messageId: msgNumericId,
          requestId: subReqId,
          requestID: subReqId,
          userId: uid,
          speaker: 1,
          currentSpeaker: 'Rei',
          content: job.dialogue,
          expression: job.expression,
          thought: '',
          MEUCode: moodCode,
          VEU25Code: moodCode,
          VECCode: moodCode,
          nextBodyPose: 'GS-A00',
          sortNum: i + 2,
          index: 0,
          voice: job.voiceUrl,
          createTime: new Date().toISOString(),
          subContent: '',
          vocalLevel: '3',
          reference: '',
          starKey: '',
          starImpression: '',
          isHistoryData: true
        };

        if (!store.chatHistories[uid]) {
          store.chatHistories[uid] = [];
        }
        store.chatHistories[uid].push(msgItem);

        broadcastWs({
          resultType: 'result',
          data: {
            messageId: msgItem.messageId,
            requestId: subReqId,
            userId: uid,
            context: '',
            resultType: 'result',
            messageList: [msgItem],
            lastMessage: true,
            lastRequest: isLast
          },
          requestId: subReqId,
          index: 0
        });

        broadcastWs({
          resultType: 'audio',
          data: `start_${subReqId}_0`,
          requestId: subReqId,
          index: 0
        });

        const sentenceStamps = generateStamps(job.dialogue);
        broadcastWs({
          resultType: 'stamp',
          data: {
            index: 0,
            text: job.dialogue,
            words: sentenceStamps
          },
          requestId: subReqId,
          index: 0
        });

        console.log(`[Chat-Stream] 成功流式推送对白分段 [${i + 1}/${ttsJobs.length}] (reqId: ${subReqId}, index: 0): "${job.dialogue}"`);

        const sentenceDurationMs = Math.max(3800, job.dialogue.length * 300 + 1200);
        await waitForSentencePlayback(job.dialogue, sentenceDurationMs);

        if (!isLast) {
          await new Promise(r => setTimeout(r, 300));
        }
      }

      broadcastWs({
        resultType: 'end',
        data: { messageId: lastMsgNumericId, requestId: lastSubReqId },
        requestId: lastSubReqId,
        index: 0
      });
      console.log(`[Chat-Success] 本轮对话全部对白与语音完整播毕，已下发 end 终结包`);

      try {
        await recordChatTurn(uid, reqNumericId, userText, ttsJobs);
      } catch (dbErr) {
        console.warn('[Chat-History] 归档聊天记录至 SQLite 异常:', dbErr.message);
      }

      const fullReplyText = ttsJobs.map(j => j.dialogue).join(' ');
      if (!sessionChatHistory.has(String(uid))) {
        sessionChatHistory.set(String(uid), []);
      }
      const curList = sessionChatHistory.get(String(uid));
      curList.push({ role: 'user', content: userText });
      curList.push({ role: 'assistant', content: fullReplyText });
      if (curList.length > 20) {
        curList.splice(0, curList.length - 20);
      }

      if (targetAct || targetOutfit) {
        const actId = targetAct ? targetAct.id : getCurrentActionId();
        console.log(`[AI-Director] 语音全部播毕，平滑驱动角色走位至新设施: [${actId}]`);
        dispatchCharacterAction(actId, targetOutfit);
      }
    } catch (err) {
      console.error("[Chat-Error] 对话与语音推送发生异常:", err.message);
    }
  })();
});

module.exports = router;
