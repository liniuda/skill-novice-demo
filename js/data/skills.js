/**
 * Skill 数据层
 * 提供预置的 11 个 CCO Skill，支持 localStorage 持久化 CRUD
 */

const STORAGE_KEY = 'scd_skills';

/* ── 状态常量 ── */
export const STATUS_LABELS = { draft: '草稿', published: '已发布' };
export const STATUS_COLORS = { draft: '#64748B', published: '#059669' };

export const CATEGORIES = [
  { id: 'customer-service', name: '客服接待', icon: '💬' },
  { id: 'ticket-processing', name: '工单处理', icon: '📋' },
  { id: 'quality-assurance', name: '质量保障', icon: '🛡️' },
  { id: 'logistics',         name: '物流运输', icon: '🚚' },
  { id: 'payment',           name: '支付资金', icon: '💰' },
  { id: 'dispute',           name: '纠纷处理', icon: '⚖️' },
  { id: 'product',           name: '商品管理', icon: '📦' },
  { id: 'operation',         name: '运营管理', icon: '🏪' },
  { id: 'knowledge',         name: '知识检索', icon: '📚' },
];

export const PRIORITY_LABELS = { critical: '紧急', high: '高', medium: '中', low: '低' };
export const PRIORITY_COLORS = { critical: '#DC2626', high: '#EA580C', medium: '#D97706', low: '#9CA3AF' };

/* ── 预置 Skill 数据 ── */
/* ── Skill Body 默认模板 ── */
function defaultBody(desc) {
  return {
    overview:      desc || '',
    prerequisites: '- 需要访问相关业务数据接口\n- Agent 需具备对应权限',
    steps:         '### 步骤 1：接收用户请求\n\n解析用户意图，提取关键信息。\n\n### 步骤 2：调用工具或数据\n\n根据意图调用相关 MCP 工具或查询知识库。\n\n### 步骤 3：整理并回复\n\n综合结果，以清晰友好的方式回复用户。',
    gotchas:       '- 注意数据时效性，敏感操作需二次确认\n- 超出能力范围时应明确告知用户',
    outputFormat:  '以自然语言回复，关键数据使用列表或表格展示，操作结果需给出明确的成功/失败状态。',
    edgeCases:     '- 数据不存在时返回友好提示\n- 网络/超时错误时建议用户稍后重试',
  };
}

/* ── Skill 生命周期 ── */
export const LIFECYCLE_STAGES = [
  { id: 'draft',     label: '草稿',   desc: '本地开发，尚未提交审核' },
  { id: 'self-test', label: '自测',   desc: '开发者自测阶段' },
  { id: 'review',    label: '代码审查', desc: '等待或正在 Code Review' },
  { id: 'eval',      label: '评估',   desc: '自动化评估中' },
  { id: 'gray',      label: '灰度',   desc: '小流量灰度验证' },
  { id: 'published', label: '已发布', desc: '全量上线' },
  { id: 'ops',       label: '运维中', desc: '线上运维观察' },
  { id: 'archive',   label: '已归档', desc: '停止使用，归档保留' },
];

