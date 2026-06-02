/**
 * 知识库（Work 模式）
 *
 * 设计参考：全局兜底策略_知识库RAG检索.md
 *   - 接口：CCO商家 > searchKnowledgeByChunk
 *   - 兜底链路：所有 Skill 未命中 → RAG 召回（score≥0.6）→ Top1~3 归纳回复
 *
 * 本模块提供 5 个子区：
 *   1. 知识库概览（条目数 / 命中率 / 兜底贡献）
 *   2. 类目卡片（7 大 categoryId 真实业务方向）
 *   3. 知识条目列表（mock）
 *   4. RAG 召回测试器（输入 query 模拟返回 Top3）
 *   5. 兜底策略说明卡（沿用历史方案的处理流程）
 */
import { showToast, escHtml } from '../utils.js';

/* ── 7 大类目（来自 全局兜底策略_知识库RAG检索.md） ── */
const KB_CATEGORIES = [
  { id: '507140007', name: '港台 GS / TA Plus', desc: '信保服务、拒付综合服务', count: 47,  scoreRange: '0.54 ~ 0.59', tone: 'navy-gray' },
  { id: '87875007',  name: '支付 / 退款',        desc: 'BLIK · Alibaba.com Pay · 通用账户', count: 82,  scoreRange: '0.70 ~ 0.77', tone: 'gold-brown' },
  { id: '4724',      name: '物流 / 退款',        desc: '商家退款、买家物流市场', count: 128, scoreRange: '0.60 ~ 0.80', tone: 'blue-cyan' },
  { id: '74774027',  name: '通用业务（一）',     desc: '服务市场、生意助手、EPR', count: 96,  scoreRange: '0.70 ~ 0.80', tone: 'orange-red' },
  { id: '276038014', name: '通用业务（二）',     desc: '通用平台规则与流程', count: 73,  scoreRange: '0.74 ~ 0.80', tone: 'purple-pink' },
  { id: '276038017', name: '通用业务（三）',     desc: '通用平台规则与流程', count: 68,  scoreRange: '0.74 ~ 0.80', tone: 'green-teal' },
  { id: '276038076', name: '通用业务（四）',     desc: '通用平台规则与流程', count: 54,  scoreRange: '0.74 ~ 0.80', tone: 'blue-cyan' },
];

/* ── Mock 知识条目（真实场景常见 FAQ） ── */
const KB_ENTRIES = [
  { id: 'k1', categoryId: '87875007',  title: 'BLIK 如何退款？',                    summary: '支付后 13 个月内支持原路退款，超出走 TT 退款。', updated: '2026-04-10', hits: 1284, status: 'published' },
  { id: 'k2', categoryId: '87875007',  title: '外贸服务市场退款到通用资金账户如何提现？', summary: '先联系服务商确认退款，退到通用账户后提交提现申请，T+7 完成。', updated: '2026-04-08', hits: 967, status: 'published' },
  { id: 'k3', categoryId: '4724',      title: '物流商家退款流程',                   summary: '订单异常 → 物流凭证上传 → 平台审核 → 退款到买家。', updated: '2026-04-05', hits: 2103, status: 'published' },
  { id: 'k4', categoryId: '4724',      title: '买家物流市场使用指南',               summary: '一键比价、自动出单、签收回执的完整链路说明。', updated: '2026-04-01', hits: 642, status: 'published' },
  { id: 'k5', categoryId: '507140007', title: 'TA Plus 服务退出说明',               summary: 'My Alibaba → 交易管理 → 交易保障服务 → 关闭服务。', updated: '2026-03-28', hits: 412, status: 'published' },
  { id: 'k6', categoryId: '74774027',  title: '生意助手如何退款？',                 summary: '联系客户经理处理，需提供订单号与原因说明。', updated: '2026-03-25', hits: 318, status: 'published' },
  { id: 'k7', categoryId: '276038014', title: 'EPR 注册材料清单',                  summary: '需要欧盟当地税号、生产商资质、产品分类等 5 项材料。', updated: '2026-03-20', hits: 856, status: 'published' },
  { id: 'k8', categoryId: '276038017', title: '平台合规处罚申诉路径',               summary: '7 天内提交申诉单 + 凭证截图，48h 内审核反馈。', updated: '2026-03-18', hits: 723, status: 'published' },
  { id: 'k9', categoryId: '276038076', title: 'AI Copilot 接入指南',               summary: '后台开通 → 配置 prompt 模板 → 上线灰度测试。', updated: '2026-03-15', hits: 234, status: 'draft' },
];

