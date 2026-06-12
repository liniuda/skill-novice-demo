/**
 * IM 测试模块 — 模拟空间 IM 对话链路，Skill 作为功能项绑定在输入框
 *
 * 核心设计：
 *  - 左侧：对话历史列表（会话维度）
 *  - 右侧：对话区，顶部显示当前空间
 *  - 输入框下方：Skill 功能胶囊，点击把 @SkillName 插入输入框作为临时调用
 *  - 不带 @Skill 发送 → 走整个空间兜底链路
 */
import { getSkills } from '../data/skills.js';
import { escHtml } from '../utils.js';

/* ── 对话历史（内存态） ── */
const _conversations = [
  { id: 'conv-1', title: '商家询问物流异常', time: '09:32', preview: '买家说包裹已签收但未收到货...' },
  { id: 'conv-2', title: '退款纠纷处理', time: '昨天', preview: '买家申请退款，卖家拒绝...' },
  { id: 'conv-3', title: '信保投诉核查', time: '06-10', preview: '商家收到知识产权投诉通知...' },
];
let _activeConvId = 'conv-main';   // 当前活跃会话
const _messages   = {};            // convId → messages[]

function getMsgs(convId) {
  if (!_messages[convId]) _messages[convId] = [];
  return _messages[convId];
}

/* ── 当前激活的 Skill（临时调用态，发送后自动清除） ── */
let _activeSkillId = null;

/* ── 模拟响应库 ── */
const SPACE_RESPONSES = [
  '您好，我是智服助理。已为您查询到相关工单信息，该买家的物流单号 SF1234567890 当前状态为「派件中」，预计今日 18:00 前送达。如买家仍未收到请 24 小时后联系我们。',
  '根据平台规则，您的退款申请符合条件。系统已为您处理退款 ¥299.00，预计 1-3 个工作日退回原支付账户，请通知买家留意。',
  '已核查该账户操作记录，近 30 天无异常行为。建议您关注账号安全设置，开启二步验证可有效防范风险。',
  '该知识产权投诉已进入平台审核流程，预计 3-5 个工作日出结果。请在此期间准备好商品授权凭证，以便加快审核进度。',
];
const SKILL_RESPONSES = {
  default: [
    '已调用指定 Skill 处理您的请求。根据 Skill 内置逻辑：该场景匹配到「物流异常追踪」流程，建议联系物流方核实末端配送记录，并为买家发起补偿申请。',
    '当前 Skill 已识别为退款场景。按照 Skill 处理规则：买家提交的退款凭据完整，建议直接审批通过，避免升级为平台投诉。',
    '该 Skill 已分析对话上下文，判断为高风险工单（DSR 扣分风险）。建议优先响应，48 小时内给买家明确处理结果。',
  ],
};

function getMockResp(useSkill, skillId, msg) {
  if (useSkill) {
    const pool = SKILL_RESPONSES[skillId] || SKILL_RESPONSES.default;
    return pool[Math.abs(msg.length * 3) % pool.length];
  }
  return SPACE_RESPONSES[Math.abs(msg.length * 7) % SPACE_RESPONSES.length];
}

/* ── 从 sessionStorage 获取当前空间名 ── */
function getCurrentSpaceName() {
  const id = sessionStorage.getItem('novice_current_space') || '';
  const map = {
    'seller-xiaomi':   '商家小蜜',
    'buyer-xiaomi':    '买家小蜜',
    'seller-copilot':  '卖家 Copilot',
    'seller-hosting':  '卖家托管',
    'cco-arbitration': 'CCO 仲裁',
    'cco-ticket':      'CCO 工单处理',
  };
  return map[id] || '智服助理';
}

/* ── 入口 ── */
export function renderImTest() {
  const el = document.getElementById('sec-im-test');
  if (!el) return;
  const skills = getSkills();
  el.innerHTML = buildPage(skills);
  bindEvents(el, skills);
}

/* ── 页面骨架 ── */
function buildPage(skills) {
  return `
    <div class="im-page">

      <!-- 左侧：对话历史 -->
      <aside class="im-sidebar">
        <div class="im-sidebar-header">
          <div class="im-sidebar-title">对话历史</div>
          <button class="im-new-conv-btn" id="imNewConv" title="新建对话">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <line x1="7" y1="1" x2="7" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
              <line x1="1" y1="7" x2="13" y2="7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            </svg>
          </button>
        </div>
        <div class="im-conv-list">
          <div class="im-conv-item ${_activeConvId === 'conv-main' ? 'active' : ''}" data-conv-id="conv-main">
            <div class="im-conv-icon">💬</div>
            <div class="im-conv-info">
              <div class="im-conv-title">新对话</div>
              <div class="im-conv-preview">${escHtml(getMsgs('conv-main').slice(-1)[0]?.content?.slice(0, 24) || '开始测试空间链路...')}</div>
            </div>
            <span class="im-conv-time">今天</span>
          </div>
          ${_conversations.map(c => `
            <div class="im-conv-item ${_activeConvId === c.id ? 'active' : ''}" data-conv-id="${c.id}">
              <div class="im-conv-icon">🗂️</div>
              <div class="im-conv-info">
                <div class="im-conv-title">${escHtml(c.title)}</div>
                <div class="im-conv-preview">${escHtml(c.preview)}</div>
              </div>
              <span class="im-conv-time">${c.time}</span>
            </div>`).join('')}
        </div>
      </aside>

      <!-- 右侧：对话区 -->
      <div class="im-chat-area">
        ${buildChatArea(skills)}
      </div>
    </div>
  `;
}

