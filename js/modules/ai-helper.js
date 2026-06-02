/**
 * 「问问 AI」浮球助手（FAQ + 跳转动作 · 无 LLM 后端）
 *
 * 设计：
 *  - 右下角浮球，点击展开 chat 面板
 *  - 内置 FAQ 知识库 + 关键词匹配 → 给答案 + 跳转按钮
 *  - 不命中时给"换个说法 / 联系小二"兜底
 *  - 历史消息存 sessionStorage
 */

const QA_BANK = [
  {
    keys: ['第一个', '怎么开始', '怎么用', '从哪开始', '新手', '入门'],
    answer: '欢迎！配第一个 AI 技能只要 5 步。',
    actions: [
      { label: '🆕 开始配置', cmd: 'goto-skill' },
      { label: '🛒 直接抄作业', cmd: 'goto-market' },
    ],
  },
  {
    keys: ['skill', '技能', '技能包', '什么是skill'],
    answer: 'Skill 就是「让 AI 学会处理某一类客服问题」的能力包。比如「物流 Skill」让 AI 学会处理快递相关问题。',
    actions: [
      { label: '📖 详细解释', cmd: 'glossary-skill' },
      { label: '👀 看看现有 Skill', cmd: 'goto-skill' },
    ],
  },
  {
    keys: ['mcp', '外接', '工具'],
    answer: 'MCP 是 AI 的"工具箱"，里面装着查物流、查订单这类外部接口。不用懂技术，配好接口 AI 就能用。',
    actions: [
      { label: '📖 详细解释', cmd: 'glossary-mcp' },
      { label: '🔧 看看 MCP 服务', cmd: 'goto-mcp' },
    ],
  },
  {
    keys: ['agent', '助理', '小何', '小蜜', '助手'],
    answer: '本平台有 3 个 AI 助理：商家小何（服务商家）、买家小蜜（服务买家）、卖家 Copilot（辅助小二）。每个 Agent 可以装多个 Skill。',
    actions: [
      { label: '📖 详细解释', cmd: 'glossary-agent' },
      { label: '👤 调拟人化', cmd: 'goto-persona' },
    ],
  },
  {
    keys: ['拟人化', '语气', '说话', 'persona', '风格'],
    answer: '拟人化中心控制 AI 怎么说话——语气、emoji、长度都可以调。新手建议直接用「一键推荐配置」。',
    actions: [
      { label: '📖 详细解释', cmd: 'glossary-persona' },
      { label: '👤 去拟人化中心', cmd: 'goto-persona' },
    ],
  },
  {
    keys: ['转人工', '降转人工', '人工率', '降低'],
    answer: '降转人工率最快的方法：先去「效果分析-场景归因」看哪些场景没覆盖，再用「✨ AI 起草」补 Skill。',
    actions: [
      { label: '📈 看场景归因', cmd: 'goto-analytics' },
      { label: '📖 什么是转人工率', cmd: 'glossary-call_rate' },
    ],
  },
  {
    keys: ['解决率', '提升', '提高'],
    answer: '提升解决率三招：① 调拟人化让回答更对路；② 在效果分析里找拖后腿的 Skill 单独优化；③ 补全未覆盖场景。',
    actions: [
      { label: '📈 去效果分析', cmd: 'goto-analytics' },
      { label: '📖 什么是解决率', cmd: 'glossary-resolve_rate' },
    ],
  },
  {
    keys: ['效果', '数据', '看效果', '怎么样'],
    answer: '在「效果分析」里能看到所有 Skill 的解决率、转人工率、调用量、贡献度，还能看哪些场景没被覆盖。',
    actions: [
      { label: '📈 去看', cmd: 'goto-analytics' },
    ],
  },
  {
    keys: ['发布', '上线', '审核'],
    answer: '配好 Skill 后到「发布管理」点上线即可。系统会自动跑冲突检测，没冲突才放行。',
    actions: [
      { label: '🚀 去发布管理', cmd: 'goto-ops' },
    ],
  },
  {
    keys: ['冲突', '矛盾', '门禁'],
    answer: '两条规则在同样情况下要做相反的事就是冲突。发布会被拦截，平台会给修复建议。',
    actions: [
      { label: '📖 详细解释', cmd: 'glossary-conflict' },
    ],
  },
  {
    keys: ['抄', '复用', '别人', '市场', '广场'],
    answer: '在 Market 广场可以一键复用别人调好的 Skill，最快的入门方式。',
    actions: [
      { label: '🛒 逛 Market', cmd: 'goto-market' },
    ],
  },
  {
    keys: ['ai起草', 'ai写', '帮我写', '不会写'],
    answer: '在 Skill 配置或详情页都有「✨ AI 起草」按钮。用大白话描述场景，AI 自动帮你生成规则。',
    actions: [
      { label: '✨ 去试试', cmd: 'goto-skill' },
    ],
  },
];

