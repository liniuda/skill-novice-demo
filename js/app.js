/**
 * 智服工坊 CCO Skill Studio — 入口
 */
import { renderSkillConfig } from './modules/skill-config.js';
import { renderHome }        from './modules/home.js';
import { renderPersona }     from './modules/persona.js';
import { renderAnalytics }   from './modules/analytics.js';
import { renderMcp }         from './modules/mcp.js';
import { renderKnowledge }   from './modules/knowledge.js';
import { renderOps }         from './modules/ops.js';
import { renderSkillDetail } from './modules/skill-detail.js';
import { renderMarketSub }   from './modules/market.js';
import { renderTicket, renderTicketSkill } from './modules/ticket.js';
import './modules/engines.js';   // 四大引擎挂载层（自注册全局事件）
import './modules/ai-helper.js'; // 问问 AI 浮球（自启动）
import './modules/glossary.js';  // 黑话翻译 hover 气泡（自启动）
import './modules/growth.js';    // 运营成长地图（自启动）
import './modules/cmdk.js';      // X · 全局 ⌘K 命令面板（自启动）
import { showModal, closeModal } from './modal.js';
import { showToast } from './utils.js';

/* ── 全局模式：work | market ── */
let _currentMode = 'work';

/* ── 侧边栏导航模板 ── */
const WORK_NAV = `
  <button class="nav-item active" data-mode="work" data-tab="home">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 8L8 2L14 8" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 7v6.5a.5.5 0 00.5.5h3v-4h2v4h3a.5.5 0 00.5-.5V7" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/></svg></span>
    <span class="nav-label">首页</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="skill">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/></svg></span>
    <span class="nav-label">Skill 配置</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="persona">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="6.2" cy="9" r="1" fill="currentColor"/><circle cx="9.8" cy="9" r="1" fill="currentColor"/><path d="M8 2v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="2" r="1" fill="currentColor"/><path d="M1 9h2M13 9h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
    <span class="nav-label">拟人化中心</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="analytics">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2 13h12" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><rect x="3" y="8" width="2" height="4" fill="currentColor"/><rect x="7" y="5" width="2" height="7" fill="currentColor"/><rect x="11" y="2" width="2" height="10" fill="currentColor"/></svg></span>
    <span class="nav-label">效果分析</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="ops">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8.5L10.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
    <span class="nav-label">发布管理</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="mcp">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" fill="currentColor"/><circle cx="13" cy="4" r="2" fill="currentColor"/><circle cx="13" cy="12" r="2" fill="currentColor"/><line x1="5" y1="8" x2="11" y2="4.5" stroke="currentColor" stroke-width="1.2"/><line x1="5" y1="8" x2="11" y2="11.5" stroke="currentColor" stroke-width="1.2"/></svg></span>
    <span class="nav-label">MCP 服务</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="knowledge">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 2.5h7a2 2 0 012 2V14L8.5 12 2.5 14V2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/><path d="M11.5 4.5h2a1 1 0 011 1V14l-3-1.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/><path d="M5 6h3M5 8.5h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>
    <span class="nav-label">知识库</span>
  </button>`;

const MARKET_NAV = `
  <button class="nav-item active" data-mode="market" data-tab="square">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="4" y="4" width="3.5" height="3.5" rx=".8" fill="currentColor" opacity=".7"/><rect x="8.5" y="4" width="3.5" height="3.5" rx=".8" fill="currentColor"/><rect x="4" y="8.5" width="3.5" height="3.5" rx=".8" fill="currentColor"/></svg></span>
    <span class="nav-label">Skill 广场</span>
  </button>
  <button class="nav-item" data-mode="market" data-tab="knowledge">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M2.5 2.5h7a2 2 0 012 2V14L8.5 12 2.5 14V2.5z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/><path d="M11.5 4.5h2a1 1 0 011 1V14l-3-1.5" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round" fill="none"/><path d="M5 6h3M5 8.5h2" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>
    <span class="nav-label">知识广场</span>
  </button>
  <button class="nav-item" data-mode="market" data-tab="publish">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v8M5 4l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11v1.5A2.5 2.5 0 004.5 15h7a2.5 2.5 0 002.5-2.5V11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>
    <span class="nav-label">发布中心</span>
  </button>
  <button class="nav-item" data-mode="market" data-tab="mine">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="4" y="1" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></span>
    <span class="nav-label">我的发布</span>
  </button>`;

