/**
 * 拟人化中心 模块
 *
 * 把 cco-ai-service 链路上 14 个干预点抽象为 7 大板块的可视化配置，
 * 数据存 localStorage，提供「预览 System Prompt」「导出 YAML」两个产物。
 *
 * 链路对应（详见 plans/拟人化中心_集成方案）：
 *   A 人设   → app/conf/prompts/*.md
 *   B 记忆   → before_run: get_user_profile / get_abbreviation
 *   C 知识   → intent_recognition.sop_id_map / recall_skill_names / search_knowledge.kwargs
 *   D 风格   → llm: model/temperature/thinking/fallback
 *   E 节奏   → interim_reply / latest_request_check / smart_segment
 *   F 安全   → input/output_risk_control
 *   G 兜底   → dispatch / max_turns 熔断
 */

import {
  AGENTS, SECTIONS,
  TONE_OPTIONS, EMOJI_OPTIONS, ADDRESSING_OPTIONS, REWRITE_OPTIONS,
  RISK_LEVELS, MODEL_OPTIONS,
  getAllPersonas, getPersona, updatePersonaSection, resetPersona,
  renderSystemPrompt, renderYaml,
} from '../data/persona.js?v=6';
import { getSkills } from '../data/skills.js';
import { showToast, escHtml } from '../utils.js';
import { showModal, closeModal } from '../modal.js';

/* ── 当前选中状态（模块内单例） ── */
let _agentId = AGENTS[0].id;
let _section = 'persona';

