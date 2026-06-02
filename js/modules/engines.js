/**
 * 四大核心引擎挂载层（最小侵入）
 * 引擎① NL→Rule 解析  · 引擎② 冲突检测
 * 引擎③ 场景识别      · 引擎④ 归因分析
 *
 * 用法：在原模块产生的 DOM 上添加 data-engine="..." 属性即可触发。
 *  - data-engine="ai-draft"   ✨ 引擎①
 *  - data-engine="conflict" data-skill-id=".."  ⚠ 引擎②（含放行后的发布回调）
 *  - data-engine="attribution" data-record-id=".."  📈 引擎④
 *  - 引擎③ 通过 buildSceneBanner() / buildSceneRecommendBanner() 直接拿 HTML 片段渲染
 */
import { getSkills, addSkill, publishSkill, getSkillById } from '../data/skills.js';
import { showToast, escHtml } from '../utils.js';

/* ─────────────────────────────────────────────
   引擎共享：场景库（mock）
───────────────────────────────────────────── */
const SCENES = [
  { id: 'sc-refund-cross-border', name: '跨境退款-海关扣件',     volume: 4231, covered: false, severity: 'high',   tag: '物流',     suggest: '建议新增 Skill「跨境退款-海关扣件」' },
  { id: 'sc-presale-multi-sku',   name: '预售多 SKU 改尺码',     volume: 2188, covered: false, severity: 'medium', tag: '订单',     suggest: '建议在「商品管理」中加规则' },
  { id: 'sc-ip-counterfeit',      name: 'IP 申诉-非授权品牌',    volume: 1576, covered: true,  severity: 'medium', tag: 'IP合规',   suggest: '已被「IP 合规」覆盖' },
  { id: 'sc-logistics-delay',     name: '物流时效异常补偿',       volume: 3892, covered: true,  severity: 'low',    tag: '物流',     suggest: '已被「物流运输」覆盖 92%' },
  { id: 'sc-fund-frozen',         name: '资金冻结申诉',           volume: 985,  covered: false, severity: 'low',    tag: '资金',     suggest: '可考虑新增低优先级 Skill' },
];

const ATTRIB_DATA = {
  // recordId/skillId → 归因
  default: {
    overall: { resolveRate: 87.4, resolveDelta: +5.2, callRate: 12.8, callDelta: -1.6, satisfaction: 4.6, satisfactionDelta: +0.3 },
    byScene: [
      { scene: '跨境退款-海关扣件', volume: 4231, resolve: 91.2, delta: +6.4 },
      { scene: '物流时效异常补偿',   volume: 3892, resolve: 85.7, delta: +3.1 },
      { scene: '预售多 SKU 改尺码', volume: 2188, resolve: 78.9, delta: -2.4 },
    ],
    advice: [
      '「预售多 SKU 改尺码」场景下解决率下降，建议优化兜底话术',
      '高频场景集中度 73%，可拆分子 Skill 提升精度',
      '建议在灰度阶段把流量从 20% → 50%',
    ],
  },
};

/* ─────────────────────────────────────────────
   全局抽屉 / 弹窗 容器（懒加载）
───────────────────────────────────────────── */
function ensureRoot() {
  if (document.getElementById('engRoot')) return;
  const root = document.createElement('div');
  root.id = 'engRoot';
  root.innerHTML = `
    <div class="eng-mask" id="engMask"></div>
    <aside class="eng-drawer" id="engDrawer" role="dialog" aria-modal="true">
      <header class="eng-drawer-head">
        <div class="eng-drawer-title" id="engTitle">—</div>
        <button class="btn-icon" id="engClose" title="关闭">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <line x1="1" y1="1" x2="13" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
            <line x1="13" y1="1" x2="1" y2="13" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>
          </svg>
        </button>
      </header>
      <div class="eng-drawer-body" id="engBody"></div>
      <footer class="eng-drawer-foot" id="engFoot"></footer>
    </aside>`;
  document.body.appendChild(root);
  document.getElementById('engClose').addEventListener('click', closeDrawer);
  document.getElementById('engMask').addEventListener('click', closeDrawer);
}

function openDrawer({ title, body, footer = '' }) {
  ensureRoot();
  document.getElementById('engTitle').innerHTML = title;
  document.getElementById('engBody').innerHTML = body;
  document.getElementById('engFoot').innerHTML = footer;
  document.getElementById('engRoot').classList.add('open');
}
function closeDrawer() {
  document.getElementById('engRoot')?.classList.remove('open');
}

