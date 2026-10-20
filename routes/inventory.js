const fs = require('fs');
const path = require('path');
const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
let INITIAL_ITEMS = [], INITIAL_MAILS = [];
try {
  const gd = require('../data/gameData');
  INITIAL_ITEMS = gd.INITIAL_ITEMS || [];
  INITIAL_MAILS = gd.INITIAL_MAILS || [];
} catch (e) {
  console.warn('[Inventory] gameData 模块未找到，使用默认空数据集');
}

const PERSIST_MAIL_FILE = path.join(__dirname, '../data/persisted_mail.json');
const PERSIST_INVENTORY_FILE = path.join(__dirname, '../data/persisted_inventory.json');

function loadMailState() {
  try {
    if (fs.existsSync(PERSIST_MAIL_FILE)) {
      const raw = fs.readFileSync(PERSIST_MAIL_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(uid => {
          if (Array.isArray(data[uid])) {
            store.mail[uid] = data[uid];
          }
        });
        console.log(`[Mail-Persist] 成功从本地加载邮件持久化状态 (${Object.keys(data).length} 个账号)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[Mail-Persist] 载入持久化邮件异常: ${err.message}`);
  }
  return false;
}

function saveMailState() {
  try {
    fs.writeFileSync(PERSIST_MAIL_FILE, JSON.stringify(store.mail, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Mail-Persist] 保存邮件持久化文件失败: ${err.message}`);
  }
}

function loadInventoryState() {
  try {
    if (fs.existsSync(PERSIST_INVENTORY_FILE)) {
      const raw = fs.readFileSync(PERSIST_INVENTORY_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data && typeof data === 'object') {
        Object.keys(data).forEach(uid => {
          if (Array.isArray(data[uid])) {
            store.inventories[uid] = data[uid];
          }
        });
        console.log(`[Inventory-Persist] 成功从本地加载背包持久化状态 (${Object.keys(data).length} 个账号)`);
        return true;
      }
    }
  } catch (err) {
    console.warn(`[Inventory-Persist] 载入持久化背包异常: ${err.message}`);
  }
  return false;
}

function saveInventoryState() {
  try {
    fs.writeFileSync(PERSIST_INVENTORY_FILE, JSON.stringify(store.inventories, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Inventory-Persist] 保存背包持久化文件失败: ${err.message}`);
  }
}

function resolveUid(userId) {
  return String(userId || process.env.DEFAULT_USER_ID || (store.users && Object.keys(store.users)[0]) || '10001');
}

loadMailState();
loadInventoryState();

function getUserInventory(userId) {
  const uid = resolveUid(userId);
  if (!store.inventories[uid] || !Array.isArray(store.inventories[uid])) {
    loadInventoryState();
  }
  if (!store.inventories[uid] || !Array.isArray(store.inventories[uid])) {
    store.inventories[uid] = JSON.parse(JSON.stringify(INITIAL_ITEMS));
    saveInventoryState();
  }
  return store.inventories[uid];
}

function getUserMails(userId) {
  const uid = resolveUid(userId);
  if (!store.mail[uid] || !Array.isArray(store.mail[uid]) || store.mail[uid].length === 0) {
    loadMailState();
  }
  if (!store.mail[uid] || !Array.isArray(store.mail[uid]) || store.mail[uid].length === 0) {
    store.mail[uid] = JSON.parse(JSON.stringify(INITIAL_MAILS));
    saveMailState();
  }
  return store.mail[uid];
}

router.all(['/inventory/getInventoryList', '/starry/inventory/getInventoryList'], function (req, res) {
  const userId = resolveUid(req.body?.userId || req.query?.userId);
  const itemType = req.body?.itemType || req.query?.itemType || '3';
  console.log(`[Inventory] 客户端获取背包道具: userId=${userId}, itemType=${itemType}`);

  const items = getUserInventory(userId);

  res.json({
    code: 200,
    msg: 'success',
    data: items
  });
});

router.all(['/inventory/getMailList', '/starry/inventory/getMailList'], function (req, res) {
  const userId = resolveUid(req.body?.userId || req.query?.userId);
  console.log(`[Mail] 客户端拉取邮件列表: userId=${userId}`);

  const mails = getUserMails(userId);
  res.json({
    code: 200,
    msg: 'success',
    data: mails
  });
});

router.all(['/inventory/claimMailAttach', '/starry/inventory/claimMailAttach'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  const mailId = parseInt(req.body?.mailId, 10);
  console.log(`[Mail] 用户 ${userId} 领取邮件附件: mailId=${mailId}`);

  const mails = getUserMails(userId);
  const targetMail = mails.find(m => m.mailId === mailId);
  if (targetMail) {
    targetMail.isClaim = 1;
    targetMail.isRead = 1;

    const inv = getUserInventory(userId);
    (targetMail.attach || []).forEach(att => {
      const exist = inv.find(it => it.itemId === att.itemId);
      if (exist) {
        exist.quantity = (exist.quantity || 1) + att.num;
      }
    });

    saveMailState();
    saveInventoryState();
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      mailId: mailId,
      isRead: 1,
      isClaim: 1
    }
  });
});