/* ── 入口 ── */
export function renderPersona() {
  const el = document.getElementById('sec-persona');
  if (!el) return;

  getAllPersonas();  // 触发默认数据写入
  const persona = getPersona(_agentId);

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">拟人化中心</h1>
        <p class="page-subtitle">配置 cco-ai-service 对话链路上的拟人化干预点，生成 YAML / System Prompt 产物</p>
      </div>
      <div style="display:flex;gap:var(--s-2)">
        <button class="btn btn-ghost" id="personaResetBtn">重置默认</button>
        <button class="btn btn-ghost" id="personaPreviewBtn">预览 Prompt</button>
        <button class="btn btn-primary" id="personaExportBtn">导出 YAML</button>
      </div>
    </div>

    <nav class="persona-section-tabs">
      ${SECTIONS.map(s => `
        <button class="persona-section-tab${s.id === _section ? ' active' : ''}" data-section="${s.id}" title="${escHtml(s.desc)}">
          ${escHtml(s.label)}
        </button>
      `).join('')}
    </nav>

    <div class="persona-body">
      <section class="persona-content" id="personaContent">
        ${renderSection(_section, persona)}
      </section>
    </div>
  `;

  bindEvents(el);
}

/* ── 顶层事件绑定 ── */
function bindEvents(el) {
  el.querySelectorAll('.persona-section-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      _section = btn.dataset.section;
      renderPersona();
    });
  });

  document.getElementById('personaResetBtn')?.addEventListener('click', handleReset);
  document.getElementById('personaPreviewBtn')?.addEventListener('click', handlePreview);
  document.getElementById('personaExportBtn')?.addEventListener('click', handleExport);

  bindSectionEvents();
}

/* ── 分发：按 sectionId 渲染对应表单 ── */
function renderSection(sectionId, p) {
  switch (sectionId) {
    case 'persona':   return renderSectionA(p);
    case 'memory':    return renderSectionB(p);
    case 'knowledge': return renderSectionC(p);
    case 'style':     return renderSectionD(p);
    case 'rhythm':    return renderSectionE(p);
    case 'safety':    return renderSectionF(p);
    case 'fallback':  return renderSectionG(p);
    default:          return '';
  }
}

function bindSectionEvents() {
  switch (_section) {
    case 'persona':   return bindSectionA();
    case 'memory':    return bindSectionB();
    case 'knowledge': return bindSectionC();
    case 'style':     return bindSectionD();
    case 'rhythm':    return bindSectionE();
    case 'safety':    return bindSectionF();
    case 'fallback':  return bindSectionG();
  }
}

/* ════════════════════════════════════════════════════════════════
 *  A 人设档案
 * ════════════════════════════════════════════════════════════════ */
function renderSectionA(p) {
  const v = p.persona;
  return `
    <div class="persona-card">
      <div class="persona-card-title">人设档案</div>
      <div class="persona-card-sub">对应 app/conf/prompts/*.md，生成 system prompt 中的角色与规则段</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">角色名</label>
          <input class="form-input" data-k="roleName" value="${escHtml(v.roleName)}" />
        </div>
        <div class="form-group">
          <label class="form-label">回复软上限（字）</label>
          <input class="form-input" type="number" min="50" max="1000" data-k="maxReplyChars" value="${v.maxReplyChars}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">身份描述</label>
        <textarea class="form-textarea" data-k="identity" rows="2">${escHtml(v.identity)}</textarea>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">语气档位</label>
          <div class="persona-segmented" data-k="tone">
            ${TONE_OPTIONS.map(o => `
              <button class="persona-seg-btn${o.value === v.tone ? ' active' : ''}" data-v="${o.value}" title="${escHtml(o.desc)}">${o.label}</button>
            `).join('')}
          </div>
        </div>
        <div class="form-group">
          <label class="form-label">emoji 策略</label>
          <div class="persona-segmented" data-k="emoji">
            ${EMOJI_OPTIONS.map(o => `
              <button class="persona-seg-btn${o.value === v.emoji ? ' active' : ''}" data-v="${o.value}">${o.label}</button>
            `).join('')}
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">口头禅 / 过渡语（回车添加）</label>
        ${renderTagInput('catchphrase', v.catchphrase, '例如：好的呀～')}
      </div>

      <div class="form-group">
        <label class="form-label">硬上限（字）—— 绝不超过</label>
        <input class="form-input" type="number" min="100" max="2000" data-k="hardMaxReplyChars" value="${v.hardMaxReplyChars}" />
        <div class="form-hint">软上限是建议值，硬上限会写进 prompt 强约束</div>
      </div>
    </div>

    <div class="persona-card">
      <div class="persona-card-title">回复规则（Requirements）</div>
      <div class="persona-card-sub">这些规则会被渲染进 system prompt 的 Requirements 段，顺序即优先级</div>
      ${renderRuleList('rules', v.rules)}
    </div>
  `;
}

function bindSectionA() {
  const p = getPersona(_agentId);
  const v = { ...p.persona };

  bindInputs('persona', v, ['roleName', 'identity', 'maxReplyChars', 'hardMaxReplyChars']);
  bindSegmented('persona', v, ['tone', 'emoji']);
  bindTagInput('persona', v, 'catchphrase');
  bindRuleList('persona', v, 'rules');
}

/* ════════════════════════════════════════════════════════════════
 *  B 记忆与画像
 * ════════════════════════════════════════════════════════════════ */
function renderSectionB(p) {
  const v = p.memory;
  return `
    <div class="persona-card">
      <div class="persona-card-title">用户画像注入</div>
      <div class="persona-card-sub">对应 before_run: get_user_profile，注入到 system prompt 占位符 {{ userProfileInfo }}</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">启用画像注入</label>
          ${renderSwitch('profileEnabled', v.profileEnabled)}
        </div>
        <div class="form-group">
          <label class="form-label">画像接口超时（秒）</label>
          <input class="form-input" type="number" min="1" max="30" data-k="profileTimeoutSec" value="${v.profileTimeoutSec}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">注入字段（按需裁剪可减少 prompt 长度）</label>
        ${renderTagInput('profileFields', v.profileFields, '字段名，如 ali_id')}
      </div>

      <div class="form-group">
        <label class="form-label">称呼方式</label>
        <div class="persona-segmented" data-k="addressing">
          ${ADDRESSING_OPTIONS.map(o => `
            <button class="persona-seg-btn${o.value === v.addressing ? ' active' : ''}" data-v="${o.value}">${o.label}</button>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="persona-card">
      <div class="persona-card-title">缩写 / 术语字典</div>
      <div class="persona-card-sub">对应 before_run: get_abbreviation，注入到 {{ Abbreviation }}</div>

      <div class="form-group">
        <label class="form-label">启用缩写注入</label>
        ${renderSwitch('abbreviationEnabled', v.abbreviationEnabled)}
      </div>

      <div class="form-group">
        <label class="form-label">自定义术语</label>
        <div class="persona-kv-list" id="customTermsList">
          ${(v.customTerms || []).map((t, i) => `
            <div class="persona-kv-row" data-idx="${i}">
              <input class="form-input" data-kv="term"    value="${escHtml(t.term)}"    placeholder="术语" />
              <input class="form-input" data-kv="meaning" value="${escHtml(t.meaning)}" placeholder="解释" />
              <button class="btn btn-sm btn-ghost persona-kv-del">删除</button>
            </div>
          `).join('')}
        </div>
        <button class="btn btn-sm btn-ghost" id="addTermBtn" style="margin-top:var(--s-2)">+ 新增术语</button>
      </div>
    </div>
  `;
}

function bindSectionB() {
  const p = getPersona(_agentId);
  const v = { ...p.memory };

  bindInputs('memory', v, ['profileTimeoutSec']);
  bindSegmented('memory', v, ['addressing']);
  bindSwitch('memory', v, ['profileEnabled', 'abbreviationEnabled']);
  bindTagInput('memory', v, 'profileFields');
  bindKvList('memory', v, 'customTerms', ['term', 'meaning'], 'customTermsList', 'addTermBtn');
}

/* ════════════════════════════════════════════════════════════════
 *  C 知识与意图
 * ════════════════════════════════════════════════════════════════ */
function renderSectionC(p) {
  const v = p.knowledge;
  const skills = getSkills().filter(s => s.status === 'published');

  return `
    <div class="persona-card">
      <div class="persona-card-title">意图 → SOP 映射</div>
      <div class="persona-card-sub">对应 intent_recognition.sop_id_map，命中意图后自动注入 SOP 大纲</div>

      <div class="persona-kv-list" id="sopMapList">
        ${(v.sopMap || []).map((s, i) => `
          <div class="persona-kv-row" data-idx="${i}">
            <input class="form-input" data-kv="intent" value="${escHtml(s.intent)}" placeholder="意图名（如 物流服务）" />
            <input class="form-input" data-kv="sopId"  value="${escHtml(s.sopId)}"  placeholder="SOP ID" />
            <button class="btn btn-sm btn-ghost persona-kv-del">删除</button>
          </div>
        `).join('')}
      </div>
      <button class="btn btn-sm btn-ghost" id="addSopBtn" style="margin-top:var(--s-2)">+ 新增映射</button>
    </div>

    <div class="persona-card">
      <div class="persona-card-title">Skill 召回</div>
      <div class="persona-card-sub">对应 agent.py 中的 recall_skill_names(top_k=10)；置顶 Skill 永远进入 prompt</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">召回 top-k</label>
          <input class="form-input" type="number" min="1" max="50" data-k="skillRecallTopK" value="${v.skillRecallTopK}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">置顶 Skill（多选）</label>
        <div class="persona-chip-pick" id="pinnedSkillsPick">
          ${skills.length ? skills.map(s => {
            const on = (v.pinnedSkills || []).includes(s.id);
            return `<button class="persona-chip${on ? ' active' : ''}" data-id="${s.id}">${s.icon || '📦'} ${escHtml(s.name)}</button>`;
          }).join('') : `<div class="persona-empty">暂无已发布的 Skill，请先在「Skill 配置」中发布</div>`}
        </div>
      </div>
    </div>

    <div class="persona-card">
      <div class="persona-card-title">知识库 RAG 参数</div>
      <div class="persona-card-sub">对应 tools.search_knowledge.kwargs</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">召回数量 (limit)</label>
          <input class="form-input" type="number" min="1" max="100" data-k="knowledge.limit" value="${v.knowledge.limit}" />
        </div>
        <div class="form-group">
          <label class="form-label">重排后保留 (topk)</label>
          <input class="form-input" type="number" min="1" max="50" data-k="knowledge.topk" value="${v.knowledge.topk}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">直出阈值 (threshold)</label>
          <input class="form-input" type="number" step="0.05" min="0" max="2" data-k="knowledge.threshold" value="${v.knowledge.threshold}" />
        </div>
        <div class="form-group">
          <label class="form-label">渠道 (channel)</label>
          <input class="form-input" data-k="knowledge.channel" value="${escHtml(v.knowledge.channel)}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">重排序器 (reranker)</label>
          <input class="form-input" data-k="knowledge.reranker" value="${escHtml(v.knowledge.reranker)}" />
        </div>
        <div class="form-group">
          <label class="form-label">引用样式</label>
          <select class="form-select" data-k="knowledge.citationStyle">
            <option value="inline"   ${v.knowledge.citationStyle === 'inline' ? 'selected' : ''}>行内 [标题](url)</option>
            <option value="footnote" ${v.knowledge.citationStyle === 'footnote' ? 'selected' : ''}>脚注 [^1]</option>
            <option value="none"     ${v.knowledge.citationStyle === 'none' ? 'selected' : ''}>不展示引用</option>
          </select>
        </div>
      </div>
    </div>
  `;
}

function bindSectionC() {
  const p = getPersona(_agentId);
  const v = JSON.parse(JSON.stringify(p.knowledge));

  bindInputs('knowledge', v, [
    'skillRecallTopK',
    'knowledge.limit', 'knowledge.topk', 'knowledge.threshold',
    'knowledge.channel', 'knowledge.reranker', 'knowledge.citationStyle',
  ]);
  bindKvList('knowledge', v, 'sopMap', ['intent', 'sopId'], 'sopMapList', 'addSopBtn');

  // 置顶 Skill
  document.querySelectorAll('#pinnedSkillsPick .persona-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const id = chip.dataset.id;
      const list = v.pinnedSkills || [];
      const idx = list.indexOf(id);
      if (idx >= 0) list.splice(idx, 1); else list.push(id);
      v.pinnedSkills = list;
      chip.classList.toggle('active');
      updatePersonaSection(_agentId, 'knowledge', v);
    });
  });
}

/* ════════════════════════════════════════════════════════════════
 *  D 风格与解码
 * ════════════════════════════════════════════════════════════════ */
function renderSectionD(p) {
  const v = p.style;
  return `
    <div class="persona-card">
      <div class="persona-card-title">LLM 解码参数</div>
      <div class="persona-card-sub">对应 YAML llm 段</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">主模型</label>
          <select class="form-select" data-k="model">
            ${MODEL_OPTIONS.map(m => `<option value="${m}" ${m === v.model ? 'selected' : ''}>${m}</option>`).join('')}
          </select>
        </div>
        <div class="form-group">
          <label class="form-label">temperature</label>
          <input class="form-input" type="number" step="0.1" min="0" max="2" data-k="temperature" value="${v.temperature}" />
        </div>
      </div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">max_tokens</label>
          <input class="form-input" type="number" min="512" max="128000" step="512" data-k="maxTokens" value="${v.maxTokens}" />
        </div>
        <div class="form-group">
          <label class="form-label">思考模式</label>
          <div style="display:flex;gap:var(--s-3);align-items:center;height:38px">
            ${renderSwitch('thinkingEnable', v.thinkingEnable)}
            <span class="persona-hint">允许 LLM 进入 reasoning_content</span>
          </div>
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">向用户透出"思考中…"</label>
        ${renderSwitch('exposeThinking', v.exposeThinking)}
        <div class="form-hint">开启后会将 LLM 思考状态以中间态消息透出，增加拟人感</div>
      </div>

      <div class="form-group">
        <label class="form-label">兜底模型链（按优先级，回车添加）</label>
        ${renderTagInput('fallbackModels', v.fallbackModels, '如 gpt-4.1-0414')}
      </div>
    </div>
  `;
}

function bindSectionD() {
  const p = getPersona(_agentId);
  const v = { ...p.style };
  bindInputs('style', v, ['model', 'temperature', 'maxTokens']);
  bindSwitch('style', v, ['thinkingEnable', 'exposeThinking']);
  bindTagInput('style', v, 'fallbackModels');
}

/* ════════════════════════════════════════════════════════════════
 *  E 节奏与互动
 * ════════════════════════════════════════════════════════════════ */
function renderSectionE(p) {
  const v = p.rhythm;
  return `
    <div class="persona-card">
      <div class="persona-card-title">阶段性回复（中间态拟人）</div>
      <div class="persona-card-sub">对应 send_interim_reply 工具 + InterimReplyPostToolHook</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">启用阶段性回复</label>
          ${renderSwitch('interimReplyEnabled', v.interimReplyEnabled)}
        </div>
        <div class="form-group">
          <label class="form-label">触发延迟（秒）</label>
          <input class="form-input" type="number" min="1" max="30" data-k="interimDelaySec" value="${v.interimDelaySec}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">触发工具调用次数阈值</label>
        <input class="form-input" type="number" min="1" max="10" data-k="interimToolThreshold" value="${v.interimToolThreshold}" />
      </div>

      <div class="form-group">
        <label class="form-label">话术池（随机选用，回车添加）</label>
        ${renderTagInput('interimTemplates', v.interimTemplates, '例如：稍等，我帮你查')}
      </div>
    </div>

    <div class="persona-card">
      <div class="persona-card-title">抢占与分段</div>
      <div class="persona-card-sub">对应 LatestRequestCheckHook + output_content_builder</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">抢占免疫阈值（毫秒）</label>
          <input class="form-input" type="number" min="0" max="120000" step="1000" data-k="preemptImmunityMs" value="${v.preemptImmunityMs}" />
          <div class="form-hint">旧请求在此时间内不会被新请求抢占中断</div>
        </div>
        <div class="form-group">
          <label class="form-label">智能分段</label>
          ${renderSwitch('smartSegment', v.smartSegment)}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">最短段落长度（字）</label>
        <input class="form-input" type="number" min="5" max="200" data-k="minSegmentLength" value="${v.minSegmentLength}" />
        <div class="form-hint">低于此长度的段落会与相邻段合并，避免出现"小气泡"</div>
      </div>
    </div>
  `;
}

function bindSectionE() {
  const p = getPersona(_agentId);
  const v = { ...p.rhythm };
  bindInputs('rhythm', v, ['interimDelaySec', 'interimToolThreshold', 'preemptImmunityMs', 'minSegmentLength']);
  bindSwitch('rhythm', v, ['interimReplyEnabled', 'smartSegment']);
  bindTagInput('rhythm', v, 'interimTemplates');
}

/* ════════════════════════════════════════════════════════════════
 *  F 安全与改写
 * ════════════════════════════════════════════════════════════════ */
function renderSectionF(p) {
  const v = p.safety;
  return `
    <div class="persona-card">
      <div class="persona-card-title">输入 / 输出风控</div>
      <div class="persona-card-sub">对应 before_run.input_risk_control / after_run.output_risk_control</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">启用输入风控</label>
          ${renderSwitch('inputRiskEnabled', v.inputRiskEnabled)}
        </div>
        <div class="form-group">
          <label class="form-label">启用输出风控</label>
          ${renderSwitch('outputRiskEnabled', v.outputRiskEnabled)}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">拦截风险等级</label>
        <div class="persona-chip-pick" id="riskLevelPick">
          ${RISK_LEVELS.map(lv => {
            const on = (v.blockLevels || []).includes(lv);
            return `<button class="persona-chip${on ? ' active' : ''}" data-lv="${lv}">${lv}</button>`;
          }).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">拦截统一文案</label>
        <textarea class="form-textarea" data-k="blockMessage" rows="2">${escHtml(v.blockMessage)}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">改写策略</label>
        <div class="persona-segmented" data-k="rewriteStrategy" style="flex-wrap:wrap">
          ${REWRITE_OPTIONS.map(o => `
            <button class="persona-seg-btn${o.value === v.rewriteStrategy ? ' active' : ''}" data-v="${o.value}">${o.label}</button>
          `).join('')}
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">补充敏感词（回车添加）</label>
        ${renderTagInput('extraSensitiveWords', v.extraSensitiveWords, '在风控之外补充的本地敏感词')}
      </div>
    </div>
  `;
}

function bindSectionF() {
  const p = getPersona(_agentId);
  const v = { ...p.safety };
  bindInputs('safety', v, ['blockMessage']);
  bindSwitch('safety', v, ['inputRiskEnabled', 'outputRiskEnabled']);
  bindSegmented('safety', v, ['rewriteStrategy']);
  bindTagInput('safety', v, 'extraSensitiveWords');

  // 风险等级多选
  document.querySelectorAll('#riskLevelPick .persona-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const lv = chip.dataset.lv;
      const list = v.blockLevels || [];
      const idx = list.indexOf(lv);
      if (idx >= 0) list.splice(idx, 1); else list.push(lv);
      v.blockLevels = list;
      chip.classList.toggle('active');
      updatePersonaSection(_agentId, 'safety', v);
    });
  });
}

/* ════════════════════════════════════════════════════════════════
 *  G 兜底与转人工
 * ════════════════════════════════════════════════════════════════ */
function renderSectionG(p) {
  const v = p.fallback;
  return `
    <div class="persona-card">
      <div class="persona-card-title">转人工</div>
      <div class="persona-card-sub">对应 dispatch_human_agent 工具 + DispatchPostToolHook</div>

      <div class="form-group">
        <label class="form-label">触发场景（顺序即优先级）</label>
        ${renderRuleList('dispatchScenarios', v.dispatchScenarios)}
      </div>

      <div class="form-group">
        <label class="form-label">转接前过渡话术</label>
        <textarea class="form-textarea" data-k="dispatchTransition" rows="2">${escHtml(v.dispatchTransition)}</textarea>
      </div>

      <div class="form-group">
        <label class="form-label">交接摘要模板</label>
        <textarea class="form-textarea" data-k="dispatchSummaryTemplate" rows="3">${escHtml(v.dispatchSummaryTemplate)}</textarea>
        <div class="form-hint">可用占位符：{intent} / {summary} / {tried}</div>
      </div>
    </div>

    <div class="persona-card">
      <div class="persona-card-title">熔断兜底</div>
      <div class="persona-card-sub">对应 max_turns 达到上限时的 close_with_reason 文案</div>

      <div class="form-row">
        <div class="form-group">
          <label class="form-label">最大 ReAct 轮数</label>
          <input class="form-input" type="number" min="1" max="50" data-k="maxTurns" value="${v.maxTurns}" />
        </div>
      </div>

      <div class="form-group">
        <label class="form-label">熔断兜底文案</label>
        <textarea class="form-textarea" data-k="fuseMessage" rows="2">${escHtml(v.fuseMessage)}</textarea>
      </div>
    </div>
  `;
}

function bindSectionG() {
  const p = getPersona(_agentId);
  const v = { ...p.fallback };
  bindInputs('fallback', v, ['dispatchTransition', 'dispatchSummaryTemplate', 'maxTurns', 'fuseMessage']);
  bindRuleList('fallback', v, 'dispatchScenarios');
}

/* ════════════════════════════════════════════════════════════════
 *  通用控件渲染 & 绑定
 * ════════════════════════════════════════════════════════════════ */
function renderSwitch(key, on) {
  return `
    <button class="persona-switch${on ? ' on' : ''}" data-k="${key}" type="button">
      <span class="persona-switch-dot"></span>
    </button>`;
}

function renderTagInput(key, values, placeholder) {
  return `
    <div class="persona-tag-input" data-k="${key}">
      <div class="persona-tag-list">
        ${(values || []).map((t, i) => `
          <span class="persona-tag" data-idx="${i}">
            ${escHtml(t)}
            <button class="persona-tag-del" data-idx="${i}">×</button>
          </span>
        `).join('')}
      </div>
      <input class="persona-tag-add form-input" placeholder="${escHtml(placeholder || '')}" />
    </div>`;
}

function renderRuleList(key, rules) {
  return `
    <div class="persona-rule-list" data-k="${key}" id="rules_${key}">
      ${(rules || []).map((r, i) => `
        <div class="persona-rule-row" data-idx="${i}">
          <span class="persona-rule-no">${i + 1}</span>
          <input class="form-input" value="${escHtml(r)}" />
          <button class="btn btn-sm btn-ghost persona-rule-del">删除</button>
        </div>
      `).join('')}
      <button class="btn btn-sm btn-ghost persona-rule-add" type="button" style="margin-top:var(--s-2)">+ 新增规则</button>
    </div>`;
}

/* ── 通用 input 绑定（支持 a.b.c 路径） ── */
function setDeep(obj, path, val) {
  const ks = path.split('.');
  let o = obj;
  for (let i = 0; i < ks.length - 1; i++) {
    if (o[ks[i]] == null || typeof o[ks[i]] !== 'object') o[ks[i]] = {};
    o = o[ks[i]];
  }
  o[ks[ks.length - 1]] = val;
}

function bindInputs(sectionKey, v, keys) {
  keys.forEach(k => {
    const el = document.querySelector(`#personaContent [data-k="${CSS.escape(k)}"]`);
    if (!el) return;
    const isNum = el.type === 'number';
    el.addEventListener('input', () => {
      const raw = isNum ? Number(el.value) : el.value;
      setDeep(v, k, isNum && Number.isNaN(raw) ? 0 : raw);
      updatePersonaSection(_agentId, sectionKey, v);
    });
    el.addEventListener('change', () => {
      const raw = isNum ? Number(el.value) : el.value;
      setDeep(v, k, isNum && Number.isNaN(raw) ? 0 : raw);
      updatePersonaSection(_agentId, sectionKey, v);
    });
  });
}

