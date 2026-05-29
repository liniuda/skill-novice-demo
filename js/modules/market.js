/**
 * Market 市场模块
 * 三大子模块：Skill 广场 / 发布中心 / 我的发布
 * 与 Work 双向联动 — 事件驱动跳转
 */
import { getSkills, addSkill, updateSkill, invalidateCache, CATEGORIES } from '../data/skills.js';
import { showToast, escHtml, debounce } from '../utils.js';
import { showModal, closeModal } from '../modal.js';

/* ─────────────────────────────────────────────
   市场预置数据
───────────────────────────────────────────── */
const MARKET_SKILLS = [
  {
    id: 'mkt-customer-routing',
    name: 'AI 客服路由',
    skillName: 'customer-routing',
    icon: '\u{1F916}',
    category: 'customer-service',
    description: '智能分流客服请求，根据意图自动分派最优 Agent 处理',
    tags: ['客服', '路由', 'AI分流'],
    author: 'alibaba-cco',
    version: '1.2.0',
    latestVersion: '1.2.0',
    downloads: 3800,
    stars: 4.9,
    badge: '官方',
    badgeType: 'official',
    body: { overview: '智能分流客服请求，根据用户意图自动路由到最优 Agent。支持规则配置和 AI 动态分派两种模式。', prerequisites: '- 需要接入客服系统 API\n- 配置路由规则表', steps: '### 步骤 1：接收用户请求\n解析用户意图标签。\n\n### 步骤 2：匹配路由规则\n优先走规则引擎，命中则直接分派。\n\n### 步骤 3：AI 兜底\n规则未命中时，调用意图分类模型选择 Agent。', gotchas: '- 避免路由死循环\n- 意图不明确时默认转人工', outputFormat: '返回目标 Agent ID 和置信度分值', edgeCases: '- 所有 Agent 繁忙时入队等待\n- 超时自动转人工' },
    evals: [{ id: 'e1', prompt: '我的包裹丢失了怎么办', expectedOutput: '路由到物流纠纷 Agent', assertions: ['返回 agentId', '置信度>0.8'] }],
    changelog: [{ version: '1.2.0', date: '2026-03-01', notes: '新增 AI 动态分派模式，准确率提升 12%' }],
  },
  {
    id: 'mkt-product-pro',
    name: '商品管理 Pro',
    skillName: 'product-management-pro',
    icon: '\u{1F4E6}',
    category: 'product',
    description: '覆盖发布/审核/管控/批量/类目/优化全链路，支持多语言商品',
    tags: ['商品', '发布', '审核', '批量'],
    author: 'cco-product-team',
    version: '2.3.0',
    latestVersion: '2.3.0',
    downloads: 1200,
    stars: 4.8,
    badge: '热门',
    badgeType: 'hot',
    body: { overview: '全链路商品管理能力，覆盖发布审核到下架归档的完整生命周期。', prerequisites: '- 商品 API 权限\n- 类目权限配置', steps: '### 步骤 1：接收商品操作请求\n识别操作类型（发布/修改/下架等）。\n\n### 步骤 2：合规预检\n调用审核规则引擎检查关键字和图片。\n\n### 步骤 3：执行操作\n调用对应商品 API 完成操作，返回结果。', gotchas: '- 批量操作需做幂等处理\n- 敏感类目需额外审核', outputFormat: '返回操作结果和商品 ID 列表', edgeCases: '- 审核失败时返回具体拒绝原因\n- 批量超限时分批执行' },
    evals: [],
    changelog: [{ version: '2.3.0', date: '2026-02-15', notes: '支持多语言商品 title 自动翻译' }],
  },
  {
    id: 'mkt-knowledge-v2',
    name: '知识检索 V2',
    skillName: 'knowledge-search-v2',
    icon: '\u{1F50D}',
    category: 'knowledge',
    description: '基于大模型的语义检索，支持多知识库融合召回与排序',
    tags: ['知识', '向量', '语义', 'RAG'],
    author: 'alibaba-cco',
    version: '2.0.0',
    latestVersion: '2.0.0',
    downloads: 2400,
    stars: 4.9,
    badge: '官方',
    badgeType: 'official',
    body: { overview: '语义向量检索，支持跨多个知识库融合召回，自动排序返回最相关结果。', prerequisites: '- 语雀/内部知识库 API 权限\n- 向量服务接入', steps: '### 步骤 1：解析查询\n对用户问题做语义理解和关键词提取。\n\n### 步骤 2：多库并行检索\n同时查询配置的多个知识库，合并结果。\n\n### 步骤 3：重排序\n根据相关度和时效性重排序，返回 TopK。', gotchas: '- 避免返回过期文档\n- 相关度阈值建议 ≥ 0.7', outputFormat: '返回文档摘要列表，含来源和相关度分值', edgeCases: '- 检索为空时引导用户联系人工\n- 知识库不可用时降级到关键字搜索' },
    evals: [{ id: 'e1', prompt: '如何申请退款', expectedOutput: '返回退款流程相关文档', assertions: ['包含文档来源', '相关度>0.7'] }],
    changelog: [{ version: '2.0.0', date: '2026-01-20', notes: '升级向量模型，召回准确率提升 18%' }],
  },
  {
    id: 'mkt-refund-smart',
    name: '智能退款处理',
    skillName: 'smart-refund',
    icon: '\u{1F504}',
    category: 'customer-service',
    description: '自动识别退款场景，智能推荐解决方案，支持规则自定义',
    tags: ['退款', '自动化', '规则引擎'],
    author: 'cco-refund-team',
    version: '1.5.0',
    latestVersion: '1.5.0',
    downloads: 980,
    stars: 4.7,
    badge: null,
    badgeType: null,
    body: { overview: '自动识别买家退款场景，根据规则引擎智能推荐最优解决方案。', prerequisites: '- 订单系统 API\n- 退款规则配置', steps: '### 步骤 1：识别退款类型\n判断是质量问题/物流问题/买家反悔等。\n\n### 步骤 2：规则匹配\n根据金额、时效、责任判定匹配处理方案。\n\n### 步骤 3：执行或升级\n自动执行或升级至人工处理。', gotchas: '- 高风险退款需人工复核\n- 保留操作日志', outputFormat: '返回处理方案和预计时效', edgeCases: '- 超权限退款提交人工审批\n- 订单异常时暂停处理' },
    evals: [],
    changelog: [{ version: '1.5.0', date: '2026-02-10', notes: '新增买家责任判定模型' }],
  },
  {
    id: 'mkt-logistics-track',
    name: '物流实时追踪',
    skillName: 'logistics-realtime',
    icon: '\u{1F5FA}',
    category: 'logistics',
    description: '接入全球主流物流商 API，实时推送轨迹更新与异常预警',
    tags: ['物流', '追踪', '实时', '全球'],
    author: 'cco-logistics-team',
    version: '3.1.0',
    latestVersion: '3.1.0',
    downloads: 1560,
    stars: 4.8,
    badge: '热门',
    badgeType: 'hot',
    body: { overview: '接入 200+ 全球物流商，实时拉取轨迹数据并推送异常预警。', prerequisites: '- 物流 API 授权\n- Webhook 配置', steps: '### 步骤 1：查询运单号\n接收运单号，识别物流商。\n\n### 步骤 2：拉取轨迹\n调用对应物流商 API 获取实时轨迹。\n\n### 步骤 3：异常检测\n检测超时/丢件/清关异常等，触发预警。', gotchas: '- 部分物流商有频率限制\n- 国际件时区处理', outputFormat: '返回时间线格式的轨迹列表和异常标记', edgeCases: '- API 不可用时返回缓存数据\n- 运单不存在时提示核查' },
    evals: [],
    changelog: [{ version: '3.1.0', date: '2026-03-05', notes: '新增 DHL Express 接入，覆盖量达 200+' }],
  },
  {
    id: 'mkt-dispute-auto',
    name: '纠纷自动举证',
    skillName: 'dispute-auto-evidence',
    icon: '\u2696\uFE0F',
    category: 'dispute',
    description: '自动收集订单/物流/沟通记录，一键生成标准化举证材料',
    tags: ['纠纷', '举证', '自动化'],
    author: 'cco-dispute-team',
    version: '1.8.0',
    latestVersion: '1.8.0',
    downloads: 720,
    stars: 4.6,
    badge: '新上线',
    badgeType: 'new',
    body: { overview: '自动聚合订单、物流、聊天记录，生成符合平台标准的举证材料包。', prerequisites: '- 纠纷系统 API\n- 文件生成权限', steps: '### 步骤 1：获取纠纷信息\n拉取纠纷 ID 对应的基础信息。\n\n### 步骤 2：聚合证据\n并行拉取订单截图、物流轨迹、聊天记录。\n\n### 步骤 3：生成材料包\n按平台模板整理为 PDF 或结构化数据。', gotchas: '- 聊天记录需脱敏处理\n- 超时证据需标注时效', outputFormat: '返回举证材料包下载链接', edgeCases: '- 证据不足时给出补充建议\n- 超期纠纷提示申诉截止时间' },
    evals: [],
    changelog: [{ version: '1.8.0', date: '2026-03-12', notes: '新增聊天记录自动截图功能' }],
  },
  {
    id: 'mkt-payment-risk',
    name: '支付风控助手',
    skillName: 'payment-risk',
    icon: '\u{1F6E1}\uFE0F',
    category: 'payment',
    description: '实时检测异常支付行为，自动触发风控规则与人工复核流程',
    tags: ['支付', '风控', '安全'],
    author: 'cco-payment-team',
    version: '1.1.0',
    latestVersion: '1.1.0',
    downloads: 540,
    stars: 4.7,
    badge: '新上线',
    badgeType: 'new',
    body: { overview: '实时检测异常支付行为，结合规则引擎和风控模型，自动触发处置流程。', prerequisites: '- 支付系统 API\n- 风控规则配置权限', steps: '### 步骤 1：接收支付事件\n监听支付行为触发的事件流。\n\n### 步骤 2：风险评估\n规则引擎 + 模型双重评分。\n\n### 步骤 3：处置\n低风险放行，高风险拦截并推送人工复核。', gotchas: '- 误拦截需快速申诉通道\n- 风控规则定期更新', outputFormat: '返回风险等级和处置结果', edgeCases: '- 系统异常时默认人工复核\n- 批量异常触发升级预警' },
    evals: [],
    changelog: [{ version: '1.1.0', date: '2026-03-08', notes: '接入新版欺诈识别模型' }],
  },
  {
    id: 'mkt-store-analytics',
    name: '店铺数据分析',
    skillName: 'store-analytics',
    icon: '\u{1F4CA}',
    category: 'operation',
    description: '汇聚流量/转化/GMV/评价多维数据，生成智能经营报告',
    tags: ['数据', '分析', '报告', '经营'],
    author: 'cco-store-team',
    version: '2.0.0',
    latestVersion: '2.0.0',
    downloads: 890,
    stars: 4.8,
    badge: null,
    badgeType: null,
    body: { overview: '汇聚多维度经营数据，通过 AI 分析生成可操作的经营建议报告。', prerequisites: '- 数据平台 API 权限\n- 店铺授权', steps: '### 步骤 1：指定分析维度\n接收时间范围和分析指标。\n\n### 步骤 2：数据聚合\n从数据平台拉取流量、转化、GMV、评价数据。\n\n### 步骤 3：AI 解读\n生成趋势分析和优化建议。', gotchas: '- T+1 数据有延迟\n- 敏感数据需脱敏', outputFormat: '返回结构化报告，含趋势图数据和文字建议', edgeCases: '- 数据不足 7 天时降级报告精度\n- API 超时时返回缓存报告' },
    evals: [],
    changelog: [{ version: '2.0.0', date: '2026-02-20', notes: 'AI 经营建议功能上线' }],
  },
];