router.all(['/inventory/claimAllMailAttach', '/starry/inventory/claimAllMailAttach'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  console.log(`[Mail] 用户 ${userId} 一键领取全部邮件附件`);

  const mails = getUserMails(userId);
  const inv = getUserInventory(userId);
  const claimedMailIds = [];
  const rewards = [];

  mails.forEach(m => {
    if (m.isClaim === 0 && m.attach && m.attach.length > 0) {
      m.isClaim = 1;
      m.isRead = 1;
      claimedMailIds.push(m.mailId);
      m.attach.forEach(att => {
        rewards.push({ itemId: att.itemId, num: att.num });
        const exist = inv.find(it => it.itemId === att.itemId);
        if (exist) {
          exist.quantity = (exist.quantity || 1) + att.num;
        }
      });
    }
  });

  if (claimedMailIds.length > 0) {
    saveMailState();
    saveInventoryState();
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      claimCount: claimedMailIds.length,
      rewardList: rewards,
      mailIds: claimedMailIds
    }
  });
});

router.all(['/inventory/deleteMail', '/starry/inventory/deleteMail'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  const mailId = parseInt(req.body?.mailId, 10);
  console.log(`[Mail] 删除邮件: mailId=${mailId}`);

  if (store.mail[userId]) {
    store.mail[userId] = store.mail[userId].filter(m => m.mailId !== mailId);
    saveMailState();
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      mailId: mailId
    }
  });
});

router.all(['/inventory/deleteAllReadMail', '/starry/inventory/deleteAllReadMail'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  console.log(`[Mail] 一键删除已读邮件`);

  const mails = getUserMails(userId);
  const delIds = mails.filter(m => m.isRead === 1).map(m => m.mailId);
  store.mail[userId] = mails.filter(m => m.isRead === 0);
  saveMailState();

  res.json({
    code: 200,
    msg: 'success',
    data: {
      mailIds: delIds
    }
  });
});

router.all(['/inventory/markMailRead', '/starry/inventory/markMailRead'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  const mailId = parseInt(req.body?.mailId, 10);
  console.log(`[Mail] 标记邮件已读: mailId=${mailId}`);

  const mails = getUserMails(userId);
  const target = mails.find(m => m.mailId === mailId);
  if (target) {
    target.isRead = 1;
    saveMailState();
  }

  res.json({
    code: 200,
    msg: 'success',
    data: {
      mailIds: [mailId]
    }
  });
});

router.all(['/inventory/redeemGiftCode', '/starry/inventory/redeemGiftCode'], function (req, res) {
  const userId = resolveUid(req.body?.userId);
  const giftCode = req.body?.giftCode || 'STARLIGHT';
  console.log(`[Redeem] 用户 ${userId} 兑换礼品码: code=${giftCode}`);

  const inv = getUserInventory(userId);
  const target = inv.find(it => it.itemId === 20001);
  if (target) target.quantity = (target.quantity || 1) + 5;
  saveInventoryState();

  res.json({
    code: 200,
    msg: '兑换成功！已获得星夜专属补给。',
    data: {
      success: true,
      rewardList: [
        { itemId: 20001, itemName: '消耗型嘴替芯片', num: 5 }
      ]
    }
  });
});

