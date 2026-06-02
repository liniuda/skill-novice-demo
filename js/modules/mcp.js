/**
 * MCP 服务配置模块
 * 职责：管理 MCP Server，绑定到 Skill
 */
import {
  getServers, getServerById, addServer, updateServer, removeServer,
  bindSkillToServer, unbindSkillFromServer, overwriteSkillBindings,
  generateMcpJson, STATUS_LABELS, STATUS_COLORS
} from '../data/mcp.js';
import { getSkills } from '../data/skills.js';
import { showToast, escHtml } from '../utils.js';
import { showModal, closeModal } from '../modal.js';

let searchQuery  = '';
let statusFilter = 'all';
const expandedIds = new Set();

/* ── 主渲染 ── */
export function renderMcp() {
  const el = document.getElementById('sec-mcp');
  if (!el) return;

  const allServers = getServers();
  let servers = allServers;
  if (statusFilter !== 'all') servers = servers.filter(s => s.status === statusFilter);
  if (searchQuery) {
    const q = searchQuery.toLowerCase();
    servers = servers.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.endpoint.toLowerCase().includes(q) ||
      s.tools.some(t => t.name.toLowerCase().includes(q))
    );
  }

  const totalTools  = allServers.reduce((a, s) => a + s.tools.length, 0);
  const onlineCount = allServers.filter(s => s.status === 'online').length;
  const boundSkills = new Set();
  allServers.forEach(s => s.skillBindings.forEach(b => boundSkills.add(b.skillId)));

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">MCP 服务</h1>
        <p class="page-subtitle">管理外部 MCP Server，绑定到 Skill 以扩展工具能力</p>
      </div>
      <button class="btn btn-primary" id="mcpAddBtn">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="7" y1="1" x2="7" y2="13" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="1" y1="7" x2="13" y2="7" stroke="white" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
        添加 Server
      </button>
    </div>

    <div class="stat-bar">
      <div class="stat-card">
        <div class="stat-value">${allServers.length}</div>
        <div class="stat-label">已配置</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${onlineCount}</div>
        <div class="stat-label">在线</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${totalTools}</div>
        <div class="stat-label">可用工具</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${boundSkills.size}</div>
        <div class="stat-label">已绑 Skill</div>
      </div>
    </div>

    <div class="toolbar">
      <input class="search-input" id="mcpSearch" type="text"
        placeholder="搜索 Server 名称、Endpoint…" value="${escHtml(searchQuery)}">
      <select class="filter-select" id="mcpStatusFilter">
        <option value="all"${statusFilter === 'all' ? ' selected' : ''}>全部状态</option>
        <option value="online"${statusFilter === 'online' ? ' selected' : ''}>在线</option>
        <option value="offline"${statusFilter === 'offline' ? ' selected' : ''}>离线</option>
        <option value="unknown"${statusFilter === 'unknown' ? ' selected' : ''}>未知</option>
      </select>
    </div>

    <div class="mcp-list" id="mcpList">
      ${servers.length ? servers.map(renderServerCard).join('') : `
        <div class="empty-state">
          <div class="empty-state-title">没有匹配的 Server</div>
          <div class="empty-state-desc">尝试调整筛选条件，或添加新的 MCP Server</div>
        </div>`}
    </div>

    <div style="margin-top:var(--s-8)">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--s-4)">
        <div>
          <div class="ops-panel-title" style="margin-bottom:2px">mcp.json 配置预览</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-secondary)">
            标准格式，可直接用于 Qoder / Claude Desktop 等 MCP 客户端
          </div>
        </div>
        <div style="display:flex;gap:var(--s-2)">
          <button class="btn btn-sm btn-ghost" id="mcpCopyJson">复制</button>
          <button class="btn btn-sm btn-ghost" id="mcpDownloadJson">下载</button>
        </div>
      </div>
      <div class="code-block">${escHtml(JSON.stringify(generateMcpJson(), null, 2))}</div>
    </div>
  `;

  bindMcpEvents(el);
}

/* ── Server 卡片 ── */
function renderServerCard(s) {
  const expanded   = expandedIds.has(s.id);
  const statusLabel = STATUS_LABELS[s.status] || '未知';
  const badgeClass = s.status === 'online' ? 'badge-success'
    : s.status === 'offline' ? 'badge-danger' : 'badge-neutral';

  const skills     = getSkills();
  const boundSkillInfos = s.skillBindings.map(b => {
    const sk = skills.find(r => r.id === b.skillId);
    return sk ? { ...b, skillName: sk.name, skillIcon: sk.icon } : null;
  }).filter(Boolean);

  const toolItems = s.tools.map(t => `
    <div class="tool-item">
      <div>
        <div class="tool-name">${escHtml(t.name)}</div>
        <div class="tool-desc">${escHtml(t.description)}</div>
      </div>
    </div>`).join('');

  const bindingItems = boundSkillInfos.length
    ? boundSkillInfos.map(b => `
        <div class="binding-item">
          <span>${b.skillIcon} ${escHtml(b.skillName)}</span>
          <button class="btn-icon" style="width:24px;height:24px"
            data-unbind-server="${s.id}" data-unbind-skill="${b.skillId}" title="取消绑定">
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <line x1="1" y1="1" x2="9" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
              <line x1="9" y1="1" x2="1" y2="9" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </button>
        </div>`).join('')
    : `<div style="font-size:var(--font-size-xs);color:var(--text-tertiary);padding:var(--s-2) 0">未绑定 Skill</div>`;

  // offline 时加左边红线
  const offlineStyle = s.status === 'offline'
    ? 'border-left: 3px solid var(--danger);border-radius: 0 var(--r-lg) var(--r-lg) 0;'
    : '';

  return `
    <div class="mcp-card" style="${offlineStyle}">
      <div class="mcp-card-header" data-expand="${s.id}">
        <div class="mcp-card-icon">${s.icon}</div>
        <div class="mcp-card-info">
          <div class="mcp-card-name">${escHtml(s.name)}</div>
          <div class="mcp-card-endpoint">${escHtml(s.endpoint)}</div>
        </div>
        <div class="mcp-card-actions">
          <span class="badge ${badgeClass}">
            <span class="badge-dot"></span>${statusLabel}
          </span>
          <button class="btn btn-sm btn-ghost" data-edit="${s.id}">编辑</button>
          <div class="dropdown">
            <button class="btn-icon" data-menu="mcp-${s.id}" title="更多">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <circle cx="7" cy="2.5" r="1.2" fill="currentColor"/>
                <circle cx="7" cy="7"   r="1.2" fill="currentColor"/>
                <circle cx="7" cy="11.5" r="1.2" fill="currentColor"/>
              </svg>
            </button>
            <div class="dropdown-menu" id="menu-mcp-${s.id}">
              <button class="dropdown-item" data-bind="${s.id}">绑定 Skill</button>
              <div class="dropdown-divider"></div>
              <button class="dropdown-item danger" data-delete="${s.id}">删除</button>
            </div>
          </div>
          <button class="btn-icon" data-expand="${s.id}" title="${expanded ? '收起' : '展开'}">
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none"
              style="transform:rotate(${expanded ? '180deg' : '0deg'});transition:transform .15s">
              <path d="M3 5L7 9L11 5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
        </div>
      </div>

      <div class="mcp-card-body${expanded ? ' expanded' : ''}">
        <div style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--s-4)">
          ${escHtml(s.description)}
        </div>

        <div class="mcp-section-title">工具列表（${s.tools.length}）</div>
        <div class="tool-list" style="margin-bottom:var(--s-5)">${toolItems}</div>

        <div class="mcp-section-title">绑定的 Skill</div>
        <div class="binding-list">${bindingItems}</div>
        <button class="btn btn-sm btn-secondary" data-bind="${s.id}" style="margin-top:var(--s-3)">
          绑定 Skill
        </button>
      </div>
    </div>
  `;
}

/* ── 事件绑定 ── */
function bindMcpEvents(el) {
  // 搜索
  el.querySelector('#mcpSearch')?.addEventListener('input', e => {
    searchQuery = e.target.value;
    renderMcp();
  });
  el.querySelector('#mcpStatusFilter')?.addEventListener('change', e => {
    statusFilter = e.target.value;
    renderMcp();
  });

  // 添加 Server
  el.querySelector('#mcpAddBtn')?.addEventListener('click', () => openServerModal(null));

  // 展开/收起
  el.querySelectorAll('[data-expand]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id = btn.dataset.expand;
      if (expandedIds.has(id)) expandedIds.delete(id);
      else expandedIds.add(id);
      renderMcp();
    });
  });

  // 编辑
  el.querySelectorAll('[data-edit]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openServerModal(btn.dataset.edit);
    });
  });

  // 绑定 Skill
  el.querySelectorAll('[data-bind]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      openBindSkillModal(btn.dataset.bind);
    });
  });

  // 取消绑定
  el.querySelectorAll('[data-unbind-server]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      unbindSkillFromServer(btn.dataset.unbindServer, btn.dataset.unbindSkill);
      showToast('绑定已取消');
      renderMcp();
    });
  });

  // 删除
  el.querySelectorAll('[data-delete]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const id  = btn.dataset.delete;
      const srv = getServerById(id);
      if (!srv) return;
      removeServer(id);
      showToast(`${srv.name} 已删除`);
      renderMcp();
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
      document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
      if (!isOpen) menu.classList.add('open');
    });
  });

  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu.open').forEach(m => m.classList.remove('open'));
  }, { once: true });

  // 复制 mcp.json
  el.querySelector('#mcpCopyJson')?.addEventListener('click', () => {
    navigator.clipboard.writeText(JSON.stringify(generateMcpJson(), null, 2))
      .then(() => showToast('已复制 mcp.json'))
      .catch(() => showToast('复制失败', 'error'));
  });

  // 下载 mcp.json
  el.querySelector('#mcpDownloadJson')?.addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(generateMcpJson(), null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'mcp.json';
    a.click();
    showToast('mcp.json 已下载');
  });
}

/* ── Server 编辑 Modal ── */
function openServerModal(serverId) {
  const srv   = serverId ? getServerById(serverId) : null;
  const title = srv ? '编辑 Server' : '添加 MCP Server';

  const ICONS = ['📊','📝','🏪','🔌','⚙️','🤖','🔍','📦','💬','🌐'];
  const iconOpts = ICONS.map(ic =>
    `<option value="${ic}"${(srv?.icon || '🔌') === ic ? ' selected' : ''}>${ic}</option>`
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
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">名称<span class="req">*</span></label>
          <input class="form-input" id="fSrvName" value="${escHtml(srv?.name || '')}" placeholder="如：Aone 数据平台">
        </div>
        <div class="form-group">
          <label class="form-label">图标</label>
          <select class="form-select" id="fSrvIcon">${iconOpts}</select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Endpoint<span class="req">*</span></label>
        <input class="form-input" id="fSrvEndpoint" value="${escHtml(srv?.endpoint || '')}"
          placeholder="https://mcp.example.com/mcp">
      </div>
      <div class="form-row">
        <div class="form-group">
          <label class="form-label">启动命令</label>
          <input class="form-input" id="fSrvCommand" value="${escHtml(srv?.command || 'npx')}" placeholder="npx">
        </div>
        <div class="form-group">
          <label class="form-label">状态</label>
          <select class="form-select" id="fSrvStatus">
            <option value="online"${(srv?.status || 'unknown') === 'online' ? ' selected' : ''}>在线</option>
            <option value="offline"${(srv?.status) === 'offline' ? ' selected' : ''}>离线</option>
            <option value="unknown"${(srv?.status || 'unknown') === 'unknown' ? ' selected' : ''}>未知</option>
          </select>
        </div>
      </div>
      <div class="form-group">
        <label class="form-label">Args（每行一个）</label>
        <textarea class="form-textarea" id="fSrvArgs" rows="2"
          placeholder="mcp-remote&#10;https://mcp.example.com/mcp">${escHtml((srv?.args || []).join('\n'))}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">描述</label>
        <textarea class="form-textarea" id="fSrvDesc" rows="2"
          placeholder="简要描述该 Server 提供的能力">${escHtml(srv?.description || '')}</textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">${srv ? '保存' : '添加'}</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  document.getElementById('modalSave')?.addEventListener('click', () => {
    const name     = document.getElementById('fSrvName')?.value.trim();
    const endpoint = document.getElementById('fSrvEndpoint')?.value.trim();
    if (!name || !endpoint) { showToast('请填写名称和 Endpoint', 'error'); return; }

    const data = {
      name,
      icon:     document.getElementById('fSrvIcon')?.value || '🔌',
      endpoint,
      command:  document.getElementById('fSrvCommand')?.value.trim() || 'npx',
      args:     (document.getElementById('fSrvArgs')?.value || '').split('\n').map(s => s.trim()).filter(Boolean),
      status:   document.getElementById('fSrvStatus')?.value || 'unknown',
      description: document.getElementById('fSrvDesc')?.value.trim() || '',
    };

    if (srv) {
      updateServer(serverId, data);
      showToast(`${data.name} 已更新`);
    } else {
      addServer(data);
      showToast(`${data.name} 已添加`);
    }
    closeModal();
    renderMcp();
  });
}

/* ── 绑定 Skill Modal（从 Server 视角） ── */
function openBindSkillModal(serverId) {
  const srv    = getServerById(serverId);
  if (!srv) return;
  const skills = getSkills();

  const skillItems = skills.map(sk => {
    const binding   = srv.skillBindings.find(b => b.skillId === sk.id);
    const isSelected = !!binding;
    const toolChecks = srv.tools.map(t => {
      const checked = binding?.toolNames?.includes(t.name) ? ' checked' : '';
      return `<label class="tool-check-label">
        <input type="checkbox" name="tool-${sk.id}" value="${escHtml(t.name)}"${checked}>
        ${escHtml(t.name)}
      </label>`;
    }).join('');

    return `
      <div class="server-check-item${isSelected ? ' selected' : ''}" id="skItem-${sk.id}">
        <input type="checkbox" id="skCheck-${sk.id}" value="${sk.id}"${isSelected ? ' checked' : ''}>
        <div style="flex:1;min-width:0">
          <div style="font-weight:500;font-size:var(--font-size-sm)">${sk.icon} ${escHtml(sk.name)}</div>
          <div class="tool-checks">${toolChecks}</div>
          <div style="margin-top:var(--s-2)">
            <input class="form-input" style="height:30px;font-size:var(--font-size-xs)"
              id="skpurpose-${sk.id}" placeholder="绑定用途（可选）"
              value="${escHtml(binding?.purpose || '')}">
          </div>
        </div>
      </div>`;
  }).join('');

  showModal(`
    <div class="modal-header">
      <span class="modal-title">绑定 Skill — ${escHtml(srv.name)}</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <p style="font-size:var(--font-size-sm);color:var(--text-secondary);margin-bottom:var(--s-4)">
        选择要绑定的 Skill，并指定该 Skill 可使用的工具。
      </p>
      ${skillItems || '<p style="color:var(--text-secondary)">暂无 Skill。</p>'}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">保存绑定</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  skills.forEach(sk => {
    const cb   = document.getElementById(`skCheck-${sk.id}`);
    const item = document.getElementById(`skItem-${sk.id}`);
    cb?.addEventListener('change', () => item?.classList.toggle('selected', cb.checked));
  });

  document.getElementById('modalSave')?.addEventListener('click', () => {
    skills.forEach(sk => {
      const cb = document.getElementById(`skCheck-${sk.id}`);
      if (cb?.checked) {
        const toolCbs = document.querySelectorAll(`input[name="tool-${sk.id}"]:checked`);
        const tools   = Array.from(toolCbs).map(t => t.value);
        const purpose = document.getElementById(`skpurpose-${sk.id}`)?.value.trim() || '';
        overwriteSkillBindings(serverId, sk.id, tools, purpose);
      } else {
        overwriteSkillBindings(serverId, sk.id, [], '');
      }
    });
    showToast(`${srv.name} 绑定已保存`);
    closeModal();
    renderMcp();
  });
}
