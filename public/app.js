const $ = (id) => document.getElementById(id);
const state = { history: [], image: null, busy: false, recognition: null, listening: false };
const CHAT_STORAGE_KEY = 'visionbot.savedHistory.v1';
const stored = {
  get(name, fallback = '') { try { return localStorage.getItem('visionbot.' + name) ?? fallback; } catch { return fallback; } },
  set(name, value) { try { localStorage.setItem('visionbot.' + name, value); } catch {} }
};
let toastTimer;
let deferredInstallPrompt = null;
function toast(message) { const el = $('toast'); el.textContent = message; el.classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => el.classList.remove('show'), 3200); }
function setFeedback(message, error = false) { $('settingsFeedback').textContent = message; $('settingsFeedback').style.color = error ? '#ffb6a5' : 'var(--cyan)'; }
function updateGreeting() { const name = stored.get('name').trim(); $('greeting').innerHTML = name ? `Welcome back, <span>${escapeHtml(name)}</span>` : 'Welcome to <span>Vision Bot</span>'; }
function saveHistory() { try { stored.set('savedHistory.v1', JSON.stringify({ history: state.history.slice(-12), messages: Array.from($('messages').querySelectorAll('.message')).slice(-24).map(el => ({ html: el.innerHTML, className: el.className })) })); } catch {} }
function restoreHistory() { try { const saved = JSON.parse(stored.get('savedHistory.v1', 'null')); if (!saved) return; state.history = Array.isArray(saved.history) ? saved.history.slice(-12) : []; if (Array.isArray(saved.messages) && saved.messages.length) { $('messages').innerHTML = ''; for (const item of saved.messages) { if (!item || typeof item.html !== 'string' || !['message user','message assistant','message assistant error'].includes(item.className)) continue; const el = document.createElement('div'); el.className = item.className; el.innerHTML = item.html; $('messages').appendChild(el); } $('messages').scrollTop = $('messages').scrollHeight; } } catch {} }
function enterVisionBot() { $('welcomeGate').classList.add('leaving'); setTimeout(() => { $('welcomeGate').classList.add('hidden'); }, 600); }
function showInstallHelp(target) {
  const message = target === 'iphone'
    ? 'On iPhone: open this website in Safari, tap the Share button, scroll and choose “Add to Home Screen”, then tap Add.'
    : 'On Android: open this website in Chrome, tap the ⋮ menu, then choose “Install app” or “Add to Home screen”. If an install prompt appears, accept it.';
  const welcomeFeedback = $('installFeedback'); if (welcomeFeedback) welcomeFeedback.textContent = message;
  const footerFeedback = $('footerInstallFeedback'); if (footerFeedback) footerFeedback.textContent = message;
}
async function requestAppInstall() {
  if (deferredInstallPrompt) {
    deferredInstallPrompt.prompt();
    const choice = await deferredInstallPrompt.userChoice.catch(() => null);
    deferredInstallPrompt = null;
    if (choice?.outcome === 'accepted') { showInstallHelp('android'); const el = $('installFeedback'); if (el) el.textContent = 'Install prompt accepted. Follow any final confirmation shown by your browser.'; toast('Vision Bot install prompt accepted.'); }
    else showInstallHelp('android');
    return;
  }
  showInstallHelp('android');
}
function initInstallExperience() {
  window.addEventListener('beforeinstallprompt', event => { event.preventDefault(); deferredInstallPrompt = event; });
  window.addEventListener('appinstalled', () => { const el = $('installFeedback'); if (el) el.textContent = 'Vision Bot has been installed on this device.'; const footer = $('footerInstallFeedback'); if (footer) footer.textContent = 'Vision Bot has been installed on this device.'; });
  $('getStarted').addEventListener('click', () => { $('welcomeStepStart').classList.add('hidden'); $('welcomeInstallStep').classList.remove('hidden'); });
  $('androidInstallBtn').addEventListener('click', requestAppInstall);
  $('iphoneInstallBtn').addEventListener('click', () => showInstallHelp('iphone'));
  $('footerAndroidInstall').addEventListener('click', requestAppInstall);
  $('footerIphoneHelp').addEventListener('click', () => { showInstallHelp('iphone'); document.getElementById('install-app').scrollIntoView({behavior:'smooth',block:'center'}); });
  $('continueFromInstall').addEventListener('click', () => { $('welcomeInstallStep').classList.add('hidden'); $('welcomeProfile').classList.remove('hidden'); $('welcomeName').focus(); });
  $('backToStart').addEventListener('click', () => { $('welcomeInstallStep').classList.add('hidden'); $('welcomeStepStart').classList.remove('hidden'); });
}
function initWelcome() { const remembered = stored.get('welcomeRemembered', 'false') === 'true'; if (remembered) { enterVisionBot(); return; } $('welcomeProfile').addEventListener('submit', e => { e.preventDefault(); const name = $('welcomeName').value.trim(); if (name) stored.set('name', name); if ($('rememberDevice').checked) stored.set('welcomeRemembered', 'true'); updateGreeting(); enterVisionBot(); }); }
function escapeHtml(s) { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function formatText(s) { return escapeHtml(s).replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/`([^`]+)`/g, '<code>$1</code>'); }
function addMessage(role, text, isError = false) {
  const empty = document.querySelector('.empty-chat'); if (empty) empty.remove();
  const el = document.createElement('div'); el.className = `message ${role === 'user' ? 'user' : 'assistant'}${isError ? ' error' : ''}`;
  const speaker = role === 'user' ? 'YOU' : (isError ? 'SYSTEM MESSAGE' : ($('roleSelect').selectedOptions[0]?.text.split(' · ')[0] || 'J.A.R.V.I.S.'));
  el.innerHTML = `<span class="speaker">${escapeHtml(speaker)}</span><div>${formatText(text)}</div>`;
  $('messages').appendChild(el); $('messages').scrollTop = $('messages').scrollHeight; return el;
}
function showTyping() { const el = document.createElement('div'); el.className = 'typing'; el.id = 'typing'; el.textContent = 'Vision Bot is thinking…'; $('messages').appendChild(el); $('messages').scrollTop = $('messages').scrollHeight; }
function removeTyping() { $('typing')?.remove(); }
function setBusy(value) { state.busy = value; $('sendBtn').disabled = value; $('sendBtn').textContent = value ? 'Thinking…' : 'Send ↗'; $('systemState').lastElementChild.textContent = value ? 'PROCESSING REQUEST' : 'J.A.R.V.I.S. READY'; }
async function sendMessage(textOverride) {
  if (state.busy) return;
  const message = (textOverride ?? $('messageInput').value).trim();
  if (!message && !state.image) { $('messageInput').focus(); return; }
  const key = stored.get('apiKey');
  if (!$('connection').classList.contains('online') && !key) { openSettings(); setFeedback('Add your Gemini API key before sending a message.', true); return; }
  if (message) addMessage('user', message + (state.image ? `\n[Image attached: ${state.image.name}]` : ''));
  else addMessage('user', `[Please analyze this image: ${state.image.name}]`);
  $('messageInput').value = ''; $('messageInput').style.height = 'auto';
  const imageForRequest = state.image ? { data: state.image.data, mimeType: state.image.mimeType } : null;
  state.image = null; $('imagePreview').classList.add('hidden'); $('imageInput').value = '';
  setBusy(true); showTyping();
  try {
    const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message, role: $('roleSelect').value, history: state.history, apiKey: key, image: imageForRequest, memory: stored.get('feature.memory', 'false') === 'true' ? stored.get('memoryNotes', '') : '' }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    removeTyping(); addMessage('model', data.answer);
    if (message) state.history.push({ role: 'user', text: message });
    state.history.push({ role: 'model', text: data.answer }); state.history = state.history.slice(-12); saveHistory();
    if ($('speakReplies').checked) speak(data.answer);
  } catch (err) { removeTyping(); addMessage('model', err.message || 'Something went wrong.', true); }
  finally { setBusy(false); }
}
function speak(text) { if (!('speechSynthesis' in window)) { toast('Speech output is not supported in this browser.'); return; } window.speechSynthesis.cancel(); const utterance = new SpeechSynthesisUtterance(text.slice(0, 4500)); utterance.rate = 1; utterance.pitch = .96; window.speechSynthesis.speak(utterance); }
function openSettings() { $('displayName').value = stored.get('name'); $('apiKey').value = stored.get('apiKey'); $('speakReplies').checked = stored.get('speakReplies', 'true') === 'true'; $('voiceFirst').checked = stored.get('voiceFirst', 'false') === 'true'; $('settingsModal').classList.remove('hidden'); setFeedback(''); }
function closeSettings() { $('settingsModal').classList.add('hidden'); }
async function checkServer() {
  try { const r = await fetch('/api/status'); const data = await r.json(); $('connection').classList.add('online'); $('connection').classList.remove('offline'); $('connection').innerHTML = '<i></i> System connected'; if (data.serverKeyConfigured) $('connection').title = 'Gemini key is configured on the server'; }
  catch { $('connection').classList.add('offline'); $('connection').innerHTML = '<i></i> Server unavailable'; }
}
function setupRecognition() {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) { toast('Speech recognition is not available here. Type your message instead.'); return; }
  if (state.listening && state.recognition) { state.recognition.stop(); return; }
  const rec = new Recognition(); state.recognition = rec; rec.lang = stored.get('voiceLanguage', 'hi-IN'); rec.interimResults = true; rec.continuous = false;
  rec.onstart = () => { state.listening = true; $('talkLabel').textContent = 'Listening… tap to stop'; $('talkBtn').classList.add('listening'); $('systemState').lastElementChild.textContent = 'LISTENING'; };
  rec.onresult = event => { let finalText = ''; let interim = ''; for (let i = event.resultIndex; i < event.results.length; i++) { if (event.results[i].isFinal) finalText += event.results[i][0].transcript; else interim += event.results[i][0].transcript; } $('messageInput').value = (finalText || interim).trim(); if (finalText.trim()) { $('messageInput').value = finalText.trim(); if (stored.get('voiceFirst', 'false') === 'true') sendMessage(finalText.trim()); } };
  rec.onerror = event => toast(event.error === 'not-allowed' ? 'Microphone permission was denied.' : `Voice input: ${event.error}. You can type instead.`);
  rec.onend = () => { state.listening = false; $('talkLabel').textContent = 'Tap to talk'; $('talkBtn').classList.remove('listening'); if (!state.busy) $('systemState').lastElementChild.textContent = 'J.A.R.V.I.S. READY'; };
  try { rec.start(); } catch { toast('Could not start voice input. Try again.'); }
}
$('chatForm').addEventListener('submit', e => { e.preventDefault(); sendMessage(); });
$('messageInput').addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); $('chatForm').requestSubmit(); } });
$('messageInput').addEventListener('input', () => { $('messageInput').style.height = 'auto'; $('messageInput').style.height = Math.min($('messageInput').scrollHeight, 150) + 'px'; });
$('talkBtn').addEventListener('click', setupRecognition);
$('settingsOpen').addEventListener('click', openSettings); $('settingsCard').addEventListener('click', openSettings); $('settingsClose').addEventListener('click', closeSettings);
$('settingsModal').addEventListener('click', e => { if (e.target.dataset.close) closeSettings(); });
$('settingsForm').addEventListener('submit', e => { e.preventDefault(); stored.set('name', $('displayName').value.trim()); stored.set('apiKey', $('apiKey').value.trim()); stored.set('speakReplies', String($('speakReplies').checked)); stored.set('voiceFirst', String($('voiceFirst').checked)); updateGreeting(); setFeedback('Settings saved on this browser.'); toast('Vision Bot settings saved.'); setTimeout(closeSettings, 600); });
$('testKey').addEventListener('click', async () => { const key = $('apiKey').value.trim() || stored.get('apiKey'); if (!key) return setFeedback('Enter your Gemini API key first.', true); setFeedback('Testing connection…'); try { const r = await fetch('/api/chat', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ message: 'Reply with exactly: Connection successful.', apiKey: key, role: 'jarvis', history: [] }) }); const d = await r.json(); if (!r.ok) throw new Error(d.error || 'Connection failed'); setFeedback('Connection successful. Gemini replied: ' + d.answer.slice(0, 90)); } catch (err) { setFeedback(err.message, true); } });
$('imageInput').addEventListener('change', async e => { const file = e.target.files?.[0]; if (!file) return; if (file.size > 7 * 1024 * 1024) { toast('Choose an image smaller than 7 MB.'); e.target.value = ''; return; } if (!['image/png','image/jpeg','image/webp'].includes(file.type)) { toast('Please choose a PNG, JPEG, or WebP image.'); return; } const data = await new Promise((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1]); reader.onerror = reject; reader.readAsDataURL(file); }); state.image = { name: file.name, data, mimeType: file.type }; $('imageName').textContent = 'Image ready: ' + file.name; $('imagePreview').classList.remove('hidden'); $('messageInput').placeholder = 'Ask a question about this image…'; $('messageInput').focus(); });
$('screenBtn').addEventListener('click', () => { toast('Choose a screenshot or image manually. Nothing is captured automatically.'); $('imageInput').click(); });
$('removeImage').addEventListener('click', () => { state.image = null; $('imagePreview').classList.add('hidden'); $('imageInput').value = ''; });
$('clearChat').addEventListener('click', () => { state.history = []; $('messages').innerHTML = '<div class="empty-chat"><div class="empty-mark">✦</div><b>Your conversation starts here</b><p>Ask a question, dictate a message, or choose an image to analyze.</p></div>'; stored.set('savedHistory.v1', ''); window.speechSynthesis?.cancel(); });
document.querySelectorAll('[data-prompt]').forEach(btn => btn.addEventListener('click', () => { $('messageInput').value = btn.dataset.prompt; $('messageInput').focus(); $('chatForm').requestSubmit(); }));
// Master Brain prototype controls. These settings do not imply native device permissions or integrations.
const featureStatus = {
  wakeWord: 'Planned: browser tabs cannot guarantee always-on background listening.',
  appLauncher: 'Limited: website links can open; native app launching needs a companion app.',
  memory: 'Ready: notes are sent with future prompts from this browser.',
  clipboard: 'Limited: clipboard access needs browser support and permission; no cross-device sync yet.',
  fileTransfer: 'Limited: file selection works locally; transfer requires a paired receiver.',
  remoteDesktop: 'Planned: secure authenticated companion software is required.',
  websiteBuilder: 'Ready for coding assistance; preview/export/publishing require additional tools.',
  emergency: 'Ready: shows locally stored guidance. It cannot contact emergency services automatically.',
  notifications: 'Limited: browser notification permission and integrations are required.',
  customVoice: 'Ready: uses voices available on this device; premium voice APIs are not bundled.',
  debate: 'Planned: real multi-model debate requires extra provider connections and quota.',
  emotion: 'Ready: expressive language/personality, not proof of human-like subjective feelings.',
  webResearch: 'Needs API: live research is unavailable until a real search integration is connected.',
  automation: 'Limited: planning works; external actions require tools and explicit approvals.',
  truthChecks: 'Ready: assistant is instructed to separate uncertainty and assumptions.',
  costManager: 'Planned: exact provider cost tracking depends on provider usage endpoints.'
};
function initFeatureControls() {
  document.querySelectorAll('[data-feature]').forEach(input => {
    input.checked = stored.get('feature.' + input.dataset.feature, 'false') === 'true';
    input.addEventListener('change', () => {
      stored.set('feature.' + input.dataset.feature, String(input.checked));
      $('featureFeedback').textContent = (input.checked ? 'Preference enabled: ' : 'Preference disabled: ') + featureStatus[input.dataset.feature];
      if (input.dataset.feature === 'memory' && input.checked) $('memoryNotes').focus();
      if (input.dataset.feature === 'customVoice' && input.checked) toast('Voice output uses voices installed in your browser/device.');
      if (input.dataset.feature === 'wakeWord' && input.checked) toast('Wake word is planned only; tap-to-talk remains the active microphone mode.');
    });
  });
  $('memoryNotes').value = stored.get('memoryNotes', '');
}
$('saveMemory').addEventListener('click', () => { stored.set('memoryNotes', $('memoryNotes').value.trim()); stored.set('feature.memory', 'true'); const toggle = document.querySelector('[data-feature="memory"]'); if (toggle) toggle.checked = true; $('featureFeedback').textContent = 'Memory saved on this browser. It will be included with future AI requests until you clear it.'; toast('Memory saved.'); });
$('clearMemory').addEventListener('click', () => { stored.set('memoryNotes', ''); $('memoryNotes').value = ''; $('featureFeedback').textContent = 'Saved memory notes cleared from this browser.'; toast('Memory cleared.'); });
$('emergencyBtn').addEventListener('click', () => { const notes = stored.get('emergencyNotes', 'Keep your phone charged. Use your device emergency-call feature for urgent danger. Keep trusted contacts and local emergency numbers saved in your phone.'); $('featureFeedback').textContent = 'OFFLINE EMERGENCY PANEL: ' + notes + ' This panel is informational only and cannot place calls automatically.'; });
$('clipboardBtn').addEventListener('click', async () => { try { if (!navigator.clipboard?.readText) throw new Error('Clipboard read is unsupported or permission is unavailable.'); const value = await navigator.clipboard.readText(); $('featureFeedback').textContent = value ? 'Clipboard read (local only): ' + value.slice(0, 240) : 'Clipboard is empty.'; } catch (e) { $('featureFeedback').textContent = 'Clipboard unavailable: ' + e.message + ' Use HTTPS and grant browser permission. Cross-device clipboard is not implemented.'; } });
$('fileTransferBtn').addEventListener('click', () => $('transferFileInput').click());
$('transferFileInput').addEventListener('change', () => { const f = $('transferFileInput').files?.[0]; if (f) $('featureFeedback').textContent = `Selected ${f.name} (${Math.ceil(f.size/1024)} KB). This prototype has not sent the file anywhere; secure paired-device transfer is a future integration.`; });
initFeatureControls();
updateGreeting(); restoreHistory(); initInstallExperience(); initWelcome(); checkServer();
if (stored.get('voiceFirst', 'false') === 'true') $('talkLabel').textContent = 'Tap to talk';
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('/sw.js').catch(() => {});
