'use strict';
/**
 * imagegen.js — 로컬/원격 이미지 생성 API 클라이언트 ("주소만 지정하면 동작").
 *
 * 설정 우선순위: deckSpec.imageApi  >  환경변수.
 *   deckSpec.imageApi = { url, kind, model, key }
 *   env: BP_IMAGE_API_URL / BP_IMAGE_API_KIND / BP_IMAGE_API_MODEL / BP_IMAGE_API_KEY
 *
 * kind 지원: 'openai'(기본, OpenAI 호환 images endpoint) | 'a1111'(SD-WebUI) | 'generic'.
 * 응답에서 base64 PNG를 여러 형태로 자동 추출하거나, 바이너리 이미지면 그대로 저장.
 *
 * 외부 의존 0 (node http/https). 미설정·실패·타임아웃이면 null 반환 →
 * 덱은 그라데이션 배경으로 graceful 폴백한다(이미지 없이도 빌드 성공).
 */
const http = require('http');
const https = require('https');
const { URL } = require('url');
const fs = require('fs');

function _request(urlStr, { method = 'POST', headers = {}, body = null, timeout = 180000 } = {}) {
  return new Promise((resolve, reject) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return reject(e); }
    const lib = u.protocol === 'https:' ? https : http;
    const data = body == null ? null : (typeof body === 'string' ? body : JSON.stringify(body));
    const opt = { method, headers: Object.assign({}, headers), timeout };
    if (data) {
      opt.headers['Content-Type'] = opt.headers['Content-Type'] || 'application/json';
      opt.headers['Content-Length'] = Buffer.byteLength(data);
    }
    const req = lib.request(u, opt, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, buf: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(new Error('image API timeout')); });
    if (data) req.write(data);
    req.end();
  });
}

// 흔한 응답 형태에서 base64 png 문자열을 뽑는다.
function _b64FromAny(obj) {
  if (!obj) return null;
  if (typeof obj === 'string') return obj.replace(/^data:image\/\w+;base64,/, '');
  const d0 = obj.data && obj.data[0];
  const cands = [
    obj.b64_json, obj.image, obj.image_base64, obj.imageBase64,
    d0 && (d0.b64_json || d0.image || d0.b64),
    Array.isArray(obj.images) && obj.images[0],
    obj.artifacts && obj.artifacts[0] && obj.artifacts[0].base64,
    obj.output && (Array.isArray(obj.output) ? obj.output[0] : obj.output)
  ].filter(Boolean);
  for (const c of cands) {
    if (typeof c === 'string' && c.length > 100) return c.replace(/^data:image\/\w+;base64,/, '');
  }
  return null;
}

// 설정 해석: deckSpec.imageApi 또는 환경변수. 없으면 null.
function resolveConfig(deckSpec) {
  const fromSpec = deckSpec && deckSpec.imageApi;
  if (fromSpec && fromSpec.url) return fromSpec;
  if (process.env.BP_IMAGE_API_URL) {
    return {
      url: process.env.BP_IMAGE_API_URL,
      kind: process.env.BP_IMAGE_API_KIND || 'openai',
      model: process.env.BP_IMAGE_API_MODEL,
      key: process.env.BP_IMAGE_API_KEY
    };
  }
  return null;
}

// prompt → outPath(PNG). 성공 시 outPath, 실패/미설정 시 null.
async function generate(prompt, cfg, outPath, opts = {}) {
  if (!cfg || !cfg.url || !prompt) return null;
  const kind = cfg.kind || 'openai';
  const w = opts.width || 1280, h = opts.height || 720;
  const headers = {};
  if (cfg.key) headers['Authorization'] = 'Bearer ' + cfg.key;
  let url, body;
  try {
    if (kind === 'a1111') {
      url = cfg.url.replace(/\/$/, '') + '/sdapi/v1/txt2img';
      body = { prompt, negative_prompt: opts.negative || '', steps: opts.steps || 20, width: w, height: h, cfg_scale: opts.cfg || 4, sampler_name: opts.sampler || 'Euler a' };
    } else if (kind === 'comfy') {
      // ComfyUI는 워크플로 JSON이 필요 → generic처럼 prompt만 보내고 서버측 래퍼를 가정.
      url = cfg.url.replace(/\/$/, '') + '/prompt';
      body = { prompt, width: w, height: h, model: cfg.model };
    } else if (kind === 'openai') {
      const base = cfg.url.replace(/\/$/, '');
      url = base.includes('/images') ? base : base + '/v1/images/generations';
      body = { model: cfg.model || 'default', prompt, size: `${w}x${h}`, n: 1, response_format: 'b64_json' };
    } else { // generic — { prompt, width, height } → 응답에서 base64/바이너리 추출
      url = cfg.url;
      body = { prompt, width: w, height: h, model: cfg.model };
    }
    const res = await _request(url, { headers, body, timeout: opts.timeout || 180000 });
    if (!res || res.status >= 400) return null;
    const ct = String(res.headers['content-type'] || '');
    if (ct.startsWith('image/')) { fs.writeFileSync(outPath, res.buf); return outPath; }
    let parsed;
    try { parsed = JSON.parse(res.buf.toString('utf8')); } catch (e) { return null; }
    const b64 = _b64FromAny(parsed);
    if (!b64) return null;
    fs.writeFileSync(outPath, Buffer.from(b64, 'base64'));
    return outPath;
  } catch (e) {
    return null; // graceful — 이미지 없이 진행
  }
}

module.exports = { resolveConfig, generate, _b64FromAny };