const BADGE_STYLES = {
  official: { bg: '#E6F4FF', color: '#1677FF', text: '官方' },
  hot:      { bg: '#FFF3EB', color: '#FF6A00', text: '热门' },
  new:      { bg: '#F6FFED', color: '#52C41A', text: '新上线' },
};

/* ─────────────────────────────────────────────
   状态
───────────────────────────────────────────── */
let _searchQuery = '';
let _activeFilter = 'all';
let _sortBy      = 'downloads';
const _rendered  = { square: false, publish: false, mine: false };

/* ─────────────────────────────────────────────
   localStorage 工具
───────────────────────────────────────────── */
function getImported() {
  try {
    const raw = localStorage.getItem('scd_market_imported');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (parsed.length && typeof parsed[0] === 'string') {
      return parsed.map(id => ({ mktId: id, workSkillId: null, importedVersion: null, importedAt: null }));
    }
    return parsed;
  } catch { return []; }
}
function saveImported(list) {
  try { localStorage.setItem('scd_market_imported', JSON.stringify(list)); } catch {}
}
function findImport(mktId) {
  return getImported().find(r => r.mktId === mktId) || null;
}
function getPublished() {
  try {
    const raw = localStorage.getItem('scd_market_published');
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function savePublished(list) {
  try { localStorage.setItem('scd_market_published', JSON.stringify(list)); } catch {}
}

/* ─────────────────────────────────────────────
   主入口 — 由 app.js 的 switchMarketTab 驱动
───────────────────────────────────────────── */
export function renderMarketSub(tab) {
  const view = document.getElementById('mkt-' + tab);
  if (!view) return;

  /* 首次进入时渲染（懒加载） */
  if (!_rendered[tab]) {
    if (tab === 'square')  { invalidateCache(); view.innerHTML = renderSquare(); bindSquareEvents(view); }
    if (tab === 'publish') { invalidateCache(); view.innerHTML = renderPublish(); bindPublishEvents(view); }
    if (tab === 'mine')    { view.innerHTML = renderMine(); bindMineEvents(view); }
    _rendered[tab] = true;
  }
}

/* 强制刷新某个子模块（数据变更后调用） */
function refreshSub(tab) {
  _rendered[tab] = false;
  const view = document.getElementById('mkt-' + tab);
  if (view) {
    if (tab === 'square')  { invalidateCache(); view.innerHTML = renderSquare(); bindSquareEvents(view); }
    if (tab === 'publish') { invalidateCache(); view.innerHTML = renderPublish(); bindPublishEvents(view); }
    if (tab === 'mine')    { view.innerHTML = renderMine(); bindMineEvents(view); }
    _rendered[tab] = true;
  }
}

/* ─────────────────────────────────────────────
   事件委托：统一路由
───────────────────────────────────────────── */
function delegateClick(root, handler) {
  root.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    e.preventDefault();
    e.stopPropagation();
    handler(btn.dataset.action, btn);
  });
}

