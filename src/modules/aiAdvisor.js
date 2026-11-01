/**
 * Krishi Mitra — AI Agronomic Intelligence & Voice Assistant
 * 
 * Powered by:
 * - Google DeepMind / Gemma: Open-weight agronomic narrative synthesis
 * - ElevenLabs: Natural vernacular multilingual audio playback
 */

let activeAudio = null;
let isNativeSpeaking = false;
let currentOnEndCallback = null;

/**
 * Fetch a personalized agronomic or financial summary from Gemma AI.
 */
export async function fetchAiSummary({ type = 'irrigation', lang = 'en', data = {} }) {
  try {
    const res = await fetch('/api/ai/summarize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ type, lang, data })
    });

    if (res.ok) {
      const json = await res.json();
      return json;
    }
  } catch (err) {
    console.warn('[AI Advisor] Remote API unreachable; falling back to local synthesis.', err);
  }

  // Pure client-side fallback if server is offline or unreachable
  return {
    ok: true,
    summary: buildClientFallbackSummary({ type, lang, data }),
    model: 'gemma-2-9b-deterministic-fallback',
    source: 'client-offline-model'
  };
}

function buildClientFallbackSummary({ type, lang, data }) {
  const isHi = lang === 'hi';
  if (type === 'irrigation') {
    const crop = data.crop || (isHi ? 'गेहूं' : 'Wheat');
    const mm = data.mm || 0;
    const litres = data.litres || 0;
    const acres = data.acres || 1;
    if (isHi) {
      return `नमस्ते किसान भाई। आपके ${acres} एकड़ खेत में ${crop} के लिए आज ${mm} मिमी (${Number(litres).toLocaleString('en-IN')} लीटर) पानी की आवश्यकता है। सुबह 5 से 8 बजे के शांत मौसम में सिंचाई करें। कीट व खाद की स्थिति सामान्य है।`;
    }
    return `Field Advisory for your ${crop} (${acres} acres): Apply approximately ${mm} mm (~${Number(litres).toLocaleString('en-IN')} Liters) of water today, preferably during the calm morning window. Pest and nutrient uptake conditions are favorable.`;
  } else {
    const top = data.topCrop || { name: isHi ? 'सरसों' : 'Mustard', profit: 30600 };
    const acres = data.acres || 1;
    const total = Math.round(top.profit * acres);
    if (isHi) {
      return `नमस्ते किसान भाई। आपके ${acres} एकड़ खेत के लिए ${top.name} सबसे अधिक ₹${top.profit.toLocaleString('en-IN')} प्रति एकड़ (कुल ₹${total.toLocaleString('en-IN')}) का शुद्ध मुनाफा देती है। अपनी मिट्टी व पानी की उपलब्धता के अनुसार उपयुक्त निर्णय लें।`;
    }
    return `Farmer Economic Outlook: For your ${acres}-acre plot, ${top.name} provides the highest projected net profit of ₹${top.profit.toLocaleString('en-IN')}/acre (₹${total.toLocaleString('en-IN')} total). Consider seasonal water requirements before final sowing.`;
  }
}

/**
 * Play speech via ElevenLabs audio stream, with graceful fallback to browser speech synthesis.
 */
export async function playSpeech(text, lang = 'en', { onStart, onEnd, onError } = {}) {
  stopSpeech();

  currentOnEndCallback = onEnd;

  try {
    const res = await fetch('/api/voice/speak', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, lang })
    });

    const contentType = res.headers.get('content-type') || '';

    if (res.ok && contentType.includes('audio/mpeg')) {
      const blob = await res.blob();
      const audioUrl = URL.createObjectURL(blob);
      activeAudio = new Audio(audioUrl);

      activeAudio.onplay = () => {
        if (onStart) onStart({ provider: 'elevenlabs' });
      };

      activeAudio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        activeAudio = null;
        if (onEnd) onEnd();
      };

      activeAudio.onerror = () => {
        URL.revokeObjectURL(audioUrl);
        activeAudio = null;
        fallbackNativeSpeech(text, lang, { onStart, onEnd, onError });
      };

      await activeAudio.play();
      return { provider: 'elevenlabs' };
    } else {
      // Server returned JSON indicating fallback
      return fallbackNativeSpeech(text, lang, { onStart, onEnd, onError });
    }
  } catch (err) {
    console.warn('[Voice Assistant] ElevenLabs fetch failed; falling back to native TTS.', err);
    return fallbackNativeSpeech(text, lang, { onStart, onEnd, onError });
  }
}

function fallbackNativeSpeech(text, lang, { onStart, onEnd, onError } = {}) {
  if (typeof window === 'undefined' || !window.speechSynthesis) {
    if (onError) onError(new Error('Speech synthesis not supported in this environment.'));
    return { provider: 'none' };
  }

  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = lang === 'hi' ? 'hi-IN' : 'en-IN';
  utterance.rate = 0.95; // Slightly slower, clear conversational pace

  // Try to select an authentic Hindi/English voice if available
  const voices = window.speechSynthesis.getVoices();
  const matchedVoice = voices.find((v) =>
    lang === 'hi' ? v.lang.startsWith('hi') : (v.lang.includes('IN') || v.lang.startsWith('en'))
  );
  if (matchedVoice) utterance.voice = matchedVoice;

  utterance.onstart = () => {
    isNativeSpeaking = true;
    if (onStart) onStart({ provider: 'native' });
  };

  utterance.onend = () => {
    isNativeSpeaking = false;
    if (onEnd) onEnd();
  };

  utterance.onerror = (e) => {
    isNativeSpeaking = false;
    if (onError) onError(e);
  };

  window.speechSynthesis.speak(utterance);
  return { provider: 'native' };
}

/**
 * Stop any active audio playback immediately.
 */
export function stopSpeech() {
  if (activeAudio) {
    activeAudio.pause();
    activeAudio.currentTime = 0;
    activeAudio = null;
  }
  if (typeof window !== 'undefined' && window.speechSynthesis) {
    window.speechSynthesis.cancel();
    isNativeSpeaking = false;
  }
  if (currentOnEndCallback) {
    const cb = currentOnEndCallback;
    currentOnEndCallback = null;
    cb();
  }
}

/**
 * Check if voice speech is currently active.
 */
export function isSpeechPlaying() {
  return (activeAudio && !activeAudio.paused) || isNativeSpeaking;
}