function bindSegmented(sectionKey, v, keys) {
  keys.forEach(k => {
    const group = document.querySelector(`#personaContent .persona-segmented[data-k="${k}"]`);
    if (!group) return;
    group.querySelectorAll('.persona-seg-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        group.querySelectorAll('.persona-seg-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        v[k] = btn.dataset.v;
        updatePersonaSection(_agentId, sectionKey, v);
      });
    });
  });
}

function bindSwitch(sectionKey, v, keys) {
  keys.forEach(k => {
    const sw = document.querySelector(`#personaContent .persona-switch[data-k="${k}"]`);
    if (!sw) return;
    sw.addEventListener('click', () => {
      v[k] = !v[k];
      sw.classList.toggle('on', v[k]);
      updatePersonaSection(_agentId, sectionKey, v);
    });
  });
}

function bindTagInput(sectionKey, v, key) {
  const wrap = document.querySelector(`#personaContent .persona-tag-input[data-k="${key}"]`);
  if (!wrap) return;
  const list  = wrap.querySelector('.persona-tag-list');
  const input = wrap.querySelector('.persona-tag-add');

  function commit(newArr) {
    v[key] = newArr;
    updatePersonaSection(_agentId, sectionKey, v);
    renderPersona();
  }

  list.querySelectorAll('.persona-tag-del').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = Number(btn.dataset.idx);
      const next = [...(v[key] || [])];
      next.splice(idx, 1);
      commit(next);
    });
  });

  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const val = input.value.trim();
    if (!val) return;
    commit([...(v[key] || []), val]);
  });
}

