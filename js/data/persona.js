/**
 * 拟人化中心 — 数据层
 *
 * 默认覆盖 cco-ai-service 中的 3 个 Agent：
 *   - agent_ai_seller    商家小何（卖家客服）
 *   - agent_ai_buyer     买家小蜜（买家客服）
 *   - agent_copilot_seller 卖家 Copilot
 *
 * 默认配置值来自 app/conf/agent_ai_seller.yaml 等线上配置反解，
 * 仅作为 skill-market 的「配置生成器」原始数据，不直接下发线上。
 */

const STORAGE_KEY = 'scd_personas';

/* ── Agent 维度 ── */
export const AGENTS = [
  {
    id: 'agent_ai_seller',
    label: '商家小何',
    sub: 'AI Seller · agent_ai_seller',
    icon: '🧑‍💼',
    color: '#FF6A00',
    role: 'seller',
  },
  {
    id: 'agent_ai_buyer',
    label: '买家小蜜',
    sub: 'AI Buyer · agent_ai_buyer',
    icon: '🛍️',
    color: '#0EA5E9',
    role: 'buyer',
  },
  {
    id: 'agent_copilot_seller',
    label: '卖家 Copilot',
    sub: 'Copilot Seller · agent_copilot_seller',
    icon: '🤝',
    color: '#7C3AED',
    role: 'copilot',
  },
];

/* ── 7 大功能板块 ── */
export const SECTIONS = [
  { id: 'persona',  label: 'A 人设档案',  desc: '角色名、身份、语气档位、口头禅、emoji、长度上限、Prompt 规则' },
  { id: 'memory',   label: 'B 记忆与画像', desc: '用户画像注入、称呼策略、缩写词典、自定义术语' },
  { id: 'knowledge',label: 'C 知识与意图', desc: '意图→SOP 映射、Skill 召回 top-k、知识库 RAG 参数' },
  { id: 'style',    label: 'D 风格与解码', desc: '模型、temperature、max_tokens、思考模式' },
  { id: 'rhythm',   label: 'E 节奏与互动', desc: '阶段性回复、话术池、抢占免疫阈值、智能分段' },
  { id: 'safety',   label: 'F 安全与改写', desc: '输入/输出风控等级、拦截文案、改写策略' },
  { id: 'fallback', label: 'G 兜底与转人工', desc: '转人工触发、过渡话术、熔断兜底' },
];

/* ── 枚举/选项 ── */
export const TONE_OPTIONS = [
  { value: 'rigorous', label: '严谨', desc: '少寒暄，直给结论' },
  { value: 'plain',    label: '平实', desc: '中性自然' },
  { value: 'friendly', label: '亲切', desc: '带语气词，关心用户' },
  { value: 'lively',   label: '活泼', desc: '可适度 emoji 与拟声' },
];

export const EMOJI_OPTIONS = [
  { value: 'off',    label: '禁用' },
  { value: 'tail',   label: '仅结尾点缀' },
  { value: 'medium', label: '适度使用' },
];

export const ADDRESSING_OPTIONS = [
  { value: 'merchant', label: '商家/老板' },
  { value: 'dear',     label: '亲' },
  { value: 'surname',  label: '姓氏 + 先生/女士' },
  { value: 'name',     label: '账号昵称' },
];

export const REWRITE_OPTIONS = [
  { value: 'block',     label: '直接拦截，给统一文案' },
  { value: 'downgrade', label: '降级回复（移除风险段，保留有效信息）' },
  { value: 'rewrite',   label: '模型改写后再回复' },
];

export const RISK_LEVELS = ['none', 'low', 'medium', 'high', 'critical'];

export const MODEL_OPTIONS = [
  'aliyun-qwen3.6-flash',
  'aliyun-qwen3.5-plus',
  'aliyun-deepseek-v4-pro',
  'gpt-4.1-0414',
];

