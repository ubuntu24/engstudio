const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawn } = require('child_process');

// Disk audio cache directory: <deploy>/cache_audio
const CACHE_DIR = path.resolve(__dirname, '../../cache_audio');
if (!fs.existsSync(CACHE_DIR)) {
  fs.mkdirSync(CACHE_DIR, { recursive: true });
}

// 🎙️ Curated Master AI Voice Registry
const VOICES_REGISTRY = {
  // --- US English (Mỹ) ---
  'rachel': {
    id: 'rachel',
    name: 'Rachel',
    accent: 'us',
    flag: '🇺🇸',
    gender: 'female',
    tag: 'Tự nhiên & Trong trẻo',
    description: 'Giọng nữ Mỹ chuẩn quốc tế, phát âm rõ ràng, dễ nghe nhất cho người học',
    elevenlabsId: '21m00Tcm4TlvDq8ikWAM',
    edgeVoice: 'en-US-JennyNeural',
    sample: "Hi there! I'm Rachel. Welcome to English Studio, let's practice English together."
  },
  'adam': {
    id: 'adam',
    name: 'Adam',
    accent: 'us',
    flag: '🇺🇸',
    gender: 'male',
    tag: 'Trầm ấm & Truyền cảm',
    description: 'Giọng nam Mỹ trầm ấm, phong cách podcast và người dẫn chuyện',
    elevenlabsId: 'pNInz6obpgDQGcFmaJgB',
    edgeVoice: 'en-US-GuyNeural',
    sample: "Hello! My name is Adam. Great storytelling starts with clear and natural pronunciation."
  },
  'christopher': {
    id: 'christopher',
    name: 'Christopher',
    accent: 'us',
    flag: '🇺🇸',
    gender: 'male',
    tag: 'Bản tin Thời sự',
    description: 'Giọng nam Mỹ đĩnh đạc, uy quyền, chuẩn phong cách phát thanh tin tức CNN/Fox',
    elevenlabsId: 'pqHfZKP75CvOlQylNhV4', // Bill
    edgeVoice: 'en-US-ChristopherNeural',
    sample: "Good evening. This is Christopher reporting live with the latest global developments."
  },
  'aria': {
    id: 'aria',
    name: 'Aria',
    accent: 'us',
    flag: '🇺🇸',
    gender: 'female',
    tag: 'Tự tin & Năng động',
    description: 'Giọng nữ Mỹ hiện đại, đầy năng lượng, phù hợp với các cuộc đối thoại thực tế',
    elevenlabsId: 'EXAVITQu4vr4xnSDxMaL', // Sarah
    edgeVoice: 'en-US-AriaNeural',
    sample: "Hey! I am Aria. Stay confident and keep expanding your vocabulary every single day."
  },

  // --- UK English (Anh) ---
  'george': {
    id: 'george',
    name: 'George',
    accent: 'uk',
    flag: '🇬🇧',
    gender: 'male',
    tag: 'BBC Storyteller',
    description: 'Giọng nam Anh quý tộc, ấm áp, chuẩn ngữ điệu BBC Documentary',
    elevenlabsId: 'JBFqnCBsd6RMkjVDRZzb',
    edgeVoice: 'en-GB-RyanNeural',
    sample: "Good day! I'm George. Welcome to today's BBC World News briefing."
  },
  'lily': {
    id: 'lily',
    name: 'Lily',
    accent: 'uk',
    flag: '🇬🇧',
    gender: 'female',
    tag: 'Chuẩn Luân Đôn',
    description: 'Giọng nữ Anh thanh lịch, phát âm từng âm tiết cực kỳ tinh tế và chuẩn xác',
    elevenlabsId: 'pFZP5JQG7iQjIQuC4Bku',
    edgeVoice: 'en-GB-SoniaNeural',
    sample: "Hello everyone, I am Lily. Mastering British pronunciation is easier than you think."
  },
  'brian': {
    id: 'brian',
    name: 'Brian',
    accent: 'uk',
    flag: '🇬🇧',
    gender: 'male',
    tag: 'Hàn lâm Oxford',
    description: 'Giọng nam Anh trầm vang, phong thái giáo sư học thuật Oxford',
    elevenlabsId: 'nPczCjzI2devNBz1zQrb',
    edgeVoice: 'en-GB-ThomasNeural',
    sample: "Indeed. Clear articulation is the hallmark of effective scholarly communication."
  },
  'sonia': {
    id: 'sonia',
    name: 'Sonia',
    accent: 'uk',
    flag: '🇬🇧',
    gender: 'female',
    tag: 'Nhẹ nhàng & Thư thái',
    description: 'Giọng nữ Anh dịu dàng, quý phái, rất hợp nghe tin tức buổi tối',
    elevenlabsId: 'XB0fDUnXU5powFXDhCwa', // Charlotte
    edgeVoice: 'en-GB-LibbyNeural',
    sample: "Welcome back. Take your time to absorb each sentence and enjoy the rhythm."
  },

  // --- AU English (Úc) ---
  'natasha': {
    id: 'natasha',
    name: 'Natasha',
    accent: 'au',
    flag: '🇦🇺',
    gender: 'female',
    tag: 'Tươi sáng nước Úc',
    description: 'Giọng nữ Úc thân thiện, tươi sáng, chuẩn Sydney Accent',
    elevenlabsId: 'pFZP5JQG7iQjIQuC4Bku',
    edgeVoice: 'en-AU-NatashaNeural',
    sample: "G'day! I'm Natasha from Sydney. Ready to explore English with a fresh breeze?"
  },
  'william': {
    id: 'william',
    name: 'William',
    accent: 'au',
    flag: '🇦🇺',
    gender: 'male',
    tag: 'Bản ngữ Phóng khoáng',
    description: 'Giọng nam Úc ấm áp, tự nhiên, phong cách bản xứ gần gũi',
    elevenlabsId: 'N2lVS1w4EtoT3dr4eOWO', // Callum
    edgeVoice: 'en-AU-WilliamMultilingualNeural',
    sample: "G'day mate! I'm William. Practicing listening every day will take you far."
  },

  // --- VI Vietnamese English Accent (Người Việt phát âm Tiếng Anh) ---
  'giang': {
    id: 'giang',
    name: 'Giang',
    accent: 'vi',
    flag: '🇻🇳',
    gender: 'female',
    tag: 'Nữ Việt phát âm Tiếng Anh',
    description: 'Giọng nữ người Việt phát âm tiếng Anh chuẩn xác, trong trẻo, phong cách giáo viên bản địa dễ nghe',
    elevenlabsId: 'f5q6kePPoQAjCPYG6moa',
    edgeVoice: 'vi-VN-NamMinhNeural',
    sample: "Hello! My name is Giang. Practicing English vocabulary every single day will bring you great results."
  },
  'tony': {
    id: 'tony',
    name: 'Tony Hoàng',
    accent: 'vi',
    flag: '🇻🇳',
    gender: 'male',
    tag: 'Nam Việt phát âm Tiếng Anh',
    description: 'Giọng nam người Việt phát âm tiếng Anh trầm ấm, tự nhiên, phong cách chia sẻ bài học truyền cảm',
    elevenlabsId: 'K7ewtjKRNtwwt3lKQ6M0',
    edgeVoice: 'vi-VN-NamMinhNeural',
    sample: "Hi everyone! I am Tony Hoang. Let's master English pronunciation and build your speaking confidence."
  }
};