function bindRuleList(sectionKey, v, key) {
  const wrap = document.querySelector(`#personaContent .persona-rule-list[data-k="${key}"]`);
  if (!wrap) return;

  function commit(newArr) {
    v[key] = newArr;
    updatePersonaSection(_agentId, sectionKey, v);
    renderPersona();
  }

  wrap.querySelectorAll('.persona-rule-row').forEach(row => {
    const idx = Number(row.dataset.idx);
    const inp = row.querySelector('input');
    const del = row.querySelector('.persona-rule-del');
    inp.addEventListener('change', () => {
      const next = [...(v[key] || [])];
      next[idx] = inp.value;
      v[key] = next;
      updatePersonaSection(_agentId, sectionKey, v);
    });
    del.addEventListener('click', () => {
      const next = [...(v[key] || [])];
      next.splice(idx, 1);
      commit(next);
    });
  });

  wrap.querySelector('.persona-rule-add')?.addEventListener('click', () => {
    commit([...(v[key] || []), '新规则']);
  });
}

function bindKvList(sectionKey, v, key, fields, listId, addBtnId) {
  const listEl = document.getElementById(listId);
  if (!listEl) return;

  function commit(next) {
    v[key] = next;
    updatePersonaSection(_agentId, sectionKey, v);
    renderPersona();
  }

  listEl.querySelectorAll('.persona-kv-row').forEach(row => {
    const idx = Number(row.dataset.idx);
    fields.forEach(f => {
      const inp = row.querySelector(`[data-kv="${f}"]`);
      if (!inp) return;
      inp.addEventListener('change', () => {
        const next = [...(v[key] || [])];
        next[idx] = { ...next[idx], [f]: inp.value };
        v[key] = next;
        updatePersonaSection(_agentId, sectionKey, v);
      });
    });
    row.querySelector('.persona-kv-del')?.addEventListener('click', () => {
      const next = [...(v[key] || [])];
      next.splice(idx, 1);
      commit(next);
    });
  });

  document.getElementById(addBtnId)?.addEventListener('click', () => {
    const empty = Object.fromEntries(fields.map(f => [f, '']));
    commit([...(v[key] || []), empty]);
  });
}

