// UpGrid economic-layer Lambda.
//
// Browser → THIS Lambda → Claude Platform on AWS native Messages API (/v1/messages).
// This is NOT Amazon Bedrock and NOT InvokeModel. The model id carries no "anthropic." prefix.
//
// The workspace API key is read from the environment (ANTHROPIC_AWS_API_KEY) and sent as the
// x-api-key header. It is never hardcoded, never printed, and never returned to the browser.
//
// Runtime: Node.js 20+ (uses the built-in global fetch). No npm dependencies.

// === MODEL: one-line change. Confirm this id is in your workspace's model list (GET /v1/models). ===
const MODEL_ID = 'claude-opus-4-8'; // Claude Opus 4.8

const ANTHROPIC_VERSION = '2023-06-01';
const MAX_TOKENS = 4096; // Messages API requires the field; keep generous, do not cap tightly.

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'content-type',
};

const SYSTEM_PROMPT = [
  'You are the economic dispatch layer for UpGrid, an integrated solid-state transformer + battery',
  '(SST+BESS) cabinet that buffers data-center demand transients on a DC bus so the AC draw stays',
  'under a fixed grid interconnection envelope. You decide the ECONOMICS only; you never control',
  'hardware. For each compute job, choose exactly one action:',
  '  - "accept": run it now on the grid (it fits the headroom and the price clears).',
  '  - "defer": delay a sheddable job to a cheaper window to reserve headroom/battery for premium work.',
  '  - "shed": drop a sheddable job entirely (last resort).',
  '  - "battery": hold the job on the DC battery because the grid is momentarily short.',
  'Decision rules:',
  '  - Non-sheddable SLA work is PROTECTED: accept if it fits the headroom, otherwise hold it on',
  '    "battery". Never shed SLA work.',
  '  - Sheddable jobs: accept if they fit the headroom and clear ~$2.0/kWh effective in peak windows',
  '    (off-peak they always clear); otherwise "defer" to reserve battery for premium work.',
  '  - "shed" only when there is no headroom AND dcSoc < 35.',
  'Return ONLY a raw JSON object, no prose and no code fences:',
  '{"action":"accept"|"defer"|"shed"|"battery","reason":"<one sentence citing the actual bid,',
  'headroom, SoC, and price multiplier>"}',
].join(' ');

function reply(statusCode, bodyObj) {
  return {
    statusCode,
    headers: { 'content-type': 'application/json', ...CORS },
    body: JSON.stringify(bodyObj),
  };
}

function parseDecision(text) {
  let s = String(text || '')
    .trim()
    .replace(/^```(?:json)?/i, '')
    .replace(/```$/, '')
    .trim();
  const a = s.indexOf('{');
  const b = s.lastIndexOf('}');
  if (a >= 0 && b > a) s = s.slice(a, b + 1);
  const obj = JSON.parse(s);
  const action = String(obj.action || '').toLowerCase();
  if (!['accept', 'defer', 'shed', 'battery'].includes(action)) throw new Error('invalid action');
  const reason = String(obj.reason || '').trim();
  if (!reason) throw new Error('empty reason');
  return { action, reason };
}

export const handler = async (event) => {
  const method = event?.requestContext?.http?.method || event?.httpMethod || 'POST';
  if (method === 'OPTIONS') return { statusCode: 204, headers: CORS, body: '' };

  const apiKey = process.env.ANTHROPIC_AWS_API_KEY;
  if (!apiKey) return reply(500, { error: 'ANTHROPIC_AWS_API_KEY is not configured' });

  const region = process.env.CLAUDE_AWS_REGION || process.env.AWS_REGION || 'us-east-2';
  const workspaceId =
    process.env.ANTHROPIC_WORKSPACE_ID || process.env.ANTHROPIC_AWS_WORKSPACE_ID || '';

  let ctx;
  try {
    let raw = event?.body ?? '{}';
    if (event?.isBase64Encoded && typeof raw === 'string') {
      raw = Buffer.from(raw, 'base64').toString('utf8');
    }
    ctx = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return reply(400, { error: 'invalid JSON body' });
  }

  const job = ctx?.job ?? {};
  const userMessage =
    'Decide for this compute job. Respond with ONLY the JSON object.\n' +
    JSON.stringify({
      job: { label: job.label, bid: job.bid, kw: job.kw, sheddable: job.sheddable },
      envelopeKw: ctx?.envelopeKw,
      committedKw: ctx?.committedKw,
      headroomKw: ctx?.headroomKw,
      dcSoc: ctx?.dcSoc,
      peakWindow: ctx?.peakWindow,
      priceMult: ctx?.priceMult,
    });

  const url = `https://aws-external-anthropic.${region}.api.aws/v1/messages`;
  const headers = {
    'content-type': 'application/json',
    'x-api-key': apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
  };
  // Short-term workspace keys are usually workspace-scoped; send the id only if provided.
  if (workspaceId) headers['anthropic-workspace-id'] = workspaceId;

  try {
    const upstream = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: MODEL_ID,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: userMessage }],
      }),
    });

    if (!upstream.ok) {
      const detail = await upstream.text().catch(() => '');
      return reply(502, { error: `upstream ${upstream.status}`, detail: detail.slice(0, 400) });
    }

    const data = await upstream.json();
    const text = (data?.content || [])
      .filter((b) => b && b.type === 'text')
      .map((b) => b.text)
      .join('')
      .trim();

    const decision = parseDecision(text);
    return reply(200, { ...decision, source: 'live', model: MODEL_ID });
  } catch (err) {
    return reply(502, { error: 'request failed', detail: String(err?.message || err).slice(0, 200) });
  }
};
