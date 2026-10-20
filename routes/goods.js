const express = require('express');
const router = express.Router();
const { store } = require('../data/store');
let INITIAL_SHOP_GOODS = [], INITIAL_ITEMS = [];
try {
  const gd = require('../data/gameData');
  INITIAL_SHOP_GOODS = gd.INITIAL_SHOP_GOODS || [];
  INITIAL_ITEMS = gd.INITIAL_ITEMS || [];
} catch (e) {
  console.warn('[Goods] gameData 模块未找到，使用空商城配置');
}

if (!store.goods || !store.goods.rows) {
  store.goods = {
    rows: JSON.parse(JSON.stringify(INITIAL_SHOP_GOODS))
  };
}

router.all(['/goods/getGoodsList', '/starry/goods/getGoodsList'], function (req, res) {
  console.log('[Shop] 客户端请求商品列表: ', req.body || req.query);
  res.json({
    code: 200,
    msg: 'success',
    data: {
      rows: store.goods.rows
    }
  });
});

router.all(['/goods/buyGoods', '/starry/goods/buyGoods'], function (req, res) {
  const body = req.body || {};
  const userId = body.userId || 10070;
  const goodsId = parseInt(body.goodsId, 10);
  const itemId = parseInt(body.itemId, 10);
  const goodsNum = parseInt(body.goodsNum, 10) || 1;

  console.log(`[Shop] 用户 ${userId} 购买商品: goodsId=${goodsId}, itemId=${itemId}, count=${goodsNum}`);

  if (!store.inventories[userId] || !Array.isArray(store.inventories[userId])) {
    store.inventories[userId] = JSON.parse(JSON.stringify(INITIAL_ITEMS));
  }

  const targetItem = store.inventories[userId].find(it => it.itemId === itemId);
  if (targetItem) {
    targetItem.quantity = (targetItem.quantity || 1) + goodsNum;
  } else {

    const baseItem = INITIAL_ITEMS.find(it => it.itemId === itemId) || {
      inventoryId: itemId,
      itemId: itemId,
      goodsId: goodsId,
      itemName: '购买道具',
      itemDesc: '从商城购买所得',
      itemType: itemId < 30000 ? 'Consumable' : 'Keep',
      itemIcon: 'icon_packProxy',
      iconBig: 'icon_packProxy',
      expireType: '0',
      expireTime: '0',
      quality: 4,
      canUse: itemId < 30000 ? '1' : '0',
      canSell: '0',
      sellCurrencyId: 0,
      sellPrice: '0',
      quantity: goodsNum,
      extAtt: ''
    };
    store.inventories[userId].push(Object.assign({}, baseItem, { quantity: goodsNum }));
  }

  res.json({
    code: 200,
    data: 1,
    msg: '购买成功'
  });
});

module.exports = router;