/* ════════════════════════════════════════════════════════════════
 *  顶部动作：重置 / 预览 Prompt / 导出 YAML
 * ════════════════════════════════════════════════════════════════ */
function handleReset() {
  if (!confirm('确定将当前 Agent 的所有拟人化配置恢复为默认值？')) return;
  resetPersona(_agentId);
  showToast('已恢复默认');
  renderPersona();
}

function handlePreview() {
  const p = getPersona(_agentId);
  const md = renderSystemPrompt(p);
  showModal(`
    <div class="modal-header">
      <div class="modal-title">System Prompt 预览</div>
      <button class="btn btn-sm btn-ghost" onclick="closeModal()">关闭</button>
    </div>
    <div class="modal-body">
      <div class="code-block" style="max-height:60vh">${escHtml(md)}</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost"  id="personaCopyPrompt">复制</button>
      <button class="btn btn-primary" onclick="closeModal()">完成</button>
    </div>
  `);
  document.getElementById('personaCopyPrompt')?.addEventListener('click', () => {
    copyText(md, 'Prompt 已复制');
  });
}

function handleExport() {
  const p = getPersona(_agentId);
  const yaml = renderYaml(p);
  showModal(`
    <div class="modal-header">
      <div class="modal-title">YAML 配置导出</div>
      <button class="btn btn-sm btn-ghost" onclick="closeModal()">关闭</button>
    </div>
    <div class="modal-body">
      <div class="form-hint" style="margin-bottom:var(--s-3)">
        生成片段可直接覆盖到 cco-ai-service 的 <code>app/conf/${escHtml(p.agentId)}.yaml</code>。
        <code>humanize</code> 段为新增字段，需 cco-ai-service 后续接入读取。
      </div>
      <div class="code-block" style="max-height:60vh">${escHtml(yaml)}</div>
    </div>
    <div class="modal-footer">
      <button class="btn btn-ghost"   id="personaCopyYaml">复制</button>
      <button class="btn btn-ghost"   id="personaDownloadYaml">下载</button>
      <button class="btn btn-primary" onclick="closeModal()">完成</button>
    </div>
  `);
  document.getElementById('personaCopyYaml')?.addEventListener('click', () => {
    copyText(yaml, 'YAML 已复制');
  });
  document.getElementById('personaDownloadYaml')?.addEventListener('click', () => {
    const blob = new Blob([yaml], { type: 'text/yaml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${p.agentId}.humanize.yaml`;
    a.click();
    URL.revokeObjectURL(url);
  });
}

function copyText(text, msg) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => showToast(msg)).catch(() => fallbackCopy(text, msg));
  } else {
    fallbackCopy(text, msg);
  }
}
function fallbackCopy(text, msg) {
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  try { document.execCommand('copy'); showToast(msg); } catch { showToast('复制失败', 'error'); }
  document.body.removeChild(ta);
}