/* ── 默认配置（按 Agent 维度反解自 YAML） ── */
function defaultPersonaA(role) {
  if (role === 'buyer') {
    return {
      roleName: '小蜜',
      identity: '阿里巴巴国际站的 AI 智能客服，服务买家(Buyer)的售前售后问题',
      tone: 'friendly',
      catchphrase: ['好的呀～', '稍等哈～', '我帮你看一下'],
      emoji: 'tail',
      maxReplyChars: 200,
      hardMaxReplyChars: 300,
      rules: [
        '禁止伪造链接，链接只能来自知识库 extractedUrl 列表',
        '邮箱/账号信息必须脱敏（第 3 字符之后至 @ 之前用 * 替代）',
        '回复中禁止"可能/也许/大概"等不确定表达',
        '回复结合完整对话历史，简洁明了，不重复历史消息',
        '优先调用 Skills > SOP > 其他工具/知识库',
        '手机端可读，单次回复 200 字以内，关键操作给跳转链接',
        '回复内容必须基于工具/Skill 执行结果（可溯源）',
      ],
    };
  }
  if (role === 'copilot') {
    return {
      roleName: 'Copilot',
      identity: '阿里巴巴国际站客服 Copilot，辅助人工客服快速答复商家',
      tone: 'plain',
      catchphrase: [],
      emoji: 'off',
      maxReplyChars: 300,
      hardMaxReplyChars: 500,
      rules: [
        '回复给到的是人工客服，可以使用专业术语',
        '禁止伪造链接，链接只能来自知识库 extractedUrl 列表',
        '优先调用 Skills > SOP > 其他工具/知识库',
        '回复内容必须基于工具/Skill 执行结果',
      ],
    };
  }
  // seller default (与线上 v2 prompt 对齐)
  return {
    roleName: '小何',
    identity: '阿里巴巴国际站的 AI 智能客服 Server，为商家(Seller)提供一对一服务',
    tone: 'friendly',
    catchphrase: ['好的～', '稍等，我看一下', '帮您查下哈'],
    emoji: 'tail',
    maxReplyChars: 200,
    hardMaxReplyChars: 300,
    rules: [
      '禁止伪造链接，链接只能来自知识库 extractedUrl 列表，markdown 格式输出',
      '若知识中含"温馨提示"信息需周知商家',
      '邮箱/账号信息必须脱敏（第 3 字符之后至 @ 之前用 *）',
      '禁止使用"可能/也许/大概"等不确定表达',
      '结合完整对话历史，简洁明了，不重复历史',
      '调用优先级：Skills > SOP > 其他工具/知识库',
      '手机端可读，回复严格控制 200 字以内，绝不超过 300 字',
      '操作步骤最多 3-5 个关键步骤',
      '回复内容必须基于工具/Skill 执行结果（可溯源）',
    ],
  };
}

function defaultPersonaB() {
  return {
    profileEnabled: true,
    profileTimeoutSec: 5,
    profileFields: ['ali_id', 'mbr_id', 'comp_id', 'admin_ali_id'],
    addressing: 'merchant',
    abbreviationEnabled: true,
    customTerms: [
      { term: 'ICBU',  meaning: '阿里巴巴国际站' },
      { term: 'TA',    meaning: '信用保障订单 (Trade Assurance)' },
    ],
  };
}

function defaultPersonaC(role) {
  return {
    sopMap: role === 'seller'
      ? [
          { intent: '物流服务',     sopId: '753509' },
          { intent: '信用保障',     sopId: '753173' },
          { intent: '资金管理',     sopId: '753079' },
          { intent: '入驻',         sopId: '752932' },
          { intent: '产品发布与管理', sopId: '752929' },
        ]
      : [
          { intent: '物流',     sopId: '' },
          { intent: '退款售后', sopId: '' },
        ],
    skillRecallTopK: 10,
    pinnedSkills: [],
    knowledge: {
      limit: 20,
      topk: 10,
      threshold: 1.0,
      reranker: 'bailian',
      channel: 'PC',
      citationStyle: 'inline',  // inline | footnote | none
    },
  };
}

function defaultPersonaD() {
  return {
    model: 'aliyun-qwen3.6-flash',
    temperature: 0.3,
    maxTokens: 32000,
    thinkingEnable: true,
    exposeThinking: false,
    fallbackModels: ['aliyun-qwen3.5-plus', 'gpt-4.1-0414', 'aliyun-deepseek-v4-pro'],
  };
}

function defaultPersonaE() {
  return {
    interimReplyEnabled: true,
    interimDelaySec: 3,
    interimToolThreshold: 1,
    interimTemplates: [
      '我看一下哈～',
      '稍等，我帮您查一下',
      '正在为您查询相关信息',
    ],
    preemptImmunityMs: 30000,
    smartSegment: true,
    minSegmentLength: 20,
  };
}

