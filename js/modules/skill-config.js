/**
 * Skill 配置模块
 * 职责：创作、绑定 MCP（不含发布/下线操作）
 * 交互：点击卡片 → 跳转到二级详情页
 */
import {
  getSkills, invalidateCache, getSkillById,
  addSkill, updateSkill, deleteSkill,
  getStats, parseFrontmatter,
  STATUS_LABELS, CATEGORIES, PRIORITY_LABELS, PRIORITY_COLORS
} from '../data/skills.js';
import { getServers, getBindingsForSkill, overwriteSkillBindings } from '../data/mcp.js';
import { showToast, escHtml } from '../utils.js';
import { showModal, closeModal } from '../modal.js';
import { buildSceneBanner } from './engines.js';
import { renderWizard, resetWizard } from './wizard.js';

let searchQuery  = '';
let statusFilter = 'all';

/* 小白 / 专家模式（默认读 sessionStorage，首次从首页「配第一个」入口会写 novice） */
function getMode() {
  return sessionStorage.getItem('skill_mode_pref') || 'expert';
}
function setMode(m) {
  sessionStorage.setItem('skill_mode_pref', m);
}

/* ── 常量 ── */
const ICON_OPTIONS = ['📦','🚚','💰','🔐','⚖️','📋','🏪','🔄','🛡️','📬','🔍','💬','📊','🤖','⚙️','🔧','📱','🌐','🎯','⚡'];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '紧急' },
  { value: 'high',     label: '高' },
  { value: 'medium',   label: '中' },
  { value: 'low',      label: '低' },
];