const PRESET_SKILLS = [
  { id: 'logistics',          name: '物流运输',   skillName: 'logistics',          icon: '🚚', color: '#0EA5E9', status: 'published', version: '2.1.0', category: 'logistics',         priority: 'high',     owner: 'cco-logistics-team',   description: '覆盖发货/跟踪/清关/揽收/费用/异常/运单7大子场景',    tags: ['物流','运输','清关','运费'],    publishedAt: '2026-01-15', updatedAt: '2026-03-10', license: 'MIT', compatibility: 'agent>=2.0.0', allowedTools: 'logistics_query, logistics_track, logistics_exception', metadata: { author: 'lidaniu', team: 'cco-logistics-team', minAgentVersion: '2.0.0' }, body: defaultBody('覆盖发货/跟踪/清关/揽收/费用/异常/运单7大子场景'), evals: [{ id: 'e1', prompt: '查询订单123的物流状态', expectedOutput: '返回物流轨迹信息', assertions: ['包含物流状态', '包含预计到达时间'] }], changelog: [{ version: '2.1.0', date: '2026-03-10', notes: '新增清关异常处理子场景' }, { version: '2.0.0', date: '2026-01-15', notes: '重构发货流程，支持多运营商' }], owners: ['cco-logistics-team', 'lidaniu'] },
  { id: 'account-permission', name: '账号权限',   skillName: 'account-permission', icon: '🔐', color: '#8B5CF6', status: 'published', version: '1.5.0', category: 'customer-service',  priority: 'medium',   owner: 'cco-account-team',     description: '账号安全/子账号/权限/认证/迁移6大子场景',             tags: ['账号','权限','安全'],           publishedAt: '2026-01-20', updatedAt: '2026-02-28', license: 'MIT', compatibility: 'agent>=1.5.0', allowedTools: '', metadata: { author: 'lidaniu', team: 'cco-account-team', minAgentVersion: '1.5.0' }, body: defaultBody('账号安全/子账号/权限/认证/迁移6大子场景'), evals: [], changelog: [{ version: '1.5.0', date: '2026-02-28', notes: '新增子账号权限管理' }], owners: ['cco-account-team'] },
  { id: 'payment-fund',       name: '支付资金',   skillName: 'payment-fund',       icon: '💰', color: '#F59E0B', status: 'published', version: '2.0.0', category: 'payment',           priority: 'high',     owner: 'cco-payment-team',     description: '提现/手续费/冻结/支付/退款/账单6大子场景',             tags: ['支付','资金','提现'],           publishedAt: '2026-01-18', updatedAt: '2026-03-05', license: 'MIT', compatibility: 'agent>=2.0.0', allowedTools: 'payment_query, fund_check', metadata: { author: 'lidaniu', team: 'cco-payment-team', minAgentVersion: '2.0.0' }, body: defaultBody('提现/手续费/冻结/支付/退款/账单6大子场景'), evals: [], changelog: [], owners: ['cco-payment-team'] },
  { id: 'ip-compliance',      name: 'IP合规',     skillName: 'ip-compliance',      icon: '⚖️', color: '#6366F1', status: 'published', version: '1.3.0', category: 'quality-assurance', priority: 'medium',   owner: 'cco-compliance-team',  description: '商标/申诉/合规/认证/管控/处罚6大子场景',               tags: ['知识产权','合规','商标'],        publishedAt: '2026-02-01', updatedAt: '2026-03-01', license: 'MIT', compatibility: 'agent>=1.0.0', allowedTools: '', metadata: { author: 'lidaniu', team: 'cco-compliance-team', minAgentVersion: '1.0.0' }, body: defaultBody('商标/申诉/合规/认证/管控/处罚6大子场景'), evals: [], changelog: [], owners: ['cco-compliance-team'] },
  { id: 'product-management', name: '商品管理',   skillName: 'product-management', icon: '📦', color: '#10B981', status: 'published', version: '1.8.0', category: 'product',           priority: 'medium',   owner: 'cco-product-team',     description: '发布/审核/管控/批量/类目/优化6大子场景',               tags: ['商品','发布','审核'],           publishedAt: '2026-01-25', updatedAt: '2026-02-20', license: 'MIT', compatibility: 'agent>=1.5.0', allowedTools: '', metadata: { author: 'lidaniu', team: 'cco-product-team', minAgentVersion: '1.5.0' }, body: defaultBody('发布/审核/管控/批量/类目/优化6大子场景'), evals: [], changelog: [], owners: ['cco-product-team'] },
  { id: 'ta-order',           name: '信保订单',   skillName: 'ta-order',           icon: '📋', color: '#EC4899', status: 'published', version: '2.2.0', category: 'ticket-processing', priority: 'high',     owner: 'cco-order-team',       description: '创建/查询/发货/修改/合同/收货6大子场景',               tags: ['订单','合同','信保'],           publishedAt: '2026-01-12', updatedAt: '2026-03-08', license: 'MIT', compatibility: 'agent>=2.0.0', allowedTools: 'order_query, order_create', metadata: { author: 'lidaniu', team: 'cco-order-team', minAgentVersion: '2.0.0' }, body: defaultBody('创建/查询/发货/修改/合同/收货6大子场景'), evals: [], changelog: [], owners: ['cco-order-team'] },
  { id: 'store-operation',    name: '店铺运营',   skillName: 'store-operation',    icon: '🏪', color: '#F97316', status: 'draft',    version: '0.8.0', category: 'operation',         priority: 'medium',   owner: 'cco-store-team',       description: '装修/数据/询盘/续费/评价/工具6大子场景',               tags: ['店铺','运营','装修'],           publishedAt: null,         updatedAt: '2026-03-12', license: 'MIT', compatibility: 'agent>=1.0.0', allowedTools: '', metadata: { author: 'lidaniu', team: 'cco-store-team', minAgentVersion: '1.0.0' }, body: defaultBody('装修/数据/询盘/续费/评价/工具6大子场景'), evals: [], changelog: [], owners: ['cco-store-team'] },
  { id: 'refund-return',      name: '退款售后',   skillName: 'refund-return',      icon: '🔄', color: '#EF4444', status: 'published', version: '1.9.0', category: 'customer-service',  priority: 'high',     owner: 'cco-refund-team',      description: '买家退款/卖家退款/退货/争议/无忧5大子场景',            tags: ['退款','退货','售后'],           publishedAt: '2026-01-10', updatedAt: '2026-03-06', license: 'MIT', compatibility: 'agent>=1.5.0', allowedTools: 'refund_apply, return_query', metadata: { author: 'lidaniu', team: 'cco-refund-team', minAgentVersion: '1.5.0' }, body: defaultBody('买家退款/卖家退款/退货/争议/无忧5大子场景'), evals: [], changelog: [], owners: ['cco-refund-team'] },
  { id: 'xinbao-dispute',     name: '信保纠纷',   skillName: 'xinbao-dispute',     icon: '🛡️', color: '#DC2626', status: 'published', version: '3.0.0', category: 'dispute',           priority: 'critical', owner: 'cco-dispute-team',     description: '退款/催促/清关/举证/仲裁等10大子场景',                 tags: ['纠纷','仲裁','举证'],           publishedAt: '2026-01-08', updatedAt: '2026-03-09', license: 'MIT', compatibility: 'agent>=2.0.0', allowedTools: 'dispute_query, arbitration_submit', metadata: { author: 'lidaniu', team: 'cco-dispute-team', minAgentVersion: '2.0.0' }, body: defaultBody('退款/催促/清关/举证/仲裁等10大子场景'), evals: [], changelog: [], owners: ['cco-dispute-team'] },
  { id: 'semi-managed',       name: '半托管',     skillName: 'semi-managed',       icon: '📬', color: '#14B8A6', status: 'draft',    version: '0.5.0', category: 'logistics',         priority: 'medium',   owner: 'cco-managed-team',     description: '发货/订单/退款/费用/地址5大子场景',                    tags: ['半托管','全托管','发货'],        publishedAt: null,         updatedAt: '2026-03-13', license: 'MIT', compatibility: 'agent>=1.0.0', allowedTools: '', metadata: { author: 'lidaniu', team: 'cco-managed-team', minAgentVersion: '1.0.0' }, body: defaultBody('发货/订单/退款/费用/地址5大子场景'), evals: [], changelog: [], owners: ['cco-managed-team'] },
  { id: 'knowledge-search',   name: '知识检索',   skillName: 'knowledge-search',   icon: '🔍', color: '#7C3AED', status: 'published', version: '1.2.0', category: 'knowledge',         priority: 'medium',   owner: 'cco-knowledge-team',   description: '基于向量检索的知识召回，支持多语言/多终端/多应用场景', tags: ['知识检索','向量','召回'],        publishedAt: '2026-02-05', updatedAt: '2026-03-02', license: 'MIT', compatibility: 'agent>=1.0.0', allowedTools: 'knowledge_search, vector_query', metadata: { author: 'lidaniu', team: 'cco-knowledge-team', minAgentVersion: '1.0.0' }, body: defaultBody('基于向量检索的知识召回，支持多语言/多终端/多应用场景'), evals: [], changelog: [], owners: ['cco-knowledge-team'] },
];

