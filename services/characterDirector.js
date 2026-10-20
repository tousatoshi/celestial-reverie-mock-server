const { store, now } = require('../data/store');

const ACTIONS = {
  Lookout: {
    id: 'Lookout',
    name: '天台栏杆远眺',
    blockingPoint: 'ROOFTOP_METAL_RAILING_AREA_0',
    description: '走向天台铁栏杆处，极目远眺城市风景',
    keywords: ['吹风', '看风景', '风景', '栏杆', '远眺', '眺望', '看远方', '外面', '发呆', '散步', '走走']
  },
  Book: {
    id: 'Book',
    name: '简易书架阅读',
    blockingPoint: 'ROOFTOP_SIMPLE_BOOKSHELF_AREA_0',
    description: '走向简易书架，抽取书籍阅读',
    keywords: ['看书', '读书', '书架', '小说', '阅读', '查阅', '文献', '学习']
  },
  Computer: {
    id: 'Computer',
    name: '电脑桌操作',
    blockingPoint: 'ROOFTOP_COMPUTER_TABLE_AREA_0',
    description: '走到室内电脑桌前，坐下敲击键盘与屏幕交互',
    keywords: ['电脑', '上网', '写代码', '查资料', '工作', '查信息', '屏幕', '打字']
  },
  Fish: {
    id: 'Fish',
    name: '观赏小鱼缸',
    blockingPoint: 'ROOFTOP_SMALL_FISHTANK_AREA_0',
    description: '走到小型生态鱼缸前，静静看鱼',
    keywords: ['看鱼', '喂鱼', '鱼缸', '小鱼', '金鱼', '游来游去']
  },
  Tea: {
    id: 'Tea',
    name: '圆桌品茶吃点心',
    blockingPoint: 'ROOFTOP_ROUND_TEA_TABLE_AREA_0',
    description: '走到圆桌茶几前，坐下品茶并吃茶点',
    keywords: ['喝茶', '品茶', '吃点心', '下午茶', '茶几', '点心', '红茶', '绿茶']
  },
  Write: {
    id: 'Write',
    name: '单人沙发写日记',
    blockingPoint: 'ROOFTOP_SINGLE_SOFA_AREA_0',
    description: '坐到单人沙发上，在膝上写日记或草图',
    keywords: ['沙发', '写日记', '记笔记', '画画', '草图', '坐沙发']
  },
  Rest: {
    id: 'Rest',
    name: '躺椅小憩',
    blockingPoint: 'ROOFTOP_SUNBED_AREA_0',
    description: '走到天台躺椅/太阳床处，悠闲躺下休息',
    keywords: ['躺椅', '晒太阳', '躺下', '小憩', '懒洋洋', '晒晒太阳', '歇会儿']
  },
  Drink: {
    id: 'Drink',
    name: '冲泡咖啡',
    blockingPoint: 'ROOFTOP_SIMPLE_COFFEE_AREA_0',
    description: '走到简易咖啡机前冲泡热咖啡',
    keywords: ['咖啡', '冲咖啡', '泡咖啡', '喝咖啡', '热饮', '热咖啡']
  },
  Run: {
    id: 'Run',
    name: '跑步机锻炼',
    blockingPoint: 'ROOFTOP_TREADMILL_GYM_AREA_0',
    description: '走到天台健身区，在跑步机上锻炼慢跑',
    keywords: ['跑步', '锻炼', '健身', '运动', '慢跑', '跑步机']
  },
  Cook: {
    id: 'Cook',
    name: '简易灶台烹饪',
    blockingPoint: 'ROOFTOP_SIMPLE_COOK_AREA_0',
    description: '走到简易厨灶前下厨做饭',
    keywords: ['做饭', '下厨', '做菜', '做吃的', '烹饪', '煮面', '做点吃的']
  },
  EatBento: {
    id: 'EatBento',
    name: '长椅吃便当',
    blockingPoint: 'ROOFTOP_EDGE_BENCH_AREA_0',
    description: '坐在天台长椅上享用便当',
    keywords: ['便当', '吃便当', '长椅', '午饭']
  },
  EatOnigiri: {
    id: 'EatOnigiri',
    name: '长椅吃饭团',
    blockingPoint: 'ROOFTOP_EDGE_BENCH_AREA_0',
    description: '坐在天台长椅上享用手作饭团',
    keywords: ['饭团', '吃饭团']
  },
  Sleep: {
    id: 'Sleep',
    name: '卧室门前睡眠',
    blockingPoint: 'ROOFTOP_SINGLE_BEDROOM_FRONT_AREA_0',
    description: '走向卧室区域休息睡觉',
    keywords: ['睡觉', '睡了', '晚安', '困了', '回屋睡', '去睡']
  },
  Toilet: {
    id: 'Toilet',
    name: '单人洗手间',
    blockingPoint: 'ROOFTOP_SINGLE_TOILET_AREA_0',
    description: '走进单人洗手间区域',
    keywords: ['洗手间', '厕所', '卫生间', '去趟厕所', '去洗手间', '上厕所', '便便', '去下洗手间']
  },
  Shower: {
    id: 'Shower',
    name: '淋浴室洗澡',
    blockingPoint: 'ROOFTOP_SINGLE_SHOWER_AREA_0',
    description: '走进天台单人淋浴室洗浴',
    keywords: ['洗澡', '淋浴', '冲凉', '冲个澡', '洗个澡', '浴室', '淋浴室', '冲水']
  },
  Eat: {
    id: 'Eat',
    name: '天台边缘吃面包喝咖啡',
    blockingPoint: 'ROOFTOP_EDGE_AREA_0',
    description: '坐在天台边吃面包喝咖啡（夜间默认动作）',
    keywords: ['吃面包', '天台边', '天台边缘']
  }
};

