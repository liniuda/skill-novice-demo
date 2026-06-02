/**
 * Skill 详情页模块
 * 5 个 Tab: 基础信息 / 指令内容 / 评估用例 / MCP 绑定 / 运维信息
 */
import {
  getSkillById, updateSkill, invalidateCache,
  CATEGORIES, PRIORITY_LABELS, PRIORITY_COLORS, LIFECYCLE_STAGES,
} from '../data/skills.js';
import { getServers, getBindingsForSkill, overwriteSkillBindings } from '../data/mcp.js';
import { showToast, escHtml } from '../utils.js';
import { showModal, closeModal } from '../modal.js';

/* ── 当前状态 ── */
let _skillId  = null;
let _activeTab = 'basic';

const TABS = [
  { id: 'basic',  label: '基础信息' },
  { id: 'body',   label: '指令内容' },
  { id: 'evals',  label: '评估用例' },
  { id: 'mcp',    label: 'MCP 绑定' },
  { id: 'ops',    label: '运维信息' },
];

const PRIORITY_OPTIONS = [
  { value: 'critical', label: '紧急' },
  { value: 'high',     label: '高' },
  { value: 'medium',   label: '中' },
  { value: 'low',      label: '低' },
];
const ICON_OPTIONS = ['📦','🚚','💰','🔐','⚖️','📋','🏪','🔄','🛡️','📬','🔍','💬','📊','🤖','⚙️','🔧','📱','🌐','🎯','⚡'];

/* ── 入口 ── */
export function renderSkillDetail(skillId, activeTab) {
  _skillId   = skillId;
  _activeTab = activeTab || 'basic';

  invalidateCache();
  const el = document.getElementById('sec-skill-detail');
  if (!el) return;

  const skill = getSkillById(_skillId);
  if (!skill) {
    el.innerHTML = `<div class="page-header"><h1 class="page-title">Skill 不存在</h1></div>`;
    return;
  }

  el.innerHTML = buildPage(skill);
  bindDetailEvents(el, skill);
}

/* ── 整体骨架 ── */
function buildPage(skill) {
  const tabBar = TABS.map(t => `
    <button class="detail-tab${_activeTab === t.id ? ' active' : ''}" data-tab="${t.id}">
      ${t.label}
    </button>`).join('');

  return `
    <div class="detail-header">
      <button class="btn btn-ghost detail-back" id="detailBack">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <path d="M9 2L4 7L9 12" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        返回列表
      </button>
      <div class="detail-breadcrumb">
        <span class="breadcrumb-home">Skill 配置</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
          <path d="M4 2L8 6L4 10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
        <span class="breadcrumb-current">${escHtml(skill.name)}</span>
      </div>
    </div>

    <div class="detail-hero">
      <div class="detail-icon">${skill.icon || '📦'}</div>
      <div class="detail-hero-info">
        <h2 class="detail-title">${escHtml(skill.name)}</h2>
        <div class="detail-meta-row">
          <span class="mono" style="color:var(--text-secondary);font-size:var(--font-size-sm)">${escHtml(skill.skillName || '')}</span>
          <span class="badge ${skill.status === 'published' ? 'badge-success' : 'badge-neutral'}">
            <span class="badge-dot"></span>
            ${skill.status === 'published' ? '已发布' : '草稿'}
          </span>
          <span style="font-size:var(--font-size-xs);color:var(--text-tertiary)">v${escHtml(skill.version || '1.0.0')}</span>
        </div>
      </div>
    </div>

    <div class="detail-tab-bar">${tabBar}</div>

    <div class="detail-tab-content" id="detailTabContent">
      ${buildTabContent(skill, _activeTab)}
    </div>
  `;
}

/* ── Tab 内容分发 ── */
function buildTabContent(skill, tab) {
  if (tab === 'basic')  return buildBasicTab(skill);
  if (tab === 'body')   return buildBodyTab(skill);
  if (tab === 'evals')  return buildEvalsTab(skill);
  if (tab === 'mcp')    return buildMcpTab(skill);
  if (tab === 'ops')    return buildOpsTab(skill);
  return '';
}