/* ─────────────────────────────────────────────
   引擎① NL → Rule 起草
───────────────────────────────────────────── */
function openAiDraft() {
  const examples = [
    '当买家申请跨境退款且物流被海关扣留时，建议优先安排原路退款',
    '商品发布时类目为食品的，需要额外校验保质期字段',
    '如果订单金额 > 1000 美元且买家信用分 < 60 分，转人工审核',
  ];
  openDrawer({
    title: `<span class="eng-tag eng-tag-1">引擎① NL → Rule</span> AI 起草 Skill`,
    body: `
      <p class="eng-hint">用自然语言描述你的业务诉求，AI 会自动解析为结构化的 Skill 草稿。</p>
      <textarea class="eng-textarea" id="engNlInput" placeholder="例如：当买家申请跨境退款且物流扣件超过 7 天，自动转人工并优先处理..."></textarea>
      <div class="eng-chip-row">
        ${examples.map(e => `<button class="eng-chip" data-eng-example="${escHtml(e)}">${escHtml(e)}</button>`).join('')}
      </div>
      <div id="engParseResult"></div>
    `,
    footer: `
      <button class="btn btn-ghost" id="engCancelDraft">取消</button>
      <button class="btn btn-primary" id="engParseBtn">✨ 解析为 Skill 草稿</button>
    `,
  });
  document.getElementById('engCancelDraft').addEventListener('click', closeDrawer);
  document.getElementById('engParseBtn').addEventListener('click', () => {
    const txt = document.getElementById('engNlInput').value.trim();
    if (!txt) { showToast('请先输入需求描述'); return; }
    renderParseResult(txt);
  });
  document.querySelectorAll('[data-eng-example]').forEach(b => {
    b.addEventListener('click', () => {
      document.getElementById('engNlInput').value = b.dataset.engExample;
    });
  });
}

function parseNL(text) {
  // 极简 NL 解析（mock）：抓主体名词、条件、动作
  const lower = text.toLowerCase();
  let cat = 'general', icon = '🤖', name = 'AI 草稿 Skill';
  if (/退款|售后|退货/.test(text))      { cat = 'refund-return'; icon = '🔄'; name = '智能退款处理（草稿）'; }
  else if (/物流|海关|扣件|运输/.test(text)) { cat = 'logistics';     icon = '🚚'; name = '物流异常处理（草稿）'; }
  else if (/商品|类目|发布/.test(text))   { cat = 'product';        icon = '📦'; name = '商品发布合规（草稿）'; }
  else if (/资金|金额|信保/.test(text))   { cat = 'payment-fund';   icon = '💰'; name = '资金风控（草稿）'; }

  const conds = [];
  if (/>/.test(text) || /大于|超过/.test(text))  conds.push('数值阈值条件');
  if (/天|小时|超时/.test(text))               conds.push('时效条件');
  if (/和|且/.test(text))                       conds.push('多条件 AND');
  if (/或/.test(text))                          conds.push('多条件 OR');
  if (conds.length === 0) conds.push('单条件触发');

  const acts = [];
  if (/转人工|人工/.test(text))   acts.push('转人工');
  if (/退款|退/.test(text))       acts.push('调用退款 API');
  if (/校验|审核/.test(text))     acts.push('合规预检');
  if (/优先/.test(text))          acts.push('提升处理优先级');
  if (acts.length === 0) acts.push('返回处理方案');

  return { name, icon, category: cat, conditions: conds, actions: acts, raw: text };
}

