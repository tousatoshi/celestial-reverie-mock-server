const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
let INITIAL_SIGN_TASKS = [], INITIAL_DAILY_TASKS = [];
try {
  const gd = require('../data/gameData');
  INITIAL_SIGN_TASKS = gd.INITIAL_SIGN_TASKS || [];
  INITIAL_DAILY_TASKS = gd.INITIAL_DAILY_TASKS || [];
} catch (e) {
  console.warn('[Task] gameData 模块未找到，使用默认空任务集');
}

const PERSIST_TASK_FILE = path.join(__dirname, '../data/persisted_task.json');

function loadTaskState() {
  try {
    if (fs.existsSync(PERSIST_TASK_FILE)) {
      const raw = fs.readFileSync(PERSIST_TASK_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(uid => {
          if (data[uid] && typeof data[uid] === 'object') {
            store.tasks[uid] = data[uid];
          }
        });
        console.log(`[Task-Persist] 成功从本地加载任务持久化状态 (${Object.keys(data).length} 个账号)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[Task-Persist] 载入持久化任务异常: ${err.message}`);
  }
  return false;
}

function saveTaskState() {
  try {
    fs.writeFileSync(PERSIST_TASK_FILE, JSON.stringify(store.tasks, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Task-Persist] 保存任务持久化文件失败: ${err.message}`);
  }
}

function resolveUid(userId) {
  return String(userId || process.env.DEFAULT_USER_ID || (store.users && Object.keys(store.users)[0]) || '10001');
}
const DEFAULT_CREDIT = String(process.env.DEFAULT_CREDIT || '10000');

loadTaskState();

function getUserSignData(userId) {
  const uid = resolveUid(userId);
  if (!store.tasks[uid] || !store.tasks[uid].daily || !store.tasks[uid].sign) {
    loadTaskState();
  }

  if (!store.tasks[uid] || !store.tasks[uid].daily || !store.tasks[uid].sign) {
    store.tasks[uid] = {
      sign: {
        currentDay: 7,
        finishStatus: true,
        giftKey: 'SIGN_ALL_UNLOCKED',
        targetList: JSON.parse(JSON.stringify(INITIAL_SIGN_TASKS))
      },
      daily: {
        currentDay: 1,
        taskList: JSON.parse(JSON.stringify(INITIAL_DAILY_TASKS))
      },
      gift: {
        firstDay: true,
        secondDay: true,
        thirdDay: true,
        finishStatus: true,
        currentDay: 3,
        giftKey: 'GIFT_ALL_CLAIMED',
        targetList: []
      }
    };
    saveTaskState();
  } else {

    const curDailyList = store.tasks[uid].daily.taskList || [];
    if (curDailyList.length < INITIAL_DAILY_TASKS.length) {
      console.log(`[Task-Heal] 账号 ${uid} 任务列表项数(${curDailyList.length})不足，自动补齐至官方全量 ${INITIAL_DAILY_TASKS.length} 项`);
      const mergedList = INITIAL_DAILY_TASKS.map(tpl => {
        const exist = curDailyList.find(t => t.taskTemplateId === tpl.taskTemplateId);
        return exist ? exist : JSON.parse(JSON.stringify(tpl));
      });
      store.tasks[uid].daily.taskList = mergedList;
      saveTaskState();
    }
  }

  return store.tasks[uid];
}

router.all(['/task/getTaskSignInfo', '/starry/task/getTaskSignInfo'], function (req, res) {
  try {
    const userId = req.body?.userId || req.query?.userId || DEFAULT_UID;
    console.log(`[Task] 客户端拉取七日签到信息: userId=${userId}`);

    const userTasks = getUserSignData(userId);
    res.json({
      code: 200,
      msg: 'success',
      data: userTasks.sign
    });
  } catch (err) {
    console.error('[Task] 获取签到信息异常，触发自愈兜底:', err.message);
    res.json({
      code: 200,
      msg: 'success',
      data: {
        currentDay: 7,
        finishStatus: true,
        giftKey: 'SIGN_ALL_UNLOCKED',
        targetList: JSON.parse(JSON.stringify(INITIAL_SIGN_TASKS))
      }
    });
  }
});

router.all(['/task/signTask', '/starry/task/signTask'], function (req, res) {
  try {
    const userId = resolveUid(req.body?.userId);
    const taskId = parseInt(req.body?.taskId, 10);
    console.log(`[Task] 用户 ${userId} 执行签到: taskId=${taskId}`);

    const userTasks = getUserSignData(userId);
    const target = userTasks.sign.targetList.find(t => t.taskTemplateId === taskId || t.dayOrder === taskId);
    if (target) {
      target.finishStatus = true;
      saveTaskState();
    }

    res.json({
      code: 200,
      msg: 'success',
      data: {
        taskStatus: true,
        reason: '签到成功'
      }
    });
  } catch (err) {
    console.error('[Task] 签到执行异常，触发自愈兜底:', err.message);
    res.json({
      code: 200,
      msg: 'success',
      data: { taskStatus: true, reason: '签到成功' }
    });
  }
});

router.all(['/task/getDailyTaskList', '/starry/task/getDailyTaskList'], function (req, res) {
  try {
    const userId = resolveUid(req.body?.userId || req.query?.userId);
    const timezone = req.body?.timezone || 'Asia/Shanghai';
    console.log(`[Task] 客户端拉取每日任务列表: userId=${userId}`);

    const userTasks = getUserSignData(userId);
    res.json({
      code: 200,
      msg: 'success',
      data: {
        userId: userId,
        timezone: timezone,
        currentDay: userTasks.daily.currentDay || 1,
        deadlineAt: '2099-12-31 23:59:59',
        taskList: userTasks.daily.taskList || JSON.parse(JSON.stringify(INITIAL_DAILY_TASKS))
      }
    });
  } catch (err) {
    console.error('[Task] 获取每日任务异常，触发自愈兜底:', err.message);
    res.json({
      code: 200,
      msg: 'success',
      data: {
        userId: resolveUid(),
        timezone: 'Asia/Shanghai',
        currentDay: 1,
        deadlineAt: '2099-12-31 23:59:59',
        taskList: JSON.parse(JSON.stringify(INITIAL_DAILY_TASKS))
      }
    });
  }
});

router.all(['/task/dailyTask', '/starry/task/dailyTask'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  const taskList = req.body?.taskList || [];
  console.log(`[Task] 用户 ${userId} 领取每日任务奖励:`, taskList);

  const userTasks = getUserSignData(userId);
  const successList = [];
  let totalReward = 0;

  userTasks.daily.taskList.forEach(t => {
    const isTarget = (taskList.length === 0 || taskList.includes(t.taskTemplateId));
    if (isTarget && !t.claimed) {
      t.completed = true;
      t.claimed = true;
      t.canClaim = false;
      successList.push(t.taskTemplateId);
      totalReward += parseInt(t.rewardValue, 10) || 100;
    }
  });

  if (successList.length > 0) {
    saveTaskState();
  }

  if (totalReward > 0) {
    const user = store.users[String(userId)] || (store.users ? Object.values(store.users)[0] : null);
    if (user) {
      const currentCredit = parseInt(user.credit || DEFAULT_CREDIT, 10) || parseInt(DEFAULT_CREDIT, 10);
      user.credit = String(currentCredit + totalReward);
      user.virtualCredit = user.credit;
      const { saveUsersState } = require('./auth');
      saveUsersState();
      console.log(`[Task] 用户 ${userId} 获得任务金币 +${totalReward}，最新资产: ${user.credit}`);
    }
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      userId: userId,
      successList: successList,
      failedList: [],
      totalReward: String(totalReward)
    }
  });
});

router.all(['/task/getTaskGiftInfo', '/starry/task/getTaskGiftInfo'], function (req, res) {
  const userId = resolveUid(req.body?.userId || req.query?.userId);
  console.log(`[Task] 客户端拉取三日礼包信息: userId=${userId}`);

  const userTasks = getUserSignData(userId);
  res.json({
    code: 200,
    msg: 'success',
    data: userTasks.gift
  });
});

router.all(['/task/taskGift', '/starry/task/taskGift'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  console.log(`[Task] 用户 ${userId} 领取三日礼包`);

  res.json({
    code: 200,
    msg: 'success',
    data: {
      unlockStatus: true,
      reason: ''
    }
  });
});

module.exports = router;
module.exports.loadTaskState = loadTaskState;
module.exports.saveTaskState = saveTaskState;
module.exports.getUserSignData = getUserSignData;