/* ── CCO 工单处理空间专属导航 ── */
const TICKET_NAV = `
  <button class="nav-item active" data-mode="work" data-tab="ticket">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="3" width="12" height="10" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><path d="M2 7h12" stroke="currentColor" stroke-width="1.2"/><circle cx="5" cy="10" r="1" fill="currentColor"/><path d="M7.5 10h4.5" stroke="currentColor" stroke-width="1.2" stroke-linecap="round"/></svg></span>
    <span class="nav-label">工单场景绑定</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="ticket-skill">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/></svg></span>
    <span class="nav-label">Skill 管理</span>
  </button>`;

/* ── 产品维度的六大空间 ── */
const SPACES = [
  { id: 'seller-xiaomi',   icon: '🏪', name: '商家小蜜',     sub: 'toB · 商家自助 AI', desc: '商家问平台规则、店铺运营、合规处罚',          tone: 'orange-red' },
  { id: 'buyer-xiaomi',    icon: '🛍️', name: '买家小蜜',     sub: 'toC · 买家自助 AI', desc: '买家退换、物流、商品咨询的智能解答',          tone: 'blue-cyan' },
  { id: 'seller-copilot',  icon: '🤖', name: '卖家 Copilot', sub: 'AI 辅助卖家',        desc: '帮卖家写文案、改商品、回买家消息',         tone: 'purple-pink' },
  { id: 'seller-hosting',  icon: '🛎️', name: '卖家托管',     sub: '全托管运营',          desc: '小二代卖家接待、统一处理售后与纠纷',        tone: 'gold-brown' },
  { id: 'cco-arbitration', icon: '⚖️', name: 'CCO 仲裁',    sub: '争议仲裁中心',        desc: '买卖双方纠纷的判定与存证',              tone: 'navy-gray' },
  { id: 'cco-ticket',      icon: '🎫', name: 'CCO 工单处理', sub: '工单流转中心',        desc: '复杂客诉的工单分派、升级与跟进',           tone: 'green-teal' },
];

const SPACE_STORAGE_KEY = 'novice_current_space';
function getCurrentSpace() {
  const id = sessionStorage.getItem(SPACE_STORAGE_KEY);
  return SPACES.find(s => s.id === id) || SPACES[0];
}
function setCurrentSpace(id) {
  sessionStorage.setItem(SPACE_STORAGE_KEY, id);
}