/* ── RAG 模拟召回 ── */
function mockRagSearch(query) {
  if (!query.trim()) return [];
  const q = query.toLowerCase();
  // 简易 mock：按 title/summary 关键词命中 + 编造 score
  const hits = KB_ENTRIES
    .filter(e => e.status === 'published')
    .map(e => {
      const t = e.title.toLowerCase();
      const s = e.summary.toLowerCase();
      let score = 0;
      if (t.includes(q) || s.includes(q)) score = 0.78 + Math.random() * 0.1;
      else if (q.split('').some(c => t.includes(c)))   score = 0.55 + Math.random() * 0.15;
      return { ...e, score };
    })
    .filter(e => e.score >= 0.5)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);
  return hits;
}

/* ── 状态 ── */
let _activeCategory = 'all';
let _searchKw = '';

/* ────────────────────────────────────────────── 渲染主入口 */
export function renderKnowledge() {
  const root = document.getElementById('sec-knowledge');
  if (!root) return;

  const totalEntries = KB_ENTRIES.length;
  const totalHits    = KB_ENTRIES.reduce((s, e) => s + e.hits, 0);
  const ragRate      = 23.7; // mock：兜底命中占总流量比

  root.innerHTML = `
    <div class="page-header">
      <h1>📚 知识库</h1>
      <p>Skill 兜底数据源 · 7 大类目 · ${totalEntries} 条已发布知识 · 累计召回 ${totalHits.toLocaleString()} 次</p>
    </div>

    <!-- 概览数据卡 -->
    <div class="kb-stat-grid">
      <div class="kb-stat-card">
        <div class="kb-stat-label">已发布知识</div>
        <div class="kb-stat-value">${totalEntries}</div>
        <div class="kb-stat-trend up">↑ 本周 +12</div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-label">月度召回</div>
        <div class="kb-stat-value">${totalHits.toLocaleString()}</div>
        <div class="kb-stat-trend up">↑ 8.4%</div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-label">兜底贡献率</div>
        <div class="kb-stat-value">${ragRate}%</div>
        <div class="kb-stat-trend">RAG 命中</div>
      </div>
      <div class="kb-stat-card">
        <div class="kb-stat-label">平均 Score</div>
        <div class="kb-stat-value">0.74</div>
        <div class="kb-stat-trend">阈值 ≥ 0.6</div>
      </div>
    </div>

    <!-- 类目分组 -->
    <div class="kb-section">
      <div class="kb-section-head">
        <h3>📂 知识类目（7 大业务方向）</h3>
        <span class="kb-section-sub">对应 categoryId · 来自实测召回数据</span>
      </div>
      <div class="kb-cat-grid">
        ${KB_CATEGORIES.map(c => `
          <button class="kb-cat-card" data-cat="${c.id}" type="button">
            <div class="kb-cat-tag" data-tone="${c.tone}">${c.id}</div>
            <div class="kb-cat-name">${c.name}</div>
            <div class="kb-cat-desc">${c.desc}</div>
            <div class="kb-cat-meta">
              <span>${c.count} 条</span>
              <span class="kb-cat-score">score ${c.scoreRange}</span>
            </div>
          </button>
        `).join('')}
      </div>
    </div>

    <!-- RAG 召回测试器 -->
    <div class="kb-section kb-rag-tester">
      <div class="kb-section-head">
        <h3>🔍 RAG 召回测试</h3>
        <span class="kb-section-sub">模拟 searchKnowledgeByChunk · 阈值 score ≥ 0.6</span>
      </div>
      <div class="kb-rag-input-row">
        <input type="text" id="ragQuery" class="kb-rag-input" placeholder="试试：怎么退款 / TA Plus 退出 / EPR 注册" />
        <button class="btn btn-primary" id="ragSearchBtn">召回测试</button>
      </div>
      <div class="kb-rag-result" id="ragResult">
        <div class="kb-rag-empty">输入问题，模拟 RAG 召回 Top3 知识</div>
      </div>
    </div>

    <!-- 知识条目列表 -->
    <div class="kb-section">
      <div class="kb-section-head">
        <h3>📑 知识条目</h3>
        <div class="kb-toolbar">
          <input type="text" id="kbSearch" class="kb-search" placeholder="搜索标题或摘要" />
          <button class="btn btn-primary" id="kbAddBtn">＋ 新建知识</button>
        </div>
      </div>
      <div class="kb-filter-bar">
        <button class="kb-chip ${_activeCategory==='all'?'active':''}" data-filter="all">全部</button>
        ${KB_CATEGORIES.map(c => `
          <button class="kb-chip ${_activeCategory===c.id?'active':''}" data-filter="${c.id}">${c.name}</button>
        `).join('')}
      </div>
      <div class="kb-entry-list" id="kbEntryList"></div>
    </div>

    <!-- 兜底策略说明卡 -->
    <div class="kb-section kb-strategy-card">
      <div class="kb-section-head">
        <h3>⚙️ 全局兜底策略</h3>
        <span class="kb-section-sub">所有 Skill 未命中时自动触发</span>
      </div>
      <div class="kb-strategy-flow">
        <div class="kb-flow-step">
          <div class="kb-flow-num">1</div>
          <div class="kb-flow-text"><strong>用户问题未命中任何 Skill</strong><br><span>过滤闲聊/招呼，提取核心关键词</span></div>
        </div>
        <div class="kb-flow-arrow">→</div>
        <div class="kb-flow-step">
          <div class="kb-flow-num">2</div>
          <div class="kb-flow-text"><strong>调用 searchKnowledgeByChunk</strong><br><span>score≥0.6 · limit=5 · 全 7 类目</span></div>
        </div>
        <div class="kb-flow-arrow">→</div>
        <div class="kb-flow-step">
          <div class="kb-flow-num">3</div>
          <div class="kb-flow-text"><strong>Top1~3 归纳回复</strong><br><span>不照搬原文 · 不编造 · 末尾追问</span></div>
        </div>
        <div class="kb-flow-arrow">→</div>
        <div class="kb-flow-step">
          <div class="kb-flow-num">4</div>
          <div class="kb-flow-text"><strong>低质量 / 空结果转人工</strong><br><span>所有 score &lt; 0.6 时自动升级</span></div>
        </div>
      </div>
    </div>
  `;

  renderEntryList();
  bindEvents(root);
}

