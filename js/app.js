/**
 * 智服工坊 CCO Skill Studio — 入口
 */
import { renderSkillConfig } from './modules/skill-config.js';
import { renderMcp }         from './modules/mcp.js';
import { renderOps }         from './modules/ops.js';
import { renderSkillDetail } from './modules/skill-detail.js';
import { renderMarketSub }   from './modules/market.js';
import { renderPersona }     from './modules/persona.js?v=4';
import { showModal, closeModal } from './modal.js';

/* ── 全局模式：work | market ── */
let _currentMode = 'work';

/* ── 侧边栏导航模板 ── */
const WORK_NAV = `
  <button class="nav-item active" data-mode="work" data-tab="skill">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".7"/></svg></span>
    <span class="nav-label">Skill 配置</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="persona">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="3" y="5" width="10" height="8" rx="2" stroke="currentColor" stroke-width="1.4" fill="none"/><circle cx="6.2" cy="9" r="1" fill="currentColor"/><circle cx="9.8" cy="9" r="1" fill="currentColor"/><path d="M8 2v3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="2" r="1" fill="currentColor"/><path d="M1 9h2M13 9h2" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg></span>
    <span class="nav-label">拟人化中心</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="ops">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.5"/><path d="M8 4.5V8.5L10.5 10" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg></span>
    <span class="nav-label">发布管理</span>
  </button>
  <button class="nav-item" data-mode="work" data-tab="mcp">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="3" cy="8" r="2" fill="currentColor"/><circle cx="13" cy="4" r="2" fill="currentColor"/><circle cx="13" cy="12" r="2" fill="currentColor"/><line x1="5" y1="8" x2="11" y2="4.5" stroke="currentColor" stroke-width="1.2"/><line x1="5" y1="8" x2="11" y2="11.5" stroke="currentColor" stroke-width="1.2"/></svg></span>
    <span class="nav-label">MCP 服务</span>
  </button>`;

const MARKET_NAV = `
  <button class="nav-item active" data-mode="market" data-tab="square">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="14" height="14" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="4" y="4" width="3.5" height="3.5" rx=".8" fill="currentColor" opacity=".7"/><rect x="8.5" y="4" width="3.5" height="3.5" rx=".8" fill="currentColor"/><rect x="4" y="8.5" width="3.5" height="3.5" rx=".8" fill="currentColor"/></svg></span>
    <span class="nav-label">Skill 广场</span>
  </button>
  <button class="nav-item" data-mode="market" data-tab="publish">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1v8M5 4l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><path d="M2 11v1.5A2.5 2.5 0 004.5 15h7a2.5 2.5 0 002.5-2.5V11" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg></span>
    <span class="nav-label">发布中心</span>
  </button>
  <button class="nav-item" data-mode="market" data-tab="mine">
    <span class="nav-icon"><svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="10" rx="2" stroke="currentColor" stroke-width="1.5" fill="none"/><rect x="4" y="1" width="8" height="4" rx="1" stroke="currentColor" stroke-width="1.2" fill="none"/></svg></span>
    <span class="nav-label">我的发布</span>
  </button>`;

function updateSidebar(mode) {
  const nav = document.getElementById('sidebarNav');
  const title = document.getElementById('sidebarTitle');
  if (!nav || !title) return;

  if (mode === 'work') {
    nav.innerHTML = WORK_NAV;
    title.textContent = 'Work 空间';
  } else {
    nav.innerHTML = MARKET_NAV;
    title.textContent = 'Market 市场';
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
    switchTab('skill');
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

  if (tab === 'skill')   renderSkillConfig();
  if (tab === 'persona') renderPersona();
  if (tab === 'ops')     renderOps();
  if (tab === 'mcp')     renderMcp();
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

  switchGlobalMode('work');
});
