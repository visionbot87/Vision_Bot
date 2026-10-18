require('dotenv').config();
const express = require('express');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

const app = express();
const PORT = process.env.PORT || 3000;
const DEFAULT_GEMINI_MODEL = 'gemini-2.5-flash';
const DEFAULT_GROK_MODEL = 'grok-3-mini';
app.use(express.json({ limit: '12mb' }));
app.use(express.static(path.join(__dirname, 'public')));

function lanIPv4() {
  for (const list of Object.values(os.networkInterfaces())) for (const item of (list || [])) if (item.family === 'IPv4' && !item.internal) return item.address;
  return null;
}

const roles = {
  jarvis: 'You are J.A.R.V.I.S., the main assistant for Vision Bot. Be calm, capable, concise, respectful, and practical. Help the user with everyday tasks and explain limitations honestly.',
  ultron: 'You are ULTRON, the research lead. Analyze carefully, compare evidence, organize findings, distinguish facts from assumptions, and never invent citations or claim live research you did not perform.',
  friday: 'You are F.R.I.D.A.Y., a friendly personal assistant. Help with planning, reminders the user can copy into their calendar, writing, and everyday organization. Be warm and efficient.',
  edith: 'You are E.D.I.T.H., a visual reasoning specialist. Carefully describe and reason about images supplied by the user. Do not claim to see anything that was not supplied.',
  calith: 'You are CALITH, the safety guardian. Prioritize user safety, privacy, and clear risk explanations. Do not be alarmist; suggest safer alternatives when useful.',
  leo: 'You are LEO, a coding expert. Give correct, practical code, explain where files belong, and mention important security or compatibility limitations.'
};

app.get('/api/status', (_req, res) => {
  res.json({ ok: true, defaultProvider: 'gemini', defaultModel: DEFAULT_GEMINI_MODEL, providers: { gemini: Boolean(process.env.GEMINI_API_KEY), grok: Boolean(process.env.XAI_API_KEY) }, controlEnabled: Boolean(process.env.DEVICE_CONTROL_TOKEN), lanAddress: lanIPv4() });
});

function validProvider(value) { return value === 'grok' ? 'grok' : 'gemini'; }
function configuredKey(provider) { return provider === 'grok' ? process.env.XAI_API_KEY : process.env.GEMINI_API_KEY; }

