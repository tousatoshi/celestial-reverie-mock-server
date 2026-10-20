const { now } = require('../data/store');

function success(data, msg) {
  const m = msg || 'ok';
  return {
    code: 0,
    status: 200,
    success: true,
    data: data,
    result: data,
    msg: m,
    message: m
  };
}

function error(code, msg) {
  const m = msg || 'error';
  return {
    code: code || 500,
    status: code || 500,
    success: false,
    data: null,
    result: null,
    msg: m,
    message: m
  };
}

function buildPreLoginResponse() {
  return success({
    serverTime: now(),
    version: '1.0.1',
    buildId: 'b5543058caec4829b240db4eacf5a014',
    features: { chat: true, voice: true, ghost: true, task: true, shop: true },
    maintenance: false
  });
}

function buildLoginResponse(user, numericUserId, token) {
  const { getVirtualWorldTime, getPreferredOutfit } = require('../services/characterDirector');
  const presenceSource = user.currentPresence || {};
  const currentOutfit = presenceSource.outfit || getPreferredOutfit() || 'MAID-WHITE-26';
  const worldTime = getVirtualWorldTime();
  const currentAction = presenceSource.actionGroup || 'Lookout';
  const currentPoint = presenceSource.blockingPointName || 'ROOFTOP_METAL_RAILING_AREA_0';

  const currentPresence = {
    actionGroup: currentAction,
    focus: presenceSource.focus || 'AF',
    blockName: presenceSource.blockName || 'default',
    blockingPointName: currentPoint,
    ghostWorldTime: worldTime,
    systemMessage: presenceSource.systemMessage || '蕾伊在等待你的归来。',
    outfit: currentOutfit,
    stageName: presenceSource.stageName || 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0'
  };

  const activityPayload = {
    current_time: worldTime,
    now: {
      activity: { experience: '', focus: 'AF' },
      block: {
        experience: '',
        name: 'default',
        stage_name: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0',
        action_group: currentAction
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
        block: {
          name: 'default',
          blockName: 'default',
          action_group: currentAction,
          activity: { focus: 'AF', style: 'normal' },
          location: {
            stage_name: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0',
            blocking_point_name: currentPoint
          },
          outfit: currentOutfit
        },
        block_data: {
          name: 'default',
          blockName: 'default',
          action_group: currentAction,
          activity: { focus: 'AF', style: 'normal' },
          location: {
            stage_name: 'DREAMCORE_ASIA_SCHMOOL_ROOTOP_0',
            blocking_point_name: currentPoint
          },
          outfit: currentOutfit
        }
      }
    },
    extra_info: {
      next: {
        activity: { focus: 'AF', owner_block_name: 'default', style: 'normal' },
        block: { name: 'default', scheduled_start_time: worldTime }
      }
    }
  };

  return success({
    userId: numericUserId,
    userName: user.userName,
    nickName: user.nickName,
    email: user.email || '',
    phone: user.phone || '',
    sex: user.sex || '0',
    avatar: user.avatar || '',
    suggestStyle: user.suggestStyle || '',
    context: '',
    relation: 100.0,
    temper: 100.0,
    energy: 100.0,
    token: token,
    suggestExpireSecond: 86400,
    frameFlag: user.frameFlag || '',
    virtualCredit: String(user.virtualCredit || user.credit || process.env.DEFAULT_CREDIT || '10000'),
    credit: String(user.credit || user.virtualCredit || process.env.DEFAULT_CREDIT || '10000'),
    throughFlag: '0',
    mainStep: user.mainStep || '1',
    activeStatus: true,
    queueNum: 0,
    userIndex: 1,
    initialRank: 1,
    confirmStatus: true,
    firstFlag: false,
    emailFlag: true,
    activity: activityPayload,
    currentPresence: currentPresence
  });
}

function buildServerInfoResponse() {
  return success({
    serverTime: now(),
    onlineCount: 1,
    maxOnline: 100,
    serverStatus: 'normal',
    maintenance: false,
    version: '1.0.1',
    capacityPercent: 0,
    inQueue: false,
    confirmed: true,
    canEnter: true,
    position: 0,
    waitTime: 0,
    features: { chat: true, voice: true, ghost: true, task: true, shop: true, wps: true }
  });
}

module.exports = {
  success,
  error,
  buildPreLoginResponse,
  buildLoginResponse,
  buildServerInfoResponse
};