/* ── 渲染条目列表 ── */
function renderEntryList() {
  const wrap = document.getElementById('kbEntryList');
  if (!wrap) return;
  const kw = _searchKw.toLowerCase().trim();
  const list = KB_ENTRIES.filter(e => {
    if (_activeCategory !== 'all' && e.categoryId !== _activeCategory) return false;
    if (kw && !(e.title.toLowerCase().includes(kw) || e.summary.toLowerCase().includes(kw))) return false;
    return true;
  });

  if (list.length === 0) {
    wrap.innerHTML = `<div class="kb-empty">暂无匹配的知识条目，换个关键词试试 ✨</div>`;
    return;
  }

  wrap.innerHTML = list.map(e => {
    const cat = KB_CATEGORIES.find(c => c.id === e.categoryId);
    const statusLabel = e.status === 'published' ? '已发布' : '草稿';
    const statusCls   = e.status === 'published' ? 'pub' : 'draft';
    return `
      <div class="kb-entry-row" data-id="${e.id}">
        <div class="kb-entry-main">
          <div class="kb-entry-title">
            ${escHtml(e.title)}
            <span class="kb-entry-status ${statusCls}">${statusLabel}</span>
          </div>
          <div class="kb-entry-summary">${escHtml(e.summary)}</div>
          <div class="kb-entry-meta">
            <span class="kb-entry-cat" data-tone="${cat?.tone || 'blue-cyan'}">${cat?.name || '未分类'}</span>
            <span>命中 ${e.hits.toLocaleString()} 次</span>
            <span>更新于 ${e.updated}</span>
          </div>
        </div>
        <div class="kb-entry-actions">
          <button class="btn btn-ghost btn-sm" data-act="preview">预览</button>
          <button class="btn btn-ghost btn-sm" data-act="edit">编辑</button>
        </div>
      </div>
    `;
  }).join('');
}

