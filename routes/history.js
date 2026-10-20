const express = require('express');
const router = express.Router();
const { getActiveDaysByYear, getHistoryDetails, clearUserHistory } = require('../services/historyDb');
const { store } = require('../data/store');

function resolveUid(userId) {
  return String(userId || process.env.DEFAULT_USER_ID || (store.users && Object.keys(store.users)[0]) || '10001');
}

router.all(['/sysUser/getHistoryList', '/starry/sysUser/getHistoryList'], async function (req, res) {
  try {
    const userId = resolveUid(req.body?.userId || req.query?.userId);
    const year = parseInt(req.body?.year || req.query?.year, 10) || new Date().getFullYear();
    console.log(`[History] 客户端获取日历打点列表: userId=${userId}, year=${year}`);

    const monthData = await getActiveDaysByYear(userId, year);

    res.json({
      success: true,
      code: 200,
      msg: 'ok',
      data: monthData
    });
  } catch (err) {
    console.error('[History] 获取日历打点列表异常:', err.message);
    res.json({
      success: true,
      code: 200,
      msg: 'ok',
      data: {}
    });
  }
});

router.all([
  '/modelServer/getUserModelInfo', '/starry/modelServer/getUserModelInfo',
  '/modelServer/getHistory', '/starry/modelServer/getHistory'
], async function (req, res) {
  try {
    const body = req.body || {};
    const userId = resolveUid(body.userId || req.query?.userId);
    const limit = parseInt(body.limit, 10) || 1000;
    const page = parseInt(body.page, 10) || 1;
    const startTime = body.startTime || req.query?.startTime || '';
    const endTime = body.endTime || req.query?.endTime || '';

    console.log(`[History] 客户端拉取历史记录消息: userId=${userId}, page=${page}, limit=${limit}, range=[${startTime} ~ ${endTime}]`);

    const result = await getHistoryDetails(userId, { startTime, endTime, page, limit });

    console.log(`[History] 成功返回历史记录: 总轮次=${result.total}, 当前下发=${result.rows.length} 轮`);

    res.json({
      code: 200,
      msg: 'ok',
      data: {
        rows: result.rows,
        total: result.total
      }
    });
  } catch (err) {
    console.error('[History] 拉取历史记录异常:', err.message);
    res.json({
      code: 200,
      msg: 'ok',
      data: {
        rows: [],
        total: 0
      }
    });
  }
});

router.all(['/modelServer/clearMessage', '/starry/modelServer/clearMessage'], async function (req, res) {
  try {
    const userId = resolveUid(req.body?.userId || req.query?.userId);
    console.log(`[History] 用户 ${userId} 清除聊天历史`);
    await clearUserHistory(userId);

    res.json({
      code: 200,
      msg: 'ok',
      data: {
        success: true
      }
    });
  } catch (err) {
    console.error('[History] 清除历史记录异常:', err.message);
    res.json({
      code: 200,
      msg: 'ok',
      data: {
        success: false
      }
    });
  }
});

module.exports = router;
