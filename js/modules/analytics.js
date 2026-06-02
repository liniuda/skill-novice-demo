/**
 * 效果分析 模块（归因引擎主战场）
 *
 * 三个子视图：
 *   📊 总览      overview
 *   🎯 Skill 归因  skill
 *   🌐 场景归因   scene
 *
 * 布局：左侧二级导航（复用 .persona-side-nav 风格）+ 右侧画布
 * 顶部：时间窗下拉 + 导出按钮
 */
import { getOverview, getSkillAttribution, getSceneAttribution, TIME_RANGES } from '../data/analytics.js';
import { showToast, escHtml } from '../utils.js';

let _view = 'overview';
let _range = '30d';

const SUB_NAV = [
  { id: 'overview', icon: '📊', label: '总览',     desc: 'KPI · 趋势 · 漏斗' },
  { id: 'skill',    icon: '🎯', label: 'Skill 归因', desc: '按 Skill 维度对比' },
  { id: 'scene',    icon: '🌐', label: '场景归因',  desc: '按业务场景维度' },
];

/* ─────────────────────────────────────────────
   主渲染
───────────────────────────────────────────── */
export function renderAnalytics(initView) {
  if (initView) _view = initView;
  const el = document.getElementById('sec-analytics');
  if (!el) return;

  const sideHtml = SUB_NAV.map(n => `
    <button class="persona-side-item${_view === n.id ? ' active' : ''}" data-an-view="${n.id}">
      <span class="persona-side-icon">${n.icon}</span>
      <div>
        <div class="persona-side-label">${escHtml(n.label)}</div>
        <div class="persona-side-desc">${escHtml(n.desc)}</div>
      </div>
    </button>
  `).join('');

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">📈 效果分析</h1>
        <p class="page-subtitle">
          <span class="eng-tag eng-tag-4">引擎④ 归因分析</span>
          基于真实会话日志的 Skill 效果归因 · 数据透传后即可对接 ODPS
        </p>
      </div>
      <div class="an-toolbar">
        <select class="filter-select" id="anRange">
          ${TIME_RANGES.map(t => `<option value="${t.id}"${_range === t.id ? ' selected' : ''}>${escHtml(t.label)}</option>`).join('')}
        </select>
        <button class="btn btn-ghost" id="anExport">📥 导出 CSV</button>
      </div>
    </div>

    <div class="persona-layout">
      <nav class="persona-side-nav">${sideHtml}</nav>
      <div class="persona-content" id="anCanvas">${renderView(_view, _range)}</div>
    </div>
  `;

  bindEvents(el);
}

function renderView(view, range) {
  if (view === 'overview') return renderOverview(range);
  if (view === 'skill')    return renderSkillView(range);
  if (view === 'scene')    return renderSceneView(range);
  return '';
}

/* ─────────────────────────────────────────────
   📊 总览
───────────────────────────────────────────── */
function renderOverview(range) {
  const { kpi, trend, funnel } = getOverview(range);
  const trendChart = renderTrendChart(trend);
  const funnelChart = renderFunnel(funnel);

  return `
    <div class="an-kpi-row">
      ${kpiCard('总解决率', kpi.resolveRate + '%', kpi.resolveDelta, true)}
      ${kpiCard('转人工率', kpi.callRate + '%',    kpi.callDelta,    false)}
      ${kpiCard('满意度',   kpi.satisfaction.toFixed(1), kpi.satisfactionDelta, true)}
      ${kpiCard('调用量',   kpi.callVolume.toLocaleString(), kpi.callVolumeDelta, true, true)}
    </div>

    <div class="an-section">
      <div class="an-section-head">
        <div class="an-section-title">解决率 / 转人工率 趋势</div>
        <div class="an-legend">
          <span class="an-legend-item"><span class="an-dot an-dot-pri"></span>解决率</span>
          <span class="an-legend-item"><span class="an-dot an-dot-warn"></span>转人工率</span>
        </div>
      </div>
      ${trendChart}
    </div>

    <div class="an-section">
      <div class="an-section-head"><div class="an-section-title">流量漏斗</div></div>
      ${funnelChart}
    </div>
  `;
}

function kpiCard(label, value, delta, upGood, isVolume) {
  const isUp = delta >= 0;
  const isGood = upGood ? isUp : !isUp;
  const arrow = isUp ? '↑' : '↓';
  const cls = isGood ? 'eng-up' : 'eng-down';
  const suffix = isVolume ? '%' : '';
  return `
    <div class="an-kpi-card">
      <div class="an-kpi-label">${escHtml(label)}</div>
      <div class="an-kpi-value">${value}</div>
      <div class="an-kpi-delta ${cls}">${arrow} ${Math.abs(delta).toFixed(1)}${suffix}</div>
    </div>
  `;
}

/* CSS 折线图（双线） */
function renderTrendChart(trend) {
  if (!trend.length) return '';
  const W = 720, H = 180, P = 30;
  const minY = 0, maxY = 100;
  const scaleX = (i) => P + (W - 2 * P) * (i / (trend.length - 1));
  const scaleY = (v) => H - P - (H - 2 * P) * ((v - minY) / (maxY - minY));

  const linePath = (key) => trend.map((d, i) => `${i === 0 ? 'M' : 'L'}${scaleX(i).toFixed(1)},${scaleY(d[key]).toFixed(1)}`).join(' ');

  const xLabels = trend.filter((_, i) => i === 0 || i === trend.length - 1 || i % Math.ceil(trend.length / 6) === 0);
  const xAxis = xLabels.map(d => {
    const i = trend.indexOf(d);
    return `<text x="${scaleX(i).toFixed(1)}" y="${H - 8}" class="an-axis">${d.date}</text>`;
  }).join('');

  const yTicks = [0, 25, 50, 75, 100];
  const yAxis = yTicks.map(v => `
    <line x1="${P}" y1="${scaleY(v)}" x2="${W - P}" y2="${scaleY(v)}" class="an-grid"/>
    <text x="${P - 6}" y="${scaleY(v) + 3}" text-anchor="end" class="an-axis">${v}</text>
  `).join('');

  return `
    <svg class="an-chart" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none">
      ${yAxis}
      <path d="${linePath('resolveRate')}" class="an-line an-line-pri" fill="none"/>
      <path d="${linePath('callRate')}"   class="an-line an-line-warn" fill="none"/>
      ${xAxis}
    </svg>
  `;
}

function renderFunnel(f) {
  const stages = [
    { key: 'intent',    label: '意图识别', value: f.intent },
    { key: 'matched',   label: 'Skill 匹配', value: f.matched },
    { key: 'executed',  label: '执行成功', value: f.executed },
    { key: 'satisfied', label: '用户满意', value: f.satisfied },
  ];
  const max = stages[0].value;
  return `
    <div class="an-funnel">
      ${stages.map((s, i) => {
        const ratio = (s.value / max * 100).toFixed(1);
        const dropoff = i > 0 ? ((stages[i].value / stages[i - 1].value) * 100).toFixed(1) : null;
        return `
          <div class="an-funnel-stage">
            <div class="an-funnel-bar" style="width:${ratio}%">
              <span class="an-funnel-label">${escHtml(s.label)}</span>
              <span class="an-funnel-value">${s.value.toLocaleString()}</span>
            </div>
            ${dropoff ? `<div class="an-funnel-conv">→ ${dropoff}%</div>` : ''}
          </div>
        `;
      }).join('')}
    </div>
  `;
}

/* ─────────────────────────────────────────────
   🎯 Skill 归因
───────────────────────────────────────────── */
function renderSkillView(range) {
  const list = getSkillAttribution(range).sort((a, b) => b.calls - a.calls);
  const maxCalls = list[0]?.calls || 1;

  const rows = list.map(s => `
    <tr data-an-skill="${s.id}">
      <td>
        <div class="an-skill-cell">
          <span class="an-skill-icon">${s.icon}</span>
          <span class="an-skill-name">${escHtml(s.name)}</span>
        </div>
      </td>
      <td class="an-num">${s.calls.toLocaleString()}</td>
      <td>
        <div class="an-bar-wrap">
          <div class="an-bar an-bar-pri" style="width:${(s.calls / maxCalls * 100).toFixed(1)}%"></div>
        </div>
      </td>
      <td class="an-num"><strong>${s.resolveRate.toFixed(1)}%</strong></td>
      <td class="an-num ${s.delta >= 0 ? 'eng-up' : 'eng-down'}">${s.delta >= 0 ? '+' : ''}${s.delta.toFixed(1)}</td>
      <td class="an-num">${s.callRate.toFixed(1)}%</td>
      <td class="an-num">${s.satisfaction.toFixed(1)}</td>
      <td class="an-num">${s.contribution.toFixed(1)}%</td>
    </tr>
  `).join('');

  return `
    <div class="an-section">
      <div class="an-section-head">
        <div class="an-section-title">各 Skill 效果对比</div>
        <div class="an-section-sub">按调用量排序 · 共 ${list.length} 个</div>
      </div>
      <table class="data-table an-table">
        <thead>
          <tr>
            <th>Skill</th>
            <th class="an-num">调用量</th>
            <th>分布</th>
            <th class="an-num">解决率</th>
            <th class="an-num">环比</th>
            <th class="an-num">转人工率</th>
            <th class="an-num">满意度</th>
            <th class="an-num">贡献度</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>

    <div class="an-section">
      <div class="an-section-head"><div class="an-section-title">解决率排名</div></div>
      ${renderRankBars(list, 'resolveRate', '%')}
    </div>
  `;
}

function renderRankBars(list, key, suffix) {
  const sorted = [...list].sort((a, b) => b[key] - a[key]);
  const max = sorted[0][key];
  return `
    <div class="an-rank-list">
      ${sorted.map(s => `
        <div class="an-rank-row">
          <div class="an-rank-name">${s.icon} ${escHtml(s.name)}</div>
          <div class="an-bar-wrap">
            <div class="an-bar an-bar-grad" style="width:${(s[key] / max * 100).toFixed(1)}%"></div>
          </div>
          <div class="an-rank-val">${s[key].toFixed(1)}${suffix}
            <span class="${s.delta >= 0 ? 'eng-up' : 'eng-down'}">${s.delta >= 0 ? '↑' : '↓'} ${Math.abs(s.delta).toFixed(1)}</span>
          </div>
        </div>
      `).join('')}
    </div>
  `;
}

/* ─────────────────────────────────────────────
   🌐 场景归因
───────────────────────────────────────────── */
function renderSceneView(range) {
  const list = getSceneAttribution(range).sort((a, b) => b.volume - a.volume);
  const total = list.reduce((s, x) => s + x.volume, 0);
  const covered = list.filter(s => s.coverage > 0).length;
  const uncovered = list.filter(s => s.coverage === 0);
  const uncoveredVol = uncovered.reduce((s, x) => s + x.volume, 0);

  const rows = list.map(s => {
    const isUncov = s.coverage === 0;
    const sharePct = (s.volume / total * 100).toFixed(1);
    return `
      <tr class="${isUncov ? 'an-row-warn' : ''}">
        <td><span class="eng-pill">${escHtml(s.tag)}</span></td>
        <td><strong>${escHtml(s.name)}</strong></td>
        <td class="an-num">${s.volume.toLocaleString()}</td>
        <td class="an-num">${sharePct}%</td>
        <td>
          ${isUncov
            ? '<span class="eng-pill eng-pill-red">未覆盖</span>'
            : `<div class="an-cov-wrap"><div class="an-cov-bar" style="width:${s.coverage}%"></div><span class="an-cov-text">${s.coverage}%</span></div>`}
        </td>
        <td class="an-num">${isUncov ? '—' : s.resolveRate.toFixed(1) + '%'}</td>
        <td class="an-num ${s.delta >= 0 ? 'eng-up' : 'eng-down'}">${isUncov ? '—' : (s.delta >= 0 ? '+' : '') + s.delta.toFixed(1)}</td>
        <td class="an-num ${s.marginalGain >= 0 ? 'eng-up' : 'eng-down'}">${isUncov ? '—' : (s.marginalGain >= 0 ? '+' : '') + s.marginalGain.toFixed(1)}</td>
        <td style="font-size:12px;color:var(--text-secondary)">${escHtml(s.ownerSkill)}</td>
      </tr>
    `;
  }).join('');

  return `
    <div class="an-kpi-row">
      <div class="an-kpi-card"><div class="an-kpi-label">识别场景</div><div class="an-kpi-value">${list.length}</div></div>
      <div class="an-kpi-card"><div class="an-kpi-label">已覆盖</div><div class="an-kpi-value" style="color:var(--success,#10B981)">${covered}</div></div>
      <div class="an-kpi-card"><div class="an-kpi-label">未覆盖</div><div class="an-kpi-value" style="color:var(--danger,#EF4444)">${uncovered.length}</div></div>
      <div class="an-kpi-card"><div class="an-kpi-label">未覆盖会话量</div><div class="an-kpi-value">${uncoveredVol.toLocaleString()}</div></div>
    </div>

    ${uncovered.length ? `
      <div class="an-alert">
        <span style="font-size:18px">⚠</span>
        <div>
          <strong>${uncovered.length} 个未覆盖场景</strong>
          消耗会话量 ${uncoveredVol.toLocaleString()}（占 ${(uncoveredVol / total * 100).toFixed(1)}%）
          ， 建议在 <a href="javascript:void(0)" data-engine="ai-draft" style="color:var(--accent);font-weight:500">✨ AI 起草</a> 中补齐 Skill。
        </div>
      </div>
    ` : ''}

    <div class="an-section">
      <div class="an-section-head">
        <div class="an-section-title">场景明细</div>
        <div class="an-section-sub">按会话量排序 · 共 ${list.length} 个场景 · 总会话量 ${total.toLocaleString()}</div>
      </div>
      <table class="data-table an-table">
        <thead>
          <tr>
            <th>类目</th>
            <th>场景</th>
            <th class="an-num">会话量</th>
            <th class="an-num">占比</th>
            <th>覆盖率</th>
            <th class="an-num">解决率</th>
            <th class="an-num">环比</th>
            <th class="an-num">边际贡献</th>
            <th>归属 Skill</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

/* ─────────────────────────────────────────────
   事件
───────────────────────────────────────────── */
function bindEvents(el) {
  // 二级导航切换
  el.querySelectorAll('[data-an-view]').forEach(b => {
    b.addEventListener('click', () => {
      _view = b.dataset.anView;
      renderAnalytics();
    });
  });

  // 时间窗
  const sel = el.querySelector('#anRange');
  if (sel) sel.addEventListener('change', () => {
    _range = sel.value;
    document.getElementById('anCanvas').innerHTML = renderView(_view, _range);
  });

  // 导出
  const exp = el.querySelector('#anExport');
  if (exp) exp.addEventListener('click', () => {
    showToast('已导出 CSV（mock）');
  });
}

/* 公共 API：让其他模块跳转到指定子视图 */
export function navigateAnalytics(view = 'overview') {
  _view = view;
  if (window.sscSwitchTab) window.sscSwitchTab('analytics');
}