const QUICK_QUESTIONS = [
  '怎么配第一个技能？',
  '什么是 Skill？',
  '转人工率怎么降？',
  '怎么看 AI 效果？',
  '发布前要做什么？',
];

let _opened = false;
let _history = []; // [{role:'me'|'ai', text:'', actions:[]}]

const STORE_KEY = 'novice_ai_history';

function loadHistory() {
  try {
    const raw = sessionStorage.getItem(STORE_KEY);
    if (raw) _history = JSON.parse(raw);
  } catch (e) {}
}

function saveHistory() {
  sessionStorage.setItem(STORE_KEY, JSON.stringify(_history));
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function findAnswer(q) {
  const text = q.toLowerCase();
  for (const item of QA_BANK) {
    if (item.keys.some(k => text.includes(k.toLowerCase()))) return item;
  }
  return null;
}

function init() {
  if (document.getElementById('aiHelperBubble')) return;

  const root = document.getElementById('aiHelperRoot') || document.body;
  loadHistory();

  // 浮球
  const bubble = document.createElement('button');
  bubble.id = 'aiHelperBubble';
  bubble.className = 'ai-helper-bubble';
  bubble.title = '问问 AI';
  bubble.innerHTML = '<span style="font-size:22px">💬</span><span class="ai-helper-pulse"></span>';
  root.appendChild(bubble);

  // 面板
  const panel = document.createElement('div');
  panel.id = 'aiHelperPanel';
  panel.className = 'ai-helper-panel';
  panel.innerHTML = `
    <div class="ai-helper-head">
      <div>
        <div class="ai-helper-title">💬 问问 AI</div>
        <div class="ai-helper-sub">不懂随时问，秒回</div>
      </div>
      <button class="ai-helper-close" id="aiHelperClose">×</button>
    </div>
    <div class="ai-helper-body" id="aiHelperBody"></div>
    <div class="ai-helper-quick" id="aiHelperQuick"></div>
    <div class="ai-helper-input">
      <input type="text" id="aiHelperInput" placeholder="问点啥？比如：什么是 Skill？" />
      <button id="aiHelperSend">发送</button>
    </div>
  `;
  root.appendChild(panel);

  bubble.addEventListener('click', toggle);
  panel.querySelector('#aiHelperClose').addEventListener('click', () => toggle(false));
  panel.querySelector('#aiHelperSend').addEventListener('click', sendInput);
  panel.querySelector('#aiHelperInput').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendInput();
  });

  renderBody();
  renderQuick();

  // 监听其他模块抛过来的提问
  window.addEventListener('ai-helper:ask', (e) => {
    toggle(true);
    setTimeout(() => ask(e.detail.q), 300);
  });
}

function toggle(force) {
  _opened = (typeof force === 'boolean') ? force : !_opened;
  document.getElementById('aiHelperPanel')?.classList.toggle('open', _opened);
  document.getElementById('aiHelperBubble')?.classList.toggle('hide', _opened);
}