function defaultPersonaF() {
  return {
    inputRiskEnabled: true,
    outputRiskEnabled: true,
    blockLevels: ['high', 'critical'],
    blockMessage: '抱歉，回答内容触发了安全策略，请换一种方式提问。',
    rewriteStrategy: 'block',
    extraSensitiveWords: [],
  };
}

function defaultPersonaG() {
  return {
    dispatchScenarios: [
      '出现红线场景（涉资损、舆情、投诉升级）',
      '连续 2 轮未能解决用户问题',
      '用户明确要求转人工',
    ],
    dispatchTransition: '已为您转接人工高级客服，请稍候，我会同步本次对话上下文。',
    dispatchSummaryTemplate: '用户诉求：{intent}\n关键信息：{summary}\n已尝试方案：{tried}',
    fuseMessage: '抱歉，本次查询较复杂，建议您稍后再试或转人工协助。',
    maxTurns: 20,
  };
}

function buildDefault(agent) {
  return {
    agentId: agent.id,
    updatedAt: new Date().toISOString(),
    persona:   defaultPersonaA(agent.role),
    memory:    defaultPersonaB(),
    knowledge: defaultPersonaC(agent.role),
    style:     defaultPersonaD(),
    rhythm:    defaultPersonaE(),
    safety:    defaultPersonaF(),
    fallback:  defaultPersonaG(),
  };
}

/* ── localStorage 持久化 ── */
let _cache = null;

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

function saveToStorage(map) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(map)); } catch { /* ignore */ }
}

export function getAllPersonas() {
  if (_cache) return _cache;
  const stored = loadFromStorage();
  const map = stored && typeof stored === 'object' ? stored : {};
  // 兜底补全
  AGENTS.forEach(a => {
    if (!map[a.id]) map[a.id] = buildDefault(a);
  });
  _cache = map;
  saveToStorage(_cache);
  return _cache;
}

export function getPersona(agentId) {
  const all = getAllPersonas();
  if (!all[agentId]) {
    const agent = AGENTS.find(a => a.id === agentId);
    if (!agent) return null;
    all[agentId] = buildDefault(agent);
    saveToStorage(all);
  }
  return all[agentId];
}

export function updatePersonaSection(agentId, sectionKey, sectionData) {
  const all = getAllPersonas();
  const p = getPersona(agentId);
  if (!p) return { success: false, error: 'Agent 不存在' };
  all[agentId] = {
    ...p,
    [sectionKey]: sectionData,
    updatedAt: new Date().toISOString(),
  };
  saveToStorage(all);
  _cache = all;
  return { success: true };
}

export function resetPersona(agentId) {
  const all = getAllPersonas();
  const agent = AGENTS.find(a => a.id === agentId);
  if (!agent) return false;
  all[agentId] = buildDefault(agent);
  saveToStorage(all);
  _cache = all;
  return true;
}

export function invalidateCache() { _cache = null; }

/* ── 导出：System Prompt（Markdown） ── */
export function renderSystemPrompt(persona) {
  const { roleName, identity, tone, catchphrase, emoji, maxReplyChars, hardMaxReplyChars, rules } = persona.persona;
  const toneLabel = (TONE_OPTIONS.find(t => t.value === tone) || {}).label || '';
  const emojiLabel = (EMOJI_OPTIONS.find(e => e.value === emoji) || {}).label || '';
  const addressing = (ADDRESSING_OPTIONS.find(a => a.value === persona.memory.addressing) || {}).label || '';

  const catchLine = (catchphrase || []).length
    ? `开场/过渡常用：${catchphrase.map(c => `「${c}」`).join('、')}`
    : '不使用固定开场白';

  const rulesMd = (rules || []).map((r, i) => `${i + 1}. ${r}`).join('\n');

  return `<task_description>
你是${identity}，请以名字「${roleName}」对外服务。
你的回复内容要尽可能拟人，不能让用户察觉你是 AI。

## 拟人化风格
- 语气档位：${toneLabel}
- emoji 策略：${emojiLabel}
- 称呼方式：${addressing}
- ${catchLine}
- 回复长度控制：单次 ${maxReplyChars} 字以内，绝不超过 ${hardMaxReplyChars} 字

## Requirements
${rulesMd}
</task_description>

<background_information>
## 当前时间
{{ datetime }}

## 用户基本信息
{{ userProfileInfo }}

## 常用缩写词
{{ Abbreviation }}

## sopOutlineTree
{{ sopOutlineTree }}
</background_information>
`;
}