const fs = require('fs');
const path = require('path');
const PERSIST_FILE = path.join(__dirname, '..', 'data', 'persisted_director.json');

const OUTFITS = {
  DEFAULT: 'CIVILIAN-UNIFORM-CAPTAIN-25',
  MAID: 'MAID-WHITE-26'
};

let preferredOutfit = OUTFITS.MAID;

let isVirtualDayMode = true;

let currentActionId = 'Lookout';

function recognizeOutfitIntent(text) {
  if (!text || typeof text !== 'string') return null;
  const t = text.trim();

  if (/换.*(常服|原本|默认|原来|日常)|穿.*(常服|日常服|原本的衣服)|脱.*女仆|换下女仆/i.test(t)) {
    return OUTFITS.DEFAULT;
  }

  if (/换.*女仆|穿.*女仆|女仆装/i.test(t)) {
    return OUTFITS.MAID;
  }
  return null;
}

function toggleOutfit() {
  const nextOutfit = (preferredOutfit === OUTFITS.MAID) ? OUTFITS.DEFAULT : OUTFITS.MAID;
  preferredOutfit = nextOutfit;
  saveDirectorState();

  dispatchCharacterAction(currentActionId, nextOutfit);
  return nextOutfit;
}

(function loadDirectorState() {
  try {
    if (fs.existsSync(PERSIST_FILE)) {
      const raw = fs.readFileSync(PERSIST_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (data.preferredOutfit) preferredOutfit = data.preferredOutfit;
      if (typeof data.isVirtualDayMode === 'boolean') isVirtualDayMode = data.isVirtualDayMode;
      if (data.currentActionId && ACTIONS[data.currentActionId]) currentActionId = data.currentActionId;
      console.log(`[Director-Persist] 成功载入持久化状态: 服装=${preferredOutfit}, 白昼模式=${isVirtualDayMode}, 动作=${currentActionId}`);
    }
  } catch (err) {
    console.warn(`[Director-Persist] 载入持久化状态失败，使用默认配置: ${err.message}`);
  }
})();

function saveDirectorState() {
  try {
    const data = {
      preferredOutfit,
      isVirtualDayMode,
      currentActionId,
      updatedAt: new Date().toISOString()
    };
    fs.writeFileSync(PERSIST_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.warn(`[Director-Persist] 保存持久化状态失败: ${err.message}`);
  }
}

function getVirtualWorldTime() {
  const d = new Date();
  if (isVirtualDayMode) {

    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hh = '14';
    const mm = String(d.getMinutes()).padStart(2, '0');
    const ss = String(d.getSeconds()).padStart(2, '0');
    return `${y}-${m}-${day} ${hh}:${mm}:${ss}`;
  }
  return d.toISOString().replace('T', ' ').slice(0, 19);
}

function recognizeActionIntent(text) {
  if (!text || typeof text !== 'string') return null;

  const tagMatch = text.match(/<action:([a-zA-Z]+)>/i);
  if (tagMatch && ACTIONS[tagMatch[1]]) {
    return ACTIONS[tagMatch[1]];
  }

  for (const key of Object.keys(ACTIONS)) {
    const act = ACTIONS[key];
    for (const kw of act.keywords) {
      if (text.includes(kw)) {
        return act;
      }
    }
  }

  return null;
}

function buildGhostActivityPayload(actionKey, customOutfit) {
  const targetAction = ACTIONS[actionKey] || ACTIONS[currentActionId] || ACTIONS.Lookout;
  const currentOutfit = customOutfit || preferredOutfit || 'MAID-WHITE-26';
  const worldTime = getVirtualWorldTime();

  const blockData = {
    name: 'default',
    blockName: 'default',
    action_group: targetAction.id,
    activity: { focus: 'AF', style: 'normal' },
    location: {
      stage_name: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0',
      blocking_point_name: targetAction.blockingPoint
    },
    outfit: currentOutfit
  };

  return {
    current_time: worldTime,
    render_display_message: '蕾伊正在调整动作与服装。',
    now: {
      activity: { experience: '', focus: 'AF' },
      block: {
        experience: '',
        name: 'default',
        stage_name: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0',
        action_group: targetAction.id
      }
    },
    weather: { ghost_weather_experience: 'clear' },
    welcome_context: ['蕾伊在等待你的归来。'],
    current_presence: {
      ghost_world_time: worldTime,
      ghost_world_presence: {
        weather: { ghost_weather_experience: 'clear' }
      },
      ghost_presence: {
        block: blockData,
        block_data: blockData
      }
    },
    extra_info: {
      next: {
        activity: { focus: 'AF', owner_block_name: 'default', style: 'normal' },
        block: { name: 'default', scheduled_start_time: worldTime }
      }
    }
  };
}

const BLOCKING_ACTIONS = new Set(['Toilet', 'Shower', 'Sleep']);

const ACTION_TIMEOUTS = {
  Toilet: 90 * 1000,
  Shower: 150 * 1000,
  Sleep: 180 * 1000
};

let autoExitTimer = null;

function clearAutoExitTimer() {
  if (autoExitTimer) {
    clearTimeout(autoExitTimer);
    autoExitTimer = null;
  }
}

function isBlockingAction(actionId) {
  return BLOCKING_ACTIONS.has(actionId);
}

function interruptBlockingAction(fallbackAction = 'Lookout', customOutfit) {
  clearAutoExitTimer();
  if (BLOCKING_ACTIONS.has(currentActionId)) {
    console.log(`[Action-Director] 打断当前阻塞行为 [${currentActionId}] -> 引导蕾伊前往 [${fallbackAction}]`);
    return dispatchCharacterAction(fallbackAction, customOutfit);
  } else if (customOutfit) {
    return dispatchCharacterAction(currentActionId, customOutfit);
  }
  return null;
}

function dispatchCharacterAction(actionKey, customOutfit) {
  clearAutoExitTimer();

  const act = ACTIONS[actionKey] || ACTIONS.Lookout;
  currentActionId = act.id;
  if (customOutfit) {
    preferredOutfit = customOutfit;
  }
  saveDirectorState();

  if (BLOCKING_ACTIONS.has(act.id) && ACTION_TIMEOUTS[act.id]) {
    const timeoutMs = ACTION_TIMEOUTS[act.id];
    console.log(`[Action-Director] 动作 [${act.id}] 具有锁定属性，已设置 ${timeoutMs / 1000}s 自动脱离倒计时`);
    autoExitTimer = setTimeout(() => {
      console.log(`[Action-Director] 动作 [${act.id}] 超时到达，自动引导蕾伊脱离设施前往天台远眺`);
      dispatchCharacterAction('Lookout');
    }, timeoutMs);
  }

  const payload = buildGhostActivityPayload(act.id, preferredOutfit);

  Object.values(store.users).forEach(u => {
    if (!u.currentPresence) u.currentPresence = {};
    u.currentPresence.actionGroup = act.id;
    u.currentPresence.blockingPointName = act.blockingPoint;
    u.currentPresence.outfit = preferredOutfit;
    u.currentPresence.ghostWorldTime = payload.current_time;
  });

  const packet = {
    resultType: 'activity',
    data: {
      current: payload.current_presence,
      render_display_message: '蕾伊已前往新互动设施'
    },
    requestId: 1,
    index: 0
  };

  const rawJson = JSON.stringify(packet);
  let sendCount = 0;
  store.activeWsSockets.forEach(ws => {
    try {
      if (ws.readyState === 1) {
        ws.send(rawJson);
        sendCount++;
      }
    } catch (e) { }
  });

  console.log(`[Action-Director] 调度蕾伊动作: [${act.id}] (${act.name}) | 锚点: ${act.blockingPoint} | 服装: ${preferredOutfit} | 广播客户端数: ${sendCount}`);
  return act;
}

module.exports = {
  ACTIONS,
  OUTFITS,
  preferredOutfit,
  setPreferredOutfit: (o) => {
    preferredOutfit = o;
    saveDirectorState();
  },
  getPreferredOutfit: () => preferredOutfit,
  toggleOutfit,
  recognizeOutfitIntent,
  setVirtualDayMode: (v) => {
    isVirtualDayMode = !!v;
    saveDirectorState();
  },
  getVirtualDayMode: () => isVirtualDayMode,
  isVirtualDayMode: () => isVirtualDayMode,
  getCurrentActionId: () => currentActionId,
  setCurrentActionId: (a) => {
    currentActionId = a;
    saveDirectorState();
  },
  getVirtualWorldTime,
  recognizeActionIntent,
  buildGhostActivityPayload,
  dispatchCharacterAction,
  isBlockingAction,
  interruptBlockingAction,
  clearAutoExitTimer
};
