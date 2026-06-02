/**
 * 智服工坊 X · Bento 异形九宫格首页
 *
 * 设计原则：
 *  - 不规则九宫格（2x2 / 2x1 / 1x2 / 1x1）传达数据重要度
 *  - 大字号关键指标 + sparkline 节奏感
 *  - AI 流式建议条（核心交互）
 *  - 悬浮 3D 抬起 + 渐变描边
 */
import { showToast, escHtml } from '../utils.js';
import { getGrowth } from '../data/growth.js';
import { getStats } from '../data/skills.js';

const RECENT_SKILLS = [
  { id: 'cross-refund', name: '跨境退款 Skill', updated: '2 小时前', status: '已上线', resolveRate: 91 },
  { id: 'logistics',    name: '物流时效 Skill', updated: '昨天',     status: '草稿',     resolveRate: null },
  { id: 'trust',        name: '信保纠纷 Skill', updated: '3 天前',   status: '已上线', resolveRate: 88 },
];

const AI_SUGGESTIONS = [
  '昨日「物流时效」转人工率涨了 4.2%，建议查看「场景归因」补全 2 个未覆盖话术。',
  '「跨境退款 Skill」解决率连续 3 日稳定 91%+，可考虑发布到 Skill 广场让更多团队 fork。',
  '检测到 5 个相似拒付场景，建议合并为 1 个 Skill 减少维护成本。',
];

let _streamTimer = null;

export function renderHome() {
  const el = document.getElementById('sec-home');
  if (!el) return;

  const g = getGrowth();
  const stats = getStats();
  const isFirst = !localStorage.getItem('novice_visited');
  if (isFirst) localStorage.setItem('novice_visited', '1');

  const progressPct = (g.points / g.nextPoints * 100).toFixed(0);

  el.innerHTML = `
    <div class="bento-hero">
      <div>
        <h1>${isFirst ? '👋 你好，运营同学' : '👋 欢迎回来'}</h1>
        <p>${escHtml(g.tip || '今天来配 1 个 Skill 怎么样？')}</p>
      </div>
      <button class="bento-hero-cta" data-action="goto-skill-novice">
        <span>＋</span><span>新建 Skill</span>
      </button>
    </div>

    <div class="bento-grid">
      <!-- 2x2 主卡：AI 今日建议 -->
      <div class="bento-tile" data-size="2x2"
           style="--tile-c1:#8B5CF6;--tile-c2:#EC4899"
           data-action="goto-analytics">
        <div class="bento-tile-eyebrow">AI Insight · 今日</div>
        <div class="bento-tile-title">智能体检官给的建议</div>
        <div class="bento-ai-stream" style="margin-top:14px">
          <span class="bento-ai-stream-icon">✨</span>
          <span class="bento-ai-stream-text" id="homeAiStream"></span>
        </div>
        <div class="bento-tile-spark" style="margin-top:14px">
          ${[58,72,65,80,76,90,68,82,94,77,88,72].map(h => `<span style="height:${h}%"></span>`).join('')}
        </div>
        <div class="bento-tile-foot">
          <span><span class="bento-pill"><span class="bento-pill-dot"></span>实时分析</span></span>
          <span class="bento-tile-arrow">→</span>
        </div>
      </div>

      <!-- 1x1：已发布 Skill 数 -->
      <div class="bento-tile" data-size="1x1"
           style="--tile-c1:#10B981;--tile-c2:#06B6D4"
           data-action="goto-skill">
        <div class="bento-tile-eyebrow">已发布 Skill</div>
        <div class="bento-tile-big">${stats.published}</div>
        <div class="bento-tile-foot">
          <span>+${stats.draft} 草稿</span>
          <span class="bento-tile-arrow">→</span>
        </div>
      </div>

      <!-- 1x1：解决率 -->
      <div class="bento-tile" data-size="1x1"
           style="--tile-c1:#F59E0B;--tile-c2:#EC4899"
           data-action="goto-analytics">
        <div class="bento-tile-eyebrow">综合解决率</div>
        <div class="bento-tile-big">89%</div>
        <div class="bento-tile-foot">
          <span style="color:#10B981">▲ 2.4%</span>
          <span class="bento-tile-arrow">→</span>
        </div>
      </div>

      <!-- 2x1：成长进度 -->
      <div class="bento-tile" data-size="2x1"
           style="--tile-c1:#3B82F6;--tile-c2:#8B5CF6"
           data-action="goto-skill">
        <div class="bento-tile-eyebrow">${escHtml(g.levelLabel)} · 成长进度</div>
        <div class="bento-tile-title" style="margin:6px 0 10px">${g.points} / ${g.nextPoints} 经验</div>
        <div style="height:8px;background:rgba(255,255,255,.06);border-radius:999px;overflow:hidden">
          <div style="height:100%;width:${progressPct}%;background:linear-gradient(90deg,#3B82F6,#8B5CF6,#EC4899);border-radius:999px"></div>
        </div>
        <div class="bento-tile-foot">
          <span>距下一级 ${g.nextPoints - g.points} 经验</span>
          <span>${progressPct}%</span>
        </div>
      </div>

      <!-- 1x2：抄作业入口 -->
      <div class="bento-tile" data-size="1x2"
           style="--tile-c1:#EC4899;--tile-c2:#F59E0B"
           data-action="goto-market">
        <div class="bento-tile-eyebrow">Skill Market</div>
        <div class="bento-tile-title">抄别人的好作业</div>
        <div class="bento-tile-desc">2,400+ 已被 fork 的精选 Skill，少走弯路。</div>
        <div style="display:flex;align-items:center;gap:-6px;margin-top:14px">
          ${['🛍️','💰','📦','⚖️','🤖'].map((e,i) => `
            <span style="width:30px;height:30px;border-radius:50%;background:rgba(255,255,255,.06);border:2px solid #161A23;display:inline-flex;align-items:center;justify-content:center;margin-left:${i ? '-8px' : '0'};font-size:14px">${e}</span>
          `).join('')}
        </div>
        <div class="bento-tile-foot">
          <span>逛广场 · 一键 fork</span>
          <span class="bento-tile-arrow">→</span>
        </div>
      </div>

      <!-- 2x1：体检诊断 -->
      <div class="bento-tile" data-size="2x1"
           style="--tile-c1:#06B6D4;--tile-c2:#10B981"
           data-action="goto-analytics">
        <div class="bento-tile-eyebrow">体检诊断</div>
        <div class="bento-tile-title">3 个 Skill 表现下滑</div>
        <div class="bento-tile-desc">AI 已生成修改建议，一键查看场景归因报告。</div>
        <div class="bento-tile-foot">
          <span><span class="bento-pill" style="border-color:rgba(245,158,11,.4);color:#F59E0B"><span class="bento-pill-dot" style="background:#F59E0B;box-shadow:0 0 8px #F59E0B"></span>需关注</span></span>
          <span class="bento-tile-arrow">→</span>
        </div>
      </div>

      <!-- 2x2：最近活儿 -->
      <div class="bento-tile" data-size="2x2"
           style="--tile-c1:#8B5CF6;--tile-c2:#3B82F6">
        <div class="bento-tile-eyebrow">最近的活儿</div>
        <div class="bento-tile-title">继续编辑</div>
        <div class="bento-recent">
          ${RECENT_SKILLS.map(s => `
            <div class="bento-recent-row" data-skill-id="${s.id}" style="cursor:pointer">
              <span><strong>${escHtml(s.name)}</strong></span>
              <span><em>${escHtml(s.updated)}</em>${s.resolveRate ? ` · <span style="color:#10B981">${s.resolveRate}%</span>` : ' · <span style="color:#F59E0B">草稿</span>'}</span>
            </div>
          `).join('')}
        </div>
        <div class="bento-tile-foot" style="margin-top:auto">
          <span>共 ${RECENT_SKILLS.length} 项</span>
          <span style="color:#8B5CF6;cursor:pointer" data-action="goto-skill">全部 →</span>
        </div>
      </div>

      <!-- 1x1：知识库 -->
      <div class="bento-tile" data-size="1x1"
           style="--tile-c1:#06B6D4;--tile-c2:#3B82F6"
           data-action="goto-knowledge">
        <div class="bento-tile-eyebrow">知识库</div>
        <div class="bento-tile-big">562</div>
        <div class="bento-tile-foot">
          <span>条已发布</span>
          <span class="bento-tile-arrow">→</span>
        </div>
      </div>

      <!-- 1x1：⌘K 提示 -->
      <div class="bento-tile" data-size="1x1"
           style="--tile-c1:#F59E0B;--tile-c2:#8B5CF6"
           data-action="open-cmdk">
        <div class="bento-tile-eyebrow">快捷搜索</div>
        <div style="display:flex;align-items:center;gap:8px;margin-top:18px;flex-wrap:wrap">
          <kbd style="padding:6px 12px;background:rgba(255,255,255,.08);border-radius:6px;font-family:ui-monospace,Menlo,monospace;color:#fff;font-size:14px;border:1px solid rgba(255,255,255,.1)">⌘ K</kbd>
        </div>
        <div class="bento-tile-desc" style="margin-top:10px">秒搜全站 Skill / 知识 / 空间</div>
      </div>
    </div>
  `;

  bind(el);
  startAiStream();
}