/* ── 对话区 ── */
function buildChatArea(skills) {
  const spaceName = getCurrentSpaceName();
  const messages  = getMsgs(_activeConvId);
  const hasHistory = messages.length > 0;

  /* 消息列表 */
  const msgHtml = messages.map(m => {
    if (m.role === 'user') {
      return `<div class="im-msg im-msg-user">
        <div class="im-msg-bubble im-msg-user-bubble">${escHtml(m.content).replace(/\n/g, '<br>')}</div>
      </div>`;
    } else {
      const isTyping      = m.content === '__typing__';
      const bubbleAttr    = isTyping ? 'data-typing' : '';
      const bubbleContent = isTyping ? '<span></span>' : escHtml(m.content).replace(/\n/g, '<br>');
      const skillTag      = m.skillName
        ? `<span class="im-resp-skill-tag">${m.skillName}</span>` : '';
      return `<div class="im-msg im-msg-assistant">
        <div class="im-msg-avatar">🤖</div>
        <div class="im-msg-body">
          ${skillTag}
          <div class="im-msg-bubble im-msg-assistant-bubble" ${bubbleAttr}>${bubbleContent}</div>
        </div>
      </div>`;
    }
  }).join('');

  /* Skill 功能胶囊 */
  const skillBtns = skills.map(s => {
    const isActive = s.id === _activeSkillId;
    return `<button class="im-skill-chip ${isActive ? 'active' : ''}" data-skill-id="${s.id}" title="${escHtml(s.description || s.name)}">
      <span class="im-skill-chip-icon">${s.icon || '📦'}</span>
      <span>${escHtml(s.name)}</span>
    </button>`;
  }).join('');

  return `
    <!-- Header -->
    <div class="im-chat-header">
      <div class="im-chat-header-icon">🤖</div>
      <div class="im-chat-header-info">
        <div class="im-chat-header-name">${escHtml(spaceName)}</div>
        <div class="im-chat-header-sub">空间链路测试 · 可通过 @Skill 指定单个处理器</div>
      </div>
      <button class="im-chat-clear-btn" id="imClearBtn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M2 3.5h10M5 3.5V2.5a1 1 0 011-1h2a1 1 0 011 1v1M4.5 3.5l.5 8a1 1 0 001 1h2a1 1 0 001-1l.5-8" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        清空
      </button>
    </div>

    <!-- 消息区 -->
    <div class="im-chat-messages" id="imChatMessages">
      ${!hasHistory ? `
        <div class="im-chat-welcome">
          <div class="im-chat-welcome-icon">🤖</div>
          <div class="im-chat-welcome-title">你好，开始测试${escHtml(spaceName)}</div>
          <div class="im-chat-welcome-desc">直接发送消息测试整个空间链路，或点击下方 Skill 功能项指定由某个 Skill 处理本次请求。</div>
        </div>` : msgHtml}
    </div>

    <!-- 输入区 -->
    <div class="im-chat-input-area">
      <!-- Skill 功能胶囊行 -->
      ${skills.length > 0 ? `
      <div class="im-skill-chips-bar" id="imSkillChipsBar">
        ${skillBtns}
      </div>` : ''}

      <div class="im-chat-input-wrap">
        <textarea class="im-chat-input" id="imChatInput"
          placeholder="${_activeSkillId ? '消息将由 @' + (skills.find(s=>s.id===_activeSkillId)?.name||'') + ' 处理...' : '向' + spaceName + '发送消息，或选择上方 Skill 功能项...'}" rows="1"></textarea>
        <button class="im-chat-send" id="imChatSend">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </button>
      </div>
      <div class="im-chat-input-footer">
        <span class="im-chat-hint">Enter 发送 · Shift+Enter 换行${_activeSkillId ? ' · 点击已选 Skill 可取消' : ''}</span>
      </div>
    </div>
  `;
}