function resolveVoice(voiceKey, accent = 'us') {
  if (voiceKey && VOICES_REGISTRY[voiceKey.toLowerCase()]) {
    return VOICES_REGISTRY[voiceKey.toLowerCase()];
  }
  const normAccent = (accent === 'uk' || accent === 'gb') ? 'uk' : (accent === 'au' ? 'au' : (accent === 'vi' || accent === 'vn' ? 'vi' : 'us'));
  if (normAccent === 'vi') return VOICES_REGISTRY['giang'];
  if (normAccent === 'uk') return VOICES_REGISTRY['george'];
  if (normAccent === 'au') return VOICES_REGISTRY['natasha'];
  return VOICES_REGISTRY['rachel'];
}

function getHash(text) {
  return crypto.createHash('md5').update(text.trim().toLowerCase()).digest('hex');
}

/**
 * Call ElevenLabs Text-to-Speech API
 */
async function callElevenLabs(text, elevenlabsVoiceId) {
  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('ELEVENLABS_API_KEY is not configured');
  }

  const voiceId = elevenlabsVoiceId || process.env.ELEVENLABS_VOICE_US || '21m00Tcm4TlvDq8ikWAM';
  const modelId = process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5';

  const url = `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}?output_format=mp3_44100_128`;
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'xi-api-key': apiKey,
      'Content-Type': 'application/json',
      'Accept': 'audio/mpeg'
    },
    body: JSON.stringify({
      text: text,
      model_id: modelId,
      voice_settings: {
        stability: 0.5,
        similarity_boost: 0.75,
        style: 0.0,
        use_speaker_boost: true
      }
    }),
    signal: AbortSignal.timeout(12000)
  });

  if (!response.ok) {
    const errText = await response.text().catch(() => '');
    throw new Error(`ElevenLabs API HTTP ${response.status}: ${errText}`);
  }

  const arrayBuf = await response.arrayBuffer();
  return Buffer.from(arrayBuf);
}