/* ── 事件绑定 ── */
function bindEvents(root) {
  /* 类目卡跳过滤 */
  root.querySelectorAll('.kb-cat-card').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeCategory = btn.dataset.cat;
      renderKnowledge();
    });
  });

  /* 过滤 chip */
  root.querySelectorAll('.kb-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      _activeCategory = btn.dataset.filter;
      renderKnowledge();
    });
  });

  /* 搜索 */
  const searchInput = root.querySelector('#kbSearch');
  searchInput?.addEventListener('input', (e) => {
    _searchKw = e.target.value;
    renderEntryList();
  });

  /* 新建 */
  root.querySelector('#kbAddBtn')?.addEventListener('click', () => {
    showToast('💡 新建知识入口即将开放，预计 5 月底上线', 'info');
  });

  /* RAG 测试 */
  const ragBtn   = root.querySelector('#ragSearchBtn');
  const ragInput = root.querySelector('#ragQuery');
  const runRag = () => {
    const q = ragInput.value.trim();
    if (!q) { showToast('请输入测试问题', 'info'); return; }
    const result = mockRagSearch(q);
    renderRagResult(q, result);
  };
  ragBtn?.addEventListener('click', runRag);
  ragInput?.addEventListener('keydown', (e) => { if (e.key === 'Enter') runRag(); });

  /* 条目操作 */
  root.querySelectorAll('.kb-entry-row .btn[data-act]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const act = btn.dataset.act;
      const row = btn.closest('.kb-entry-row');
      const id = row?.dataset.id;
      const entry = KB_ENTRIES.find(x => x.id === id);
      if (!entry) return;
      if (act === 'preview') showToast(`📖 预览「${entry.title}」`, 'info');
      if (act === 'edit')    showToast(`✏️ 编辑「${entry.title}」`, 'info');
    });
  });
}

function renderRagResult(query, hits) {
  const wrap = document.getElementById('ragResult');
  if (!wrap) return;
  if (hits.length === 0) {
    wrap.innerHTML = `
      <div class="kb-rag-miss">
        <div class="kb-rag-miss-title">⚠️ 未命中知识库</div>
        <div class="kb-rag-miss-desc">所有结果 score &lt; 0.5，按兜底策略将转人工客服处理</div>
        <pre class="kb-rag-reply">「抱歉，您的问题我暂时无法直接解答，正在为您转接人工客服，请稍候。」</pre>
      </div>
    `;
    return;
  }
  const top = hits[0];
  const passThreshold = top.score >= 0.6;
  wrap.innerHTML = `
    <div class="kb-rag-summary ${passThreshold ? 'pass' : 'low'}">
      <span class="kb-rag-q">Query: <strong>${escHtml(query)}</strong></span>
      <span class="kb-rag-status">${passThreshold ? '✅ 命中（score ≥ 0.6）' : '⚠️ 低质量（score &lt; 0.6 → 转人工）'}</span>
    </div>
    <div class="kb-rag-hits">
      ${hits.map((h, i) => {
        const cat = KB_CATEGORIES.find(c => c.id === h.categoryId);
        return `
          <div class="kb-rag-hit">
            <div class="kb-rag-hit-rank">Top ${i + 1}</div>
            <div class="kb-rag-hit-body">
              <div class="kb-rag-hit-title">${escHtml(h.title)}</div>
              <div class="kb-rag-hit-summary">${escHtml(h.summary)}</div>
              <div class="kb-rag-hit-meta">
                <span class="kb-entry-cat" data-tone="${cat?.tone || 'blue-cyan'}">${cat?.name || '未分类'}</span>
                <span class="kb-rag-score" data-level="${h.score >= 0.7 ? 'high' : h.score >= 0.6 ? 'mid' : 'low'}">score ${h.score.toFixed(2)}</span>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
    ${passThreshold ? `
      <div class="kb-rag-reply-box">
        <div class="kb-rag-reply-label">📝 AI 自动回复（基于 Top1~${Math.min(hits.length, 3)} 归纳）</div>
        <div class="kb-rag-reply-text">${escHtml(top.summary)} 如果还有其他问题，您可以继续咨询。请问还有什么可以帮您的吗？</div>
      </div>
    ` : ''}
  `;
}