function renderSpaceSwitcher() {
  const header = document.getElementById('sidebarHeader');
  if (!header) return;

  const current = getCurrentSpace();
  const optionsHtml = SPACES.map(s => `
    <button class="space-option ${s.id === current.id ? 'active' : ''}" data-space="${s.id}" type="button">
      <span class="space-option-icon" data-tone="${s.tone}">${s.icon}</span>
      <span class="space-option-text">
        <span class="space-option-name">${s.name}</span>
        <span class="space-option-desc">${s.desc}</span>
      </span>
      <span class="space-option-check">✓</span>
    </button>
  `).join('');

  header.innerHTML = `
    <div class="space-switcher" id="spaceSwitcher">
      <button class="space-switcher-trigger" id="spaceSwitcherTrigger" type="button" aria-expanded="false" aria-haspopup="listbox">
        <span class="space-icon" data-tone="${current.tone}">${current.icon}</span>
        <span class="space-info">
          <span class="space-name" id="sidebarTitle">${current.name}</span>
          <span class="space-sub">${current.sub}</span>
        </span>
        <svg class="space-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
      <div class="space-dropdown" id="spaceDropdown" role="listbox">
        <div class="space-dropdown-header">切换产品空间</div>
        ${optionsHtml}
        <div class="space-dropdown-divider"></div>
        <button class="space-option space-option-add" data-space="new" type="button">
          <span class="space-option-icon" data-tone="add">＋</span>
          <span class="space-option-text">
            <span class="space-option-name">创建新空间</span>
            <span class="space-option-desc">即将推出 · 支持自定义场景</span>
          </span>
        </button>
      </div>
    </div>
  `;

  const sw      = header.querySelector('#spaceSwitcher');
  const trigger = header.querySelector('#spaceSwitcherTrigger');

  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = sw.classList.toggle('open');
    trigger.setAttribute('aria-expanded', String(isOpen));
  });

  header.querySelectorAll('.space-option').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const target = btn.dataset.space;
      sw.classList.remove('open');
      trigger?.setAttribute('aria-expanded', 'false');
      if (target === 'new') {
        showToast('💡 多空间创建能力即将推出，敬请期待', 'info');
        return;
      }
      if (target !== current.id) {
        setCurrentSpace(target);
        const next = SPACES.find(s => s.id === target);
        showToast(`已切换到「${next.name}」· ${next.sub}`);
        renderSpaceSwitcher();
        /* 切换空间后重新加载侧边栏导航并跳转默认页 */
        updateSidebar('work');
        if (target === 'cco-ticket') {
          switchTab('ticket');
        } else {
          switchTab('home');
        }
      }
    });
  });
}

function renderMarketHeader() {
  const header = document.getElementById('sidebarHeader');
  if (!header) return;
  header.innerHTML = `
    <div class="market-header">
      <span class="market-header-icon">🛍️</span>
      <span class="market-header-text">
        <span class="market-header-name">Skill Market</span>
        <span class="market-header-sub">社区市场 · 一键 fork</span>
      </span>
    </div>
  `;
}

function updateSidebar(mode) {
  const nav = document.getElementById('sidebarNav');
  if (!nav) return;

  if (mode === 'work') {
    renderSpaceSwitcher();
    const space = getCurrentSpace();
    if (space.id === 'cco-ticket') {
      nav.innerHTML = TICKET_NAV;
    } else {
      nav.innerHTML = WORK_NAV;
    }
  } else {
    renderMarketHeader();
    nav.innerHTML = MARKET_NAV;
  }

  /* 重新绑定侧边栏导航点击 */
  nav.querySelectorAll('.nav-item').forEach(btn => {
    btn.addEventListener('click', function () {
      const targetMode = this.dataset.mode;
      const targetTab  = this.dataset.tab;
      if (targetMode === 'work') {
        switchTab(targetTab);
      } else {
        switchMarketTab(targetTab);
      }
      if (window.innerWidth <= 640) document.body.classList.remove('sidebar-open');
    });
  });
}

function switchGlobalMode(mode) {
  _currentMode = mode;

  const workLayout   = document.getElementById('modeWork');
  const marketLayout = document.getElementById('modeMarket');
  const sidebar      = document.getElementById('sidebar');

  document.querySelectorAll('.global-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.mode === mode);
  });

  if (mode === 'work') {
    workLayout.style.display   = '';
    marketLayout.style.display = 'none';
    if (sidebar) sidebar.style.display = '';
    updateSidebar('work');
    switchTab('home');
  } else {
    workLayout.style.display   = 'none';
    marketLayout.style.display = '';
    if (sidebar) sidebar.style.display = '';
    updateSidebar('market');
    document.getElementById('sec-market')?.classList.add('active');
    switchMarketTab('square');
  }
}

