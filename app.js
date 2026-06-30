const els = {
  apiKey: document.getElementById('apiKey'),
  endpoint: document.getElementById('endpoint'),
  modelName: document.getElementById('modelName'),
  rememberApi: document.getElementById('rememberApi'),
  clearConfig: document.getElementById('clearConfig'),
  mediaInput: document.getElementById('mediaInput'),
  dropZone: document.getElementById('dropZone'),
  frameCount: document.getElementById('frameCount'),
  maxSize: document.getElementById('maxSize'),
  preview: document.getElementById('preview'),
  sceneType: document.getElementById('sceneType'),
  labels: document.getElementById('labels'),
  analyzeBtn: document.getElementById('analyzeBtn'),
  status: document.getElementById('status'),
  resultCards: document.getElementById('resultCards'),
  rawOutput: document.getElementById('rawOutput'),
  copyJson: document.getElementById('copyJson'),
};

let selectedFile = null;
let lastStructuredResult = null;

const STORAGE_KEYS = {
  apiKey: 'qwen_action_api_key',
  endpoint: 'qwen_action_endpoint',
  model: 'qwen_action_model',
};

function setStatus(message, type = '') {
  els.status.textContent = message;
  els.status.className = `status ${type}`.trim();
}

function loadLocalConfig() {
  const endpoint = localStorage.getItem(STORAGE_KEYS.endpoint);
  const model = localStorage.getItem(STORAGE_KEYS.model);
  const apiKey = localStorage.getItem(STORAGE_KEYS.apiKey);
  if (endpoint) els.endpoint.value = endpoint;
  if (model) els.modelName.value = model;
  if (apiKey) {
    els.apiKey.value = apiKey;
    els.rememberApi.checked = true;
  }
}

function saveLocalConfig() {
  localStorage.setItem(STORAGE_KEYS.endpoint, els.endpoint.value.trim());
  localStorage.setItem(STORAGE_KEYS.model, els.modelName.value);
  if (els.rememberApi.checked) {
    localStorage.setItem(STORAGE_KEYS.apiKey, els.apiKey.value.trim());
  } else {
    localStorage.removeItem(STORAGE_KEYS.apiKey);
  }
}

function clearLocalConfig() {
  Object.values(STORAGE_KEYS).forEach((key) => localStorage.removeItem(key));
  els.apiKey.value = '';
  els.rememberApi.checked = false;
  setStatus('已清除本地配置。');
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes)) return '未知大小';
  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }
  return `${size.toFixed(size >= 10 || unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function updatePreview(file) {
  if (!file) {
    els.preview.className = 'preview empty';
    els.preview.innerHTML = '<p>未选择文件</p>';
    return;
  }

  const objectUrl = URL.createObjectURL(file);
  const safeName = escapeHtml(file.name);
  const meta = `${safeName} · ${formatBytes(file.size)} · ${escapeHtml(file.type || '未知类型')}`;

  els.preview.className = 'preview';
  if (file.type.startsWith('image/')) {
    els.preview.innerHTML = `<img src="${objectUrl}" alt="预览图片"><div class="preview__meta">${meta}</div>`;
  } else if (file.type.startsWith('video/')) {
    els.preview.innerHTML = `<video src="${objectUrl}" controls muted></video><div class="preview__meta">${meta}</div>`;
  } else {
    els.preview.className = 'preview empty';
    els.preview.innerHTML = `<p>不支持的文件类型：${meta}</p>`;
  }
}

function fileToImageDataUrl(file, maxSide, quality = 0.86) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('读取图片失败。'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('图片解码失败。'));
      img.onload = () => {
        const { width, height } = fitSize(img.naturalWidth, img.naturalHeight, maxSide);
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function fitSize(width, height, maxSide) {
  if (width <= maxSide && height <= maxSide) return { width, height };
  const scale = maxSide / Math.max(width, height);
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

function waitForEvent(target, eventName, timeout = 10000) {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      cleanup();
      reject(new Error(`等待 ${eventName} 超时。`));
    }, timeout);

    function cleanup() {
      window.clearTimeout(timer);
      target.removeEventListener(eventName, onEvent);
      target.removeEventListener('error', onError);
    }

    function onEvent() {
      cleanup();
      resolve();
    }

    function onError() {
      cleanup();
      reject(new Error('媒体文件加载失败。'));
    }

    target.addEventListener(eventName, onEvent, { once: true });
    target.addEventListener('error', onError, { once: true });
  });
}

async function extractVideoFrames(file, frameCount, maxSide, quality = 0.82) {
  const url = URL.createObjectURL(file);
  const video = document.createElement('video');
  video.preload = 'metadata';
  video.muted = true;
  video.playsInline = true;
  video.src = url;

  try {
    await waitForEvent(video, 'loadedmetadata');
    const duration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 1;
    const count = Math.max(1, Math.min(frameCount, 8));
    const canvas = document.createElement('canvas');
    const { width, height } = fitSize(video.videoWidth || 640, video.videoHeight || 360, maxSide);
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    const frames = [];

    for (let i = 0; i < count; i += 1) {
      const t = duration <= 0.3 ? 0 : Math.min(duration - 0.05, (duration * (i + 1)) / (count + 1));
      video.currentTime = Math.max(0, t);
      await waitForEvent(video, 'seeked');
      ctx.drawImage(video, 0, 0, width, height);
      frames.push(canvas.toDataURL('image/jpeg', quality));
      setStatus(`正在抽取视频关键帧：${i + 1}/${count}`);
    }

    const fps = Math.max(0.1, Math.min(10, Number((count / Math.max(duration, 1)).toFixed(2))));
    return { frames, fps, duration };
  } finally {
    URL.revokeObjectURL(url);
  }
}

function buildPrompt({ sceneType, labels, isVideo }) {
  const mediaDesc = isVideo
    ? '输入内容是一段短视频按时间顺序抽取的关键帧。请综合帧间变化判断动作，不要只描述单帧。'
    : '输入内容是一张图片。请基于可见人体姿态、物体交互和场景线索判断动作。';

  return `你是一个专业的人体动作识别与安全风险评估智能体。任务场景：${sceneType}。
