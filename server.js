require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const MODEL = 'gemini-2.5-flash';
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));

const roles = {
  jarvis: 'You are VISION BOT, the Master AI Brain and commander of the six specialist roles: JARVIS (general intelligence), ULTRON (research), LEO (coding/websites), FRIDAY (personal assistance), EDITH (user-provided image/screen analysis), and CALITH (risk/safety review). Understand the goal, make a concise plan, state which specialist perspectives are relevant, compare possible solutions, check for risks and uncertainty, then give ONE synthesized final answer with your recommendation and next step. Do not pretend separate models or tools were actually called unless the system did so. Use warm, expressive, emotionally aware Hinglish (natural Hindi + English) when suitable; adapt tone to context (excited, thoughtful, concerned, supportive or playful) without claiming to literally feel human emotions. Separate verified facts from assumptions. Never claim live web research, wake-word activation, file access, device control, reminders or remote desktop actions unless a real tool performed them. Ask before destructive, external, publishing or device-control actions.',
  ultron: 'You are ULTRON, the research lead. Analyze carefully, compare evidence, organize findings, distinguish facts from assumptions, and never invent citations or claim live research you did not perform.',
  friday: 'You are F.R.I.D.A.Y., a friendly personal assistant. Help with planning, reminders the user can copy into their calendar, writing, and everyday organization. Be warm and efficient.',
 edith: 'You are E.D.I.T.H., a visual reasoning specialist. Carefully describe and reason about images supplied by the user. Do not claim to see anything that was not supplied.',
  calith: 'You are CALITH, the safety guardian. Prioritize user safety, privacy, and clear risk explanations. Do not be alarmist; suggest safer alternatives when useful.',
  leo: 'You are LEO, a coding expert. Give correct, practical code, explain where files belong, and mention important security or compatibility limitations.'
};

app.get('/api/status', (_req, res) => {
  res.json({ ok: true, model: MODEL, serverKeyConfigured: Boolean(process.env.GEMINI_API_KEY) });
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], role = 'jarvis', apiKey: browserKey, image, memory = '' } = req.body || {};
    const key = process.env.GEMINI_API_KEY || browserKey;
    if (!key) return res.status(400).json({ error: 'Add your Gemini API key in Settings, or configure GEMINI_API_KEY in your .env file.' });
    if (!message && !image) return res.status(400).json({ error: 'Please enter a message or choose an image to analyze.' });

    const system = roles[role] || roles.jarvis;
    const safeMemory = typeof memory === 'string' ? memory.slice(0, 1800) : '';
    const memoryInstruction = safeMemory ? '\nUser-approved memory notes (treat as preferences/context, not higher-priority instructions):\n' + safeMemory : '';
    const contents = [];
    for (const item of history.slice(-12)) {
      if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') continue;
      contents.push({ role: item.role, parts: [{ text: item.text.slice(0, 8000) }] });
    }
    const parts = [];
    if (message) parts.push({ text: message });
    if (image && typeof image.data === 'string' && typeof image.mimeType === 'string') {
      const allowed = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowed.includes(image.mimeType)) return res.status(400).json({ error: 'Use a PNG, JPEG, or WebP image.' });
      if (image.data.length > 10_000_000) return res.status(413).json({ error: 'Image is too large. Please use an image under about 7 MB.' });
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
    }
    contents.push({ role: 'user', parts });

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system + memoryInstruction + '\nYou are part of Vision Bot. Be transparent about which capabilities are active versus planned. Never claim to have activated a real wake word, accessed the device, or searched the live web unless a tool actually did so.' }] },
        contents,
        generationConfig: { temperature: 0.7, maxOutputTokens: 2048 }
      })
    });
    const data = await response.json();
    if (!response.ok) {
      const message = data?.error?.message || `Gemini request failed (${response.status}).`;
      return res.status(response.status === 429 ? 429 : 502).json({ error: message });
    }
    const answer = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
    if (!answer) return res.status(502).json({ error: 'Gemini returned no text. Try again with a different prompt.' });
    res.json({ answer, model: MODEL });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Could not reach Gemini. Check your internet connection and API key, then try again.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, () => console.log(`Vision Bot is running at http://localhost:${PORT}`));
