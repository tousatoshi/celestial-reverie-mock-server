const fs = require('fs');
const path = require('path');
const axios = require('axios');

function getOrLoadSystemPrompt() {
  const promptFile = path.join(__dirname, '..', 'prompts', 'rei.prompt.js');
  const exampleFile = path.join(__dirname, '..', 'prompts', 'rei.prompt.example.js');

  if (!fs.existsSync(promptFile)) {
    console.log('[Prompt-Loader] 未检测到自定义 prompts/rei.prompt.js，正在自动从模板克隆 rei.prompt.example.js...');
    try {
      if (fs.existsSync(exampleFile)) {
        fs.copyFileSync(exampleFile, promptFile);
        console.log('[Prompt-Loader] 克隆完成！已生成 prompts/rei.prompt.js，可自由修改自定义人设。');
      } else {
        console.warn('[Prompt-Loader] 模板文件 prompts/rei.prompt.example.js 不存在，跳过克隆。');
      }
    } catch (e) {
      console.warn(`[Prompt-Loader] 自动克隆模板失败: ${e.message}`);
    }
  }

  try {
    if (fs.existsSync(promptFile)) {
      delete require.cache[require.resolve(promptFile)];
      const { buildReiSystemPrompt } = require(promptFile);
      return buildReiSystemPrompt();
    }
  } catch (e) {
    console.warn(`[Prompt-Loader] 加载 rei.prompt.js 失败: ${e.message}，尝试回退加载 example 模板...`);
  }

  try {
    delete require.cache[require.resolve(exampleFile)];
    const { buildReiSystemPrompt } = require(exampleFile);
    return buildReiSystemPrompt();
  } catch (e) {
    console.error(`[Prompt-Loader] 加载 example 模板也失败: ${e.message}`);
    return "你是蕾伊（Rei），一位来自未来的18岁傲娇少女，陪伴在用户的天台上。请始终用纯口语对话回应。";
  }
}

const REPLY_TOOL = {
  type: "function",
  function: {
    name: "generate_reply",
    description: "生成女主角蕾伊在天台陪伴调查员时的对白与行动。必须且仅调用本工具输出对白与动作指令，严禁包含任何内部思考、分析或草稿。",
    parameters: {
      type: "object",
      properties: {
        replies: {
          type: "array",
          description: "蕾伊对调查员说的话。支持输出 1~3 句自然连贯的中文对白，可逐步推进情绪或表达完整意思。每一句控制在10到35字以内，纯口语对白。",
          items: {
            type: "object",
            properties: {
              dialogue: {
                type: "string",
                description: "纯粹的角色对白内容，用亲切、生活化的中文，绝对不包含任何括号、动作描写或思考"
              },
              expression: {
                type: "string",
                description: "角色的面部表情，官方全量情绪状态：Smile/Happy(开心悦), Normal(平静默认), Shy(害羞脸红), Sweat(流汗尴尬), Angry(炸毛生气), Sad(失落沉重), Confused(疑惑), Think(思考), Relaxed(轻松), Proud(傲然), Cold(冷漠)",
                enum: [
                  "Smile", "Happy", "Normal", "Shy", "Sweat", "Angry", "Sad",
                  "Confused", "Think", "Relaxed", "Proud", "Cold"
                ]
              }
            },
            required: ["dialogue"]
          }
        },
        action: {
          type: "string",
          description: "蕾伊要前往的天台设施或动作（官方16组行为组，仅需在顶层指定一次）。可选值：Lookout(栏杆看风景), Book(书架看书), Computer(玩电脑), Fish(看小鱼), Tea(喝茶吃点心), Write(沙发写日记), Rest(躺椅休息), Drink(冲咖啡), Toilet(洗手间), Shower(淋浴洗澡), Sleep(卧室睡觉), Run(跑步锻炼), EatBento(长椅吃便当), EatOnigiri(长椅吃饭团), Cook(做饭烹饪), Eat(天台边吃面包喝咖啡)。无特殊移动意图可留空。",
          enum: [
            "Lookout", "Book", "Computer", "Fish", "Tea", "Write", "Rest", "Drink",
            "Toilet", "Shower", "Sleep", "Run", "EatBento", "EatOnigiri", "Cook", "Eat", ""
          ]
        },
        outfit: {
          type: "string",
          description: "若调查员提出换装请求或你配合换装，可选填服装（仅需在顶层指定一次）。可选值：default(换回默认舰长常服), maid(换上女仆装), 或留空保持当前服装。",
          enum: ["default", "maid", ""]
        }
      },
      required: ["replies"]
    }
  }
};

function tryParseJson(str) {
  if (typeof str !== 'string') return str;
  try {
    return JSON.parse(str);
  } catch (e) {
    const match = str.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch (err) { }
    }
    return null;
  }
}