/* ── 右侧通用信息面板 ── */
function buildSidePanel(skill) {
  const mcpBindings = getBindingsForSkill(skill.id);
  const catInfo = CATEGORIES.find(c => c.id === skill.category);
  const priLabel = PRIORITY_LABELS[skill.priority] || '—';
  const priColor = PRIORITY_COLORS[skill.priority] || 'var(--text-tertiary)';
  const tagHtml = (skill.tags || []).length
    ? skill.tags.map(t => `<span class="chip">${escHtml(t)}</span>`).join('')
    : '<span style="color:var(--text-tertiary);font-size:var(--font-size-xs)">无</span>';
  const mcpHtml = mcpBindings.length
    ? mcpBindings.map(b => `<div class="side-mcp-item"><span class="chip">${escHtml(b.serverName)}</span><span style="color:var(--text-tertiary);font-size:var(--font-size-xs)">${escHtml(b.purpose || '')}</span></div>`).join('')
    : '<span style="color:var(--text-tertiary);font-size:var(--font-size-xs)">未绑定</span>';

  return `
    <aside class="detail-side-panel">
      <div class="side-card">
        <div class="side-card-title">状态信息</div>
        <div class="side-row">
          <span class="side-label">状态</span>
          <span class="badge ${skill.status === 'published' ? 'badge-success' : 'badge-neutral'}">
            <span class="badge-dot"></span>${skill.status === 'published' ? '已发布' : '草稿'}
          </span>
        </div>
        <div class="side-row">
          <span class="side-label">版本</span>
          <span class="mono" style="font-size:var(--font-size-sm)">${escHtml(skill.version || '1.0.0')}</span>
        </div>
        <div class="side-row">
          <span class="side-label">优先级</span>
          <span style="font-weight:600;color:${priColor};font-size:var(--font-size-sm)">${priLabel}</span>
        </div>
        <div class="side-row">
          <span class="side-label">分类</span>
          <span style="font-size:var(--font-size-sm)">${escHtml(catInfo?.name || '—')}</span>
        </div>
        <div class="side-row">
          <span class="side-label">负责人</span>
          <span class="mono" style="font-size:var(--font-size-xs);word-break:break-all">${escHtml(skill.owner || '—')}</span>
        </div>
      </div>

      <div class="side-card">
        <div class="side-card-title">标签</div>
        <div class="side-tag-wrap">${tagHtml}</div>
      </div>

      <div class="side-card">
        <div class="side-card-title">MCP 绑定</div>
        ${mcpHtml}
        <button class="btn btn-sm btn-ghost" style="margin-top:var(--s-3);width:100%"
          onclick="window.openSkillDetail?.('${escHtml(skill.id)}','mcp')">管理绑定</button>
      </div>

      <div class="side-card">
        <div class="side-card-title">时间</div>
        <div class="side-row">
          <span class="side-label">创建</span>
          <span style="font-size:var(--font-size-xs);color:var(--text-secondary)">${skill.createdAt ? new Date(skill.createdAt).toLocaleDateString('zh-CN') : '—'}</span>
        </div>
        <div class="side-row">
          <span class="side-label">更新</span>
          <span style="font-size:var(--font-size-xs);color:var(--text-secondary)">${skill.updatedAt ? new Date(skill.updatedAt).toLocaleDateString('zh-CN') : '—'}</span>
        </div>
        <div class="side-row">
          <span class="side-label">发布</span>
          <span style="font-size:var(--font-size-xs);color:var(--text-secondary)">${skill.publishedAt ? new Date(skill.publishedAt).toLocaleDateString('zh-CN') : '未发布'}</span>
        </div>
      </div>
    </aside>
  `;
}