/* ─────────────────────────────────────────────
   ① Skill 广场
───────────────────────────────────────────── */
function renderSquare() {
  const imported = getImported();
  const importedIds = new Set(imported.map(r => r.mktId));
  const workSkills = getSkills();
  const workSkillNames = new Set(workSkills.map(s => s.skillName));

  /* 筛选 + 排序 */
  let list = [...MARKET_SKILLS];
  if (_activeFilter !== 'all') list = list.filter(s => s.category === _activeFilter);
  if (_searchQuery) {
    const q = _searchQuery.toLowerCase();
    list = list.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.description.toLowerCase().includes(q) ||
      (s.tags || []).some(t => t.toLowerCase().includes(q))
    );
  }
  if (_sortBy === 'downloads') list.sort((a, b) => b.downloads - a.downloads);
  else if (_sortBy === 'stars') list.sort((a, b) => b.stars - a.stars);

  const filterCats = [
    { id: 'all', name: '全部', icon: '🔷' },
    ...CATEGORIES.filter(c => MARKET_SKILLS.some(s => s.category === c.id)),
  ];
  const filterHtml = filterCats.map(c =>
    `<button class="filter-chip${_activeFilter === c.id ? ' active' : ''}" data-action="filter" data-cat="${c.id}">${c.icon || ''} ${escHtml(c.name)}</button>`
  ).join('');

  const totalImported = imported.length;
  const totalDownloads = MARKET_SKILLS.reduce((s, m) => s + m.downloads, 0);

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">Skill 广场</h1>
        <p class="page-subtitle">
          发现并引入社区优质 Skill &nbsp;·&nbsp; 共 <strong>${MARKET_SKILLS.length}</strong> 个
          &nbsp;·&nbsp; 已引入 <strong>${totalImported}</strong> 个
          &nbsp;·&nbsp; 累计引入 <strong>${totalDownloads.toLocaleString()}</strong> 次
        </p>
      </div>
    </div>

    <div class="mkt-toolbar">
      <div class="search-wrap">
        <svg class="search-icon" width="14" height="14" viewBox="0 0 14 14" fill="none">
          <circle cx="6" cy="6" r="4.5" stroke="currentColor" stroke-width="1.4"/>
          <line x1="9.5" y1="9.5" x2="13" y2="13" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
        </svg>
        <input class="search-input" id="mktSearch" type="text" placeholder="搜索名称、描述、标签…" value="${escHtml(_searchQuery)}">
      </div>
      <select class="filter-select" id="mktSort" style="width:auto">
        <option value="downloads"${_sortBy === 'downloads' ? ' selected' : ''}>按引入量</option>
        <option value="stars"${_sortBy === 'stars' ? ' selected' : ''}>按评分</option>
      </select>
    </div>

    <div class="filter-row">${filterHtml}</div>

    <div class="mkt-grid" id="mktGrid">
      ${list.length
        ? list.map(s => renderSquareCard(s, importedIds.has(s.id), workSkillNames.has(s.skillName), imported.find(r => r.mktId === s.id))).join('')
        : `<div class="empty-state"><div class="empty-state-title">没有匹配的 Skill</div><div class="empty-state-desc">尝试调整筛选条件或搜索关键词</div></div>`
      }
    </div>
  `;
}

function renderSquareCard(s, isImported, isConflict, importRecord) {
  const badge = s.badgeType ? BADGE_STYLES[s.badgeType] : null;
  const catInfo = CATEGORIES.find(c => c.id === s.category);
  const hasUpgrade = isImported && importRecord?.importedVersion && importRecord.importedVersion !== s.latestVersion;

  /* 识别层 badge */
  const badgeHtml = badge
    ? `<span class="mkt-card-badge" style="background:${badge.bg};color:${badge.color}">${badge.text}</span>`
    : '';
  const upgradeBadge = hasUpgrade
    ? `<span class="mkt-card-badge" style="background:#FFF3EB;color:#FF6A00">v${escHtml(s.latestVersion)}</span>`
    : '';

  /* 行动层按钮 */
  let actionBtn;
  if (isImported) {
    if (hasUpgrade) {
      actionBtn = `<button class="btn btn-sm btn-primary" data-action="upgrade" data-mkt-id="${s.id}">升级到 v${escHtml(s.latestVersion)}</button>
                   <button class="btn btn-sm btn-ghost" data-action="preview" data-mkt-id="${s.id}">查看详情</button>`;
    } else {
      actionBtn = `<button class="btn btn-sm btn-ghost" data-action="preview" data-mkt-id="${s.id}">查看详情</button>`;
    }
  } else if (isConflict) {
    actionBtn = `<span class="mkt-card-conflict">Work 中已有同名</span>`;
  } else {
    actionBtn = `<button class="btn btn-sm btn-primary" data-action="import" data-mkt-id="${s.id}">引入</button>`;
  }

  return `
    <div class="mkt-card${hasUpgrade ? ' mkt-card-upgradable' : ''}" data-action="preview" data-mkt-id="${s.id}">
      ${badgeHtml}${upgradeBadge}
      <div class="mkt-card-header">
        <div class="mkt-card-icon">${s.icon}</div>
        <div class="mkt-card-meta">
          <div class="mkt-card-name">${escHtml(s.name)}</div>
          <div class="mkt-card-author">${escHtml(s.author)} · v${escHtml(s.version)}</div>
        </div>
      </div>
      <div class="mkt-card-desc">${escHtml(s.description)}</div>
      <div class="mkt-card-footer">
        <div class="mkt-card-stats">
          <span title="引入量">⬇ ${s.downloads.toLocaleString()}</span>
          <span class="mkt-stars" title="评分">★ ${s.stars}</span>
          ${catInfo ? `<span class="mkt-card-cat">${catInfo.icon} ${escHtml(catInfo.name)}</span>` : ''}
        </div>
        <div class="mkt-card-actions">${actionBtn}</div>
      </div>
    </div>
  `;
}

function bindSquareEvents(root) {
  /* 搜索防抖 */
  root.querySelector('#mktSearch')?.addEventListener('input', debounce((e) => {
    _searchQuery = e.target.value;
    refreshSub('square');
  }, 250));

  root.querySelector('#mktSort')?.addEventListener('change', e => {
    _sortBy = e.target.value;
    refreshSub('square');
  });

  /* 事件委托 */
  delegateClick(root, (action, btn) => {
    const mktId = btn.dataset.mktId;
    const mktSkill = MARKET_SKILLS.find(s => s.id === mktId);

    switch (action) {
      case 'import':
        if (mktSkill) importSkill(mktSkill);
        break;
      case 'upgrade':
        if (mktSkill) upgradeSkill(mktSkill);
        break;
      case 'preview':
        if (mktSkill) openPreviewModal(mktSkill);
        break;
      case 'filter':
        _activeFilter = btn.dataset.cat;
        refreshSub('square');
        break;
    }
  });
}

/* ─────────────────────────────────────────────
   ② 发布中心
───────────────────────────────────────────── */
function renderPublish() {
  const workSkills = getSkills();
  const published = getPublished();
  const publishedIds = new Set(published.filter(r => r.status === 'active').map(r => r.workSkillId));

  const publishable = workSkills.filter(s => s.status === 'published' && !publishedIds.has(s.id));
  const drafts = workSkills.filter(s => s.status !== 'published' && !publishedIds.has(s.id));

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">发布中心</h1>
        <p class="page-subtitle">将 Work 中已发布的 Skill 共享到市场，让更多团队复用你的能力</p>
      </div>
    </div>

    ${publishable.length === 0 && drafts.length === 0 ? `
      <div class="empty-state">
        <div class="empty-state-icon">\u{1F680}</div>
        <div class="empty-state-title">暂无可发布的 Skill</div>
        <div class="empty-state-desc">Work 中所有 Skill 均已发布到市场，或尚无 Skill</div>
        <button class="btn btn-primary" data-action="nav-work">去 Work 创建 Skill</button>
      </div>` : ''}

    ${publishable.length > 0 ? `
      <div class="form-section">
        <div class="form-section-title">可发布的 Skill（已在 Work 中上线）</div>
        <div class="publish-list" id="publishList">
          ${publishable.map(s => renderPublishItem(s)).join('')}
        </div>
      </div>` : ''}

    ${drafts.length > 0 ? `
      <div class="form-section" style="margin-top:var(--s-6)">
        <div class="form-section-title" style="color:var(--text-tertiary)">草稿 Skill（需先在 Work 中发布才可共享）</div>
        <div class="publish-list">
          ${drafts.map(s => renderDraftItem(s)).join('')}
        </div>
      </div>` : ''}
  `;
}

