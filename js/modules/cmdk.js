/**
 * 全局 ⌘K 命令面板
 *
 * 索引：
 *   - 6 个产品空间（切换）
 *   - 11 个 Skill（跳详情）
 *   - 7 个知识类目（跳知识库）
 *   - 6 个导航命令（首页/Skill/Persona/Analytics/Ops/MCP/Knowledge）
 *   - 5 个 AI 命令（询问 AI）
 *
 * 交互：
 *   - ⌘K / Ctrl+K 打开
 *   - 输入即过滤（fuzzy match）
 *   - ↑↓ 导航 / Enter 执行 / Esc 关闭
 *   - 点击空白关闭
 */
import { getSkills } from '../data/skills.js';

const SPACES = [
  { id: 'seller-xiaomi',   icon: '🏪', name: '商家小蜜',     desc: 'toB · 商家自助 AI' },
  { id: 'buyer-xiaomi',    icon: '🛍️', name: '买家小蜜',     desc: 'toC · 买家自助 AI' },
  { id: 'seller-copilot',  icon: '🤖', name: '卖家 Copilot', desc: 'AI 辅助卖家' },
  { id: 'seller-hosting',  icon: '🛎️', name: '卖家托管',     desc: '全托管运营' },
  { id: 'cco-arbitration', icon: '⚖️', name: 'CCO 仲裁',     desc: '争议仲裁中心' },
  { id: 'cco-ticket',      icon: '🎫', name: 'CCO 工单处理', desc: '工单流转中心' },
];

const NAV_CMDS = [
  { id: 'nav-home',      icon: '🏠', name: '前往：首页',       desc: 'Bento 概览', tab: 'home' },
  { id: 'nav-skill',     icon: '⚙️', name: '前往：Skill 配置', desc: '11 个已上线/草稿', tab: 'skill' },
  { id: 'nav-persona',   icon: '🎭', name: '前往：拟人化中心', desc: 'AI 性格 / 语气', tab: 'persona' },
  { id: 'nav-analytics', icon: '📊', name: '前往：效果分析',   desc: '解决率 / 转人工', tab: 'analytics' },
  { id: 'nav-ops',       icon: '🚀', name: '前往：发布管理',   desc: '冲突检测 / 上线', tab: 'ops' },
  { id: 'nav-mcp',       icon: '🔌', name: '前往：MCP 服务',   desc: '14 个外部接口', tab: 'mcp' },
  { id: 'nav-knowledge', icon: '📚', name: '前往：知识库',     desc: '562 条 / RAG 兜底', tab: 'knowledge' },
  { id: 'nav-market',    icon: '🛍️', name: '前往：Skill Market', desc: '社区市场', mode: 'market' },
];

const KB_CATS = [
  { id: '507140007', name: '港台 GS / TA Plus', desc: '信保服务 · 拒付综合' },
  { id: '87875007',  name: '支付 / 退款',       desc: 'BLIK · Alibaba.com Pay' },
  { id: '4724',      name: '物流 / 退款',       desc: '商家退款 · 买家物流' },
  { id: '74774027',  name: '通用业务 A',        desc: 'EPR 合规 / 跨境注册' },
  { id: '276038014', name: '通用业务 B',        desc: '纠纷举证' },
  { id: '276038017', name: '通用业务 C',        desc: '运营管理' },
  { id: '276038076', name: '通用业务 D',        desc: 'AI Copilot 接入' },
];

const AI_CMDS = [
  { id: 'ai-1', icon: '💬', name: '问 AI：怎么配第一个 Skill？',    q: '怎么配第一个技能？' },
  { id: 'ai-2', icon: '💬', name: '问 AI：转人工率怎么降下来？',     q: '转人工率怎么降？' },
  { id: 'ai-3', icon: '💬', name: '问 AI：解决率怎么提升？',         q: '怎么提升解决率？' },
  { id: 'ai-4', icon: '💬', name: '问 AI：什么是 Skill？',           q: '什么是 Skill？' },
  { id: 'ai-5', icon: '💬', name: '问 AI：怎么看 AI 效果？',         q: '怎么看 AI 效果？' },
];

