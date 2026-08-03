# AnswerSearch

> **让散落在表格里的知识，随搜随得。**

**AnswerSearch** 是一个面向题库、问答库、知识库、FAQ、SOP 和普通 Excel 数据表的纯前端智能检索系统。

无需后端、无需数据库、无需账号体系。上传 Excel 或 CSV 后，即可在浏览器中完成智能解析、本地缓存和快速搜索。

<p align="center">
  <strong>Browser-First · Local Processing · Privacy by Design</strong>
</p>

<p align="center">
  <a href="https://github.com/liu-suria/AnswerSearch">GitHub 项目地址</a>
  ·
  <a href="https://github.com/liu-suria/AnswerSearch/issues">提交建议</a>
</p>

如果这个项目对你有帮助，欢迎前往 GitHub 点一个 **Star**：

**https://github.com/liu-suria/AnswerSearch**

## 为什么选择 AnswerSearch

### 纯前端实现

AnswerSearch 使用 HTML、CSS 和原生 JavaScript 构建，不依赖服务端程序。

不需要：

- Node.js
- Java / Python / PHP
- MySQL / Redis
- Docker
- 服务端 API
- 用户账号系统

只需部署静态文件即可运行，几乎没有运维成本。

### 隐私优先

Excel 和 CSV 文件默认在浏览器本地解析：

- 文件不会被项目主动上传到服务器
- 搜索索引在当前浏览器中建立
- 资料库使用 IndexedDB 本地缓存
- 不需要登录账号
- 不依赖云数据库
- 不同设备之间不会自动同步资料

这意味着在正常使用场景下，数据默认保留在用户自己的设备和浏览器中。

> 注意：任何软件都不适合承诺绝对的“零风险”。对于高度敏感资料，仍建议使用可信设备、可信浏览器环境，并避免安装来源不明的浏览器扩展。

### 无需固定 Excel 模板

AnswerSearch 不要求 Excel 必须按照指定格式整理。

它可以自动适配：

- 标准选择题题库
- 问答题题库
- 两列“问题 / 答案”表
- 单列知识清单
- FAQ
- 企业 SOP
- 产品参数表
- 客户资料表
- 任意多列表格
- 多工作表 Excel
- 无标准表头或陌生表头

系统会尽量保留所有非空字段，并将其加入检索范围。

## 核心功能

- 支持 `.xlsx`、`.xls`、`.csv`
- 支持同时管理多个资料库
- 自动读取 Excel 内全部工作表
- 智能判断表头和数据结构
- 支持单列、两列和任意多列表
- 自动识别选择题、问答题和知识条目
- 支持中文搜索
- 支持无声调拼音搜索
- 支持空格分隔的多关键词搜索
- 搜索结果实时高亮
- 只展示命中的内容
- 支持任意字段参与搜索
- 使用 IndexedDB 自动缓存资料库
- 刷新页面后无需重新上传
- 支持 `/` 快捷键快速聚焦搜索框
- 支持 PC 和手机端响应式布局
- 无后端、无数据库、无构建步骤

## 智能解析示例

### 标准题库

| 类型 | 题干 | 选项A | 选项B | 答案 | 解析 |
|---|---|---|---|---|---|
| 选择题 | 中国的首都是哪里？ | 北京 | 上海 | A | 北京是中国的首都。 |

存在选项时，系统会自动按选择题展示。

### 两列问答库

| 问题 | 答案 |
|---|---|
| EdgeOne Pages 是什么？ | 一个适合部署静态站点的边缘开发平台。 |

系统会自动将第一列作为标题或问题，第二列作为正文或答案。

### 单列知识库

| 知识内容 |
|---|
| IndexedDB 是浏览器提供的本地结构化存储能力。 |

每一个非空单元格都会作为一条可检索内容。

### 任意多列表格

普通 Excel 中的每一列都会尽量保留，并以“字段名：字段值”的方式展示。所有非空字段均可参与搜索。

## 搜索方式

### 中文搜索

```text
北京
```

### 拼音搜索

```text
beijing
```

### 多关键词搜索

多个关键词使用空格分隔，只有全部关键词均命中的记录才会展示。

```text
北京 首都
```

### 快捷键

在页面中按 `/`，可以快速聚焦搜索框。

## 数据存储说明

上传后的资料库会保存在当前浏览器的 IndexedDB 中：

- 刷新页面后仍然保留
- 下次打开无需重新上传
- 不同浏览器之间不会共享
- 不同设备之间不会共享
- 清除站点数据后，本地资料库会被删除

建议不要在公共电脑上长期保存敏感资料。

## 技术栈

- HTML5
- CSS3
- Vanilla JavaScript
- IndexedDB
- SheetJS
- pinyin-pro

项目没有使用 React、Vue、Node.js 或构建工具。

## 本地运行

项目是纯静态站点，可以直接打开 `index.html`。

也可以使用任意静态服务器：

```bash
python3 -m http.server 8080
```

然后访问：

```text
http://localhost:8080
```

## 部署到 EdgeOne Pages

1. Fork 或下载本项目。
2. 在 EdgeOne Pages 创建新项目。
3. 关联 GitHub 仓库。
4. 框架选择“其他”或“静态站点”。
5. 构建命令留空。
6. 根目录保持默认。
7. 输出目录填写 `/` 或使用项目根目录。
8. 保存并部署。

无需配置环境变量，也不需要服务端函数。

同样支持部署到：

- Cloudflare Pages
- GitHub Pages
- Netlify
- Vercel
- Nginx
- Apache
- 任意静态文件服务器

## 项目结构

```text
AnswerSearch/
├── index.html          # 页面结构与资源引用
├── styles.css          # 基础页面和响应式样式
├── smart.css           # 智能字段及知识条目展示样式
├── app.js              # 解析、缓存、搜索与交互逻辑
├── favicon.svg         # 网站图标
├── 题库导入模板.csv     # 示例模板
└── README.md           # 项目介绍
```

## 适用场景

- 考试题库与答案检索
- 企业内部知识库
- 客服 FAQ
- 产品参数与资料表
- 规章制度与操作手册
- 培训资料与学习笔记
- 医疗、法律等内部资料整理
- 个人 Excel 数据检索
- 无需后端的临时资料查询工具

## 浏览器兼容性

建议使用较新版本的：

- Chrome
- Edge
- Safari
- Firefox
- iOS Safari
- Android Chrome

浏览器需要支持 IndexedDB。

## 开源与反馈

项目地址：

**https://github.com/liu-suria/AnswerSearch**

欢迎：

- 提交 Issue
- 提交功能建议
- 提交 Pull Request
- 分享使用场景
- 点一个 Star 支持项目

## License

建议在正式公开推广前，为项目补充明确的开源许可证，例如 MIT License。
