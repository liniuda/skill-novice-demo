/**
 * 运营成长地图 — UI 层
 *
 * 自启动模块：在 sidebar-footer 之前注入「成长地图卡」
 * 点击展开 modal 显示完整任务清单
 */
import { getGrowth, getQuests, completeQuest } from '../data/growth.js';
import { showModal, closeModal } from '../modal.js';
import { escHtml } from '../utils.js';

function inject() {
  const footer = document.querySelector('.sidebar-footer');
  if (!footer || document.getElementById('growthCard')) return;

  const card = document.createElement('div');
  card.id = 'growthCard';
  card.className = 'growth-card';
  card.innerHTML = render();
  footer.parentNode.insertBefore(card, footer);

  card.addEventListener('click', openModal);
}

function render() {
  const g = getGrowth();
  const pct = (g.points / g.nextPoints * 100).toFixed(0);
  return `
    <div class="growth-card-head">
      <span class="growth-card-icon">🎓</span>
      <span class="growth-card-level">${escHtml(g.levelLabel)}</span>
    </div>
    <div class="growth-card-bar"><div class="growth-card-fill" style="width:${pct}%"></div></div>
    <div class="growth-card-tip">${escHtml(g.tip)}</div>
  `;
}

function refresh() {
  const card = document.getElementById('growthCard');
  if (card) card.innerHTML = render();
}

function openModal() {
  const g = getGrowth();
  const quests = getQuests();
  const html = `
    <div class="growth-modal">
      <div class="growth-modal-head">
        <h2>🎓 你的运营成长地图</h2>
        <div class="growth-modal-stat">
          <strong>${escHtml(g.levelLabel)}</strong>
          <span>${g.points} / ${g.nextPoints} 经验</span>
        </div>
        <div class="growth-modal-bar"><div class="growth-modal-fill" style="width:${(g.points / g.nextPoints * 100).toFixed(0)}%"></div></div>
      </div>
      <div class="growth-quest-list">
        ${quests.map(q => `
          <div class="growth-quest-item${q.done ? ' done' : ''}">
            <div class="growth-quest-check">${q.done ? '✅' : '⬜'}</div>
            <div class="growth-quest-info">
              <div class="growth-quest-label">${escHtml(q.label)}</div>
              <div class="growth-quest-hint">${escHtml(q.hint)}</div>
            </div>
            <div class="growth-quest-pts">+${q.points}</div>
          </div>
        `).join('')}
      </div>
      <div class="growth-modal-foot">
        <button class="btn btn-ghost" id="growthReset">重置进度</button>
        <button class="btn btn-primary" id="growthClose">继续加油</button>
      </div>
    </div>
  `;
  showModal(html);
  document.getElementById('growthClose')?.addEventListener('click', closeModal);
  document.getElementById('growthReset')?.addEventListener('click', () => {
    localStorage.removeItem('novice_growth');
    closeModal();
    refresh();
  });
}

// 监听任务完成事件，自动刷新卡 + 弹 toast
window.addEventListener('growth:updated', (e) => {
  refresh();
  const { points } = e.detail;
  // 简易 toast
  const t = document.getElementById('toast');
  if (t) {
    t.textContent = `🎉 +${points} 经验`;
    t.className = 'toast show success';
    setTimeout(() => { t.className = 'toast'; }, 2400);
  }
});

// 暴露给业务模块调用
window.completeQuest = completeQuest;

// DOM 就绪后注入
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', inject);
} else {
  // sidebar 是动态构建的，多试几次
  setTimeout(inject, 100);
  setTimeout(inject, 500);
  setTimeout(inject, 1500);
}