router.all(['/inventory/useItem', '/starry/inventory/useItem'], function (req, res) {
  const b = req.body || {};
  const userId = resolveUid(b.userId || req.query?.userId);
  const itemId = parseInt(b.itemId, 10);
  const inventoryId = parseInt(b.inventoryId || b.itemId, 10);
  const goodsId = parseInt(b.goodsId || 0, 10);
  const useNum = parseInt(b.useNum || 1, 10);

  console.log(`[Inventory-Use] 收到道具使用请求: userId=${userId}, itemId=${itemId}, useNum=${useNum}`);

  const user = store.users[userId] || (store.users ? Object.values(store.users)[0] : null);
  const inv = getUserInventory(userId);
  const targetItem = inv.find(it => it.itemId === itemId);

  let expireSecond = 0;
  let newOutfit = null;

  if (itemId === 31001) {

    const { dispatchCharacterAction, setPreferredOutfit, getPreferredOutfit, OUTFITS, isBlockingAction } = require('../services/characterDirector');
    const currentOutfit = getPreferredOutfit();

    newOutfit = (currentOutfit === OUTFITS.MAID) ? OUTFITS.DEFAULT : OUTFITS.MAID;
    setPreferredOutfit(newOutfit);

    Object.values(store.users).forEach(u => {
      if (!u.currentPresence) u.currentPresence = {};
      u.currentPresence.outfit = newOutfit;
    });

    if (user) {
      if (!user.currentPresence) user.currentPresence = {};
      user.currentPresence.outfit = newOutfit;
      const outfitDesc = newOutfit === OUTFITS.MAID ? '女仆装 (MAID-WHITE-26)' : '默认常服 (CIVILIAN-UNIFORM-CAPTAIN-25)';
      console.log(`[Inventory-Use] 用户 ${userId} 切换服装成功: ${outfitDesc}`);

      const curAction = user.currentPresence.actionGroup || 'Lookout';
      const targetAction = isBlockingAction(curAction) ? 'Lookout' : curAction;
      dispatchCharacterAction(targetAction, newOutfit);
    }

    if (targetItem) {
      targetItem.quantity = Math.max(1, targetItem.quantity || 1);
    }
  } else if (itemId === 30201 || itemId === 30202) {

    if (itemId === 30202 && user) {
      user.gotChessFrame = 1;
    }
    if (targetItem) {
      targetItem.quantity = Math.max(1, targetItem.quantity || 1);
    }
    console.log(`[Inventory-Use] 用户 ${userId} 成功使用相框道具: ${itemId}`);
  } else if (itemId === 30001) {

    if (targetItem) {
      targetItem.quantity = Math.max(1, targetItem.quantity || 1);
    }
    console.log(`[Inventory-Use] 用户 ${userId} 成功查阅女仆装档案: ${itemId}`);
  } else if (itemId === 20001) {

    expireSecond = 7200;
    if (targetItem && targetItem.quantity > 0) {
      targetItem.quantity = Math.max(0, targetItem.quantity - useNum);
    }
    console.log(`[Inventory-Use] 用户 ${userId} 使用嘴替芯片，获得 7200 秒辅助能力`);
  } else {

    if (targetItem) {
      if (targetItem.itemType === 'Consumable') {
        targetItem.quantity = Math.max(0, (targetItem.quantity || 1) - useNum);
      } else {
        targetItem.quantity = Math.max(1, targetItem.quantity || 1);
      }
    }
  }

  saveInventoryState();

  res.json({
    code: 200,
    msg: 'success',
    data: {
      inventoryId: inventoryId || itemId,
      itemId: itemId,
      goodsId: goodsId,
      useStatus: true,
      expireSecond: expireSecond
    }
  });
});

module.exports = router;
module.exports.loadMailState = loadMailState;
module.exports.saveMailState = saveMailState;
module.exports.getUserMails = getUserMails;
module.exports.loadInventoryState = loadInventoryState;
module.exports.saveInventoryState = saveInventoryState;
module.exports.getUserInventory = getUserInventory;
