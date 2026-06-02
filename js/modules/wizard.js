/**
 * Skill 配置 · 小白模式 5 步向导
 *
 * 设计：把"配 12 个字段"换成"回答 5 个问题"
 *  Step 1 · 你想让 AI 处理什么场景？（输入 → 引擎③ 场景识别）
 *  Step 2 · 客服一般怎么回？（给 1~3 个例子 → 引擎① NL→Rule 反推规则）
 *  Step 3 · AI 不确定时回什么？（3 个推荐话术选）
 *  Step 4 · 自动赔付？金额上限？
 *  Step 5 · 预览 + 试一试 + 发布
 */
import { showToast, escHtml } from '../utils.js';

let _step = 1;
const _data = {
  scene: '',
  examples: ['', '', ''],
  fallback: '',
  autoPay: 'no',
  payLimit: 50,
  skillName: '',
};

const STEPS = [
  { n: 1, title: '你想让 AI 处理什么场景？', icon: '🎯' },
  { n: 2, title: '客服一般怎么回？给我看 1~3 个例子', icon: '💬' },
  { n: 3, title: 'AI 不确定时，回什么？', icon: '🤔' },
  { n: 4, title: '要不要自动赔付？', icon: '💰' },
  { n: 5, title: '预览 + 上线', icon: '🚀' },
];

const SCENE_PRESETS = [
  '买家说没收到货 / 物流问题',
  '买家要求退款 / 售后纠纷',
  '买家咨询商品信息 / 售前',
  '买家投诉商品质量 / 品质问题',
  '买家催发货 / 时效投诉',
];

const FALLBACK_PRESETS = [
  '抱歉，这个问题我需要请同事帮您处理，马上为您转接 ☎',
  '您好，目前需要进一步核实情况，请稍等，我会尽快回复您',
  '不好意思暂时无法处理，我帮您升级到人工客服 🙇',
];

export function resetWizard() {
  _step = 1;
  _data.scene = '';
  _data.examples = ['', '', ''];
  _data.fallback = '';
  _data.autoPay = 'no';
  _data.payLimit = 50;
  _data.skillName = '';
}

export function renderWizard(container) {
  if (!container) return;

  const stepHtml = STEPS.map(s => `
    <div class="wiz-step ${s.n === _step ? 'active' : ''} ${s.n < _step ? 'done' : ''}">
      <div class="wiz-step-num">${s.n < _step ? '✓' : s.n}</div>
      <div class="wiz-step-label">${escHtml(s.title.split(' ').slice(0, 6).join(' '))}</div>
    </div>
  `).join('<div class="wiz-step-line"></div>');

  container.innerHTML = `
    <div class="wiz-shell">
      <div class="wiz-stepper">${stepHtml}</div>
      <div class="wiz-card">${renderStep(_step)}</div>
    </div>
  `;
  bind(container);
}

function renderStep(n) {
  const s = STEPS.find(x => x.n === n);
  const body = {
    1: stepScene(),
    2: stepExamples(),
    3: stepFallback(),
    4: stepAutoPay(),
    5: stepPreview(),
  }[n];

  return `
    <div class="wiz-head">
      <div class="wiz-head-icon">${s.icon}</div>
      <div>
        <div class="wiz-head-num">Step ${n} / 5</div>
        <div class="wiz-head-title">${escHtml(s.title)}</div>
      </div>
    </div>
    <div class="wiz-body">${body}</div>
    <div class="wiz-foot">
      ${n > 1 ? '<button class="btn btn-ghost" data-wiz="back">← 上一步</button>' : '<span></span>'}
      ${n < 5
        ? `<button class="btn btn-primary" data-wiz="next">下一步 →</button>`
        : `<button class="btn btn-primary" data-wiz="publish">🚀 上线这个 Skill</button>`}
    </div>
  `;
}

/* ─── Step 1 · 场景 ─── */
function stepScene() {
  return `
    <p class="wiz-desc">用大白话告诉我你想让 AI 处理哪一类问题，写一句话就行。</p>
    <textarea class="wiz-textarea" id="wizScene" rows="3" placeholder="例如：买家说没收到货，要我们查物流和补偿">${escHtml(_data.scene)}</textarea>

    <div class="wiz-presets-title">不会写？点一个套用：</div>
    <div class="wiz-presets">
      ${SCENE_PRESETS.map(p => `<button class="wiz-preset-chip" data-preset="${escHtml(p)}">${escHtml(p)}</button>`).join('')}
    </div>

    ${_data.scene ? `
      <div class="wiz-ai-hint">
        <div class="wiz-ai-icon">🤖</div>
        <div>
          <strong>AI 帮你识别到了：</strong> ${guessSceneTag(_data.scene)}
          <div class="wiz-ai-sub">下一步我会根据这个场景帮你生成处理规则。</div>
        </div>
      </div>
    ` : ''}
  `;
}