/* ── 事件绑定 ── */
function bindEvents(el, skills) {
  /* 左侧对话列表切换 */
  el.querySelectorAll('.im-conv-item').forEach(item => {
    item.addEventListener('click', () => {
      _activeConvId  = item.dataset.convId;
      _activeSkillId = null;
      renderImTest();
    });
  });

  /* 新建对话 */
  el.querySelector('#imNewConv')?.addEventListener('click', () => {
    const id = 'conv-' + Date.now();
    _conversations.unshift({ id, title: '新对话 ' + new Date().toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' }), time: '刚刚', preview: '' });
    _activeConvId  = id;
    _activeSkillId = null;
    renderImTest();
  });

  /* Skill 功能胶囊：点击 toggle，激活时把 @SkillName 设为输入框前缀提示 */
  el.querySelectorAll('.im-skill-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const skillId = chip.dataset.skillId;
      if (_activeSkillId === skillId) {
        /* 取消激活 */
        _activeSkillId = null;
      } else {
        _activeSkillId = skillId;
      }
      /* 局部更新胶囊状态和 placeholder，不重绘整个页面 */
      el.querySelectorAll('.im-skill-chip').forEach(c => {
        c.classList.toggle('active', c.dataset.skillId === _activeSkillId);
      });
      const input = el.querySelector('#imChatInput');
      if (input) {
        const skill = skills.find(s => s.id === _activeSkillId);
        input.placeholder = skill
          ? `消息将由 @${skill.name} 处理...`
          : `向${getCurrentSpaceName()}发送消息，或选择上方 Skill 功能项...`;
        input.focus();
      }
      /* 更新 footer hint */
      const hint = el.querySelector('.im-chat-hint');
      if (hint) hint.textContent = `Enter 发送 · Shift+Enter 换行${_activeSkillId ? ' · 再次点击 Skill 可取消' : ''}`;
      /* 更新激活指示条 */
      const bar = el.querySelector('#imSkillChipsBar');
      if (bar) bar.dataset.active = _activeSkillId ? '1' : '';
    });
  });

  /* 发送逻辑 */
  const input   = el.querySelector('#imChatInput');
  const sendBtn = el.querySelector('#imChatSend');

  function doSend() {
    const rawText = (input?.value || '').trim();
    if (!rawText) return;

    const msgs = getMsgs(_activeConvId);
    const skill = _activeSkillId ? skills.find(s => s.id === _activeSkillId) : null;

    /* 用户消息：若激活了 Skill，在消息前加 @SkillName 标识 */
    const displayText = skill ? `@${skill.name}  ${rawText}` : rawText;
    msgs.push({ role: 'user', content: displayText });

    input.value = '';
    input.style.height = 'auto';

    /* 记录本次使用的 skillId，然后立即清除激活态（临时调用） */
    const usedSkillId   = _activeSkillId;
    const usedSkillName = skill ? skill.name : null;
    _activeSkillId = null;

    /* 同步更新胶囊 UI */
    el.querySelectorAll('.im-skill-chip').forEach(c => c.classList.remove('active'));
    if (input) input.placeholder = `向${getCurrentSpaceName()}发送消息，或选择上方 Skill 功能项...`;

    /* typing 占位 */
    const typingMsg = { role: 'assistant', content: '__typing__', skillName: usedSkillName };
    msgs.push(typingMsg);
    _rerenderMessages(el, msgs);
    scrollBottom();

    setTimeout(() => {
      typingMsg.content = getMockResp(!!usedSkillId, usedSkillId || 'default', rawText);
      _rerenderMessages(el, msgs);
      scrollBottom();
    }, 600 + Math.random() * 900);
  }

  sendBtn?.addEventListener('click', doSend);
  input?.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); doSend(); }
  });
  input?.addEventListener('input', () => {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 140) + 'px';
  });

  /* 清空对话 */
  el.querySelector('#imClearBtn')?.addEventListener('click', () => {
    _messages[_activeConvId] = [];
    renderImTest();
  });

  /* 初始化滚动 */
  scrollBottom();
}

/* ── 局部重绘消息列表（避免全量 re-render 导致输入框失焦） ── */
function _rerenderMessages(el, msgs) {
  const box = el.querySelector('#imChatMessages');
  if (!box) return;

  box.innerHTML = msgs.map(m => {
    if (m.role === 'user') {
      return `<div class="im-msg im-msg-user">
        <div class="im-msg-bubble im-msg-user-bubble">${escHtml(m.content).replace(/\n/g, '<br>')}</div>
      </div>`;
    } else {
      const isTyping      = m.content === '__typing__';
      const bubbleAttr    = isTyping ? 'data-typing' : '';
      const bubbleContent = isTyping ? '<span></span>' : escHtml(m.content).replace(/\n/g, '<br>');
      const skillTag      = m.skillName
        ? `<span class="im-resp-skill-tag">${escHtml(m.skillName)}</span>` : '';
      return `<div class="im-msg im-msg-assistant">
        <div class="im-msg-avatar">🤖</div>
        <div class="im-msg-body">
          ${skillTag}
          <div class="im-msg-bubble im-msg-assistant-bubble" ${bubbleAttr}>${bubbleContent}</div>
        </div>
      </div>`;
    }
  }).join('');
}

function scrollBottom() {
  requestAnimationFrame(() => {
    const box = document.querySelector('#imChatMessages');
    if (box) box.scrollTop = box.scrollHeight;
  });
}