/* ── localStorage 持久化 ── */
let _cache = null;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(skills) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(skills)); } catch { /* ignore */ }
}

export function getSkills() {
  if (_cache) return _cache;
  const stored = loadFromStorage();
  if (stored && stored.length > 0) {
    // 兼容旧数据：补全新增字段
    _cache = stored.map(s => ({
      license: 'MIT',
      compatibility: '',
      allowedTools: '',
      metadata: { author: '', team: '', minAgentVersion: '' },
      body: defaultBody(s.description || ''),
      evals: [],
      changelog: [],
      owners: s.owner ? [s.owner] : [],
      ...s,
    }));
  } else {
    _cache = [...PRESET_SKILLS.map(s => ({ ...s }))];
    saveToStorage(_cache);
  }
  return _cache;
}

export function invalidateCache() { _cache = null; }

export function getSkillById(id) {
  return getSkills().find(s => s.id === id) || null;
}

export function addSkill(data) {
  const skills = getSkills();
  const id = data.skillName;
  if (!id) return { success: false, error: 'skillName 不能为空' };
  if (skills.find(s => s.id === id)) return { success: false, error: 'Skill Name 已存在' };

  const now = new Date().toISOString();
  const skill = {
    id,
    name: data.name || id,
    skillName: id,
    icon: data.icon || '🔧',
    color: data.color || '#6366F1',
    status: 'draft',
    version: data.version || '0.1.0',
    category: data.category || 'customer-service',
    priority: data.priority || 'medium',
    owner: data.owner || '',
    description: data.description || '',
    tags: data.tags || [],
    publishedAt: null,
    updatedAt: now,
    createdAt: now,
    license: data.license || 'MIT',
    compatibility: data.compatibility || '',
    allowedTools: data.allowedTools || '',
    metadata: data.metadata || { author: '', team: '', minAgentVersion: '' },
    body: data.body || defaultBody(data.description || ''),
    evals: data.evals || [],
    changelog: data.changelog || [],
    owners: data.owners || [],
  };
  skills.push(skill);
  saveToStorage(skills);
  return { success: true, skill };
}