function renderPublishItem(s) {
  const hasEvals = (s.evals || []).length > 0;
  const hasChangelog = (s.changelog || []).length > 0;
  const qualityScore = [s.description ? 1 : 0, s.body?.overview ? 1 : 0, hasEvals ? 1 : 0, hasChangelog ? 1 : 0].reduce((a, b) => a + b, 0);
  const qualityColor = qualityScore >= 3 ? 'var(--success)' : qualityScore >= 2 ? 'var(--warning)' : 'var(--danger)';

  return `
    <div class="publish-item">
      <div class="publish-item-info">
        <div style="display:flex;align-items:center;gap:var(--s-2)">
          <span style="font-size:20px">${s.icon}</span>
          <div>
            <div style="font-weight:600;font-size:var(--font-size-sm)">${escHtml(s.name)}</div>
            <div style="font-size:var(--font-size-xs);color:var(--text-secondary)">${escHtml(s.skillName)} · v${escHtml(s.version)}</div>
          </div>
        </div>
        <span style="font-size:var(--font-size-xs);color:${qualityColor};font-weight:500">质量 ${qualityScore}/4</span>
      </div>
      <div style="display:flex;gap:var(--s-2)">
        <button class="btn btn-sm btn-ghost" data-action="nav-work-skill" data-skill-id="${escHtml(s.id)}" data-tab="basic">编辑</button>
        <button class="btn btn-sm btn-primary" data-action="publish" data-work-id="${escHtml(s.id)}">发布到市场</button>
      </div>
    </div>
  `;
}

