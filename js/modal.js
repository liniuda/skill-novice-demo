/**
 * Modal 工具
 * 独立模块，避免 app.js ↔ skill-config/skill-detail 的循环依赖
 */
export function showModal(html) {
  const inner = document.getElementById('appModalInner');
  if (!inner) return;
  inner.innerHTML = html;
  document.getElementById('appModal').classList.add('active');
}

export function closeModal() {
  document.getElementById('appModal').classList.remove('active');
  const inner = document.getElementById('appModalInner');
  if (inner) inner.innerHTML = '';
}

/* ── 挂载到 window，供 onclick 内联调用 ── */
window.closeModal = closeModal;
window.showModal  = showModal;