/* ── 主渲染 ── */
export function renderSkillConfig() {
  const el = document.getElementById('sec-skill');
  if (!el) return;

  const mode = getMode();

  // 小白模式：渲染 5 步向导
  if (mode === 'novice') {
    el.innerHTML = `
      <div class="page-header">
        <div>
          <h1 class="page-title">配一个 AI 技能</h1>
          <p class="page-subtitle">5 步搞定，AI 全程陪你。不懂随时点右下角的 💬 问问。</p>
        </div>
        <div class="mode-toggle">
          <button class="mode-toggle-btn active" data-mode="novice">🌱 小白模式</button>
          <button class="mode-toggle-btn" data-mode="expert">⚡ 专家模式</button>
        </div>
      </div>
      <div id="wizardHost"></div>
    `;
    renderWizard(el.querySelector('#wizardHost'));
    el.querySelectorAll('.mode-toggle-btn').forEach(b => {
      b.addEventListener('click', () => {
        setMode(b.dataset.mode);
        if (b.dataset.mode === 'expert') resetWizard();
        renderSkillConfig();
      });
    });
    return;
  }

  // 专家模式（原逻辑）
  invalidateCache();
  const skills = getSkills();
  const stats  = getStats();

  let list = skills;
  if (statusFilter !== 'all') list = list.filter(s => s.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    list = list.filter(s =>
      (s.name || '').toLowerCase().includes(q) ||
      (s.skillName || '').toLowerCase().includes(q) ||
      (s.description || '').toLowerCase().includes(q) ||
      (s.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">Skill 配置</h1>
        <p class="page-subtitle">注册并配置 Agent Skills，绑定 MCP 外部工具。发布上线请前往
          <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:inherit;padding:0"
            onclick="window.sscSwitchTab('ops')">发布管理</button>
        </p>
      </div>
      <div style="display:flex;align-items:center;gap:8px">
        <button class="btn btn-ghost" data-engine="ai-draft">
          ✨ AI 起草
        </button>
        <button class="btn btn-primary" id="scRegisterBtn">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="7" y1="1" x2="7" y2="13" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="1" y1="7" x2="13" y2="7" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
          注册 Skill
        </button>
        <div class="mode-toggle" style="margin-left:4px">
          <button class="mode-toggle-btn" data-mode="novice">🌱 小白模式</button>
          <button class="mode-toggle-btn active" data-mode="expert">⚡ 专家模式</button>
        </div>
      </div>
    </div>

    ${buildSceneBanner()}

    <div class="stat-bar">
      <div class="stat-card">
        <div class="stat-value">${stats.total}</div>
        <div class="stat-label">全部</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.published}</div>
        <div class="stat-label">已发布</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${stats.draft}</div>
        <div class="stat-label">草稿</div>
      </div>
    </div>

    <div class="toolbar">
      <input class="search-input" id="scSearch" type="text"
        placeholder="搜索 Skill 名称、描述、标签…" value="${escHtml(searchQuery)}">
      <select class="filter-select" id="scStatusFilter">
        <option value="all"${statusFilter === 'all' ? ' selected' : ''}>全部状态</option>
        <option value="draft"${statusFilter === 'draft' ? ' selected' : ''}>草稿</option>
        <option value="published"${statusFilter === 'published' ? ' selected' : ''}>已发布</option>
      </select>
    </div>

    <div class="skill-grid" id="scGrid">
      ${list.length ? list.map(renderCard).join('') : `
        <div class="empty-state">
          <div class="empty-state-icon">
            <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
              <rect x="4" y="4" width="14" height="14" rx="3" fill="#AEAEB2" opacity=".4"/>
              <rect x="22" y="4" width="14" height="14" rx="3" fill="#AEAEB2" opacity=".6"/>
              <rect x="4" y="22" width="14" height="14" rx="3" fill="#AEAEB2" opacity=".6"/>
              <rect x="22" y="22" width="14" height="14" rx="3" fill="#AEAEB2" opacity=".4"/>
            </svg>
          </div>
          <div class="empty-state-title">没有匹配的 Skill</div>
          <div class="empty-state-desc">尝试调整筛选条件，或注册一个新的 Skill</div>
          <button class="btn btn-primary" id="scEmptyRegister">注册 Skill</button>
        </div>`}
    </div>
  `;

  bindEvents(el);

  // 模式切换
  el.querySelectorAll('.mode-toggle-btn').forEach(b => {
    b.addEventListener('click', () => {
      setMode(b.dataset.mode);
      renderSkillConfig();
    });
  });

  // 响应 engines 里 AI 起草后创建的 Skill，刷新列表
  document.addEventListener('engines:skill-added', () => renderSkillConfig(), { once: true });
}

/* ── 卡片渲染 ── */
function renderCard(s) {
  const mcpBindings = getBindingsForSkill(s.id);
  const badgeClass  = s.status === 'published' ? 'badge-success' : 'badge-neutral';
  const label       = STATUS_LABELS[s.status] || s.status;

  const chips = mcpBindings.length
    ? mcpBindings.map(b => `<span class="chip" title="${escHtml(b.purpose)}">${escHtml(b.serverName)}</span>`).join('')
    : `<span style="font-size:var(--font-size-xs);color:var(--text-tertiary)">未绑定 MCP</span>`;

  return `
    <div class="skill-card" data-card-id="${s.id}" style="cursor:pointer">
      <div class="skill-card-header">
        <div class="skill-icon">${s.icon || '?'}</div>
        <div class="skill-card-meta">
          <div class="skill-name">${escHtml(s.name)}</div>
          <div class="skill-id">${escHtml(s.skillName || '')} · ${escHtml(s.version || 'v1.0.0')}</div>
        </div>
        <span class="badge ${badgeClass}">
          <span class="badge-dot"></span>${label}
        </span>
      </div>

      <div class="skill-card-desc">${escHtml(s.description || '暂无描述')}</div>

      <div class="skill-card-footer">
        <div class="skill-mcp-chips">${chips}</div>
        <div class="skill-card-actions">
          <div class="dropdown">
            <button class="btn-icon" data-menu="${s.id}" title="更多操作"
              onclick="event.stopPropagation()">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
                <circle cx="7" cy="7"   r="1.2" fill="currentColor"/>
                <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            <div class="dropdown-menu" id="menu-${s.id}">
              <button class="dropdown-item" data-action="mcp" data-id="${s.id}">绑定 MCP</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item danger" data-action="delete" data-id="${s.id}">删除</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;
}

/* ── 事件绑定 ── */
function bindEvents(el) {
  // 搜索
  el.querySelector('#scSearch')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderSkillConfig();
  });

  // 筛选
  el.querySelector('#scStatusFilter')?.addEventListener('change', e => {
    statusFilter = e.target.value;
    renderSkillConfig();
  });

  // 注册按钮
  el.querySelector('#scRegisterBtn')?.addEventListener('click', () => openSkillModal(null));
  el.querySelector('#scEmptyRegister')?.addEventListener('click', () => openSkillModal(null));

  // 卡片点击 → 跳转详情页
  el.querySelectorAll('[data-card-id]').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.cardId;
      window.openSkillDetail?.(id, 'basic');
    });
  });

  // ··· 菜单
  el.querySelectorAll('[data-menu]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const menuId = btn.dataset.menu;
      const menu   = document.getElementById(`menu-${menuId}`);
      if (!menu) return;
      const isOpen = menu.classList.contains('open');
      closeAllMenus();
      if (!isOpen) menu.classList.add('open');
    });
  });

  // 菜单动作
  el.querySelectorAll('[data-action]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const { action, id } = btn.dataset;
      if (action === 'mcp')    openMcpModal(id);
      if (action === 'delete') confirmDelete(id);
    });
  });

  document.addEventListener('click', closeAllMenus, { once: true });
}