/* ── 导出：YAML 片段（对齐 agent_ai_seller.yaml 结构） ── */
function ind(spaces, str) {
  const pad = ' '.repeat(spaces);
  return str.split('\n').map(l => l ? pad + l : l).join('\n');
}

function yamlList(arr, spaces) {
  if (!arr || !arr.length) return ind(spaces, '[]');
  return arr.map(v => ind(spaces, `- ${JSON.stringify(v)}`)).join('\n');
}

export function renderYaml(persona) {
  const agent = AGENTS.find(a => a.id === persona.agentId);
  const sopLines = (persona.knowledge.sopMap || [])
    .filter(s => s.intent && s.sopId)
    .map(s => `        ${s.intent}: ${s.sopId}`)
    .join('\n') || '        其他: ""';

  const fallbackLines = (persona.style.fallbackModels || [])
    .map(m => `    - ${m}`).join('\n') || '    []';

  const interimTpls = (persona.rhythm.interimTemplates || [])
    .map(t => `      - ${JSON.stringify(t)}`).join('\n');

  return `# Auto-generated by skill-market 拟人化中心
# Agent: ${agent ? agent.label : persona.agentId} (${persona.agentId})
# UpdatedAt: ${persona.updatedAt}

appcode: ${persona.agentId}

mode_params:
  max_turns: ${persona.fallback.maxTurns}
  latest_request_check:
    enabled: true
    interrupt_immunity_threshold_ms: ${persona.rhythm.preemptImmunityMs}

  before_run_handlers:
    - type: intent_recognition
      enabled: true
      parallel: true
      sop_id_map:
${sopLines}
      timeout: 8
    - type: get_user_profile
      enabled: ${persona.memory.profileEnabled}
      parallel: true
      timeout: ${persona.memory.profileTimeoutSec}
    - type: get_abbreviation
      enabled: ${persona.memory.abbreviationEnabled}
      parallel: true
    - type: input_risk_control
      enabled: ${persona.safety.inputRiskEnabled}

  after_run_handlers:
    - type: output_risk_control
      enabled: ${persona.safety.outputRiskEnabled}
      block_on_risk: true
      block_message: ${JSON.stringify(persona.safety.blockMessage)}
      risk_levels_to_block: [${(persona.safety.blockLevels || []).join(', ')}]
    - type: output_content_builder
      enabled: true
      smart_segment: ${persona.rhythm.smartSegment}
      min_segment_length: ${persona.rhythm.minSegmentLength}

llm:
  provider: openai
  model: ${persona.style.model}
  temperature: ${persona.style.temperature}
  max_tokens: ${persona.style.maxTokens}
  thinking:
    enable: ${persona.style.thinkingEnable}
  fallback_models:
${fallbackLines}

prompt:
  template_key: ${persona.agentId}_system_prompt
  vars: {}

# === 拟人化扩展（skill-market 新增字段，待 cco-ai-service 接入） ===
humanize:
  skill_recall_top_k: ${persona.knowledge.skillRecallTopK}
  pinned_skills: ${JSON.stringify(persona.knowledge.pinnedSkills || [])}
  knowledge_rag:
    limit: ${persona.knowledge.knowledge.limit}
    topk: ${persona.knowledge.knowledge.topk}
    threshold: ${persona.knowledge.knowledge.threshold}
    reranker: ${persona.knowledge.knowledge.reranker}
    channel: ${persona.knowledge.knowledge.channel}
    citation_style: ${persona.knowledge.knowledge.citationStyle}
  interim_reply:
    enabled: ${persona.rhythm.interimReplyEnabled}
    delay_sec: ${persona.rhythm.interimDelaySec}
    tool_threshold: ${persona.rhythm.interimToolThreshold}
    templates:
${interimTpls || '      []'}
  dispatch:
    scenarios:
${(persona.fallback.dispatchScenarios || []).map(s => `      - ${JSON.stringify(s)}`).join('\n') || '      []'}
    transition: ${JSON.stringify(persona.fallback.dispatchTransition)}
    summary_template: ${JSON.stringify(persona.fallback.dispatchSummaryTemplate)}
  fuse_message: ${JSON.stringify(persona.fallback.fuseMessage)}
  expose_thinking: ${persona.style.exposeThinking}
  rewrite_strategy: ${persona.safety.rewriteStrategy}
`;
}