/* ─────────────────────────────────────────────
   Tab 1: 基础信息
───────────────────────────────────────────── */
function buildBasicTab(skill) {
  const catInfo  = CATEGORIES.find(c => c.id === skill.category);
  const priLabel = PRIORITY_LABELS[skill.priority] || '—';
  const priColor = PRIORITY_COLORS[skill.priority] || 'var(--text-tertiary)';

  const catOpts = [{ id: '', name: '不指定' }, ...CATEGORIES].map(c =>
    `<option value="${escHtml(c.id)}"${skill.category === c.id ? ' selected' : ''}>${escHtml(c.name)}</option>`).join('');
  const priOpts = PRIORITY_OPTIONS.map(p =>
    `<option value="${p.value}"${skill.priority === p.value ? ' selected' : ''}>${p.label}</option>`).join('');
  const iconOpts = ICON_OPTIONS.map(ic =>
    `<option value="${ic}"${skill.icon === ic ? ' selected' : ''}>${ic}</option>`).join('');

  const tagStr = (skill.tags || []).join(', ');
  const ownerStr = (skill.owners || []).join(', ');
  const meta = skill.metadata || {};

  return `
    <div class="detail-tab-body">
      <form class="detail-form" id="formBasic" data-skillid="${skill.id}">
        <div class="form-section">
          <div class="form-section-title">基础标识</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">显示名称 <span class="req">*</span></label>
              <input class="form-input" name="name" value="${escHtml(skill.name)}" required>
            </div>
            <div class="form-group">
              <label class="form-label">Skill ID</label>
              <input class="form-input mono" name="skillName" value="${escHtml(skill.skillName || '')}" readonly
                style="background:var(--bg-tertiary);cursor:not-allowed;" title="Skill ID 创建后不可修改">
            </div>
          </div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">图标</label>
              <select class="form-select" name="icon">${iconOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">版本</label>
              <input class="form-input mono" name="version" value="${escHtml(skill.version || '1.0.0')}">
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">分类与优先级</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">分类</label>
              <select class="form-select" name="category">${catOpts}</select>
            </div>
            <div class="form-group">
              <label class="form-label">优先级</label>
              <select class="form-select" name="priority">${priOpts}</select>
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">归属与描述</div>
          <div class="form-group">
            <label class="form-label">主负责人 (owner)</label>
            <input class="form-input" name="owner" value="${escHtml(skill.owner || '')}" placeholder="如：cco-logistics-team">
          </div>
          <div class="form-group">
            <label class="form-label">描述</label>
            <textarea class="form-textarea" name="description" rows="3">${escHtml(skill.description || '')}</textarea>
          </div>
          <div class="form-group">
            <label class="form-label">标签</label>
            <input class="form-input" name="tags" value="${escHtml(tagStr)}" placeholder="用逗号分隔，如：物流, 运输">
            <div class="form-hint">多个标签用逗号分隔</div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">合规与兼容性</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">License</label>
              <input class="form-input" name="license" value="${escHtml(skill.license || 'MIT')}" placeholder="如：MIT">
            </div>
            <div class="form-group">
              <label class="form-label">兼容性 (compatibility)</label>
              <input class="form-input mono" name="compatibility" value="${escHtml(skill.compatibility || '')}" placeholder="如：agent>=2.0.0">
            </div>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">元数据 (metadata)</div>
          <div class="form-row">
            <div class="form-group">
              <label class="form-label">作者 (author)</label>
              <input class="form-input" name="meta_author" value="${escHtml(meta.author || '')}">
            </div>
            <div class="form-group">
              <label class="form-label">团队 (team)</label>
              <input class="form-input" name="meta_team" value="${escHtml(meta.team || '')}">
            </div>
          </div>
          <div class="form-group">
            <label class="form-label">最低 Agent 版本 (min-agent-version)</label>
            <input class="form-input mono" name="meta_minAgentVersion" value="${escHtml(meta.minAgentVersion || '')}" placeholder="如：2.0.0">
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">工具授权</div>
          <div class="form-group">
            <label class="form-label">allowed-tools</label>
            <input class="form-input mono" name="allowedTools"
              value="${escHtml(skill.allowedTools || '')}"
              placeholder="逗号分隔，如：logistics_query, logistics_track">
            <div class="form-hint">列出该 Skill 允许调用的工具名称</div>
          </div>
        </div>

        <div class="detail-form-actions">
          <button type="submit" class="btn btn-primary">保存基础信息</button>
        </div>
      </form>
      ${buildSidePanel(skill)}
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Tab 2: 指令内容 (SKILL.md Body)
───────────────────────────────────────────── */
function buildBodyTab(skill) {
  const body = skill.body || {};

  const sections = [
    { key: 'overview',      label: '概述',     rows: 4,  placeholder: '简述该 Skill 的功能范围和核心能力。' },
    { key: 'prerequisites', label: '前置条件',  rows: 4,  placeholder: '- 需要什么权限或数据接口\n- 对 Agent 版本/能力的要求' },
    { key: 'steps',         label: '执行步骤',  rows: 10, placeholder: '### 步骤 1：接收请求\n...\n### 步骤 2：调用工具\n...' },
    { key: 'gotchas',       label: '注意事项 (Gotchas)', rows: 4, placeholder: '- 已知限制或注意点\n- 常见错误和规避方法' },
    { key: 'outputFormat',  label: '输出格式',  rows: 4,  placeholder: '描述期望的输出结构和格式规范。' },
    { key: 'edgeCases',     label: '边界情况',  rows: 4,  placeholder: '- 数据不存在时的处理\n- 超时/网络异常时的处理' },
  ];

  const sectionHtml = sections.map(sec => `
    <div class="form-section">
      <div class="form-section-title">${sec.label}</div>
      <textarea class="form-textarea body-editor" name="${sec.key}" rows="${sec.rows}"
        placeholder="${escHtml(sec.placeholder)}">${escHtml(body[sec.key] || '')}</textarea>
    </div>`).join('');

  return `
    <div class="detail-tab-body">
      <form class="detail-form" id="formBody" data-skillid="${skill.id}">
        <div class="body-tab-hint">
          编辑内容对应 SKILL.md 的 Body 部分，支持 Markdown 语法。
        </div>
        ${sectionHtml}
        <div class="detail-form-actions">
          <button type="submit" class="btn btn-primary">保存指令内容</button>
        </div>
      </form>
      ${buildSidePanel(skill)}
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Tab 3: 评估用例
───────────────────────────────────────────── */
function buildEvalsTab(skill) {
  const evals = skill.evals || [];

  const evalCards = evals.map((ev, idx) => `
    <div class="eval-card" data-eval-idx="${idx}">
      <div class="eval-card-header">
        <span class="eval-num">用例 ${idx + 1}</span>
        <button class="btn-icon eval-delete" data-eval-idx="${idx}" title="删除用例">
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <line x1="1" y1="1" x2="11" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
            <line x1="11" y1="1" x2="1" y2="11" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
          </svg>
        </button>
      </div>
      <div class="form-group">
        <label class="form-label">Prompt（用户输入）</label>
        <textarea class="form-textarea" name="eval_prompt_${idx}" rows="2">${escHtml(ev.prompt || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Expected Output（期望输出）</label>
        <textarea class="form-textarea" name="eval_expected_${idx}" rows="2">${escHtml(ev.expectedOutput || '')}</textarea>
      </div>
      <div class="form-group">
        <label class="form-label">Assertions（断言，逗号分隔）</label>
        <input class="form-input" name="eval_assertions_${idx}"
          value="${escHtml((ev.assertions || []).join(', '))}"
          placeholder="如：包含物流状态, 包含预计到达时间">
      </div>
    </div>
  `).join('');

  return `
    <div class="detail-tab-body single-col">
      <div class="detail-form" id="evalsContainer" data-skillid="${skill.id}">
        <div class="body-tab-hint">
          评估用例对应 evals/evals.json，用于自动化 Eval 测试。
        </div>
        <div id="evalsList">
          ${evalCards || `<div class="eval-empty">暂无评估用例，点击下方按钮添加</div>`}
        </div>
        <div class="detail-form-actions" style="gap:var(--s-2)">
          <button class="btn btn-ghost" id="addEvalBtn">+ 添加用例</button>
          <button class="btn btn-primary" id="saveEvalsBtn">保存评估用例</button>
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Tab 4: MCP 绑定
───────────────────────────────────────────── */
function buildMcpTab(skill) {
  const servers  = getServers();
  const bindings = getBindingsForSkill(skill.id);

  const serverItems = servers.map(srv => {
    const binding    = bindings.find(b => b.serverId === srv.id);
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
          <div style="font-weight:500;font-size:var(--font-size-sm)">${srv.icon || ''} ${escHtml(srv.name)}</div>
          <div style="font-size:var(--font-size-xs);color:var(--text-secondary);margin-top:2px">${escHtml(srv.description || '')}</div>
          <div class="tool-checks">${toolChecks || '<span style="color:var(--text-tertiary);font-size:var(--font-size-xs)">无可绑定工具</span>'}</div>
          <div style="margin-top:var(--s-2)">
            <input class="form-input" style="height:30px;font-size:var(--font-size-xs)"
              id="purpose-${srv.id}" placeholder="绑定用途（可选）"
              value="${escHtml(binding?.purpose || '')}">
          </div>
        </div>
      </div>`;
  }).join('');

  return `
    <div class="detail-tab-body single-col">
      <div class="detail-form" id="mcpBindContainer" data-skillid="${skill.id}">
        <div class="body-tab-hint">
          选择该 Skill 需要调用的 MCP Server 及具体工具。
        </div>
        ${serverItems || '<div class="eval-empty">暂无 MCP Server，请先在"MCP 服务"页添加。</div>'}
        <div class="detail-form-actions">
          <button class="btn btn-primary" id="saveMcpBindBtn">保存绑定</button>
        </div>
      </div>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   Tab 5: 运维信息
───────────────────────────────────────────── */
function buildOpsTab(skill) {
  /* 生命周期进度条 */
  const stages = LIFECYCLE_STAGES;
  const currentIdx = stages.findIndex(s => s.id === skill.status);
  const stagesHtml = stages.map((s, i) => {
    const isDone    = i < currentIdx;
    const isCurrent = i === currentIdx;
    return `
      <div class="lifecycle-stage${isDone ? ' done' : ''}${isCurrent ? ' current' : ''}">
        <div class="lifecycle-dot"></div>
        <div class="lifecycle-info">
          <div class="lifecycle-label">${s.label}</div>
          <div class="lifecycle-desc">${s.desc}</div>
        </div>
      </div>`;
  }).join('');

  /* Changelog */
  const changelog = skill.changelog || [];
  const changelogHtml = changelog.length
    ? changelog.map(c => `
        <div class="changelog-entry">
          <span class="changelog-ver">v${escHtml(c.version || '')}</span>
          <span class="changelog-date">${escHtml(c.date || '')}</span>
          <span class="changelog-notes">${escHtml(c.notes || '')}</span>
        </div>`).join('')
    : `<div style="color:var(--text-tertiary);font-size:var(--font-size-sm)">暂无变更记录</div>`;

  /* Owners */
  const ownersStr = (skill.owners || []).join(', ');

  return `
    <div class="detail-tab-body">
      <div class="detail-form" id="opsContainer" data-skillid="${skill.id}">

        <div class="form-section">
          <div class="form-section-title">生命周期</div>
          <div class="lifecycle-track">${stagesHtml}</div>
          <div class="form-row" style="margin-top:var(--s-4)">
            <div class="form-group">
              <label class="form-label">当前状态</label>
              <select class="form-select" id="opsStatus">
                ${LIFECYCLE_STAGES.map(s =>
                  `<option value="${s.id}"${skill.status === s.id ? ' selected' : ''}>${s.label}</option>`
                ).join('')}
              </select>
            </div>
            <div class="form-group">
              <label class="form-label">发布时间</label>
              <input class="form-input mono" readonly
                value="${skill.publishedAt ? new Date(skill.publishedAt).toLocaleDateString('zh-CN') : '未发布'}"
                style="background:var(--bg-tertiary)">
            </div>
          </div>
          <div class="detail-form-actions" style="margin-top:var(--s-3)">
            <button class="btn btn-primary" id="saveOpsStatusBtn">更新状态</button>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">OWNERS</div>
          <div class="form-group">
            <label class="form-label">Owner 列表（逗号分隔）</label>
            <input class="form-input" id="opsOwners" value="${escHtml(ownersStr)}" placeholder="如：cco-team, lidaniu">
          </div>
          <div class="detail-form-actions" style="margin-top:var(--s-3)">
            <button class="btn btn-primary" id="saveOwnersBtn">保存 OWNERS</button>
          </div>
        </div>

        <div class="form-section">
          <div class="form-section-title">CHANGELOG</div>
          <div class="changelog-list">${changelogHtml}</div>
          <button class="btn btn-ghost" style="margin-top:var(--s-3)" id="addChangelogBtn">+ 添加变更记录</button>
        </div>

      </div>
      ${buildSidePanel(skill)}
    </div>
  `;
}

/* ─────────────────────────────────────────────
   事件绑定
───────────────────────────────────────────── */
function bindDetailEvents(el, skill) {
  /* 返回 */
  el.querySelector('#detailBack')?.addEventListener('click', () => {
    window.backToSkillList?.();
  });

  /* Tab 切换 */
  el.querySelectorAll('.detail-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeTab = btn.dataset.tab;
      renderSkillDetail(_skillId, _activeTab);
    });
  });

  /* ── 基础信息 form ── */
  const formBasic = el.querySelector('#formBasic');
  if (formBasic) {
    formBasic.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formBasic));
      const tags = (data.tags || '').split(/[,，]/).map(t => t.trim()).filter(Boolean);
      const result = updateSkill(skill.id, {
        name:          data.name?.trim(),
        icon:          data.icon,
        version:       data.version?.trim(),
        category:      data.category,
        priority:      data.priority,
        owner:         data.owner?.trim(),
        description:   data.description?.trim(),
        tags,
        license:       data.license?.trim(),
        compatibility: data.compatibility?.trim(),
        allowedTools:  data.allowedTools?.trim(),
        metadata: {
          author:          (data.meta_author || '').trim(),
          team:            (data.meta_team || '').trim(),
          minAgentVersion: (data.meta_minAgentVersion || '').trim(),
        },
      });
      if (result.success) {
        showToast('基础信息已保存');
        renderSkillDetail(_skillId, 'basic');
      } else {
        showToast(result.error || '保存失败', 'error');
      }
    });
  }

  /* ── 指令内容 form ── */
  const formBody = el.querySelector('#formBody');
  if (formBody) {
    formBody.addEventListener('submit', e => {
      e.preventDefault();
      const data = Object.fromEntries(new FormData(formBody));
      const body = {
        overview:      data.overview      || '',
        prerequisites: data.prerequisites || '',
        steps:         data.steps         || '',
        gotchas:       data.gotchas       || '',
        outputFormat:  data.outputFormat  || '',
        edgeCases:     data.edgeCases     || '',
      };
      updateSkill(skill.id, { body });
      showToast('指令内容已保存');
    });
  }

  /* ── 评估用例 ── */
  const evalsContainer = el.querySelector('#evalsContainer');
  if (evalsContainer) {
    /* 添加用例 */
    el.querySelector('#addEvalBtn')?.addEventListener('click', () => {
      const currentSkill = getSkillById(skill.id);
      const evals = [...(currentSkill.evals || []), { id: `e${Date.now()}`, prompt: '', expectedOutput: '', assertions: [] }];
      updateSkill(skill.id, { evals });
      renderSkillDetail(_skillId, 'evals');
    });

    /* 删除用例 */
    el.querySelectorAll('.eval-delete').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.evalIdx, 10);
        const currentSkill = getSkillById(skill.id);
        const evals = (currentSkill.evals || []).filter((_, i) => i !== idx);
        updateSkill(skill.id, { evals });
        showToast('已删除');
        renderSkillDetail(_skillId, 'evals');
      });
    });

    /* 保存用例 */
    el.querySelector('#saveEvalsBtn')?.addEventListener('click', () => {
      const currentSkill = getSkillById(skill.id);
      const count = (currentSkill.evals || []).length;
      const evals = Array.from({ length: count }, (_, i) => {
        const prompt     = evalsContainer.querySelector(`[name="eval_prompt_${i}"]`)?.value.trim() || '';
        const expected   = evalsContainer.querySelector(`[name="eval_expected_${i}"]`)?.value.trim() || '';
        const assertsRaw = evalsContainer.querySelector(`[name="eval_assertions_${i}"]`)?.value || '';
        const assertions = assertsRaw.split(/[,，]/).map(a => a.trim()).filter(Boolean);
        return { id: currentSkill.evals[i]?.id || `e${i}`, prompt, expectedOutput: expected, assertions };
      });
      updateSkill(skill.id, { evals });
      showToast('评估用例已保存');
    });
  }

  /* ── MCP 绑定 ── */
  const servers = getServers();
  servers.forEach(srv => {
    const cb   = el.querySelector(`#srvCheck-${srv.id}`);
    const item = el.querySelector(`#srvItem-${srv.id}`);
    cb?.addEventListener('change', () => {
      item?.classList.toggle('selected', cb.checked);
    });
  });

  el.querySelector('#saveMcpBindBtn')?.addEventListener('click', () => {
    servers.forEach(srv => {
      const cb = el.querySelector(`#srvCheck-${srv.id}`);
      if (cb?.checked) {
        const toolCbs = el.querySelectorAll(`input[name="tool-${srv.id}"]:checked`);
        const tools   = Array.from(toolCbs).map(t => t.value);
        const purpose = el.querySelector(`#purpose-${srv.id}`)?.value.trim() || '';
        overwriteSkillBindings(srv.id, skill.id, tools, purpose);
      } else {
        overwriteSkillBindings(srv.id, skill.id, [], '');
      }
    });
    showToast('MCP 绑定已保存');
    renderSkillDetail(_skillId, 'mcp');
  });

  /* ── 运维信息 ── */
  el.querySelector('#saveOpsStatusBtn')?.addEventListener('click', () => {
    const newStatus = el.querySelector('#opsStatus')?.value;
    if (!newStatus) return;
    const updates = { status: newStatus };
    if (newStatus === 'published' && !skill.publishedAt) {
      updates.publishedAt = new Date().toISOString();
    }
    updateSkill(skill.id, updates);
    showToast('状态已更新');
    renderSkillDetail(_skillId, 'ops');
  });

  el.querySelector('#saveOwnersBtn')?.addEventListener('click', () => {
    const raw = el.querySelector('#opsOwners')?.value || '';
    const owners = raw.split(/[,，]/).map(o => o.trim()).filter(Boolean);
    updateSkill(skill.id, { owners });
    showToast('OWNERS 已保存');
  });

  el.querySelector('#addChangelogBtn')?.addEventListener('click', () => {
    openChangelogModal(skill.id);
  });
}

