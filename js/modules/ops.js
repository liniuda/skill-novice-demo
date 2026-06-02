/**
 * 发布运维模块
 * 职责：Skill 生命周期管理 —— 发布/下线操作的唯一入口
 */
import {
  getSkills, getSkillById, publishSkill, unpublishSkill,
  STATUS_LABELS
} from '../data/skills.js';
import { getBindingsForSkill } from '../data/mcp.js';
import { showToast, escHtml } from '../utils.js';
import { runConflictGate } from './engines.js';

const ACTIVITY_LOG = [
  { action: '发布', target: '物流运输 v2.1.0',     time: '10分钟前', type: 'publish' },
  { action: '下线', target: '半托管 v0.4.0',       time: '2小时前',  type: 'unpublish' },
  { action: '发布', target: '信保订单 v2.2.0',     time: '昨天',     type: 'publish' },
  { action: '发布', target: '退款售后 v1.9.0',     time: '3天前',    type: 'publish' },
  { action: '下线', target: '店铺运营 v0.7.0',     time: '上周',     type: 'unpublish' },
  { action: '发布', target: '知识检索 v1.2.0',     time: '上周',     type: 'publish' },
];

/* ── 主渲染 ── */
export function renderOps() {
  const el = document.getElementById('sec-ops');
  if (!el) return;

  const skills    = getSkills();
  const published = skills.filter(s => s.status === 'published');
  const draft     = skills.filter(s => s.status === 'draft');
  const mcpBound  = skills.filter(s => getBindingsForSkill(s.id).length > 0);
  const publishRate = skills.length ? Math.round(published.length / skills.length * 100) : 0;

  const rows = skills.map(s => {
    const bindings  = getBindingsForSkill(s.id);
    const isDraft   = s.status === 'draft';
    const badgeClass = isDraft ? 'badge-neutral' : 'badge-success';
    const label     = STATUS_LABELS[s.status] || s.status;
    const pubDate   = s.publishedAt
      ? new Date(s.publishedAt).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
      : '—';

    return `
      <tr>
        <td>
          <div class="skill-identity">
            <div class="skill-identity-icon">${s.icon || '?'}</div>
            <div>
              <div class="skill-identity-name">${escHtml(s.name)}</div>
              <div class="skill-identity-owner">${escHtml(s.owner || '—')}</div>
            </div>
          </div>
        </td>
        <td>
          <span class="badge ${badgeClass}">
            <span class="badge-dot"></span>${label}
          </span>
        </td>
        <td style="color:var(--text-secondary);font-size:var(--font-size-sm)">${escHtml(s.version || '—')}</td>
        <td style="font-size:var(--font-size-sm)">
          ${bindings.length
            ? `<span style="font-weight:600;color:var(--accent)">${bindings.length}</span>`
            : `<span style="color:var(--text-tertiary)">—</span>`}
        </td>
        <td style="font-size:var(--font-size-sm);color:var(--text-secondary)">${pubDate}</td>
        <td>
          ${isDraft
            ? `<button class="btn btn-sm btn-primary" data-publish="${s.id}">发布</button>`
            : `<button class="btn btn-sm btn-ghost" data-unpublish="${s.id}">下线</button>`}
        </td>
      </tr>`;
  }).join('');

  const activityItems = ACTIVITY_LOG.map(a => {
    const dotColor = a.type === 'publish' ? 'var(--success)' : 'var(--text-tertiary)';
    return `
      <div class="activity-item">
        <div class="activity-dot" style="background:${dotColor}"></div>
        <div class="activity-content">
          <div class="activity-text"><strong>${a.action}</strong> ${escHtml(a.target)}</div>
          <div class="activity-time">${a.time}</div>
        </div>
      </div>`;
  }).join('');

  el.innerHTML = `
    <div class="page-header">
      <div>
        <h1 class="page-title">发布管理</h1>
        <p class="page-subtitle">控制 Skill 的上线与下线，追踪发布历史。编辑和配置请前往
          <button style="background:none;border:none;color:var(--accent);cursor:pointer;font-size:inherit;padding:0"
            onclick="window.sscSwitchTab('skill')">Skill 配置</button>
        </p>
      </div>
    </div>

    <div class="stat-bar">
      <div class="stat-card">
        <div class="stat-value">${skills.length}</div>
        <div class="stat-label">全部</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${published.length}</div>
        <div class="stat-label">已发布</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${draft.length}</div>
        <div class="stat-label">草稿</div>
      </div>
      <div class="stat-card">
        <div class="stat-value">${publishRate}%</div>
        <div class="stat-label">发布率</div>
      </div>
    </div>

    <div class="ops-layout">
      <!-- 左侧表格 -->
      <div>
        <div class="ops-panel-title">Skill 列表</div>
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Skill</th>
                <th>状态</th>
                <th>版本</th>
                <th>MCP 绑定</th>
                <th>发布时间</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
        </div>
      </div>

      <!-- 右侧面板 -->
      <div>
        <div class="right-panel">
          <div class="panel-section">
            <div class="panel-section-title">变更历史</div>
            <div class="activity-feed">${activityItems}</div>
          </div>
          <div class="panel-section">
            <div class="panel-section-title">统计</div>
            <div class="kv-row">
              <span class="kv-key">已绑定 MCP</span>
              <span class="kv-val">${mcpBound.length} / ${skills.length}</span>
            </div>
            <div class="kv-row">
              <span class="kv-key">高优先级</span>
              <span class="kv-val">${skills.filter(s => s.priority === 'high' || s.priority === 'critical').length} 个</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  `;

  // 事件：发布（接入引擎② 冲突检测门禁）
  el.querySelectorAll('[data-publish]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.publish;
      const skill = getSkillById(id);
      if (!skill) return;
      runConflictGate(id, () => {
        publishSkill(id);
        showToast(`${skill.name} 已发布`);
        ACTIVITY_LOG.unshift({ action: '发布', target: `${skill.name} ${skill.version}`, time: '刚刚', type: 'publish' });
        renderOps();
      });
    });
  });

  // 事件：下线
  el.querySelectorAll('[data-unpublish]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id    = btn.dataset.unpublish;
      const skill = getSkillById(id);
      if (!skill) return;
      unpublishSkill(id);
      showToast(`${skill.name} 已下线`);
      ACTIVITY_LOG.unshift({ action: '下线', target: `${skill.name} ${skill.version}`, time: '刚刚', type: 'unpublish' });
      renderOps();
    });
  });
}