let _state = {
  open: false,
  query: '',
  active: 0,
  groups: [],
};

function buildIndex() {
  const skills = getSkills().map(s => ({
    id:   `skill-${s.id}`,
    icon: s.icon || '⚙️',
    name: `${s.name}`,
    desc: s.description?.slice(0, 60) || '',
    kind: 'Skill',
    skillId: s.id,
  }));

  return [
    { label: '空间切换', kind: 'space', items: SPACES.map(s => ({
      id: `space-${s.id}`, icon: s.icon, name: s.name, desc: s.desc, kind: '空间', spaceId: s.id,
    }))},
    { label: '导航',     kind: 'nav',   items: NAV_CMDS.map(c => ({ ...c, kind: '页面' })) },
    { label: 'Skill',    kind: 'skill', items: skills },
    { label: '知识类目', kind: 'kb',    items: KB_CATS.map(c => ({
      id: `kb-${c.id}`, icon: '📂', name: c.name, desc: c.desc, kind: '知识', catId: c.id,
    }))},
    { label: '问 AI',    kind: 'ai',    items: AI_CMDS.map(c => ({ ...c, kind: 'AI' })) },
  ];
}

function fuzzyMatch(q, text) {
  if (!q) return true;
  const t = text.toLowerCase();
  const lq = q.toLowerCase();
  if (t.includes(lq)) return true;
  // 简易拼音首字母 / 字符顺序匹配
  let i = 0;
  for (const ch of lq) {
    const idx = t.indexOf(ch, i);
    if (idx === -1) return false;
    i = idx + 1;
  }
  return true;
}

function filterIndex(query) {
  const all = buildIndex();
  if (!query) return all;
  return all.map(g => ({
    ...g,
    items: g.items.filter(it => fuzzyMatch(query, `${it.name} ${it.desc || ''}`)),
  })).filter(g => g.items.length > 0);
}

function init() {
  if (document.getElementById('cmdkPanel')) return;

  const root = document.getElementById('cmdkRoot') || document.body;
  const mask = document.createElement('div');
  mask.className = 'cmdk-mask';
  mask.id = 'cmdkMask';
  mask.innerHTML = `
    <div class="cmdk-panel" id="cmdkPanel" role="dialog" aria-modal="true" aria-label="全局命令面板">
      <div class="cmdk-input-wrap">
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <circle cx="7" cy="7" r="4.5" stroke="currentColor" stroke-width="1.5"/>
          <path d="M11 11l3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
        </svg>
        <input class="cmdk-input" id="cmdkInput" type="text" placeholder="搜索 Skill / 知识 / 空间 / 命令..." autocomplete="off" spellcheck="false">
        <span class="cmdk-esc">ESC</span>
      </div>
      <div class="cmdk-list" id="cmdkList"></div>
      <div class="cmdk-footer">
        <span><kbd>↑↓</kbd>导航</span>
        <span><kbd>↵</kbd>执行</span>
        <span><kbd>ESC</kbd>关闭</span>
        <span style="margin-left:auto"><kbd>⌘ K</kbd>随时唤起</span>
      </div>
    </div>
  `;
  root.appendChild(mask);

  const input = mask.querySelector('#cmdkInput');
  const listEl = mask.querySelector('#cmdkList');

  // 点击空白关闭
  mask.addEventListener('click', (e) => {
    if (e.target === mask) close();
  });

  input.addEventListener('input', (e) => {
    _state.query = e.target.value.trim();
    _state.active = 0;
    renderList();
  });

  input.addEventListener('keydown', (e) => {
    const flat = flatItems();
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      _state.active = Math.min(flat.length - 1, _state.active + 1);
      renderList();
      scrollIntoActive();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      _state.active = Math.max(0, _state.active - 1);
      renderList();
      scrollIntoActive();
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const it = flat[_state.active];
      if (it) execute(it);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  });

  // 全局快捷键 ⌘K / Ctrl+K
  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      _state.open ? close() : open();
    }
  });

  // 自定义事件 cmdk:open
  window.addEventListener('cmdk:open', () => open());

  // 顶栏触发器
  document.getElementById('cmdkTrigger')?.addEventListener('click', () => open());
}