function renderParseResult(text) {
  const r = parseNL(text);
  const html = `
    <div class="eng-result">
      <div class="eng-result-head">
        <span class="eng-result-icon">${r.icon}</span>
        <div>
          <div class="eng-result-title">${escHtml(r.name)}</div>
          <div class="eng-result-sub">类目：${escHtml(r.category)}</div>
        </div>
      </div>
      <div class="eng-kv">
        <div class="eng-kv-k">触发条件</div>
        <div class="eng-kv-v">${r.conditions.map(c => `<span class="eng-pill">${escHtml(c)}</span>`).join('')}</div>
      </div>
      <div class="eng-kv">
        <div class="eng-kv-k">执行动作</div>
        <div class="eng-kv-v">${r.actions.map(a => `<span class="eng-pill eng-pill-blue">${escHtml(a)}</span>`).join('')}</div>
      </div>
      <div class="eng-kv">
        <div class="eng-kv-k">原始描述</div>
        <div class="eng-kv-v" style="color:var(--text-secondary);font-size:12px">${escHtml(r.raw)}</div>
      </div>
    </div>`;
  document.getElementById('engParseResult').innerHTML = html;
  // 替换底部按钮
  document.getElementById('engFoot').innerHTML = `
    <button class="btn btn-ghost" id="engCancelDraft">取消</button>
    <button class="btn btn-primary" id="engCommitDraft">创建为草稿 Skill</button>
  `;
  document.getElementById('engCancelDraft').addEventListener('click', closeDrawer);
  document.getElementById('engCommitDraft').addEventListener('click', () => {
    addSkill({
      name: r.name,
      skillName: 'ai-draft-' + Date.now().toString(36),
      icon: r.icon,
      category: r.category,
      description: r.raw,
      version: 'v0.1.0',
      status: 'draft',
      owner: '我',
      priority: 'medium',
      tags: ['AI起草', r.category],
    });
    closeDrawer();
    showToast('✨ AI 草稿已生成');
    document.dispatchEvent(new CustomEvent('engines:skill-added'));
  });
}

/* ─────────────────────────────────────────────
   引擎② 冲突检测
───────────────────────────────────────────── */
function detectConflicts(skill) {
  const all = getSkills();
  const others = all.filter(s => s.id !== skill.id && s.status === 'published');
  const issues = [];
  // mock 规则：同 category 多于 1 个 → 覆盖冲突；高优先级且未绑定 MCP → 提醒
  const sameCat = others.filter(s => s.category === skill.category);
  if (sameCat.length >= 1) {
    issues.push({
      level: 'warning',
      title: '类目重叠',
      detail: `已有 ${sameCat.length} 个同类目（${escHtml(skill.category || '未分类')}）Skill 在线：${sameCat.map(s => escHtml(s.name)).join('、')}`,
      suggest: '建议明确区分触发条件，或合并到现有 Skill',
    });
  }
  if (skill.priority === 'critical' || skill.priority === 'high') {
    issues.push({
      level: 'info',
      title: '高优先级 Skill',
      detail: '该 Skill 标记为高优先级，将被优先匹配，可能抢占已有规则',
      suggest: '建议先 5% 灰度观察 24 小时',
    });
  }
  if (!skill.description || skill.description.length < 10) {
    issues.push({
      level: 'error',
      title: '描述不完整',
      detail: 'Skill 描述缺失或过短，影响匹配准确率',
      suggest: '补充 ≥ 30 字的清晰场景描述',
    });
  }
  return issues;
}

function openConflictDrawer(skillId, onPass) {
  const skill = getSkillById(skillId);
  if (!skill) return;
  const issues = detectConflicts(skill);
  const blocked = issues.some(i => i.level === 'error');
  const stepsHtml = ['冲突扫描', '影响评估', '门禁判定'].map((s, i) =>
    `<div class="eng-step ${i < 2 ? 'eng-step-done' : (blocked ? 'eng-step-fail' : 'eng-step-pass')}">
       <div class="eng-step-dot">${i < 2 ? '✓' : (blocked ? '✗' : '✓')}</div>
       <div>${escHtml(s)}</div>
     </div>`
  ).join('<div class="eng-step-line"></div>');

  openDrawer({
    title: `<span class="eng-tag eng-tag-2">引擎② 冲突检测</span> 发布门禁 · ${escHtml(skill.name)}`,
    body: `
      <div class="eng-steps">${stepsHtml}</div>
      <div class="eng-summary ${blocked ? 'eng-summary-fail' : (issues.length ? 'eng-summary-warn' : 'eng-summary-pass')}">
        ${blocked ? '🚫 不通过 — 存在阻断性问题' : (issues.length ? `⚠ 有 ${issues.length} 个提示，可继续发布` : '✓ 一切正常，可放心发布')}
      </div>
      <div class="eng-issues">
        ${issues.length === 0 ? '<div class="eng-empty">未检测到冲突</div>' : issues.map(i => `
          <div class="eng-issue eng-issue-${i.level}">
            <div class="eng-issue-head">
              <span class="eng-issue-level">${i.level === 'error' ? '阻断' : i.level === 'warning' ? '提示' : '说明'}</span>
              <span class="eng-issue-title">${escHtml(i.title)}</span>
            </div>
            <div class="eng-issue-detail">${i.detail}</div>
            <div class="eng-issue-suggest">建议：${escHtml(i.suggest)}</div>
          </div>
        `).join('')}
      </div>
    `,
    footer: `
      <button class="btn btn-ghost" id="engCancelConflict">取消</button>
      <button class="btn ${blocked ? 'btn-disabled' : 'btn-primary'}" id="engConfirmPublish" ${blocked ? 'disabled' : ''}>
        ${blocked ? '存在阻断' : '确认发布'}
      </button>
    `,
  });
  document.getElementById('engCancelConflict').addEventListener('click', closeDrawer);
  if (!blocked) {
    document.getElementById('engConfirmPublish').addEventListener('click', () => {
      onPass && onPass();
      closeDrawer();
    });
  }
}