/* ── Work 内 Tab 切换 ── */
function switchTab(tab) {
  document.querySelectorAll('#modeWork .page').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#sidebarNav .nav-item[data-mode="work"]').forEach(t => t.classList.remove('active'));

  const sec = document.getElementById('sec-' + tab);
  if (sec) sec.classList.add('active');
  const btn = document.querySelector(`#sidebarNav .nav-item[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');

  if (tab === 'home')      renderHome();
  if (tab === 'skill')     renderSkillConfig();
  if (tab === 'persona')   renderPersona();
  if (tab === 'analytics') renderAnalytics();
  if (tab === 'ops')       renderOps();
  if (tab === 'mcp')       renderMcp();
  if (tab === 'knowledge') renderKnowledge();
  if (tab === 'ticket')    renderTicket();
  if (tab === 'ticket-skill')    renderTicketSkill();
}

/* ── Market 内 Tab 切换 ── */
function switchMarketTab(tab) {
  document.querySelectorAll('.mkt-view').forEach(v => v.classList.remove('active'));
  document.querySelectorAll('#sidebarNav .nav-item[data-mode="market"]').forEach(t => t.classList.remove('active'));

  const view = document.getElementById('mkt-' + tab);
  if (view) view.classList.add('active');
  const btn = document.querySelector(`#sidebarNav .nav-item[data-tab="${tab}"]`);
  if (btn) btn.classList.add('active');

  renderMarketSub(tab);
}

/* ── 进入 Skill 详情页 ── */
function openSkillDetail(skillId, activeTab) {
  document.querySelectorAll('#modeWork .page').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('#sidebarNav .nav-item[data-mode="work"]').forEach(t => t.classList.remove('active'));

  document.querySelector('#sidebarNav .nav-item[data-tab="skill"]')?.classList.add('active');

  const sec = document.getElementById('sec-skill-detail');
  if (sec) {
    sec.classList.add('active');
    renderSkillDetail(skillId, activeTab || 'basic');
  }
}

/* ── 从详情页返回列表 ── */
function backToSkillList() {
  switchTab('skill');
}

window.sscSwitchTab      = switchTab;
window.openSkillDetail   = openSkillDetail;
window.backToSkillList   = backToSkillList;
window.switchGlobalMode  = switchGlobalMode;
window.switchMarketTab   = switchMarketTab;

/* ── 事件驱动跳转：Market → Work 详情页 ── */
document.addEventListener('app:nav-to-skill', (e) => {
  switchGlobalMode('work');
  requestAnimationFrame(() => openSkillDetail(e.detail.skillId, e.detail.tab));
});

/* ── 初始化 ── */
document.addEventListener('DOMContentLoaded', () => {
  /* 全局 Tab 按钮 */
  document.querySelectorAll('.global-tab[data-mode]').forEach(btn => {
    btn.addEventListener('click', () => switchGlobalMode(btn.dataset.mode));
  });

  /* 侧边栏折叠 */
  const toggle = document.getElementById('sidebarToggle');
  if (toggle) {
    if (localStorage.getItem('scd_sidebar_collapsed') === 'true') {
      document.body.classList.add('sidebar-collapsed');
    }
    toggle.addEventListener('click', () => {
      document.body.classList.toggle('sidebar-collapsed');
      localStorage.setItem('scd_sidebar_collapsed',
        String(document.body.classList.contains('sidebar-collapsed')));
    });
  }

  /* 移动端 */
  document.getElementById('mobileMenuBtn')?.addEventListener('click', () => {
    document.body.classList.add('sidebar-open');
  });
  document.getElementById('mobileBackdrop')?.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
  });

  /* Modal 背景关闭 */
  document.getElementById('appModal')?.addEventListener('click', function (e) {
    if (e.target === this) closeModal();
  });

  /* 点击侧栏空间切换器以外区域，关闭下拉 */
  document.addEventListener('click', (e) => {
    const sw = document.getElementById('spaceSwitcher');
    if (sw && sw.classList.contains('open') && !sw.contains(e.target)) {
      sw.classList.remove('open');
      document.getElementById('spaceSwitcherTrigger')?.setAttribute('aria-expanded', 'false');
    }
  });

  switchGlobalMode('work');
});