/**
 * Call Microsoft Edge Neural TTS via python edge-tts
 */
async function callEdgeTts(text, edgeVoiceName, tempFilePath) {
  const voice = edgeVoiceName || 'en-US-JennyNeural';

  return new Promise((resolve, reject) => {
    let finished = false;
    const pythonBin = process.env.PYTHON_BIN || (process.platform === 'win32' ? 'python' : 'python3');
    const proc = spawn(pythonBin, [
      '-m', 'edge_tts',
      '--voice', voice,
      '--text', text,
      '--write-media', tempFilePath
    ]);

    const timer = setTimeout(() => {
      if (!finished) {
        finished = true;
        try { proc.kill(); } catch (_) {}
        reject(new Error('Edge-TTS timeout after 8s'));
      }
    }, 8000);

    let stderr = '';
    proc.stderr.on('data', d => stderr += d.toString());

    proc.on('close', (code) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      if (code === 0 && fs.existsSync(tempFilePath) && fs.statSync(tempFilePath).size > 0) {
        resolve();
      } else {
        reject(new Error(`Edge-TTS exited with code ${code}: ${stderr.trim()}`));
      }
    });

    proc.on('error', (err) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      reject(new Error(`Edge-TTS spawn error: ${err.message}`));
    });
  });
}

/**
 * Fallback to Google Translate TTS
 */