function flatItems() {
  const result = [];
  _state.groups.forEach(g => g.items.forEach(it => result.push(it)));
  return result;
}

function open() {
  _state.open = true;
  _state.query = '';
  _state.active = 0;
  _state.groups = filterIndex('');
  document.getElementById('cmdkMask')?.classList.add('open');
  setTimeout(() => {
    const inp = document.getElementById('cmdkInput');
    if (inp) { inp.value = ''; inp.focus(); }
    renderList();
  }, 30);
}

function close() {
  _state.open = false;
  document.getElementById('cmdkMask')?.classList.remove('open');
}

function renderList() {
  const listEl = document.getElementById('cmdkList');
  if (!listEl) return;
  _state.groups = filterIndex(_state.query);

  if (_state.groups.length === 0) {
    listEl.innerHTML = `
      <div class="cmdk-empty">
        没找到匹配项 · 试试 <strong>"退款"</strong> / <strong>"物流"</strong> / <strong>"分析"</strong>
      </div>`;
    return;
  }

  let idx = 0;
  let html = '';
  _state.groups.forEach(g => {
    html += `<div class="cmdk-group-label">${g.label}</div>`;
    g.items.forEach(it => {
      const active = idx === _state.active;
      html += `
        <div class="cmdk-row${active ? ' active' : ''}" data-idx="${idx}">
          <span class="cmdk-row-icon">${it.icon || '·'}</span>
          <span class="cmdk-row-text">
            <span class="cmdk-row-name">${escHtml(it.name)}</span>
            ${it.desc ? `<span class="cmdk-row-desc">${escHtml(it.desc)}</span>` : ''}
          </span>
          <span class="cmdk-row-kind">${it.kind || ''}</span>
          <span class="cmdk-row-enter">↵</span>
        </div>`;
      idx++;
    });
  });
  listEl.innerHTML = html;

  listEl.querySelectorAll('.cmdk-row').forEach(row => {
    row.addEventListener('mouseenter', () => {
      _state.active = parseInt(row.dataset.idx, 10);
      listEl.querySelectorAll('.cmdk-row').forEach(r => r.classList.remove('active'));
      row.classList.add('active');
    });
    row.addEventListener('click', () => {
      const i = parseInt(row.dataset.idx, 10);
      const it = flatItems()[i];
      if (it) execute(it);
    });
  });
}

function scrollIntoActive() {
  const listEl = document.getElementById('cmdkList');
  const row = listEl?.querySelector('.cmdk-row.active');
  row?.scrollIntoView({ block: 'nearest' });
}

function execute(item) {
  // 空间切换
  if (item.spaceId) {
    sessionStorage.setItem('novice_current_space', item.spaceId);
    close();
    if (window.switchGlobalMode) window.switchGlobalMode('work');
    setTimeout(() => location.reload(), 100);
    return;
  }
  // 页面跳转
  if (item.tab) {
    close();
    if (window.switchGlobalMode) window.switchGlobalMode('work');
    setTimeout(() => window.sscSwitchTab && window.sscSwitchTab(item.tab), 50);
    return;
  }
  if (item.mode === 'market') {
    close();
    window.switchGlobalMode && window.switchGlobalMode('market');
    return;
  }
  // Skill 详情
  if (item.skillId) {
    close();
    window.switchGlobalMode && window.switchGlobalMode('work');
    setTimeout(() => window.openSkillDetail && window.openSkillDetail(item.skillId, 'basic'), 50);
    return;
  }
  // 知识类目
  if (item.catId) {
    close();
    window.switchGlobalMode && window.switchGlobalMode('work');
    setTimeout(() => window.sscSwitchTab && window.sscSwitchTab('knowledge'), 50);
    return;
  }
  // 问 AI
  if (item.q) {
    close();
    setTimeout(() => {
      window.dispatchEvent(new CustomEvent('ai-helper:ask', { detail: { q: item.q } }));
    }, 80);
    return;
  }
}

function escHtml(s) {
  return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