function renderDraftItem(s) {
  return `
    <div class="publish-item" style="opacity:.6">
      <div class="publish-item-info">
        <div style="display:flex;align-items:center;gap:var(--s-2)">
          <span style="font-size:20px">${s.icon}</span>
          <div>
            <div style="font-weight:600;font-size:var(--font-size-sm)">${escHtml(s.name)}</div>
            <div style="font-size:var(--font-size-xs);color:var(--text-secondary)">${escHtml(s.skillName)} · ${escHtml(s.status === 'draft' ? '草稿' : s.status)}</div>
          </div>
        </div>
      </div>
      <button class="btn btn-sm btn-ghost" data-action="nav-work-skill" data-skill-id="${escHtml(s.id)}" data-tab="ops">去发布</button>
    </div>
  `;
}

function bindPublishEvents(root) {
  delegateClick(root, (action, btn) => {
    switch (action) {
      case 'nav-work':
        document.dispatchEvent(new CustomEvent('app:nav-to-skill', { detail: {} }));
        window.switchGlobalMode?.('work');
        break;
      case 'nav-work-skill':
        document.dispatchEvent(new CustomEvent('app:nav-to-skill', {
          detail: { skillId: btn.dataset.skillId, tab: btn.dataset.tab || 'basic' }
        }));
        break;
      case 'publish':
        openPublishModal(btn.dataset.workId, btn);
        break;
    }
  });
}