function stripThinkingContent(rawText) {
  if (!rawText) return "";
  let text = rawText;

  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');

  text = text.replace(/^(?:We need to respond|Let's think|Thinking Process|Let's craft|I will respond)[\s\S]*?(?:Let's craft:|Response:|：|:|"|“)/i, '');

  const quoteMatch = text.match(/["“]([\u4e00-\u9fa5\s，。！？、~～]+)["”]/);
  if (quoteMatch && quoteMatch[1] && quoteMatch[1].trim().length >= 5) {
    return quoteMatch[1].trim();
  }

  text = text.replace(/Count characters:[\s\S]*$/i, '');

  const lines = text.split('\n').filter(l => /[\u4e00-\u9fa5]/.test(l));
  const cleaned = lines.join(' ').replace(/["'“”]/g, '').trim();
  return cleaned || rawText.trim();
}

function getOfflineFallbackReply() {
  const fallbacks = [
    "今天的风吹得很舒服呢。不管发生什么，我都会一直在天台这里陪着你的，放心吧。",
    "刚才稍微走神了一下……你在想什么呢？要不要一起看一会儿远处的天空？",
    "天台的阳光正好，面包的味道也很香。能这样静静地听你说话，感觉很安心。",
    "无论世界线如何变动，阿列夫锚点都会把我们连接在一起。今天也要开心哦！",
    "听到了哦！有你在身边的时光，即使什么都不做，也是最特别的。"
  ];
  const chosen = fallbacks[Math.floor(Math.random() * fallbacks.length)];
  return { replies: [{ dialogue: chosen, expression: "Smile" }], action: null, outfit: null };
}

function resolveChatCompletionsUrl(baseUrl) {
  const cleanBase = (baseUrl || 'https://api.openai.com/v1').trim().replace(/\/+$/, '');
  if (cleanBase.endsWith('/chat/completions')) {
    return cleanBase;
  }
  return `${cleanBase}/chat/completions`;
}

function loadPrivateModelConfig() {
  const configPath = path.join(__dirname, '..', 'model-config.ts');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  try {
    const raw = fs.readFileSync(configPath, 'utf8');
    const regex = /\{\s*model\s*:\s*["']([^"']+)["']\s*,\s*apiKeyEnv\s*:\s*["']([^"']+)["'](?:\s*,\s*timeout\s*:\s*(\d+))?\s*\}/g;
    const list = [];
    let match;
    while ((match = regex.exec(raw)) !== null) {
      list.push({
        model: match[1],
        apiKeyEnv: match[2],
        timeout: match[3] ? parseInt(match[3], 10) : 15000
      });
    }
    return list.length > 0 ? list : null;
  } catch (e) {
    return null;
  }
}

function parseRepliesFromMessage(msg) {

  if (msg?.tool_calls && msg.tool_calls.length > 0) {
    const tc = msg.tool_calls[0];
    const parsedArgs = tryParseJson(tc.function?.arguments);
    if (parsedArgs?.replies && Array.isArray(parsedArgs.replies) && parsedArgs.replies.length > 0) {
      const replies = parsedArgs.replies.map(r => ({
        dialogue: stripThinkingContent(r.dialogue || ""),
        expression: r.expression || "Smile"
      })).filter(r => r.dialogue.length > 0);

      if (replies.length > 0) {
        let action = parsedArgs.action || null;
        let outfit = parsedArgs.outfit || null;
        if (!action) {
          const lastItem = parsedArgs.replies[parsedArgs.replies.length - 1];
          if (lastItem?.action) action = lastItem.action;
        }
        if (!outfit) {
          const lastItem = parsedArgs.replies[parsedArgs.replies.length - 1];
          if (lastItem?.outfit) outfit = lastItem.outfit;
        }
        return { replies, action, outfit };
      }
    }
  }

  const content = msg?.content;
  if (content && content.trim()) {
    const cleanedDialogue = stripThinkingContent(content);
    if (cleanedDialogue.length > 0) {
      return { replies: [{ dialogue: cleanedDialogue, expression: "Smile" }], action: null, outfit: null };
    }
  }

  return null;
}

async function executeFailoverLLM(privateModels, requestMessages) {
  const newApiBaseUrl = (process.env.NEWAPI_API_URL || 'https://gcp-vm.visuforge.top/v1').replace(/\/+$/, '');
  const newApiEndpoint = newApiBaseUrl + '/chat/completions';

  function getNewApiKey(envName) {
    return process.env[envName] || process.env.NEWAPI_API_KEY || process.env.NEWAPI_FREE_KEY || process.env.NEWAPI_PAID_KEY;
  }

  for (let i = 0; i < privateModels.length; i++) {
    const item = privateModels[i];
    const apiKey = getNewApiKey(item.apiKeyEnv);
    if (!apiKey) continue;

    console.log(`[LLM-NewAPI] 尝试请求模型 [${i + 1}/${privateModels.length}]: ${item.model}`);
    const startTime = Date.now();
    try {
      const resp = await axios.post(newApiEndpoint, {
        model: item.model,
        messages: requestMessages,
        tools: [REPLY_TOOL],
        tool_choice: { type: "function", function: { name: "generate_reply" } },
        temperature: 0.8,
        max_tokens: 450
      }, {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: item.timeout || 15000
      });

      const parsed = parseRepliesFromMessage(resp.data?.choices?.[0]?.message);
      if (parsed) {
        const dur = Date.now() - startTime;
        console.log(`[LLM-NewAPI] 模型 [${item.model}] 成功响应 (耗时: ${dur}ms), 首句: "${parsed.replies[0].dialogue}"`);
        return parsed;
      }
    } catch (e) {
      const dur = Date.now() - startTime;
      const status = e.response ? e.response.status : (e.code || 'TIMEOUT_OR_NET_ERR');
      const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
      console.warn(`[LLM-Fallback] 模型 [${item.model}] 调用异常 [${status}] (${dur}ms): ${detail}，触发故障转移...`);
    }
  }

  console.log("[LLM] 全部网关模型遍历失败，使用离线自愈语料兜底");
  return getOfflineFallbackReply();
}

async function executeSingleModelLLM(requestMessages) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return getOfflineFallbackReply();
  }

  const endpoint = resolveChatCompletionsUrl(process.env.OPENAI_API_BASE);
  const model = process.env.OPENAI_MODEL || 'gpt-4o-mini';

  console.log(`[LLM] 发起模型请求: ${model} (${endpoint})`);
  const startTime = Date.now();
  try {
    const resp = await axios.post(endpoint, {
      model: model,
      messages: requestMessages,
      tools: [REPLY_TOOL],
      tool_choice: { type: "function", function: { name: "generate_reply" } },
      temperature: 0.8,
      max_tokens: 450
    }, {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    const parsed = parseRepliesFromMessage(resp.data?.choices?.[0]?.message);
    if (parsed) {
      const dur = Date.now() - startTime;
      console.log(`[LLM] 模型 [${model}] 成功生成 ${parsed.replies.length} 条对白 (耗时: ${dur}ms), 首句: "${parsed.replies[0].dialogue}"`);
      return parsed;
    }
  } catch (e) {
    const dur = Date.now() - startTime;
    const status = e.response ? e.response.status : (e.code || 'TIMEOUT_OR_NET_ERR');
    const detail = e.response?.data ? JSON.stringify(e.response.data) : e.message;
    console.warn(`[LLM] 模型 [${model}] 请求失败 [${status}] (${dur}ms): ${detail}，使用内置离线语料兜底`);
  }

  return getOfflineFallbackReply();
}

async function callLLMForReplies(userPrompt, history = [], runtimeContext = null) {
  let systemPrompt = getOrLoadSystemPrompt();

  if (runtimeContext && (runtimeContext.actionId || runtimeContext.actionName)) {
    const actDesc = runtimeContext.actionName ? `${runtimeContext.actionName} (\`${runtimeContext.actionId}\`)` : `\`${runtimeContext.actionId}\``;
    const outfitDesc = runtimeContext.outfitName || '默认舰长常服';
    const timeDesc = runtimeContext.timeText || '白天 (Day)';
    systemPrompt += `\n\n---\n\n## 📡 当前天台实时环境与蕾伊所处状态 (REALTIME CONTEXT)\n` +
      `- **蕾伊当前所在设施/动作**：${actDesc}\n` +
      `- **蕾伊当前穿着服装**：${outfitDesc}\n` +
      `- **当前天台光照环境**：${timeDesc}\n` +
      `* **环境感知硬约束**：若调查员询问蕾伊“你在干嘛/在做什么/在干什么”或针对当前天台所处动作发起互动，蕾伊**必须以当前所在设施（${actDesc}）为准进行自然真实的回应**，严禁脱离当前真实所处设施随意凭空猜测。`;
  }

  const safeHistory = Array.isArray(history) ? history.slice(-20) : [];
  const requestMessages = [
    { role: 'system', content: systemPrompt },
    ...safeHistory,
    { role: 'user', content: userPrompt }
  ];

  const ctxInfo = runtimeContext?.actionId ? ` [当前设施: ${runtimeContext.actionId}]` : '';
  console.log(`[LLM] 携带历史上下文轮次: ${Math.floor(safeHistory.length / 2)} 轮 (${safeHistory.length} 条消息)${ctxInfo}, 本次输入: "${userPrompt.substring(0, 30)}..."`);

  const privateModels = loadPrivateModelConfig();
  if (privateModels && privateModels.length > 0) {
    return await executeFailoverLLM(privateModels, requestMessages);
  }

  return await executeSingleModelLLM(requestMessages);
}

function isLLMConfigured() {
  const privateModels = loadPrivateModelConfig();
  if (privateModels && privateModels.length > 0) return true;
  return Boolean(process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.trim());
}

function getLLMConfigStatus() {
  const privateModels = loadPrivateModelConfig();
  if (privateModels && privateModels.length > 0) {
    return {
      configured: true,
      mode: 'private_failover',
      count: privateModels.length
    };
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey && apiKey.trim()) {
    return {
      configured: true,
      mode: 'single_model',
      model: process.env.OPENAI_MODEL || 'gpt-4o-mini',
      endpoint: resolveChatCompletionsUrl(process.env.OPENAI_API_BASE)
    };
  }

  return {
    configured: false,
    mode: 'offline'
  };
}

module.exports = {
  callLLMForReplies,
  getOrLoadSystemPrompt,
  stripThinkingContent,
  isLLMConfigured,
  getLLMConfigStatus,
  resolveChatCompletionsUrl
};