/* ── 添加 Changelog 条目 Modal ── */
function openChangelogModal(skillId) {
  const skill = getSkillById(skillId);
  if (!skill) return;

  showModal(`
    <div class="modal-header">
      <span class="modal-title">添加变更记录</span>
      <button class="btn-icon" id="modalClose">
        <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
          <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
        </svg>
      </button>
    </div>
    <div class="modal-body">
      <div class="form-group">
        <label class="form-label">版本号 <span class="req">*</span></label>
        <input class="form-input mono" id="clVersion" placeholder="如：1.0.1" value="${escHtml(skill.version || '')}">
      </div>
      <div class="form-group">
        <label class="form-label">日期</label>
        <input class="form-input" id="clDate" type="date" value="${new Date().toISOString().slice(0, 10)}">
      </div>
      <div class="form-group">
        <label class="form-label">变更说明 <span class="req">*</span></label>
        <textarea class="form-textarea" id="clNotes" rows="3" placeholder="描述本次版本的主要变更内容"></textarea>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary" id="modalSave">添加</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSave')?.addEventListener('click', () => {
    const version = document.getElementById('clVersion')?.value.trim();
    const date    = document.getElementById('clDate')?.value.trim();
    const notes   = document.getElementById('clNotes')?.value.trim();
    if (!version || !notes) { showToast('请填写版本号和变更说明', 'error'); return; }

    const currentSkill = getSkillById(skillId);
    const changelog = [{ version, date, notes }, ...(currentSkill.changelog || [])];
    updateSkill(skillId, { changelog });
    showToast('变更记录已添加');
    closeModal();
    renderSkillDetail(_skillId, 'ops');
  });
}