function guessSceneTag(text) {
  const t = text;
  if (/没收到|物流|快递|没到/.test(t)) return '<span class="eng-pill">物流问题</span>';
  if (/退款|退货|售后/.test(t)) return '<span class="eng-pill">退款售后</span>';
  if (/质量|破损|坏了/.test(t)) return '<span class="eng-pill">品质问题</span>';
  if (/咨询|问问|想知道/.test(t)) return '<span class="eng-pill">售前咨询</span>';
  return '<span class="eng-pill">通用咨询</span>';
}

/* ─── Step 2 · 例子（AI 反推规则） ─── */
function stepExamples() {
  return `
    <p class="wiz-desc">把你客服平时怎么回的，给我看 1~3 个真实例子。AI 会自动总结出规则，不用你手写。</p>
    ${[0, 1, 2].map(i => `
      <div class="wiz-example-row">
        <div class="wiz-example-num">例 ${i + 1}</div>
        <textarea class="wiz-textarea" data-eg-index="${i}" rows="2" placeholder="${i === 0 ? '必填，例如：先安抚情绪，再查物流单号，超 48 小时没动静就主动补偿' : '可选'}">${escHtml(_data.examples[i])}</textarea>
      </div>
    `).join('')}

    ${_data.examples[0] ? `
      <div class="wiz-ai-hint">
        <div class="wiz-ai-icon">✨</div>
        <div>
          <strong>AI 已根据你的例子，反向生成 3 条规则：</strong>
          <ul class="wiz-rule-list">
            <li><strong>规则 1：</strong>开场先用 1 句话安抚买家情绪</li>
            <li><strong>规则 2：</strong>主动查物流单状态，给买家明确时间预期</li>
            <li><strong>规则 3：</strong>超过约定时效自动触发补偿提案（金额由下一步配置）</li>
          </ul>
          <div class="wiz-ai-sub">上线后还能在「Skill 详情」里手动微调。</div>
        </div>
      </div>
    ` : ''}
  `;
}

/* ─── Step 3 · 兜底话术 ─── */
function stepFallback() {
  return `
    <p class="wiz-desc">遇到 AI 拿不准的情况，应该回什么？三选一即可，也可以自己改。</p>
    <div class="wiz-fallback-list">
      ${FALLBACK_PRESETS.map(p => `
        <label class="wiz-fallback-item ${_data.fallback === p ? 'selected' : ''}">
          <input type="radio" name="wizFb" value="${escHtml(p)}" ${_data.fallback === p ? 'checked' : ''}>
          <span>${escHtml(p)}</span>
        </label>
      `).join('')}
    </div>
    <div class="wiz-or">— 或自己写 —</div>
    <textarea class="wiz-textarea" id="wizFbCustom" rows="2" placeholder="（可选）写一句你自己的兜底话术">${_data.fallback && !FALLBACK_PRESETS.includes(_data.fallback) ? escHtml(_data.fallback) : ''}</textarea>
  `;
}

/* ─── Step 4 · 自动赔付 ─── */
function stepAutoPay() {
  return `
    <p class="wiz-desc">AI 是否可以主动给买家补偿？开通后能大幅降低转人工。</p>
    <div class="wiz-radio-group">
      <label class="wiz-radio-card ${_data.autoPay === 'no' ? 'selected' : ''}">
        <input type="radio" name="autoPay" value="no" ${_data.autoPay === 'no' ? 'checked' : ''}>
        <div>
          <div class="wiz-radio-title">❌ 不自动赔</div>
          <div class="wiz-radio-desc">AI 只引导话术，需要人工最终拍板</div>
        </div>
      </label>
      <label class="wiz-radio-card ${_data.autoPay === 'yes' ? 'selected' : ''}">
        <input type="radio" name="autoPay" value="yes" ${_data.autoPay === 'yes' ? 'checked' : ''}>
        <div>
          <div class="wiz-radio-title">✅ 允许自动赔（推荐）</div>
          <div class="wiz-radio-desc">AI 在金额上限内自动决策，超额转人工</div>
        </div>
      </label>
    </div>

    ${_data.autoPay === 'yes' ? `
      <div class="wiz-pay-limit">
        <label>单次赔付上限：</label>
        <input type="number" id="wizPayLimit" value="${_data.payLimit}" min="0" max="500" />
        <span>元</span>
        <div class="wiz-ai-sub">建议：50 元起步，跑顺了再调高</div>
      </div>
    ` : ''}
  `;
}