/* ─────────────────────────────────────────────
   引擎③ 场景识别（Banner 片段）
───────────────────────────────────────────── */
export function buildSceneBanner() {
  const uncovered = SCENES.filter(s => !s.covered);
  return `
    <div class="eng-banner eng-banner-3">
      <div class="eng-banner-icon">🎯</div>
      <div class="eng-banner-body">
        <div class="eng-banner-title">
          <span class="eng-tag eng-tag-3">引擎③ 场景识别</span>
          AI 在近 7 天会话中识别到 <strong>${uncovered.length}</strong> 个未覆盖场景
        </div>
        <div class="eng-banner-sub">
          ${uncovered.slice(0, 3).map(s => `<span class="eng-pill">${escHtml(s.tag)} · ${escHtml(s.name)}（${s.volume.toLocaleString()}次）</span>`).join('')}
        </div>
      </div>
      <button class="btn btn-sm btn-primary" data-engine="scene-detail">查看场景洞察</button>
    </div>
  `;
}

export function buildSceneRecommendBanner() {
  const top = SCENES.filter(s => !s.covered).slice(0, 2);
  return `
    <div class="eng-banner eng-banner-3 eng-banner-rec">
      <div class="eng-banner-icon">✨</div>
      <div class="eng-banner-body">
        <div class="eng-banner-title">
          <span class="eng-tag eng-tag-3">引擎③ 场景识别</span>
          根据你的会话热区，为你推荐市场 Skill
        </div>
        <div class="eng-banner-sub">
          ${top.map(s => `<span class="eng-pill eng-pill-blue">${escHtml(s.name)}</span>`).join('')}
          <span style="color:var(--text-tertiary);font-size:12px;margin-left:6px">向下浏览匹配的官方 Skill ↓</span>
        </div>
      </div>
    </div>
  `;
}

function openSceneDetail() {
  const rows = SCENES.map(s => `
    <tr>
      <td>${escHtml(s.tag)}</td>
      <td>${escHtml(s.name)}</td>
      <td style="text-align:right">${s.volume.toLocaleString()}</td>
      <td><span class="eng-pill ${s.severity === 'high' ? 'eng-pill-red' : s.severity === 'medium' ? 'eng-pill-orange' : ''}">${s.severity === 'high' ? '高' : s.severity === 'medium' ? '中' : '低'}</span></td>
      <td>${s.covered ? '<span class="eng-pill eng-pill-green">已覆盖</span>' : '<span class="eng-pill eng-pill-red">未覆盖</span>'}</td>
      <td style="font-size:12px;color:var(--text-secondary)">${escHtml(s.suggest)}</td>
    </tr>
  `).join('');
  openDrawer({
    title: `<span class="eng-tag eng-tag-3">引擎③ 场景识别</span> 近 7 天场景洞察`,
    body: `
      <div class="eng-stat-row">
        <div class="eng-stat"><div class="eng-stat-v">${SCENES.length}</div><div class="eng-stat-l">识别场景</div></div>
        <div class="eng-stat"><div class="eng-stat-v" style="color:var(--success)">${SCENES.filter(s => s.covered).length}</div><div class="eng-stat-l">已覆盖</div></div>
        <div class="eng-stat"><div class="eng-stat-v" style="color:var(--danger)">${SCENES.filter(s => !s.covered).length}</div><div class="eng-stat-l">待补齐</div></div>
        <div class="eng-stat"><div class="eng-stat-v">${SCENES.reduce((a, b) => a + b.volume, 0).toLocaleString()}</div><div class="eng-stat-l">总会话量</div></div>
      </div>
      <table class="eng-table">
        <thead><tr><th>类目</th><th>场景</th><th style="text-align:right">会话量</th><th>严重度</th><th>状态</th><th>建议</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `,
    footer: `<button class="btn btn-primary" data-engine="ai-draft">✨ 用 AI 起草补齐</button>`,
  });
}