export function updateSkill(id, updates) {
  const skills = getSkills();
  const idx = skills.findIndex(s => s.id === id);
  if (idx === -1) return { success: false, error: 'Skill 不存在' };
  skills[idx] = { ...skills[idx], ...updates, id, updatedAt: new Date().toISOString() };
  saveToStorage(skills);
  return { success: true, skill: skills[idx] };
}

export function deleteSkill(id) {
  const skills = getSkills();
  const idx = skills.findIndex(s => s.id === id);
  if (idx === -1) return false;
  skills.splice(idx, 1);
  saveToStorage(skills);
  return true;
}

export function publishSkill(id) {
  return updateSkill(id, { status: 'published', publishedAt: new Date().toISOString() });
}

export function unpublishSkill(id) {
  return updateSkill(id, { status: 'draft', publishedAt: null });
}

export function getStats() {
  const skills = getSkills();
  const published = skills.filter(s => s.status === 'published');
  return {
    total: skills.length,
    published: published.length,
    draft: skills.filter(s => s.status === 'draft').length,
  };
}

/* ── SKILL.md Frontmatter 解析（纯 regex YAML 子集） ── */
export function parseFrontmatter(text) {
  const match = text.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!match) return { ok: false, error: '未找到 Frontmatter（---分隔符）', data: {} };

  const fm = {};
  const lines = match[1].split('\n');
  let inMeta = false;

  for (const line of lines) {
    if (line.match(/^metadata:/)) { inMeta = true; continue; }
    const sub = inMeta && line.match(/^ {2}(\w[\w-]*):\s*(.*)/);
    if (sub) continue;
    if (inMeta && !line.startsWith(' ')) inMeta = false;

    const kv = line.match(/^(\w[\w-]*):\s*(.*)/);
    if (kv) {
      const [, key, val] = kv;
      const v = val.trim().replace(/^["']|["']$/g, '');
      fm[key] = v;
    }
  }

  if (typeof fm.tags === 'string') {
    fm.tags = fm.tags.split(/[,，]/).map(t => t.trim()).filter(Boolean);
  }

  return { ok: true, error: null, data: fm };
}

/* ── 生成 SKILL.md ── */
export function generateSkillMd(skill) {
  const lines = [
    '---',
    `name: ${skill.skillName || skill.id}`,
    `description: >`,
    `  ${skill.description || ''}`,
    `version: "${skill.version || '0.1.0'}"`,
    `category: ${skill.category || 'customer-service'}`,
    `priority: ${skill.priority || 'medium'}`,
    skill.owner ? `owner: ${skill.owner}` : null,
    skill.tags && skill.tags.length ? `tags: "${skill.tags.join(', ')}"` : null,
    '---',
    '',
    `## 概述`,
    '',
    skill.description || '',
    '',
    `## 前置条件`,
    '',
    '- [所需权限或数据访问]',
    '',
    `## 执行步骤`,
    '',
    '### 步骤 1：[步骤名称]',
    '',
    '[具体操作说明]',
    '',
    `## 注意事项`,
    '',
    '- [已知限制或注意点]',
  ].filter(l => l !== null);

  return lines.join('\n');
}