/* ─── Step 5 · 预览 + 发布 ─── */
function stepPreview() {
  const name = _data.skillName || autoName();
  return `
    <p class="wiz-desc">最后一步！预览一下，没问题就上线。</p>

    <div class="wiz-preview-card">
      <div class="wiz-preview-row">
        <span class="wiz-preview-key">名字：</span>
        <input type="text" id="wizSkillName" value="${escHtml(name)}" class="wiz-name-input">
      </div>
      <div class="wiz-preview-row">
        <span class="wiz-preview-key">场景：</span>
        <span>${escHtml(_data.scene || '（未填）')}</span>
      </div>
      <div class="wiz-preview-row">
        <span class="wiz-preview-key">规则数：</span>
        <span>3 条（AI 自动生成）</span>
      </div>
      <div class="wiz-preview-row">
        <span class="wiz-preview-key">兜底话术：</span>
        <span>${escHtml(_data.fallback || '（未选）')}</span>
      </div>
      <div class="wiz-preview-row">
        <span class="wiz-preview-key">自动赔付：</span>
        <span>${_data.autoPay === 'yes' ? `✅ 是，上限 ${_data.payLimit} 元` : '❌ 否'}</span>
      </div>
    </div>

    <div class="wiz-sim">
      <div class="wiz-sim-title">💬 模拟试一试</div>
      <div class="wiz-sim-msg wiz-sim-msg-user">买家：我下单一周了还没收到货</div>
      <div class="wiz-sim-msg wiz-sim-msg-ai">
        <strong>AI：</strong>非常理解您着急的心情 🙇 我马上帮您查物流。订单号 #${Math.floor(Math.random()*900000+100000)} 显示物流正在派送中，预计今天下午到达。${_data.autoPay === 'yes' ? `若今晚仍未送达，我们将主动赔付 ${Math.min(20, _data.payLimit)} 元运费补偿。` : '若有问题请随时联系我。'}
      </div>
    </div>
  `;
}

function autoName() {
  if (/没收到|物流/.test(_data.scene)) return '物流时效 Skill';
  if (/退款|退货/.test(_data.scene))   return '退款售后 Skill';
  if (/质量|破损/.test(_data.scene))   return '商品质量 Skill';
  return '我的新 Skill';
}

/* ─── 事件 ─── */
function bind(container) {
  // 场景输入
  container.querySelector('#wizScene')?.addEventListener('input', (e) => {
    _data.scene = e.target.value;
  });
  container.querySelectorAll('[data-preset]').forEach(b => {
    b.addEventListener('click', () => {
      _data.scene = b.dataset.preset;
      renderWizard(container)
    });
  });

  // 例子
  container.querySelectorAll('[data-eg-index]').forEach(t => {
    t.addEventListener('input', (e) => {
      _data.examples[+t.dataset.egIndex] = e.target.value;
      _xUpdateGhost(t);
    });
    t.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && t.dataset.xGhost) {
        e.preventDefault();
        t.value = t.value + t.dataset.xGhost;
        _data.examples[+t.dataset.egIndex] = t.value;
        delete t.dataset.xGhost;
        const tip = t.parentElement?.querySelector('.x-ghost-tip');
        if (tip) tip.remove();
      } else if (e.key === 'Escape' && t.dataset.xGhost) {
        e.preventDefault();
        delete t.dataset.xGhost;
        const tip = t.parentElement?.querySelector('.x-ghost-tip');
        if (tip) tip.remove();
      }
    });
    t.addEventListener('blur', () => {
      // 失焦后重渲染，触发 AI 反推规则提示
      if (_data.examples[0] && !container.querySelector('.wiz-rule-list')) {
        renderWizard(container)
      }
    });
    // 初始化包裹
    if (t.parentElement && !t.parentElement.classList.contains('x-ghost-wrap')) {
      t.parentElement.style.position = 'relative';
    }
  });

  // 兜底
  container.querySelectorAll('input[name="wizFb"]').forEach(r => {
    r.addEventListener('change', (e) => {
      _data.fallback = e.target.value;
      renderWizard(container)
    });
  });
  container.querySelector('#wizFbCustom')?.addEventListener('input', (e) => {
    if (e.target.value) _data.fallback = e.target.value;
  });

  // 自动赔付
  container.querySelectorAll('input[name="autoPay"]').forEach(r => {
    r.addEventListener('change', (e) => {
      _data.autoPay = e.target.value;
      renderWizard(container)
    });
  });
  container.querySelector('#wizPayLimit')?.addEventListener('input', (e) => {
    _data.payLimit = +e.target.value || 0;
  });

  // 名字
  container.querySelector('#wizSkillName')?.addEventListener('input', (e) => {
    _data.skillName = e.target.value;
  });

  // 导航
  container.querySelector('[data-wiz="back"]')?.addEventListener('click', () => {
    _step--;
    renderWizard(container)
  });
  container.querySelector('[data-wiz="next"]')?.addEventListener('click', () => {
    if (!validateStep(_step)) return;
    _step++;
    renderWizard(container)
  });
  container.querySelector('[data-wiz="publish"]')?.addEventListener('click', () => {
    showToast('🎉 已上线：' + (_data.skillName || autoName()));
    if (window.completeQuest) {
      window.completeQuest('q-first-skill');
      window.completeQuest('q-publish');
    }
    // 回到首页
    setTimeout(() => {
      resetWizard();
      window.sscSwitchTab && window.sscSwitchTab('home');
    }, 800);
  });
}

