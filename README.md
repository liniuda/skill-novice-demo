# 智服工坊 X · CCO Skill Studio · GUI Next

> 基于 [skill-novice-demo](../skill-novice-demo) 的**前沿 GUI 进化版**，把 2025-2026 年最热的 8 大交互范式集成到 Skill 配置/运营平台。

## 🎨 已落地的前沿范式

| 模块 | 风格 | 看点 |
|---|---|---|
| 🏠 首页 | **Bento Box 异形九宫格** | 9 个不规则尺寸卡（2x2 / 2x1 / 1x2 / 1x1）+ AI 流式建议条 + sparkline + 渐变描边 |
| ⌘K 全局 | **Command Palette** | `⌘K` / `Ctrl+K` 全站唤起，索引：6 空间 + 11 Skill + 7 知识类目 + 8 导航 + 5 AI 提问；↑↓ 键盘导航；fuzzy 匹配 |
| 🤖 AI 浮球 | **Glassmorphism 2.0 + Stream UI** | 磨砂玻璃面板 + 22ms/字 流式回复 + 光标闪烁 |
| 🧙 Wizard | **Inline Ghost Text** | 输入触发关键词补全（退款/物流/拒付/信保/补偿/EPR），`Tab` 接受 / `Esc` 拒绝 |
| 🎭 Persona | **Spatial 3D 卡片** | hover 微 3D 倾斜（rotateY -3° + rotateX 2° + translateZ 10px）+ 紫色描边发光 |
| 🔌 MCP | **Cyber-Brutalism** | 黑底荧光黄边 + 偏移阴影 + 等宽字体接口名 |
| 📚 知识库 | **Glass RAG 浮层** | RAG 测试器磨砂玻璃化 + 类目卡渐变描边 |
| 🌌 全站 | **暗色主题 + Glass 顶栏** | 三色 radial 背光（#3B82F6 / #EC4899 / #8B5CF6）+ sticky blur 顶栏 |

## 🚀 本地运行

```bash
cd skill-studio-x
python3 -m http.server 8767
# 打开 http://127.0.0.1:8767
```

## ⌨️ 全局快捷键

| 快捷键 | 作用 |
|---|---|
| `⌘ K` / `Ctrl K` | 唤起命令面板 |
| `↑` / `↓` | 命令面板内导航 |
| `↵` | 执行选中项 |
| `Esc` | 关闭面板 / 拒绝 Ghost 补全 |
| `Tab` | 接受 Ghost Text 补全（在 Wizard 例子输入框） |

## 📁 项目结构

```
skill-studio-x/
├── index.html              # 入口（暗色主题 + ⌘K trigger）
├── css/
│   ├── main.css            # 继承自 novice 版的基础样式
│   └── x-theme.css         # X 主题层：暗色变量 / Bento / ⌘K / Glass / 3D / Brutal
├── js/
│   ├── app.js              # 入口（挂载 cmdk 模块）
│   ├── modules/
│   │   ├── home.js         # ⭐ 重写为 Bento 九宫格
│   │   ├── cmdk.js         # ⭐ 全新：⌘K 命令面板
│   │   ├── ai-helper.js    # 改造：流式回复
│   │   ├── wizard.js       # 改造：Ghost Text 补全
│   │   └── ...             # persona / mcp / knowledge / market 等沿用
```

## 🔮 后续可加（P2）

- [ ] Analytics 改 Bento + Editorial 大字号
- [ ] Ops 流程图改 Scroll-Driven 入场
- [ ] 浅色主题切换器（顶栏加日月图标）

---

构建于 2026 · CCO Skill Studio
