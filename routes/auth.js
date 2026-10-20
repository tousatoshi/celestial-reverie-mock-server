const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { store, now, genToken } = require('../data/store');
const { success, buildPreLoginResponse, buildLoginResponse } = require('../responses/templates');

const PERSIST_USER_FILE = path.join(__dirname, '../data/persisted_users.json');

function loadUsersState() {
  try {
    if (fs.existsSync(PERSIST_USER_FILE)) {
      const raw = fs.readFileSync(PERSIST_USER_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(uid => {
          store.users[uid] = data[uid];
        });
        console.log(`[User-Persist] 成功从本地加载用户持久化状态 (${Object.keys(data).length} 个账号)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[User-Persist] 载入持久化用户异常: ${err.message}`);
  }
  return false;
}

function saveUsersState() {
  try {
    fs.writeFileSync(PERSIST_USER_FILE, JSON.stringify(store.users, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[User-Persist] 保存用户持久化文件失败: ${err.message}`);
  }
}

const DEFAULT_UID = String(process.env.DEFAULT_USER_ID || '');
const DEFAULT_USERNAME = String(process.env.DEFAULT_USER_NAME || '');
const DEFAULT_NICKNAME = String(process.env.DEFAULT_NICK_NAME || '');
const DEFAULT_EMAIL = String(process.env.DEFAULT_EMAIL || '');
const DEFAULT_PASSWORD = String(process.env.DEFAULT_PASSWORD || '');
const DEFAULT_CREDIT = String(process.env.DEFAULT_CREDIT || '10000');

loadUsersState();

function authMiddleware(req, res, next) {
  const rawToken = req.headers['authorization'] || req.headers['x-token'] || req.headers['token'] || req.query?.token;
  if (!rawToken) {
    const fallbackUid = (DEFAULT_UID && store.users[DEFAULT_UID]) ? DEFAULT_UID : Object.keys(store.users)[0] || '';
    req.userId = fallbackUid;
    return next();
  }
  const token = rawToken.replace(/^Bearer\s+/i, '').trim();
  const s = store.sessions[token];
  if (!s) {
    const fallbackUid = (DEFAULT_UID && store.users[DEFAULT_UID]) ? DEFAULT_UID : Object.keys(store.users)[0] || '';
    req.userId = fallbackUid;
    req.userToken = token;
    return next();
  }
  req.userId = s.userId || (DEFAULT_UID || Object.keys(store.users)[0] || '');
  req.userToken = token;
  next();
}

router.all(['/common/preLogin', '/preLogin', '/starry/common/preLogin', '/starry/preLogin'], function (req, res) {
  res.json(buildPreLoginResponse());
});

let INITIAL_ITEMS = [], INITIAL_MAILS = [], INITIAL_SIGN_TASKS = [], INITIAL_DAILY_TASKS = [];
try {
  const gd = require('../data/gameData');
  INITIAL_ITEMS = gd.INITIAL_ITEMS || [];
  INITIAL_MAILS = gd.INITIAL_MAILS || [];
  INITIAL_SIGN_TASKS = gd.INITIAL_SIGN_TASKS || [];
  INITIAL_DAILY_TASKS = gd.INITIAL_DAILY_TASKS || [];
} catch (e) {
  console.warn('[Auth] gameData 模块未找到，使用默认空数据集');
}

function injectAccountGameData(uid) {
  if (!store.inventories[uid]) {
    store.inventories[uid] = JSON.parse(JSON.stringify(INITIAL_ITEMS));
  }

  const { getUserSignData } = require('./task');
  getUserSignData(uid);

  const { getUserMails } = require('./inventory');
  getUserMails(uid);

  if (!store.chatHistories[uid]) {
    store.chatHistories[uid] = [];
  }
}

router.post(['/common/login', '/login', '/starry/common/login', '/starry/login'], function (req, res) {
  const b = req.body || {};
  console.log("[Auth-Payload] 客户端登录参数:", JSON.stringify(b));
  const queryAccount = b.email || b.userName || b.account;
  const providedId = b.userId;

  let user = null;
  if (providedId && store.users[String(providedId)]) {
    user = store.users[String(providedId)];
  } else if (queryAccount) {
    user = Object.values(store.users).find(u => u.userName === queryAccount || u.email === queryAccount);
  }

  if (!user && !queryAccount) {
    if (DEFAULT_UID && store.users[DEFAULT_UID]) {
      user = store.users[DEFAULT_UID];
    } else if (Object.keys(store.users).length > 0) {
      user = Object.values(store.users)[0];
    }
  }

  const { getPreferredOutfit, getVirtualWorldTime } = require('../services/characterDirector');
  const preferredOutfit = getPreferredOutfit() || 'MAID-WHITE-26';
  const worldTime = getVirtualWorldTime();

  if (!user) {
    if (queryAccount) {

      const uid = String(Math.floor(10000 + Math.random() * 89999));
      const parsedName = queryAccount.includes('@') ? queryAccount.split('@')[0] : queryAccount;
      const userEmail = queryAccount.includes('@') ? queryAccount : `${parsedName}@celestialreverie.local`;

      user = {
        userId: uid,
        userName: parsedName,
        nickName: parsedName,
        email: userEmail,
        phone: b.phone || '',
        sex: '0',
        avatar: '',
        credit: DEFAULT_CREDIT,
        virtualCredit: DEFAULT_CREDIT,
        mainStep: '1',
        suggestStyle: '',
        frameFlag: '1',
        gotChessFrame: 1,
        currentPresence: {
          actionGroup: 'Lookout',
          focus: 'AF',
          blockName: 'default',
          blockingPointName: 'ROOFTOP_METAL_RAILING_AREA_0',
          ghostWorldTime: worldTime,
          systemMessage: '蕾伊在等待你的归来。',
          outfit: preferredOutfit,
          stageName: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0'
        },
        createdAt: now(),
        lastLoginTime: now()
      };
      store.users[uid] = user;
      saveUsersState();
      injectAccountGameData(uid);
      console.log(`[Auth] 创建并持久化新用户账号: ${user.userName} (UID: ${uid})`);
    } else {
      console.log('[Auth] 未提供账号数据且无预设用户，返回未认证状态引导注册');
      return res.json({
        code: 401,
        msg: '请先在客户端注册或输入账号登录',
        success: false,
        data: null
      });
    }
  } else {

    if (!user.credit) user.credit = DEFAULT_CREDIT;
    if (!user.virtualCredit) user.virtualCredit = DEFAULT_CREDIT;
    user.lastLoginTime = now();
    const { getCurrentActionId, ACTIONS } = require('../services/characterDirector');
    const curActId = getCurrentActionId() || 'Lookout';
    const curAct = ACTIONS[curActId] || ACTIONS.Lookout;
    if (!user.currentPresence) user.currentPresence = {};
    user.currentPresence.outfit = preferredOutfit;
    user.currentPresence.actionGroup = curAct.id;
    user.currentPresence.blockingPointName = curAct.blockingPoint;
    user.currentPresence.ghostWorldTime = worldTime;
    saveUsersState();
    injectAccountGameData(user.userId);
  }

  const token = genToken();
  const numericUserId = parseInt(user.userId, 10) || 10001;
  store.sessions[token] = { userId: String(numericUserId), createdAt: Date.now() };
  console.log(`[Auth] 用户登录成功: ${user.userName} (UID: ${numericUserId}), Token: ${token}, 金币: ${user.credit}`);

  res.json(buildLoginResponse(user, numericUserId, token));
});

router.all([
  '/common/register', '/register', '/starry/common/register', '/starry/register'
], function (req, res) {
  const b = req.body || {};
  console.log("[Register-Payload] 客户端注册参数:", JSON.stringify(b));
  const queryAccount = b.phone || b.email || b.userName || `user_${Date.now().toString().slice(-4)}`;
  const uid = String(Math.floor(10000 + Math.random() * 89999));
  const parsedName = queryAccount.includes('@') ? queryAccount.split('@')[0] : queryAccount;

  const newUser = {
    userId: uid,
    userName: parsedName,
    nickName: parsedName,
    email: queryAccount.includes('@') ? queryAccount : `${parsedName}@celestialreverie.local`,
    phone: b.phone || '',
    sex: '0',
    avatar: '',
    credit: DEFAULT_CREDIT,
    virtualCredit: DEFAULT_CREDIT,
    mainStep: '1',
    suggestStyle: '',
    frameFlag: '1',
    gotChessFrame: 1,
    currentPresence: {
      actionGroup: 'Lookout',
      focus: 'AF',
      blockName: 'default',
      blockingPointName: 'ROOFTOP_METAL_RAILING_AREA_0',
      ghostWorldTime: now(),
      systemMessage: '蕾伊在等待你的归来。',
      outfit: 'MAID-WHITE-26',
      stageName: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0'
    },
    createdAt: now(),
    lastLoginTime: now()
  };
  store.users[uid] = newUser;
  saveUsersState();
  injectAccountGameData(uid);
  console.log(`[Register] 新用户注册成功并持久化: ${newUser.userName} (UID: ${uid})`);

  const token = genToken();
  const numericUserId = parseInt(uid, 10);
  store.sessions[token] = { userId: String(numericUserId), createdAt: Date.now() };
  res.json(buildLoginResponse(newUser, numericUserId, token));
});

router.all([
  '/common/sendEmailCode', '/starry/common/sendEmailCode',
  '/common/regSendEMailCode', '/starry/common/regSendEMailCode',
  '/common/sendSmsCode', '/starry/common/sendSmsCode',
  '/common/checkCode', '/starry/common/checkCode',
  '/common/checkSmsCode', '/starry/common/checkSmsCode',
  '/common/regCheckEMailCode', '/starry/common/regCheckEMailCode'
], function (req, res) {
  res.json({
    code: 200,
    msg: 'success',
    success: true,
    data: { success: true, verifyCode: '123456' }
  });
});

router.all(['/common/checkUserInfo', '/checkUserInfo', '/starry/common/checkUserInfo', '/starry/checkUserInfo'], authMiddleware, function (req, res) {
  const u = store.users[req.userId] || store.users[DEFAULT_UID] || Object.values(store.users)[0] || {};
  res.json(success(u));
});

router.all(['/sysUser/updateUserInfo', '/starry/sysUser/updateUserInfo'], authMiddleware, function (req, res) {
  const b = req.body || {};
  const userId = String(b.userId || req.userId || DEFAULT_UID);
  const user = store.users[userId] || store.users[DEFAULT_UID] || Object.values(store.users)[0];

  console.log(`[User-Update] 收到用户信息更新: userId=${userId}, paramsType=${b.paramsType}`);

  if (user) {
    if (b.nickName) user.nickName = b.nickName;
    if (b.mainStep) user.mainStep = b.mainStep;
    if (b.suggestStyle) user.suggestStyle = b.suggestStyle;
    if (b.frameFlag) {
      user.frameFlag = b.frameFlag;
      user.gotChessFrame = b.frameFlag === '1' || b.frameFlag === 1 ? 1 : 0;
      console.log(`[User-Update] 用户 ${userId} 更新相框标记: frameFlag=${b.frameFlag}`);
    }
    saveUsersState();
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      success: true,
      userId: userId
    }
  });
});

module.exports = { router, authMiddleware, loadUsersState, saveUsersState, injectAccountGameData, DEFAULT_UID };