/* ─────────────────────────────────────────────
   引擎④ 归因分析
───────────────────────────────────────────── */
function openAttribution(recordId) {
  const a = ATTRIB_DATA.default;
  const advRows = a.advice.map(t => `<li>${escHtml(t)}</li>`).join('');
  const sceneRows = a.byScene.map(r => `
    <tr>
      <td>${escHtml(r.scene)}</td>
      <td style="text-align:right">${r.volume.toLocaleString()}</td>
      <td style="text-align:right">${r.resolve.toFixed(1)}%</td>
      <td style="text-align:right" class="${r.delta >= 0 ? 'eng-up' : 'eng-down'}">${r.delta >= 0 ? '+' : ''}${r.delta.toFixed(1)}</td>
    </tr>
  `).join('');
  openDrawer({
    title: `<span class="eng-tag eng-tag-4">引擎④ 归因分析</span> 近 30 天效果`,
    body: `
      <div class="eng-stat-row">
        <div class="eng-stat"><div class="eng-stat-v">${a.overall.resolveRate}%</div><div class="eng-stat-l">解决率 <span class="${a.overall.resolveDelta >= 0 ? 'eng-up' : 'eng-down'}">${a.overall.resolveDelta >= 0 ? '↑' : '↓'} ${Math.abs(a.overall.resolveDelta)}</span></div></div>
        <div class="eng-stat"><div class="eng-stat-v">${a.overall.callRate}%</div><div class="eng-stat-l">转人工率 <span class="${a.overall.callDelta <= 0 ? 'eng-up' : 'eng-down'}">${a.overall.callDelta >= 0 ? '↑' : '↓'} ${Math.abs(a.overall.callDelta)}</span></div></div>
        <div class="eng-stat"><div class="eng-stat-v">${a.overall.satisfaction}</div><div class="eng-stat-l">满意度 <span class="${a.overall.satisfactionDelta >= 0 ? 'eng-up' : 'eng-down'}">${a.overall.satisfactionDelta >= 0 ? '↑' : '↓'} ${Math.abs(a.overall.satisfactionDelta)}</span></div></div>
      </div>
      <div class="eng-section-title">分场景效果</div>
      <table class="eng-table">
        <thead><tr><th>场景</th><th style="text-align:right">会话量</th><th style="text-align:right">解决率</th><th style="text-align:right">环比</th></tr></thead>
        <tbody>${sceneRows}</tbody>
      </table>
      <div class="eng-section-title">优化建议</div>
      <ul class="eng-advice">${advRows}</ul>
    `,
    footer: `<button class="btn btn-ghost" id="engGotoAnalytics">📊 在效果分析中查看</button><button class="btn btn-primary" id="engCloseAttr">知道了</button>`,
  });
  document.getElementById('engCloseAttr')?.addEventListener('click', closeDrawer);
  document.getElementById('engGotoAnalytics')?.addEventListener('click', () => {
    closeDrawer();
    if (window.sscSwitchTab) window.sscSwitchTab('analytics');
  });
}

/* ─────────────────────────────────────────────
   全局事件代理 + 公共 API
───────────────────────────────────────────── */
document.addEventListener('click', (ev) => {
  const t = ev.target.closest('[data-engine]');
  if (!t) return;
  const kind = t.dataset.engine;
  if (kind === 'ai-draft') {
    ev.preventDefault();
    openAiDraft();
  } else if (kind === 'scene-detail') {
    ev.preventDefault();
    openSceneDetail();
  } else if (kind === 'attribution') {
    ev.preventDefault();
    openAttribution(t.dataset.recordId);
  }
});

/* 公开给 ops 模块用：发布门禁 */
export function runConflictGate(skillId, onPass) {
  openConflictDrawer(skillId, onPass);
}