${mediaDesc}

候选动作标签集：${labels}

请完成以下任务：
1. 判断画面中的主要人体动作；
2. 判断动作类别，例如日常动作、劳动动作、异常动作、安全风险动作；
3. 评估风险等级，只能使用：低风险、中风险、高风险、未知；
4. 给出简洁、专业、可执行的安全建议；
5. 不要识别人物身份，不要猜测姓名、年龄、民族等个人身份信息。

必须只输出严格 JSON，不要输出 Markdown，不要输出代码块，不要添加 JSON 之外的文字。JSON 字段如下：
{
  "action": "主要动作，尽量从候选动作标签集中选择",
  "category": "动作类别",
  "risk_level": "低风险/中风险/高风险/未知",
  "confidence": 0.0,
  "persons_count": 0,
  "scene": "场景简述",
  "description": "动作识别依据，不超过80字",
  "suggestion": "安全或行为建议，不超过80字",
  "evidence": ["可见证据1", "可见证据2"],
  "labels": ["相关标签1", "相关标签2"]
}`;
}

function buildContentPayload({ mediaPayload, prompt, isVideo }) {
  if (isVideo) {
    return [
      {
        type: 'video',
        video: mediaPayload.frames,
        fps: mediaPayload.fps,
        min_pixels: 4096,
        max_pixels: 655360,
      },
      { type: 'text', text: prompt },
    ];
  }

  return [
    {
      type: 'image_url',
      image_url: { url: mediaPayload.dataUrl },
      min_pixels: 4096,
      max_pixels: 1048576,
    },
    { type: 'text', text: prompt },
  ];
}

async function callQwenVL({ apiKey, endpoint, model, content }) {
  const payload = {
    model,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
    temperature: 0.1,
  };

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let data = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }

  if (!response.ok) {
    const message = typeof data === 'object'
      ? JSON.stringify(data, null, 2)
      : text;
    throw new Error(`接口请求失败：HTTP ${response.status}\n${message}`);
  }

  const contentText = data?.choices?.[0]?.message?.content;
  if (!contentText) {
    throw new Error(`模型响应中没有可解析内容：\n${JSON.stringify(data, null, 2)}`);
  }

  return { rawData: data, contentText };
}

function parseModelJson(text) {
  const cleaned = String(text)
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    const start = cleaned.indexOf('{');
    const end = cleaned.lastIndexOf('}');
    if (start >= 0 && end > start) {
      return JSON.parse(cleaned.slice(start, end + 1));
    }
    throw new Error('模型输出不是有效 JSON。请查看“原始模型输出”。');
  }
}

function riskClass(riskLevel) {
  const text = String(riskLevel || '未知');
  if (text.includes('高')) return 'risk-high';
  if (text.includes('中')) return 'risk-mid';
  if (text.includes('低')) return 'risk-low';
  return 'risk-unknown';
}

function card(label, value, extraClass = '') {
  return `
    <div class="metric-card ${extraClass}">
      <p class="metric-card__label">${escapeHtml(label)}</p>
      <p class="metric-card__value">${value}</p>
    </div>
  `;
}

function renderResult(result) {
  const risk = escapeHtml(result.risk_level || '未知');
  const riskHtml = `<span class="risk-badge ${riskClass(result.risk_level)}">${risk}</span>`;
  const confidence = Number(result.confidence);
  const confidenceText = Number.isFinite(confidence) ? `${Math.round(confidence * 100)}%` : '未知';
  const evidence = Array.isArray(result.evidence) ? result.evidence.join('；') : (result.evidence || '无');
  const labels = Array.isArray(result.labels) ? result.labels.join('、') : (result.labels || '无');

  els.resultCards.className = 'result-cards';
  els.resultCards.innerHTML = [
    card('主要动作', escapeHtml(result.action || '未知')),
    card('动作类别', escapeHtml(result.category || '未知')),
    card('风险等级', riskHtml),
    card('置信度', escapeHtml(confidenceText)),
    card('人数估计', escapeHtml(result.persons_count ?? '未知')),
    card('场景简述', escapeHtml(result.scene || '未知'), 'wide'),
    card('相关标签', escapeHtml(labels), 'wide'),
    card('识别依据', escapeHtml(result.description || '无'), 'wide'),
    card('安全建议', escapeHtml(result.suggestion || '无'), 'wide'),
    card('可见证据', escapeHtml(evidence), 'full'),
  ].join('');
}

async function analyze() {
  const apiKey = els.apiKey.value.trim();
  const endpoint = els.endpoint.value.trim();
  const model = els.modelName.value.trim();
  const maxSide = Number(els.maxSize.value);
  const frameCount = Number(els.frameCount.value);

  if (!apiKey) {
    setStatus('请先填写 API Key。', 'error');
    return;
  }
  if (!endpoint) {
    setStatus('请填写 OpenAI 兼容接口地址。', 'error');
    return;
  }
  if (!selectedFile) {
    setStatus('请先上传图片或短视频。', 'error');
    return;
  }
  if (!selectedFile.type.startsWith('image/') && !selectedFile.type.startsWith('video/')) {
    setStatus('当前文件类型不支持。', 'error');
    return;
  }

  saveLocalConfig();
  els.analyzeBtn.disabled = true;
  els.copyJson.disabled = true;
  lastStructuredResult = null;
  els.rawOutput.textContent = '处理中...';

  try {
    const isVideo = selectedFile.type.startsWith('video/');
    setStatus(isVideo ? '正在抽取视频关键帧...' : '正在压缩图片...');

    const mediaPayload = isVideo
      ? await extractVideoFrames(selectedFile, frameCount, maxSide)
      : { dataUrl: await fileToImageDataUrl(selectedFile, maxSide) };

    setStatus('正在调用 Qwen-VL，请等待模型返回结果...');
    const prompt = buildPrompt({
      sceneType: els.sceneType.value,
      labels: els.labels.value.trim(),
      isVideo,
    });
    const content = buildContentPayload({ mediaPayload, prompt, isVideo });
    const { contentText, rawData } = await callQwenVL({ apiKey, endpoint, model, content });

    els.rawOutput.textContent = contentText;
    const parsed = parseModelJson(contentText);
    lastStructuredResult = parsed;
    renderResult(parsed);
    els.copyJson.disabled = false;
    setStatus(`识别完成。Token 用量：${rawData?.usage?.total_tokens ?? '未知'}`, 'ok');
  } catch (error) {
    console.error(error);
    els.rawOutput.textContent = error?.message || String(error);
    setStatus(error?.message || '识别失败。', 'error');
  } finally {
    els.analyzeBtn.disabled = false;
  }
}

function handleFile(file) {
  selectedFile = file || null;
  updatePreview(selectedFile);
  if (selectedFile) {
    setStatus('文件已选择。填写 API Key 后可开始识别。');
  }
}

function initDragAndDrop() {
  ['dragenter', 'dragover'].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.add('drag-over');
    });
  });

  ['dragleave', 'drop'].forEach((eventName) => {
    els.dropZone.addEventListener(eventName, (event) => {
      event.preventDefault();
      els.dropZone.classList.remove('drag-over');
    });
  });

  els.dropZone.addEventListener('drop', (event) => {
    const file = event.dataTransfer?.files?.[0];
    if (file) {
      els.mediaInput.files = event.dataTransfer.files;
      handleFile(file);
    }
  });
}

function init() {
  loadLocalConfig();
  initDragAndDrop();

  els.mediaInput.addEventListener('change', (event) => {
    handleFile(event.target.files?.[0]);
  });

  [els.endpoint, els.modelName].forEach((el) => {
    el.addEventListener('change', saveLocalConfig);
  });

  els.rememberApi.addEventListener('change', saveLocalConfig);
  els.apiKey.addEventListener('change', saveLocalConfig);
  els.clearConfig.addEventListener('click', clearLocalConfig);
  els.analyzeBtn.addEventListener('click', analyze);

  els.copyJson.addEventListener('click', async () => {
    if (!lastStructuredResult) return;
    await navigator.clipboard.writeText(JSON.stringify(lastStructuredResult, null, 2));
    setStatus('已复制结构化 JSON。', 'ok');
  });
}

init();
