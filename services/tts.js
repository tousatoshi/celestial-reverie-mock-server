const fs = require('fs');
const path = require('path');
const axios = require('axios');
const { HttpsProxyAgent } = require('https-proxy-agent');

const AUDIO_DIR = path.join(__dirname, '..', 'audio');
if (!fs.existsSync(AUDIO_DIR)) fs.mkdirSync(AUDIO_DIR, { recursive: true });

function getProxyAgent() {
  const proxy = process.env.PROXY_URL || process.env.HTTP_PROXY || process.env.HTTPS_PROXY || 'http://127.0.0.1:10808';
  try {
    return new HttpsProxyAgent(proxy);
  } catch (e) {
    return undefined;
  }
}

function generateStamps(text) {
  const chars = Array.from(text);
  const words = [];
  let currentTime = 0.05;
  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];
    if (/[，。！？、~～\s,.!?]/.test(ch)) {
      currentTime += 0.2;
      continue;
    }
    const duration = 0.22;
    words.push({
      word: ch,
      start: parseFloat(currentTime.toFixed(2)),
      end: parseFloat((currentTime + duration).toFixed(2))
    });
    currentTime += duration;
  }
  return words;
}

async function callFishAudio(text, audioFileName) {
  const apiKey = process.env.FISH_AUDIO_KEY;
  const voiceId = process.env.FISH_AUDIO_VOICE_ID || '889e931050c04afebb9866644ae8e5a1';
  const model = process.env.FISH_AUDIO_MODEL || 's2.1-pro';
  const audioFilePath = path.join(AUDIO_DIR, audioFileName);

  if (!apiKey) {
    console.log('[Fish-Audio] 未配置 FISH_AUDIO_KEY，使用本地已有语音兜底');
    return getFallbackAudio(audioFileName);
  }

  const ttsUrl = process.env.FISH_AUDIO_URL || 'https://api.fish.audio/v1/tts';
  const startTime = Date.now();
  console.log(`[Fish-Audio] 正在调用 Fish Audio TTS (model: ${model}, voice: ${voiceId}) 合成: "${text.substring(0, 30)}..."`);

  async function requestTts(useProxy) {
    const config = {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'model': model
      },
      responseType: 'arraybuffer',
      timeout: 12000
    };
    if (useProxy) {
      const agent = getProxyAgent();
      if (agent) {
        config.httpsAgent = agent;
        config.proxy = false;
      }
    }
    return await axios.post(ttsUrl, {
      text: text,
      reference_id: voiceId,
      format: 'mp3',
      mp3_bitrate: 128,
      latency: 'balanced'
    }, config);
  }

  try {
    let resp;
    try {
      resp = await requestTts(true);
    } catch (proxyErr) {
      console.warn(`[Fish-Audio] 智能代理连接异常 (${proxyErr.message})，回退纯直连尝试...`);
      resp = await requestTts(false);
    }

    fs.writeFileSync(audioFilePath, Buffer.from(resp.data));
    console.log(`[Fish-Audio] 语音生成成功并保存: ${audioFilePath} (${resp.data.byteLength} 字节, 耗时: ${Date.now() - startTime}ms)`);
    return `http://106.12.163.121:28888/audio/${audioFileName}`;
  } catch (err) {
    const errDetail = err.response?.data ? Buffer.from(err.response.data).toString() : err.message;
    console.error(`[Fish-Audio] 调用异常 [耗时 ${Date.now() - startTime}ms]: ${errDetail}，切换本地音频兜底`);
    return getFallbackAudio(audioFileName);
  }
}

function getFallbackAudio(audioFileName) {
  const sampleAudio = path.join(AUDIO_DIR, '10079_0.mp3');
  const targetAudio = path.join(AUDIO_DIR, audioFileName);
  if (fs.existsSync(sampleAudio) && !fs.existsSync(targetAudio)) {
    try {
      fs.copyFileSync(sampleAudio, targetAudio);
      return `http://106.12.163.121:28888/audio/${audioFileName}`;
    } catch (e) { }
  }
  return `http://106.12.163.121:28888/audio/10079_0.mp3`;
}

module.exports = {
  AUDIO_DIR,
  generateStamps,
  callFishAudio,
  getFallbackAudio
};
