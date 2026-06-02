/**
 * 黑话翻译 — 自启动 hover 气泡
 *
 * 用法：在任意元素加 data-glossary="key"
 * 鼠标 hover 自动出现解释气泡，点击会进一步展开详情 modal
 */
import { showModal, closeModal } from '../modal.js';

const DICT = {
  skill: {
    title: 'Skill（AI 技能包）',
    short: 'AI 技能包：一个 Skill = 一种业务场景的处理能力',
    long: '<p><strong>Skill 是什么？</strong>简单说，一个 Skill 就是「让 AI 学会处理某一类客服问题」的能力包。</p><p>比如「跨境退款 Skill」让 AI 学会怎么处理退款请求；「物流时效 Skill」让 AI 学会查物流单和补偿规则。</p><p><strong>类比：</strong>Skill 就像员工的"岗位说明书"，写清楚遇到什么情况该怎么做。</p>',
  },
  agent: {
    title: 'Agent（AI 助理）',
    short: 'AI 助理：替你回复消息的那个虚拟员工。本平台共 3 个：商家小何 / 买家小蜜 / 卖家 Copilot',
    long: '<p><strong>Agent = 一个会说话、会查资料、会做决定的 AI 助理</strong>。</p><p>本平台有 3 个内置 Agent：</p><ul><li>🧑‍💼 <strong>商家小何</strong>：服务商家的 AI</li><li>👜 <strong>买家小蜜</strong>：服务买家的 AI</li><li>👨‍💻 <strong>卖家 Copilot</strong>：辅助小二的 AI</li></ul><p>每个 Agent 可以装多个 Skill。</p>',
  },
  mcp: {
    title: 'MCP 服务（外接工具）',
    short: '外接工具：让 AI 能查物流单、订单这类外部数据',
    long: '<p><strong>MCP = Model Context Protocol</strong>，简单说就是「让 AI 能用外部工具」的协议。</p><p>比如 AI 想知道一个订单的物流状态，就要调 MCP 里的「查物流接口」；想看用户付款金额，就调「订单接口」。</p><p>不用懂技术，<strong>把它当成 AI 的"工具箱"</strong>，里面装着各种数据查询工具。</p>',
  },
  intent: {
    title: '意图识别',
    short: '搞清楚用户在问什么。比如「我没收到货」 → 意图：物流问题',
    long: '<p>用户的话千变万化，但意图是有限的。「没收到货」「快递哪去了」「我的包裹呢」都属于<strong>同一个意图：物流问题</strong>。</p><p>意图识别就是给用户的话<strong>归类</strong>，归到哪个 Skill 就由那个 Skill 处理。</p>',
  },
  rule: {
    title: '规则',
    short: '一条 if-then 逻辑。比如：if 物流单已签收 then 不赔付',
    long: '<p>规则就是 <strong>「如果...就...」</strong>的逻辑：</p><p>例：「<strong>如果</strong>买家说没收到货 <strong>且</strong>物流签收时间<24小时 <strong>则</strong>引导查看签收照片」</p><p>本平台支持<strong>「✨ AI 起草」</strong>，用大白话描述场景，AI 自动帮你写规则，不用手敲。</p>',
  },
  resolve_rate: {
    title: '解决率',
    short: 'AI 没让用户转人工就把问题搞定的比例。越高越好。',
    long: '<p><strong>解决率 = AI 独立处理完的会话数 ÷ 总会话数</strong></p><p>越高 = AI 越能干 = 越省人力。一般：</p><ul><li>< 70%：AI 还不太能干，要继续优化</li><li>70~85%：及格</li><li>> 85%：很不错</li><li>> 90%：优秀</li></ul>',
  },
  call_rate: {
    title: '转人工率',
    short: 'AI 接不住、转给人工客服的比例。越低越好。',
    long: '<p>转人工率高，说明 AI 经常"举手投降"。原因可能：</p><ul><li>没配相关 Skill</li><li>规则太死，灵活性不够</li><li>知识库内容太少</li></ul><p>降转人工率最快的办法：在<strong>效果分析-场景归因</strong>看哪些场景未覆盖，然后用<strong>「✨ AI 起草」</strong>补 Skill。</p>',
  },
  persona: {
    title: '拟人化',
    short: 'AI 该说什么话的开关。比如语气是亲切还是正式、要不要带 emoji',
    long: '<p>拟人化中心控制 <strong>AI 的"性格"</strong>：</p><ul><li>语气：亲切 / 正式 / 专业</li><li>风格：要不要 emoji、回复长度</li><li>14 个细节干预点：开场白、致歉模板、收尾语...</li></ul><p>不会调？打开「<strong>一键应用推荐配置</strong>」即可。</p>',
  },
  attribution: {
    title: '归因分析',
    short: '搞清楚效果好/差是哪个 Skill、哪个场景的功劳/锅',
    long: '<p>归因 = <strong>给结果找原因</strong>。</p><p>整体解决率 87% 听起来不错，但拆开看可能：</p><ul><li>物流 Skill 解决率 95%（很棒）</li><li>退款 Skill 解决率 65%（拖后腿）</li></ul><p>归因引擎自动算好<strong>每个 Skill / 每个场景的贡献度</strong>，告诉你优先优化谁。</p>',
  },
  conflict: {
    title: '规则冲突',
    short: '两条规则在同样情况下要做相反的事，发布前必须解决',
    long: '<p>例：你新写的规则是<strong>「物流延迟 → 全额退款」</strong>，但已有规则是<strong>「物流延迟 → 退 50%」</strong>。</p><p>同一情况下指令矛盾，AI 不知道听谁的。冲突检测会在发布前<strong>自动拦截 + 给修复建议</strong>。</p>',
  },
  threshold: {
    title: '阈值',
    short: 'AI 多自信才执行某个动作。一般默认 0.7 就够用',
    long: '<p>AI 给每个判断打置信分（0~1）。<strong>阈值</strong>就是"几分以上才执行"。</p><p>阈值越高 = AI 越保守 = 转人工越多；阈值越低 = AI 越激进 = 错误率上升。</p><p><strong>新手建议：</strong>用默认 0.7，不用动。</p>',
  },
};