function closeAllMenus() {
  document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
}

/* ── Skill 注册 Modal ── */
function openSkillModal(skillId) {
  const skill = skillId ? getSkillById(skillId) : null;
  const title = skill ? '编辑 Skill' : '注册新 Skill';

  const iconOpts = ICON_OPTIONS.map(ic =>
    `<option value="${ic}"${(skill?.icon || '📦') === ic ? ' selected' : ''}>${ic}</option>`
  ).join('');
  const catOpts = CATEGORIES.map(c =>
    `<option value="${c.id}"${(skill?.category || '') === c.id ? ' selected' : ''}>${c.name}</option>`
  ).join('');
  const priOpts = PRIORITY_OPTIONS.map(p =>
    `<option value="${p.value}"${(skill?.priority || 'medium') === p.value ? ' selected' : ''}>${p.label}</option>`
  ).join('');

  showModal(`
    <div class="modal-header">
      <span class="modal-title">${title}</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      ${!skill ? `
      <div class="form-group">
        <label class="form-label">导入 SKILL.md（可选）</label>
        <div class="dropzone" id="scDropzone">拖入 SKILL.md 文件，或点击选择</div>
        <input type="file" id="scFileInput" accept=".md" style="display:none">
      </div>` : ''}
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">显示名称<span class="req">*</span></label>
          <input class="form-input" id="fName" value="${escHtml(skill?.name || '')}" placeholder="如：物流运输">
        </div>
        <div class="form-group">
          <label class="form-label">Skill ID<span class="req">*</span></label>
          <input class="form-input" id="fSkillName" value="${escHtml(skill?.skillName || '')}" placeholder="如：logistics">
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">图标</label>
          <select class="form-select" id="fIcon">${iconOpts}</select>
        </div>
        <div class="form-group">
          <label class="form-label">分类</label>
          <select class="form-select" id="fCategory">
            <option value="">不指定</option>${catOpts}
          </select>
        </div>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">版本</label>
          <input class="form-input" id="fVersion" value="${escHtml(skill?.version || 'v1.0.0')}" placeholder="v1.0.0">
        </div>
        <div class="form-group">
          <label class="form-label">优先级</label>
          <select class="form-select" id="fPriority">${priOpts}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">负责人</label>
        <input class="form-input" id="fOwner" value="${escHtml(skill?.owner || '')}" placeholder="如：cco-logistics-team">
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="fDesc" rows="3"
          placeholder="简要描述该 Skill 的能力和使用场景">${escHtml(skill?.description || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">标签</label>
        <input class="form-input" id="fTags"
          value="${escHtml((skill?.tags || []).join(', '))}"
          placeholder="用逗号分隔，如：物流, 运输, 清关">
        <div class="form-hint">多个标签用逗号分隔</div>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">${skill ? '保存' : '注册'}</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  if (!skill) {
    const dz = document.getElementById('scDropzone');
    const fi = document.getElementById('scFileInput');
    dz?.addEventListener('click', () => fi?.click());
    dz?.addEventListener('dragover', e => { e.preventDefault(); dz.classList.add('dragover'); });
    dz?.addEventListener('dragleave', () => dz.classList.remove('dragover'));
    dz?.addEventListener('drop', e => {
      e.preventDefault(); dz.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (file) parseMdFile(file);
    });
    fi?.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) parseMdFile(file);
    });
  }

  document.getElementById('modalSave')?.addEventListener('click', () => {
    const name      = document.getElementById('fName')?.value.trim();
    const skillName = document.getElementById('fSkillName')?.value.trim();
    if (!name || !skillName) { showToast('请填写名称和 Skill ID', 'error'); return; }

    const tagsRaw = document.getElementById('fTags')?.value || '';
    const tags = tagsRaw.split(/[,，]/).map(t => t.trim()).filter(Boolean);

    const data = {
      name, skillName,
      icon:        document.getElementById('fIcon')?.value || '📦',
      category:    document.getElementById('fCategory')?.value || '',
      version:     document.getElementById('fVersion')?.value.trim() || 'v1.0.0',
      priority:    document.getElementById('fPriority')?.value || 'medium',
      owner:       document.getElementById('fOwner')?.value.trim() || '',
      description: document.getElementById('fDesc')?.value.trim() || '',
      tags,
    };

    if (skill) {
      updateSkill(skillId, data);
      showToast(`${data.name} 已更新`);
      closeModal();
      renderSkillConfig();
    } else {
      const result = addSkill(data);
      if (result.success) {
        showToast(`${data.name} 已注册`);
        closeModal();
        window.openSkillDetail?.(result.skill.id, 'basic');
      } else {
        showToast(result.error || '注册失败', 'error');
      }
    }
  });
}

/* ── 解析 SKILL.md ── */
function parseMdFile(file) {
  const reader = new FileReader();
  reader.onload = e => {
    const result = parseFrontmatter(e.target.result);
    const parsed = result.ok ? result.data : {};
    if (parsed.name)        document.getElementById('fName').value      = parsed.name;
    if (parsed.skillName)   document.getElementById('fSkillName').value = parsed.skillName;
    if (parsed.icon)        document.getElementById('fIcon').value      = parsed.icon;
    if (parsed.version)     document.getElementById('fVersion').value   = parsed.version;
    if (parsed.owner)       document.getElementById('fOwner').value     = parsed.owner;
    if (parsed.description) document.getElementById('fDesc').value      = parsed.description;
    if (parsed.priority)    document.getElementById('fPriority').value  = parsed.priority;
    if (parsed.tags) {
      const tags = Array.isArray(parsed.tags) ? parsed.tags : [parsed.tags];
      document.getElementById('fTags').value = tags.join(', ');
    }
    showToast('SKILL.md 已解析');
  };
  reader.readAsText(file);
}

/* ── MCP 绑定 Modal ── */
function openMcpModal(skillId) {
  const skill   = getSkillById(skillId);
  if (!skill) return;
  const servers = getServers();
  const current = getBindingsForSkill(skillId);

  const serverItems = servers.map(srv => {
    const binding    = current.find(b => b.serverId === srv.id);
    const isSelected = !!binding;
    const toolChecks = srv.tools.map(t => {
      const checked = binding?.toolNames?.includes(t.name) ? ' checked' : '';
      return `<label class="tool-check-label">
        <input type="checkbox" name="tool-${srv.id}" value="${escHtml(t.name)}"${checked}>
        ${escHtml(t.name)}
      </label>`;
    }).join('');

    return `
      <div class="server-check-item${isSelected ? ' selected' : ''}" id="srvItem-${srv.id}">
        <input type="checkbox" id="srvCheck-${srv.id}" value="${srv.id}"${isSelected ? ' checked' : ''}>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:var(--font-size-sm)">${srv.icon} ${escHtml(srv.name)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:2px">${escHtml(srv.description)}</div>
          <div class="tool-checks">${toolChecks}</div>
          <div style="margin-top:var(--s-2)">
            <input class="form-input" style="height:30px;font-size:var(--font-size-xs)"
              id="purpose-${srv.id}" placeholder="绑定用途（可选）"
              value="${escHtml(binding?.purpose || '')}">
          </div>
        </div>
      </div>`;
  }).join('');

  showModal(`
    <div class="modal-header">
      <span class="modal-title">绑定 MCP — ${escHtml(skill.name)}</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <p style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--s-4)">
        勾选要绑定的 MCP Server，并选择该 Skill 需要使用的工具。
      </p>
      ${serverItems || '<p style="color:var(--text-secondary)">暂无 MCP Server，请先在 MCP 服务页添加。</p>'}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">保存绑定</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  servers.forEach(srv => {
    const cb   = document.getElementById(`srvCheck-${srv.id}`);
    const item = document.getElementById(`srvItem-${srv.id}`);
    cb?.addEventListener('change', () => {
      item?.classList.toggle('selected', cb.checked);
    });
  });

  document.getElementById('modalSave')?.addEventListener('click', () => {
    servers.forEach(srv => {
      const cb = document.getElementById(`srvCheck-${srv.id}`);
      if (cb?.checked) {
        const toolCbs  = document.querySelectorAll(`input[name="tool-${srv.id}"]:checked`);
        const tools    = Array.from(toolCbs).map(t => t.value);
        const purpose  = document.getElementById(`purpose-${srv.id}`)?.value.trim() || '';
        overwriteSkillBindings(srv.id, skillId, tools, purpose);
      } else {
        overwriteSkillBindings(srv.id, skillId, [], '');
      }
    });
    showToast(`${skill.name} 绑定已保存`);
    closeModal();
    renderSkillConfig();
  });
}

/* ── 删除确认 Modal ── */
function confirmDelete(skillId) {
  const skill = getSkillById(skillId);
  if (!skill) return;

  showModal(`
    <div class="modal-header">
      <span class="modal-title">删除 Skill</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <p style="font-size:var(--font-size-sm);color:var(--text-secondary)">
        确定要删除 <strong>${escHtml(skill.name)}</strong> 吗？此操作不可撤销。
      </p>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-danger" id="modalConfirm">删除</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalConfirm')?.addEventListener('click', () => {
    deleteSkill(skillId);
    showToast(`${skill.name} 已删除`);
    closeModal();
    renderSkillConfig();
  });
}