function renderBody() {
  const body = document.getElementById('aiHelperBody');
  if (!body) return;

  if (_history.length === 0) {
    body.innerHTML = `
      <div class="ai-helper-greet">
        <div class="ai-helper-avatar">🤖</div>
        <div class="ai-helper-bubble-msg">
          <strong>你好呀～</strong><br>
          我是你的 AI 引导助手。<br>
          配置遇到不懂的，直接问我。<br>
          下面是常见问题，戳一下就回答：
        </div>
      </div>
    `;
    return;
  }

  body.innerHTML = _history.map(m => {
    if (m.role === 'me') {
      return `<div class="ai-msg ai-msg-me"><div class="ai-msg-text">${escapeHtml(m.text)}</div></div>`;
    }
    const acts = (m.actions || []).map(a =>
      `<button class="ai-msg-action" data-cmd="${a.cmd}">${escapeHtml(a.label)}</button>`).join('');
    return `
      <div class="ai-msg ai-msg-ai">
        <div class="ai-msg-avatar">🤖</div>
        <div class="ai-msg-content">
          <div class="ai-msg-text">${m.text}</div>
          ${acts ? `<div class="ai-msg-actions">${acts}</div>` : ''}
        </div>
      </div>
    `;
  }).join('');
  body.scrollTop = body.scrollHeight;

  // 绑定动作按钮
  body.querySelectorAll('[data-cmd]').forEach(b => {
    b.addEventListener('click', () => doCommand(b.dataset.cmd));
  });
}

function renderQuick() {
  const q = document.getElementById('aiHelperQuick');
  if (!q) return;
  q.innerHTML = QUICK_QUESTIONS.map(s => `<button class="ai-helper-chip">${escapeHtml(s)}</button>`).join('');
  q.querySelectorAll('.ai-helper-chip').forEach(b => {
    b.addEventListener('click', () => ask(b.textContent));
  });
}

function sendInput() {
  const inp = document.getElementById('aiHelperInput');
  if (!inp || !inp.value.trim()) return;
  ask(inp.value.trim());
  inp.value = '';
}

function ask(q) {
  _history.push({ role: 'me', text: q });
  renderBody();

  // 插入一个空的 ai 消息占位，后续流式填充
  const found = findAnswer(q);
  const fullText = found
    ? found.answer
    : '抱歉，这个问题我还不太懂 🥹 你可以：<br>① 换个说法重新问<br>② 直接问"怎么开始用"先入门<br>③ 找小二同学协助';
  const actions = found ? found.actions : [
    { label: '🆕 怎么开始用', cmd: 'ask-help' },
    { label: '🛒 看看市场', cmd: 'goto-market' },
  ];

  // 插空位
  _history.push({ role: 'ai', text: '<span class="x-stream-cursor"></span>', actions: [] });
  saveHistory();
  renderBody();

  // 逐字流出
  const idx = _history.length - 1;
  let i = 0;
  const speed = 22; // ms / 字
  const timer = setInterval(() => {
    if (i >= fullText.length) {
      clearInterval(timer);
      _history[idx] = { role: 'ai', text: fullText, actions };
      saveHistory();
      renderBody();
      return;
    }
    i++;
    _history[idx].text = fullText.slice(0, i) + '<span class="x-stream-cursor"></span>';
    renderBody();
  }, speed);
}

function doCommand(cmd) {
  if (cmd.startsWith('goto-')) {
    const tab = cmd.slice(5);
    if (tab === 'market') {
      window.switchGlobalMode && window.switchGlobalMode('market');
    } else {
      window.sscSwitchTab && window.sscSwitchTab(tab);
    }
    toggle(false);
  } else if (cmd.startsWith('glossary-')) {
    const key = cmd.slice(9);
    window.openGlossary && window.openGlossary(key);
  } else if (cmd === 'ask-help') {
    ask('怎么开始用');
  }
}

// 自启动
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