/* ─────────────────────────────────────────────
   ③ 我的发布
───────────────────────────────────────────── */
function renderMine() {
  const published = getPublished();
  const active = published.filter(r => r.status === 'active');

  if (active.length === 0) {
    return `
      <div class="page-header">
        <div>
          <h1 class="page-title">我的发布</h1>
          <p class="page-subtitle">管理你发布到市场的 Skill</p>
        </div>
      </div>
      <div class="empty-state">
        <div class="empty-state-icon">\u{1F4E6}</div>
        <div class="empty-state-title">还没有发布过 Skill</div>
        <div class="empty-state-desc">前往发布中心，将 Work 中的 Skill 共享到市场</div>
        <button class="btn btn-primary" data-action="go-publish">去发布中心</button>
      </div>
    `;
  }

  const workSkills = getSkills();

  const cards = active.map(record => {
    const workSkill = workSkills.find(s => s.id === record.workSkillId);
    const hasUpdate = workSkill && workSkill.version !== record.syncedVersion;
    const workGone  = !workSkill;

    return `
      <div class="mine-card${hasUpdate ? ' mine-card-update' : ''}${workGone ? ' mine-card-gone' : ''}">
        <div class="mine-card-header">
          <div style="display:flex;align-items:center;gap:var(--s-3)">
            <span style="font-size:24px">${workSkill?.icon || '\u{1F4E6}'}</span>
            <div>
              <div style="font-weight:600">${escHtml(record.name)}</div>
              <div style="font-size:var(--font-size-xs);color:var(--text-secondary)">
                发布版本 v${escHtml(record.syncedVersion)}
                ${hasUpdate ? `<span style="color:var(--accent);font-weight:500;margin-left:6px">· Work 已更新到 v${escHtml(workSkill.version)}</span>` : ''}
                ${workGone ? `<span style="color:var(--danger);font-weight:500;margin-left:6px">· Work 中源 Skill 已删除</span>` : ''}
              </div>
            </div>
          </div>
          <span class="badge ${record.visibility === 'public' ? 'badge-success' : 'badge-neutral'}">
            <span class="badge-dot"></span>${record.visibility === 'public' ? '公开' : '私有'}
          </span>
        </div>

        <div class="mine-card-stats">
          <div class="mine-stat"><div class="mine-stat-val">${(record.downloads || 0).toLocaleString()}</div><div class="mine-stat-label">引入次数</div></div>
          <div class="mine-stat"><div class="mine-stat-val">${record.stars != null ? record.stars : '暂无'}</div><div class="mine-stat-label">评分</div></div>
          <div class="mine-stat"><div class="mine-stat-val">${record.syncedAt ? new Date(record.syncedAt).toLocaleDateString('zh-CN') : '首次发布'}</div><div class="mine-stat-label">同步时间</div></div>
          <div class="mine-stat"><div class="mine-stat-val">${record.publishedAt ? new Date(record.publishedAt).toLocaleDateString('zh-CN') : '—'}</div><div class="mine-stat-label">发布时间</div></div>
        </div>

        <div class="mine-card-actions">
          ${!workGone ? `<button class="btn btn-sm btn-ghost" data-action="nav-work-skill" data-skill-id="${escHtml(record.workSkillId)}" data-tab="basic">去 Work 编辑</button>` : ''}
          ${hasUpdate ? `<button class="btn btn-sm btn-primary" data-action="sync" data-record-id="${escHtml(record.id)}">同步最新版本</button>` : ''}
          <button class="btn btn-sm btn-ghost" data-action="toggle-vis" data-record-id="${escHtml(record.id)}">${record.visibility === 'public' ? '设为私有' : '设为公开'}</button>
          <button class="btn btn-sm" data-action="unpublish" data-record-id="${escHtml(record.id)}" style="color:var(--danger)">下架</button>
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="page-header">
      <div>
        <h1 class="page-title">我的发布</h1>
        <p class="page-subtitle">共发布 <strong>${active.length}</strong> 个 Skill</p>
      </div>
    </div>
    <div class="mine-grid">${cards}</div>
  `;
}

function bindMineEvents(root) {
  delegateClick(root, (action, btn) => {
    const recordId = btn.dataset.recordId;

    switch (action) {
      case 'go-publish':
        window.switchMarketTab?.('publish');
        break;
      case 'nav-work-skill':
        document.dispatchEvent(new CustomEvent('app:nav-to-skill', {
          detail: { skillId: btn.dataset.skillId, tab: btn.dataset.tab || 'basic' }
        }));
        break;
      case 'sync':
        syncPublished(recordId);
        break;
      case 'toggle-vis': {
        const list = getPublished();
        const rec = list.find(r => r.id === recordId);
        if (!rec) return;
        rec.visibility = rec.visibility === 'public' ? 'private' : 'public';
        savePublished(list);
        showToast(`已设为${rec.visibility === 'public' ? '公开' : '私有'}`);
        refreshSub('mine');
        break;
      }
      case 'unpublish': {
        const list = getPublished();
        const rec = list.find(r => r.id === recordId);
        if (!rec) return;
        showModal(`
          <div class="modal-header">
            <span class="modal-title">下架确认</span>
            <button class="btn-icon" id="modalClose"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
          </div>
          <div class="modal-body">
            <p style="font-size:var(--font-size-sm);color:var(--text-secondary)">确定要从市场下架 <strong>${escHtml(rec.name)}</strong> 吗？已引入该 Skill 的用户不受影响。</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-ghost" id="modalCancel">取消</button>
            <button class="btn btn-danger" id="modalConfirm">确认下架</button>
          </div>
        `);
        document.getElementById('modalClose')?.addEventListener('click', closeModal);
        document.getElementById('modalCancel')?.addEventListener('click', closeModal);
        document.getElementById('modalConfirm')?.addEventListener('click', () => {
          rec.status = 'archived';
          savePublished(list);
          closeModal();
          showToast(`${rec.name} 已下架`);
          refreshSub('mine');
        });
        break;
      }
    }
  });
}

/* ─────────────────────────────────────────────
   联动操作
───────────────────────────────────────────── */

function importSkill(mktSkill) {
  invalidateCache();
  const existing = getSkills().find(s => s.skillName === mktSkill.skillName);
  if (existing) {
    showToast(`「${mktSkill.name}」已在 Work 空间中`, 'error');
    return;
  }

  const result = addSkill({
    name: mktSkill.name, skillName: mktSkill.skillName, icon: mktSkill.icon,
    category: mktSkill.category, description: mktSkill.description,
    tags: mktSkill.tags, version: mktSkill.version, owner: mktSkill.author,
    body: mktSkill.body, evals: mktSkill.evals || [], changelog: mktSkill.changelog || [],
  });

  if (result.success) {
    const list = getImported();
    list.push({ mktId: mktSkill.id, workSkillId: result.skill.id, importedVersion: mktSkill.version, importedAt: new Date().toISOString() });
    saveImported(list);

    showToast(`「${mktSkill.name}」已引入，正在跳转 Work…`);
    document.dispatchEvent(new CustomEvent('app:nav-to-skill', {
      detail: { skillId: result.skill.id, tab: 'basic' }
    }));
    /* 刷新广场状态 */
    _rendered.square = false;
  } else {
    showToast(result.error || '引入失败', 'error');
  }
}

function upgradeSkill(mktSkill) {
  const list = getImported();
  const record = list.find(r => r.mktId === mktSkill.id);
  if (!record?.workSkillId) return;

  invalidateCache();
  const result = updateSkill(record.workSkillId, {
    version: mktSkill.latestVersion, body: mktSkill.body,
    evals: mktSkill.evals || [], changelog: mktSkill.changelog || [],
  });

  if (result.success) {
    record.importedVersion = mktSkill.latestVersion;
    saveImported(list);
    showToast(`已升级到 v${mktSkill.latestVersion}`);
    refreshSub('square');
  } else {
    showToast('升级失败', 'error');
  }
}

function syncPublished(recordId) {
  invalidateCache();
  const list = getPublished();
  const record = list.find(r => r.id === recordId);
  if (!record) return;

  const workSkill = getSkills().find(s => s.id === record.workSkillId);
  if (!workSkill) { showToast('源 Skill 已不存在', 'error'); return; }

  record.syncedVersion = workSkill.version;
  record.syncedAt = new Date().toISOString();
  savePublished(list);
  showToast(`已同步到 v${workSkill.version}`);
  refreshSub('mine');
}

/* 发布 Modal */
function openPublishModal(workSkillId, btn) {
  invalidateCache();
  const skill = getSkills().find(s => s.id === workSkillId);
  if (!skill) return;

  const hasDesc = !!skill.description;
  const hasOverview = !!skill.body?.overview;
  const canPublish = hasDesc && hasOverview;
  const qualityHints = [
    hasOverview ? '<li style="color:var(--success)">✓ 有指令概述</li>' : '<li style="color:var(--danger)">✗ 缺少指令概述（必须）</li>',
    hasDesc ? '<li style="color:var(--success)">✓ 有描述</li>' : '<li style="color:var(--danger)">✗ 缺少描述（必须）</li>',
    (skill.evals || []).length > 0 ? '<li style="color:var(--success)">✓ 有评估用例</li>' : '<li style="color:var(--warning)">⚠ 建议添加评估用例</li>',
    (skill.changelog || []).length > 0 ? '<li style="color:var(--success)">✓ 有 Changelog</li>' : '<li style="color:var(--warning)">⚠ 建议添加 Changelog</li>',
  ].join('');

  showModal(`
    <div class="modal-header">
      <span class="modal-title">发布到市场 — ${escHtml(skill.name)}</span>
      <button class="btn-icon" id="modalClose"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div style="background:var(--bg);border-radius:var(--r-md);padding:var(--s-3);margin-bottom:var(--s-4)">
        <div style="font-size:var(--font-size-xs);font-weight:600;color:var(--text-secondary);margin-bottom:var(--s-2)">发布质量检查</div>
        <ul style="list-style:none;display:flex;flex-direction:column;gap:4px;font-size:var(--font-size-xs)">${qualityHints}</ul>
      </div>
      <div class="form-group">
        <label class="form-label">发布版本</label>
        <input class="form-input mono" id="pubVersion" value="${escHtml(skill.version)}" readonly style="background:var(--bg-tertiary)">
      </div>
      <div class="form-group">
        <label class="form-label">可见性</label>
        <select class="form-select" id="pubVisibility">
          <option value="public">公开（所有用户可见）</option>
          <option value="private">私有（仅自己可见）</option>
        </select>
      </div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">取消</button>
      <button class="btn btn-primary${canPublish ? '' : ' disabled'}" id="modalSave" ${canPublish ? '' : 'disabled'}>${canPublish ? '确认发布' : '请补充必填项'}</button>
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);
  document.getElementById('modalSave')?.addEventListener('click', () => {
    if (!canPublish) return;
    const visibility = document.getElementById('pubVisibility')?.value || 'public';
    const now = new Date().toISOString();

    const pubList = getPublished();
    pubList.push({
      id: `pub-${Date.now()}`, workSkillId: skill.id, name: skill.name,
      syncedVersion: skill.version, publishedAt: now, syncedAt: now,
      visibility, status: 'active', downloads: 0, stars: null,
    });
    savePublished(pubList);

    btn.textContent = '已发布';
    btn.disabled = true;

    closeModal();
    showToast(`「${skill.name}」已发布到市场`);
    /* 跳转到我的发布 */
    _rendered.mine = false;
    _rendered.publish = false;
    window.switchMarketTab?.('mine');
  });
}

/* 预览 Modal */
function openPreviewModal(mktSkill) {
  const catInfo = CATEGORIES.find(c => c.id === mktSkill.category);
  const importRecord = findImport(mktSkill.id);
  const isImported = !!importRecord;

  showModal(`
    <div class="modal-header">
      <span class="modal-title">${mktSkill.icon} ${escHtml(mktSkill.name)}</span>
      <button class="btn-icon" id="modalClose"><svg width="14" height="14" viewBox="0 0 14 14" fill="none"><line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>
    </div>
    <div class="modal-body">
      <div style="display:flex;gap:var(--s-2);flex-wrap:wrap;margin-bottom:var(--s-4)">
        <span class="badge badge-neutral"><span class="badge-dot"></span>${escHtml(mktSkill.author)}</span>
        <span class="badge badge-neutral">v${escHtml(mktSkill.version)}</span>
        ${catInfo ? `<span class="badge badge-neutral">${catInfo.icon} ${escHtml(catInfo.name)}</span>` : ''}
        <span class="badge badge-neutral">⬇ ${mktSkill.downloads.toLocaleString()}</span>
      </div>

      <div class="form-section">
        <div class="form-section-title">概述</div>
        <p style="font-size:var(--font-size-sm);color:var(--text-secondary);line-height:1.7">${escHtml(mktSkill.body?.overview || mktSkill.description)}</p>
      </div>

      ${mktSkill.body?.steps ? `
      <div class="form-section">
        <div class="form-section-title">执行步骤（预览）</div>
        <pre style="font-size:var(--font-size-xs);background:var(--bg);padding:var(--s-3);border-radius:var(--r-md);white-space:pre-wrap;line-height:1.6;color:var(--text-secondary)">${escHtml(mktSkill.body.steps.slice(0, 300))}${mktSkill.body.steps.length > 300 ? '…' : ''}</pre>
      </div>` : ''}

      ${(mktSkill.evals || []).length > 0 ? `
      <div class="form-section">
        <div class="form-section-title">评估用例（${mktSkill.evals.length} 个）</div>
        ${mktSkill.evals.map(ev => `
          <div class="eval-card" style="margin-bottom:var(--s-2)">
            <div style="font-size:var(--font-size-xs);color:var(--text-secondary)">Prompt: ${escHtml(ev.prompt)}</div>
            <div style="font-size:var(--font-size-xs);color:var(--text-tertiary)">预期: ${escHtml(ev.expectedOutput)}</div>
          </div>`).join('')}
      </div>` : ''}

      ${(mktSkill.changelog || []).length > 0 ? `
      <div class="form-section">
        <div class="form-section-title">变更记录</div>
        ${mktSkill.changelog.map(c => `
          <div class="changelog-entry">
            <span class="changelog-ver">v${escHtml(c.version)}</span>
            <span class="changelog-date">${escHtml(c.date)}</span>
            <span class="changelog-notes">${escHtml(c.notes)}</span>
          </div>`).join('')}
      </div>` : ''}
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost" id="modalCancel">关闭</button>
      ${isImported
        ? `<button class="btn btn-ghost" id="previewNavWork">去 Work 查看</button>`
        : `<button class="btn btn-primary" id="previewImportBtn">引入到 Work</button>`
      }
    </div>
  `);

  document.getElementById('modalClose')?.addEventListener('click', closeModal);
  document.getElementById('modalCancel')?.addEventListener('click', closeModal);

  const navWorkBtn = document.getElementById('previewNavWork');
  if (navWorkBtn) {
    navWorkBtn.addEventListener('click', () => {
      closeModal();
      document.dispatchEvent(new CustomEvent('app:nav-to-skill', {
        detail: { skillId: importRecord?.workSkillId || mktSkill.skillName, tab: 'basic' }
      }));
    });
  }

  document.getElementById('previewImportBtn')?.addEventListener('click', () => {
    closeModal();
    importSkill(mktSkill);
  });
}
