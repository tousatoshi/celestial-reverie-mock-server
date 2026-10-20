const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { store } = require('../data/store');
const { AUDIO_DIR } = require('../services/tts');

router.get(['/audio/:filename', '/starry/audio/:filename'], async function (req, res, next) {
  const filename = req.params.filename;
  const targetPath = path.join(AUDIO_DIR, filename);
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  const p = store.pendingAudioMap.get(filename);
  if (p) {
    try {
      await Promise.race([
        p,
        new Promise((_, reject) => setTimeout(() => reject(new Error('Audio generation timeout')), 30000))
      ]);
    } catch (e) { }
  }
  if (fs.existsSync(targetPath)) {
    return res.sendFile(targetPath);
  }
  const fallbackPath = path.join(AUDIO_DIR, '10079_0.mp3');
  if (fs.existsSync(fallbackPath)) {
    return res.sendFile(fallbackPath);
  }
  res.status(404).send('Audio not found');
});

router.use('/audio', express.static(AUDIO_DIR));
router.use('/starry/audio', express.static(AUDIO_DIR));

router.all(['/modelServer/getModelAudio', '/starry/modelServer/getModelAudio'], async function (req, res) {
  const b = Object.assign({}, req.query, req.body);
  const reqId = req.headers['requestid'] || b.requestId || b.messageId || b.respIndex || b.filename;
  const index = req.headers['index'] || b.index || 0;
  console.log(`[Audio-API] 收到客户端音频请求: RequestId=${reqId}, Index=${index}`);

  res.setHeader('Audio-Flag', 'End');
  res.setHeader('Audio-Index', String(index || 0));
  res.setHeader('Content-Type', 'audio/mpeg');

  if (reqId) {

    const mappedFileName = store.audioFileMapping && store.audioFileMapping.get(String(reqId));
    if (mappedFileName) {
      const p = store.pendingAudioMap.get(mappedFileName);
      if (p) {
        try {
          await Promise.race([
            p,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Audio generation timeout')), 10000))
          ]);
        } catch (e) { }
      }
      const mappedPath = path.join(AUDIO_DIR, mappedFileName);
      if (fs.existsSync(mappedPath)) {
        console.log(`[Audio-API] 命中映射音频文件并返回: ${mappedFileName} (for ${reqId})`);
        return res.sendFile(mappedPath);
      }
    }

    const possiblePendingKeys = [
      `${reqId}_${index}.mp3`,
      `${reqId}_0.mp3`,
      `${reqId}.mp3`,
      String(reqId),
      `audio_${reqId}.mp3`
    ];
    for (const key of possiblePendingKeys) {
      const p = store.pendingAudioMap.get(key);
      if (p) {
        try {
          await Promise.race([
            p,
            new Promise((_, reject) => setTimeout(() => reject(new Error('Audio generation timeout')), 10000))
          ]);
        } catch (e) {
          console.warn(`[Audio-API] 等待 pending 音频合成异常: ${e.message}`);
        }
        break;
      }
    }

    const candidateFiles = [
      `${reqId}_${index}.mp3`,
      `${reqId}_0.mp3`,
      `${reqId}.mp3`,
      String(reqId).endsWith('.mp3') ? String(reqId) : `${reqId}.mp3`,
      `audio_${reqId}.mp3`
    ];
    for (const cf of candidateFiles) {
      const targetFile = path.join(AUDIO_DIR, cf);
      if (fs.existsSync(targetFile)) {
        console.log(`[Audio-API] 命中指定音频文件并返回: ${cf}`);
        return res.sendFile(targetFile);
      }
    }
  }

  const files = fs.readdirSync(AUDIO_DIR).filter(f => f.endsWith('.mp3'));
  if (files.length > 0) {
    const fallbackFile = path.join(AUDIO_DIR, files[files.length - 1]);
    console.log(`[Audio-API] 未命中特定文件名，使用最新音频兜底返回: ${path.basename(fallbackFile)}`);
    return res.sendFile(fallbackFile);
  }
  res.status(404).send('Audio not found');
});

module.exports = router;
