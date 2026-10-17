# Vision Bot — Master AI Brain Requirements & Implementation Plan

## Product goal
Vision Bot is the user-facing Master AI Brain. It understands the user's goal, creates a plan, routes work to six specialist roles, reviews evidence and risks, then returns one synthesized result with suggestions and next steps. Its personality can be expressive and emotionally aware, but the product must not claim that the AI has human subjective feelings.

## Six specialist roles
- **JARVIS** — general intelligence and conversation.
- **ULTRON** — research, source comparison and fact/assumption separation.
- **LEO** — coding, debugging and website-building assistance.
- **FRIDAY** — personal planning, reminders and routines.
- **EDITH** — analysis of user-supplied images/screenshots/files.
- **CALITH** — risk, privacy and safety review.

Roles can initially be prompts/workflows using the configured model. They are not separate AI models until separate provider endpoints are configured. The UI must not claim real delegation occurred unless the orchestration actually called those tools.

## Feature inventory
| Feature | Prototype status | Dependencies / implementation notes |
|---|---|---|
| Master Brain planner and final synthesis | Prompt/UI foundation | True multi-agent delegation needs server-side orchestrator and actual specialist calls. |
| Emotional personality | Prompt foundation | Expressive tone, empathy, avatar states; never assert literal human feelings. |
| Hinglish/Hindi/English | Browser speech + prompt | Speech recognition language support varies; automatic mixed-language detection may need realtime speech API. |
| Live low-latency voice | Not implemented | Requires a compatible real-time audio API, streaming transport, microphone permissions, interruption handling and provider quota. Browser TTS + speech recognition is not equivalent. |
| Hey JARVIS wake word | Planned | Native/background microphone service or supported wake-word SDK; browsers cannot reliably listen while closed/backgrounded. |
| Voice app launcher | Limited | Can open approved web URLs; launching native PC apps requires an installed companion agent and allowlist. |
| AI memory | Local notes prototype | Current notes stored in browser local storage. Production needs authenticated server-side storage, encryption, retention controls and edit/delete UI. Avoid sensitive details. |
| Universal clipboard | Local browser API check | Cross-device sync needs authenticated paired devices, encrypted transport and user consent. Clipboard read/write is browser permission/security constrained. |
| File transfer | File selection prototype | Real transfer needs device pairing, authenticated upload/download, encryption, file size/type limits and receiver approval. |
| Remote desktop | Not implemented | Companion service, secure pairing, short-lived credentials, view/control permissions, session logs and explicit approval. Never expose unauthenticated remote-control endpoints. |
| AI website builder | Coding assistance available | Real preview/build requires sandboxed execution; exporting is possible; publishing needs GitHub/hosting integration and per-action approval. |
| Offline emergency panel | Local guidance prototype | Can show saved contacts/instructions offline; cannot guarantee AI operation, call emergency services, or verify local emergency information without connectivity. |
| Smart notifications | Limited | Browser notification permission, service worker support, and optional calendar/task integrations. Background delivery differs by platform. |
| Custom assistant voice | Device voices | Use installed SpeechSynthesis voices; premium voices require an appropriate provider/API and consent for any cloned voice. |
| AI debate mode | Planned | Call two or more configured models or distinct specialist passes, then synthesize; disclose cost/quota and avoid fake independent consensus. |
| Live web research | Not implemented | Requires a search provider/tool, source URLs, retrieval dates and citation rendering. Never label model-only answers as live research. |
| Task automation | Planning only | Each action needs a supported integration, least-privilege permissions, visible action log and approval gates. |
| Truth/confidence checks | Prompt foundation | Label facts, assumptions, unknowns and verification state; do not present model confidence as calibrated probability. |
| Multi-AI cost manager | Planned | Provider-specific usage endpoints or usage logs; not every provider exposes exact real-time cost. |
| Image/document analysis | Image upload supports images | PDFs/documents need parsers and limits; screen capture must be explicit and permissioned. |
| Phone ↔ PC ecosystem | Not implemented | Paired companion app/service, device identity, encryption, revoke access, online status and audit log. |
| Secure login | Not implemented | Remembered browser profile is not authentication. Production needs trusted identity/session management. |
| Approval & safety gate | Prompt foundation | Enforce server-side allowlists and explicit confirmations for publishing, sending, deleting, remote control or purchases. |
| Diagnostics and status | Basic server status | Add provider health, quota/error categories, redacted logs and safe troubleshooting. Never log API keys. |

## API key and privacy requirements
- The existing prototype lets the user enter a key in the app, but it stores that key in browser local storage. This is acceptable only for private local testing, not a public multi-user app.
- Production should offer an in-app provider setup screen while storing secrets on an authenticated server-side secret store (for example, platform-managed secrets). The API key must never be embedded in public frontend code, committed to GitHub, or exposed in logs.
- Do not ask the user to paste a key into chat. Add provider-specific connection tests, quota/error explanations and an option to disconnect/delete credentials.
- Memory is opt-in, browser-local in this prototype, and user-editable/clearable. Avoid storing sensitive personal information by default.

## Recommended implementation phases
1. **Foundation:** responsive mobile-first UI, six roles, Master Brain prompt, settings, opt-in memory, diagnostics, truthful feature-status labels.
2. **Orchestration:** server-side task planner, specialist routing, bounded specialist calls, final synthesis, timeout/retry and cost guardrails.
3. **Voice:** tap-to-talk first; add real-time streaming voice only after choosing a compatible API and testing Hindi/Hinglish, interruption and latency.
4. **Website studio:** sandboxed preview, code diff, export ZIP, approval before publishing.
5. **Device ecosystem:** pairing/authentication, clipboard and file transfer, then remote desktop with least privilege and session approvals.
6. **Automation:** reminders, notifications, app launching and routines through explicitly connected integrations.
7. **Quality/security:** mobile/browser testing, API error handling, rate limits, privacy review, accessibility and recovery paths.

## Approval and release policy
- No deployment, public publishing, repository replacement, or release is authorized by this plan.
- Keep changes in a private working copy/branch until the user reviews and explicitly approves the exact release action.
- Report each feature as Working, Partial, Planned, or Blocked by dependency. UI switches must not imply unavailable device/API functions are active.

## Prototype files updated
- `public/index.html`: adds Master Brain Control Room and advanced capability inventory.
- `public/styles.css`: responsive control-room styling.
- `public/app.js`: opt-in local memory notes, feature preference toggles, offline information panel, clipboard capability check and local file-selection status.
- `server.js`: Master Brain/personality system prompt and user-approved memory context.

## Validation completed in this archive
- `node --check server.js`
- `node --check public/app.js`

Live Gemini API access, real-time voice, native wake word, cross-device transfer, remote desktop, web search, notifications and publishing were not verified or implemented as full integrations.
