const express = require('express');
const router = express.Router();
const { success, buildServerInfoResponse } = require('../responses/templates');
const { store } = require('../data/store');

router.all(['/server/info', '/info', '/starry/server/info', '/starry/info'], function (req, res) {
  res.json(buildServerInfoResponse());
});

router.all([
  '/server/joinQueue', '/starry/server/joinQueue',
  '/server/checkConfirm', '/starry/server/checkConfirm',
  '/server/getUserQueueInfo', '/starry/server/getUserQueueInfo'
], function (req, res) {
  res.json(success({ inQueue: false, confirmed: true, canEnter: true, position: 0, waitTime: 0 }));
});

router.all(['/event/userQueueEvent', '/starry/event/userQueueEvent', '/event/queueEvent', '/starry/event/queueEvent'], function (req, res) {
  console.log("[Queue-Event] 收到客户端排队事件: " + JSON.stringify(req.body));
  res.json(success({ received: true, inQueue: false, confirmed: true, canEnter: true, position: 0 }));
});

router.all([
  '/event/log', '/starry/event/log',
  '/event/logs', '/starry/event/logs',
  '/event/userEvent', '/starry/event/userEvent'
], function (req, res) {
  const bodyStr = JSON.stringify(req.body || {});
  console.log(`[Client-Log] 收到客户端事件/日志 (${req.url}):`, bodyStr);

  if (bodyStr.includes('sleep_knock') || bodyStr.includes('knock')) {
    console.log('[Action-Director] 捕获到客户端敲门唤醒事件 (sleep_knock)，立即引导蕾伊回归天台远眺！');
    try {
      const { interruptBlockingAction } = require('../services/characterDirector');
      interruptBlockingAction('Lookout');
    } catch (e) {
      console.warn('[Action-Director] 唤醒调度异常:', e.message);
    }
  }

  if (bodyStr.includes('ghost_speech_responsed')) {
    try {
      if (store.chatEventEmitter) {
        store.chatEventEmitter.emit('ghost_speech_responsed', req.body);
      }
    } catch (e) { }
  }

  res.json(success({ received: true }));
});

router.all('*', function (req, res) {
  console.log("[Catch-all] 兼容放行: " + req.method + " " + req.url);
  res.json(success({
    inQueue: false, confirmed: true, canEnter: true, position: 0, waitTime: 0
  }, 'ok'));
});

module.exports = router;