function validateStep(n) {
  if (n === 1 && !_data.scene.trim()) {
    showToast('先填一下场景描述吧', 'warning');
    return false;
  }
  if (n === 2 && !_data.examples[0].trim()) {
    showToast('至少给一个客服回复的例子', 'warning');
    return false;
  }
  if (n === 3 && !_data.fallback.trim()) {
    showToast('选一个或写一句兜底话术', 'warning');
    return false;
  }
  return true;
}

/* ============== X · Ghost Text 补全 ============== */
const X_GHOST_DICT = [
  { trigger: '退款',     suggest: '：先查订单状态和支付方式，原路退款会在 7-15 个工作日到账' },
  { trigger: '物流',     suggest: '：查跟踪号主动同步状态，超过约定时效主动告知买家并提供补偿方案' },
  { trigger: '不满意',   suggest: '：先共情安抚「带给您不好的体验非常抱歉」，再查原因给出具体解决方案' },
  { trigger: '拒付',     suggest: '：按「订单、物流、沟通、交付」四个维度举证，提交资料会提高胜诉率' },
  { trigger: '信保',     suggest: '纠纷：先二次确认买家诉求，再按合同条款判断责任归属，超 14 天未反馈可以仲裁' },
  { trigger: '补偿',     suggest: '：优先提供优惠券/部分退款「软补偿」，调动买家保留意愿' },
  { trigger: '审核',     suggest: '：48 小时内完成，进度会同步到订单详情页，如果需补资料会提前提醒' },
  { trigger: 'EPR',     suggest: ' 合规：需准备 5 项材料（当地税号、生产商资质、授权代表、产品分类、销售平台）' },
];

function _xMatchGhost(text) {
  if (!text) return null;
  // 取最后一个匹配的触发词（以避免领头匹配错）
  for (const item of X_GHOST_DICT) {
    if (text.endsWith(item.trigger)) return item.suggest;
  }
  return null;
}

function _xUpdateGhost(textarea) {
  if (!textarea || !textarea.parentElement) return;
  const wrap = textarea.parentElement;
  let tip = wrap.querySelector('.x-ghost-tip');
  const suggest = _xMatchGhost(textarea.value);
  if (!suggest) {
    delete textarea.dataset.xGhost;
    if (tip) tip.remove();
    return;
  }
  textarea.dataset.xGhost = suggest;
  if (!tip) {
    tip = document.createElement('div');
    tip.className = 'x-ghost-tip';
    wrap.appendChild(tip);
  }
  // 只展示前 28 字
  const preview = suggest.length > 28 ? suggest.slice(0, 28) + '…' : suggest;
  tip.innerHTML = `✨ AI 补全：<span style="color:#A3A8B5">${preview}</span> · <kbd style="padding:0 4px;background:rgba(139,92,246,.25);border-radius:3px;color:#fff">Tab</kbd> 接受`;
}