function bind(el) {
  el.querySelectorAll('[data-action]').forEach(card => {
    card.addEventListener('click', (e) => {
      e.stopPropagation();
      const action = card.dataset.action;
      doAction(action);
    });
  });
  el.querySelectorAll('[data-skill-id]').forEach(row => {
    row.addEventListener('click', (e) => {
      e.stopPropagation();
      if (window.openSkillDetail) window.openSkillDetail(row.dataset.skillId, 'basic');
    });
  });
}

function doAction(action) {
  switch (action) {
    case 'goto-skill-novice':
      sessionStorage.setItem('skill_mode_pref', 'novice');
      window.sscSwitchTab && window.sscSwitchTab('skill');
      break;
    case 'goto-skill':
      window.sscSwitchTab && window.sscSwitchTab('skill');
      break;
    case 'goto-analytics':
      window.sscSwitchTab && window.sscSwitchTab('analytics');
      break;
    case 'goto-knowledge':
      window.sscSwitchTab && window.sscSwitchTab('knowledge');
      break;
    case 'goto-market':
      window.switchGlobalMode && window.switchGlobalMode('market');
      break;
    case 'open-cmdk':
      window.dispatchEvent(new CustomEvent('cmdk:open'));
      break;
  }
}

function startAiStream() {
  const target = document.getElementById('homeAiStream');
  if (!target) return;
  if (_streamTimer) { clearInterval(_streamTimer); _streamTimer = null; }

  const text = AI_SUGGESTIONS[Math.floor(Math.random() * AI_SUGGESTIONS.length)];
  let i = 0;
  target.innerHTML = '<span class="x-stream-cursor"></span>';
  _streamTimer = setInterval(() => {
    if (i >= text.length) {
      clearInterval(_streamTimer);
      _streamTimer = null;
      target.innerHTML = text + '<span class="x-stream-cursor"></span>';
      return;
    }
    i++;
    target.innerHTML = text.slice(0, i) + '<span class="x-stream-cursor"></span>';
  }, 32);
}