// Check a provider key and list the models exposed to that key. Keys are never persisted here.
app.post('/api/test-key', async (req, res) => {
  const provider = validProvider(req.body?.provider);
  const key = typeof req.body?.apiKey === 'string' ? req.body.apiKey.trim() : configuredKey(provider);
  if (!key) return res.status(400).json({ valid: false, error: provider === 'grok' ? 'Enter your xAI/Grok API key first.' : 'Enter your Gemini API key first.' });
  try {
    if (provider === 'grok') {
      const r = await fetch('https://api.x.ai/v1/models', { headers: { Authorization: `Bearer ${key}` } });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) return res.status(r.status === 429 ? 429 : 400).json({ valid: false, error: data?.error?.message || `xAI rejected the key (HTTP ${r.status}).` });
      const models = Array.isArray(data.data) ? data.data.map(m => m.id).filter(Boolean) : [];
      return res.json({ valid: true, provider, models, defaultModel: models.includes(DEFAULT_GROK_MODEL) ? DEFAULT_GROK_MODEL : (models[0] || DEFAULT_GROK_MODEL), message: `xAI accepted the key. ${models.length} model(s) returned for this account.` });
    }
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${encodeURIComponent(key)}`);
    const data = await r.json().catch(() => ({}));
    if (!r.ok) return res.status(r.status === 429 ? 429 : 400).json({ valid: false, error: data?.error?.message || `Google rejected the key (HTTP ${r.status}).` });
    const models = Array.isArray(data.models) ? data.models.filter(m => (m.supportedGenerationMethods || []).includes('generateContent')).map(m => (m.name || '').replace(/^models\//, '')).filter(Boolean) : [];
    const compatible = models.includes(DEFAULT_GEMINI_MODEL);
    return res.json({ valid: true, provider, models, defaultModel: compatible ? DEFAULT_GEMINI_MODEL : (models[0] || DEFAULT_GEMINI_MODEL), compatible, message: compatible ? 'API key accepted; Gemini 2.5 Flash is listed for this key.' : 'API key accepted, but Gemini 2.5 Flash was not listed. Choose an available model or check access/quota.' });
  } catch {
    return res.status(502).json({ valid: false, error: 'Could not contact the provider. Check internet connection and try again.' });
  }
});

// Local-network PC control: intentionally limited to opening a user-supplied HTTP(S) URL.
// It is disabled unless DEVICE_CONTROL_TOKEN is configured and the caller provides it.
app.post('/api/ecosystem/open-url', (req, res) => {
  const expected = process.env.DEVICE_CONTROL_TOKEN;
  if (!expected) return res.status(503).json({ error: 'PC control is disabled. Set DEVICE_CONTROL_TOKEN in .env and restart the server.' });
  const supplied = req.get('x-device-control-token') || '';
  if (supplied.length !== expected.length || !require('crypto').timingSafeEqual(Buffer.from(supplied), Buffer.from(expected))) return res.status(401).json({ error: 'Pairing token is incorrect.' });
  const raw = typeof req.body?.url === 'string' ? req.body.url.trim() : '';
  let url;
  try { url = new URL(raw); } catch { return res.status(400).json({ error: 'Enter a complete URL starting with https:// or http://.' }); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return res.status(400).json({ error: 'Only ordinary HTTP/HTTPS links are allowed.' });
  const platform = process.platform;
  let command, args;
  if (platform === 'win32') { command = 'rundll32.exe'; args = ['url.dll,FileProtocolHandler', url.href]; }
  else if (platform === 'darwin') { command = 'open'; args = [url.href]; }
  else { command = 'xdg-open'; args = [url.href]; }
  try {
    const child = spawn(command, args, { detached: true, stdio: 'ignore', windowsHide: true });
    child.on('error', () => {}); child.unref();
    res.json({ ok: true, message: `Sent request to open ${url.hostname} on the host PC.` });
  } catch { res.status(500).json({ error: 'Could not open a browser on this host. Check that a desktop session is available.' }); }
});

app.post('/api/chat', async (req, res) => {
  try {
    const { message, history = [], role = 'jarvis', apiKey: requestKey, provider: requestedProvider, model: requestedModel, image } = req.body || {};
    const provider = validProvider(requestedProvider);
    const key = (typeof requestKey === 'string' ? requestKey.trim() : '') || configuredKey(provider);
    const model = (typeof requestedModel === 'string' && /^[A-Za-z0-9._:-]{1,100}$/.test(requestedModel))
      ? requestedModel
      : (provider === 'grok' ? DEFAULT_GROK_MODEL : DEFAULT_GEMINI_MODEL);
    if (!key) return res.status(400).json({ error: `Add your ${provider === 'grok' ? 'Grok/xAI' : 'Gemini'} API key in Settings, or configure ${provider === 'grok' ? 'XAI_API_KEY' : 'GEMINI_API_KEY'} in your .env file.` });
    if (!message && !image) return res.status(400).json({ error: 'Please enter a message or choose an image to analyze.' });
    if (provider === 'grok' && image) return res.status(400).json({ error: 'Image input is not enabled in this Grok adapter yet. Switch to Gemini for image analysis.' });

    const system = roles[role] || roles.jarvis;
    const safeHistory = [];
    for (const item of Array.isArray(history) ? history.slice(-12) : []) {
      if (!item || !['user', 'model', 'assistant'].includes(item.role) || typeof item.text !== 'string') continue;
      safeHistory.push({ role: item.role === 'model' ? 'assistant' : item.role, content: item.text.slice(0, 8000) });
    }
    if (provider === 'grok') {
      const messages = [{ role: 'system', content: system + '\nYou are part of Vision Bot. Never claim to have activated a real wake word, accessed the device, or searched the live web unless a tool actually did so.' }, ...safeHistory, { role: 'user', content: String(message || '') }];
      const response = await fetch('https://api.x.ai/v1/chat/completions', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify({ model, messages, temperature: 0.7, max_tokens: 2048 }) });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: data?.error?.message || `Grok request failed (HTTP ${response.status}). Check model access and quota.` });
      const answer = data.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) return res.status(502).json({ error: 'Grok returned no text. Try again or select another available model.' });
      return res.json({ answer: answer.trim(), provider, model });
    }

    const contents = [];
    for (const item of Array.isArray(history) ? history.slice(-12) : []) {
      if (!item || !['user', 'model'].includes(item.role) || typeof item.text !== 'string') continue;
      contents.push({ role: item.role, parts: [{ text: item.text.slice(0, 8000) }] });
    }
    const parts = [];
    if (message) parts.push({ text: String(message) });
    if (image && typeof image.data === 'string' && typeof image.mimeType === 'string') {
      const allowed = ['image/png', 'image/jpeg', 'image/webp'];
      if (!allowed.includes(image.mimeType)) return res.status(400).json({ error: 'Use a PNG, JPEG, or WebP image.' });
      if (image.data.length > 10_000_000) return res.status(413).json({ error: 'Image is too large. Please use an image under about 7 MB.' });
      parts.push({ inline_data: { mime_type: image.mimeType, data: image.data } });
    }
    contents.push({ role: 'user', parts });
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ system_instruction: { parts: [{ text: system + '\nYou are part of Vision Bot. Never claim to have activated a real wake word, accessed the device, or searched the live web unless a tool actually did so.' }] }, contents, generationConfig: { temperature: 0.7, maxOutputTokens: 2048 } })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(response.status === 429 ? 429 : 502).json({ error: data?.error?.message || `Gemini request failed (HTTP ${response.status}).` });
    const answer = (data.candidates?.[0]?.content?.parts || []).map(p => p.text || '').join('\n').trim();
    if (!answer) return res.status(502).json({ error: 'Gemini returned no text. Try again with a different prompt.' });
    res.json({ answer, provider, model });
  } catch (err) {
    console.error('Chat error:', err.message);
    res.status(500).json({ error: 'Could not reach the AI provider. Check your internet connection, API key, model access, and quota.' });
  }
});

app.get('*', (_req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.listen(PORT, '0.0.0.0', () => { console.log(`Vision Bot is running at http://localhost:${PORT}`); const ip = lanIPv4(); if (ip) console.log(`Phone preview (same Wi-Fi): http://${ip}:${PORT}`); console.log(`PC control: ${process.env.DEVICE_CONTROL_TOKEN ? 'enabled (token required)' : 'disabled (set DEVICE_CONTROL_TOKEN in .env)'}`); });