let _tip;
let _hovered;

function getTip() {
  if (_tip) return _tip;
  _tip = document.createElement('div');
  _tip.className = 'glossary-tip';
  document.body.appendChild(_tip);
  return _tip;
}

function showTip(target, key) {
  const item = DICT[key];
  if (!item) return;
  const tip = getTip();
  tip.innerHTML = `
    <div class="glossary-tip-title">${item.title}</div>
    <div class="glossary-tip-short">${item.short}</div>
    <div class="glossary-tip-cta">点击查看详细解释 →</div>
  `;
  const r = target.getBoundingClientRect();
  tip.style.left = Math.min(window.innerWidth - 320, r.left) + 'px';
  tip.style.top  = (r.bottom + 6) + 'px';
  tip.classList.add('show');
}

function hideTip() {
  const tip = getTip();
  tip.classList.remove('show');
}

function openDetail(key) {
  const item = DICT[key];
  if (!item) return;
  showModal(`
    <div class="glossary-modal">
      <h2>${item.title}</h2>
      <div class="glossary-modal-body">${item.long}</div>
      <div class="glossary-modal-foot">
        <button class="btn btn-primary" id="glClose">明白了</button>
      </div>
    </div>
  `);
  document.getElementById('glClose')?.addEventListener('click', closeModal);
}

// 全局事件代理
document.addEventListener('mouseover', (e) => {
  const target = e.target.closest('[data-glossary]');
  if (!target) return;
  if (target === _hovered) return;
  _hovered = target;
  showTip(target, target.dataset.glossary);
});
document.addEventListener('mouseout', (e) => {
  const target = e.target.closest('[data-glossary]');
  if (target && target === _hovered) {
    _hovered = null;
    hideTip();
  }
});
document.addEventListener('click', (e) => {
  const target = e.target.closest('[data-glossary]');
  if (!target) return;
  hideTip();
  openDetail(target.dataset.glossary);
});

// 暴露给 ai-helper 用
window.__GLOSSARY__ = DICT;
window.openGlossary = openDetail;