async function callGoogleTts(text, accent) {
  const tl = (accent === 'uk' || accent === 'gb') ? 'en-gb' : (accent === 'au' ? 'en-au' : (accent === 'vi' || accent === 'vn' ? 'vi' : 'en'));
  const shortText = text.slice(0, 200);
  const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${tl}&q=${encodeURIComponent(shortText)}`;

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Referer': 'https://translate.google.com/'
    },
    signal: AbortSignal.timeout(6000)
  });

  if (!res.ok) {
    throw new Error(`Google TTS HTTP ${res.status}`);
  }

  const arrayBuf = await res.arrayBuffer();
  return Buffer.from(arrayBuf);
}

const inFlightTts = new Map();

/**
 * Get or synthesize TTS audio
 * Options: { text, accent, voiceKey }
 * Returns { buffer, filePath, engine, voice: voiceObj }
 */
async function getOrGenerateTts(text, accent = 'us', voiceKey = null) {
  const voice = resolveVoice(voiceKey, accent);
  const hash = getHash(text);
  const flightKey = `${voice.id}_${hash}`;

  if (inFlightTts.has(flightKey)) {
    return inFlightTts.get(flightKey);
  }

  const promise = (async () => {
    const hasElevenLabsKey = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim());

    const file11 = path.join(CACHE_DIR, `11labs_${voice.id}_${hash}.mp3`);
    const fileEdge = path.join(CACHE_DIR, `edge_${voice.id}_${hash}.mp3`);
    const fileGoogle = path.join(CACHE_DIR, `google_${voice.accent}_${hash}.mp3`);

    // 1. Check if cached 11labs audio exists
    if (fs.existsSync(file11) && fs.statSync(file11).size > 0) {
      return {
        filePath: file11,
        engine: 'elevenlabs-cached',
        voice
      };
    }

    // 2. If ElevenLabs API Key is present, attempt ElevenLabs synthesis
    if (hasElevenLabsKey) {
      try {
        console.log(`[TTS] ElevenLabs (${voice.name}): "${text.slice(0, 40)}..."`);
        const buffer = await callElevenLabs(text, voice.elevenlabsId);
        fs.writeFileSync(file11, buffer);
        return {
          filePath: file11,
          buffer,
          engine: 'elevenlabs',
          voice
        };
      } catch (err) {
        console.warn(`[TTS] ElevenLabs failed (${err.message}). Falling back to Edge-TTS...`);
      }
    }

    // 3. Check if cached Edge-TTS audio exists
    if (fs.existsSync(fileEdge) && fs.statSync(fileEdge).size > 0) {
      return {
        filePath: fileEdge,
        engine: 'edge-cached',
        voice
      };
    }

    // 4. Synthesize with Edge-TTS (Microsoft Neural)
    const tempFile = path.join(CACHE_DIR, `temp_${Date.now()}_${hash}.mp3`);
    try {
      console.log(`[TTS] Edge-TTS (${voice.name} - ${voice.edgeVoice}): "${text.slice(0, 40)}..."`);
      await callEdgeTts(text, voice.edgeVoice, tempFile);
      if (fs.existsSync(tempFile)) {
        try {
          fs.renameSync(tempFile, fileEdge);
        } catch (_) {
          fs.copyFileSync(tempFile, fileEdge);
          fs.unlinkSync(tempFile);
        }
      }
      return {
        filePath: fileEdge,
        engine: 'edge-tts',
        voice
      };
    } catch (err) {
      try {
        if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
      } catch (_) {}
      console.warn(`[TTS] Edge-TTS failed (${err.message}). Falling back to Google TTS...`);
    }

    // 5. Check if cached Google TTS exists
    if (fs.existsSync(fileGoogle) && fs.statSync(fileGoogle).size > 0) {
      return {
        filePath: fileGoogle,
        engine: 'google-cached',
        voice
      };
    }

    // 6. Last resort: Google Translate TTS
    console.log(`[TTS] Google TTS fallback (${voice.accent}): "${text.slice(0, 40)}..."`);
    const buffer = await callGoogleTts(text, voice.accent);
    fs.writeFileSync(fileGoogle, buffer);
    return {
      filePath: fileGoogle,
      buffer,
      engine: 'google-tts',
      voice
    };
  })();

  inFlightTts.set(flightKey, promise);
  try {
    return await promise;
  } finally {
    inFlightTts.delete(flightKey);
  }
}

function getAllVoicesInfo() {
  const hasElevenLabsKey = Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_API_KEY.trim());
  return {
    active_engine: hasElevenLabsKey ? 'elevenlabs' : 'edge-tts',
    has_elevenlabs_key: hasElevenLabsKey,
    model: process.env.ELEVENLABS_MODEL_ID || 'eleven_turbo_v2_5',
    default_voices: {
      us: 'rachel',
      uk: 'george',
      au: 'natasha',
      vi: 'giang'
    },
    voices: Object.values(VOICES_REGISTRY).map(v => ({
      id: v.id,
      name: v.name,
      accent: v.accent,
      flag: v.flag,
      gender: v.gender,
      tag: v.tag,
      description: v.description,
      sample: v.sample,
      edgeVoice: v.edgeVoice
    }))
  };
}

module.exports = {
  getOrGenerateTts,
  callElevenLabs,
  callEdgeTts,
  callGoogleTts,
  getAllVoicesInfo,
  VOICES_REGISTRY,
  CACHE_DIR
};
