# 校内乒乓球积分赛

一个可直接部署到 GitHub Pages 的静态网站，用来记录校内乒乓球比赛、自动计算积分、展示排行榜与球员详情，并允许仓库协作者在前端直接追加比赛数据。

## 功能概览

- 首页积分榜：按积分排序，支持姓名实时搜索，桌面端表格、移动端卡片。
- 球员详情页：积分变化折线图、最近 10 场、对手交手记录。
- 比赛记录页：按时间倒序显示，支持按球员筛选和分页加载更多。
- 管理功能：GitHub 登录后检查协作者权限，协作者可提交比赛并更新 `data/matches.json`。
- 纯静态部署：无构建依赖，直接使用 GitHub Pages 发布。

## 项目结构

```text
.
├── .nojekyll
├── .github/workflows/deploy.yml
├── app
│   ├── config.js
│   ├── data.js
│   ├── github.js
│   ├── main.js
│   ├── rating.js
│   └── utils.js
├── data
│   ├── matches.json
│   └── players.json
├── oauth
│   └── cloudflare-worker.js
├── index.html
├── README.md
└── styles.css
```

## 数据文件

### `data/players.json`

```json
[
  {
    "id": "zhangsan",
    "name": "张三",
    "initialRating": 1500,
    "joinDate": "2025-01-01"
  }
]
```

### `data/matches.json`

```json
[
  {
    "id": "m001",
    "date": "2025-03-15",
    "winnerId": "zhangsan",
    "loserId": "lisi",
    "score": "11:9,11:7,11:5",
    "winnerRatingChange": 16,
    "loserRatingChange": -16
  }
]
```

## 积分规则

- 初始积分：`1500`
- Elo 变体：

```text
expected = 1 / (1 + 10^((opponent_rating - player_rating) / 400))
new_rating = old_rating + K * (score - expected)
```

- 胜者 `score = 1`，负者 `score = 0`
- K 值：
  - 前 10 场：`64`
  - 第 11-30 场：`32`
  - 第 31 场起：`16`
  - 双方区间不同时，取更低的 K

## 本地运行

这是一个纯静态站点，不需要安装依赖。只要启动任意静态文件服务器即可。

### 方式一：Python

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`

### 方式二：VS Code Live Server

直接打开仓库根目录即可。

## 配置仓库信息

编辑 [app/config.js](/home/zibo/zibo/pingpang/app/config.js)：

```js
window.APP_CONFIG = {
  siteTitle: "校内乒乓球积分赛",
  repoOwner: "your-github-name",
  repoName: "your-repo-name",
  repoBranch: "main",
  basePath: "/your-repo-name",
  oauth: {
    clientId: "your_github_oauth_client_id",
    redirectPath: "/",
    proxyUrl: "https://your-oauth-proxy.example.workers.dev",
  },
};
```

### 字段说明

- `repoOwner`：GitHub 用户或组织名
- `repoName`：仓库名
- `repoBranch`：录入比赛时要提交到的分支，通常为 `main`
- `basePath`：如果是项目页，填写 `/<repoName>`；如果绑定了自定义域名，可留空
- `oauth.clientId`：GitHub OAuth App 的 Client ID
- `oauth.proxyUrl`：OAuth code 换 token 的代理地址

## GitHub OAuth 配置说明

纯静态 GitHub Pages 站点不能安全保存 `client_secret`，所以 OAuth 的 `code -> access_token` 交换必须通过一个独立的轻量代理完成。仓库里已提供 Cloudflare Worker 示例：[oauth/cloudflare-worker.js](/home/zibo/zibo/pingpang/oauth/cloudflare-worker.js)

### 1. 创建 GitHub OAuth App

进入 GitHub `Settings -> Developer settings -> OAuth Apps -> New OAuth App`

- Application name：任意，例如 `Campus PingPong`
- Homepage URL：
  - 项目页：`https://<owner>.github.io/<repo>/`
  - 自定义域名：填写你的正式域名
- Authorization callback URL：
  - 项目页：`https://<owner>.github.io/<repo>/`
  - 自定义域名：`https://your-domain/`

记录生成后的 `Client ID` 和 `Client Secret`

### 2. 部署 OAuth 代理

推荐 Cloudflare Workers。将 [oauth/cloudflare-worker.js](/home/zibo/zibo/pingpang/oauth/cloudflare-worker.js) 作为入口，并配置两个环境变量：

- `GITHUB_CLIENT_ID`
- `GITHUB_CLIENT_SECRET`

部署成功后，把 Worker 地址填入 `app/config.js` 的 `oauth.proxyUrl`

### 3. 作用域建议

前端授权链接默认请求：

- `public_repo`
- `read:user`

如果你的仓库是私有仓库，或协作者检查需要更高权限，请改为 `repo`

## 协作者录入流程

1. 用户点击右上角 `GitHub 登录`
2. GitHub 授权后回跳到站点
3. 前端把 `code` 发送给 OAuth 代理换取 token，并保存在 `sessionStorage`
4. 前端调用 GitHub API 获取用户资料
5. 前端调用 `GET /repos/{owner}/{repo}/collaborators/{username}` 检查是否为协作者
6. 若是协作者，首页展示“录入新比赛”表单
7. 提交后前端会读取仓库中的 `data/matches.json`，追加新比赛，再通过 `PUT /repos/{owner}/{repo}/contents/data/matches.json` 写回

## GitHub Pages 部署

仓库已经包含工作流：[.github/workflows/deploy.yml](/home/zibo/zibo/pingpang/.github/workflows/deploy.yml)

### 启用方式

1. 推送到 `main` 分支
2. 进入 GitHub 仓库 `Settings -> Pages`
3. `Source` 选择 `GitHub Actions`
4. 等待工作流执行完成

### 首次部署报错处理

如果 Actions 日志里出现下面这类错误：

```text
Get Pages site failed. Please verify that the repository has Pages enabled...
```

说明仓库当前还没有启用 Pages 站点。处理方式有两种：

1. 手动启用
   进入仓库 `Settings -> Pages`，把 `Source` 切到 `GitHub Actions`，然后重新运行工作流。
2. 自动启用
   新建一个仓库 Secret：`PAGES_PAT`
   这个 token 需要满足以下其一：
   `repo` scope，或 Pages 写权限

当前工作流已经兼容这两种模式：

- 有 `PAGES_PAT`：`actions/configure-pages@v5` 会尝试自动启用 Pages
- 没有 `PAGES_PAT`：工作流仍会使用默认 `GITHUB_TOKEN`，但要求你先在仓库设置里手动开启 Pages

## 使用建议

- 新增球员：直接编辑 [data/players.json](/home/zibo/zibo/pingpang/data/players.json)，每位球员的 `initialRating` 建议保持 `1500`
- 管理比赛：优先通过网页内录入；如需批量导入，也可直接编辑 [data/matches.json](/home/zibo/zibo/pingpang/data/matches.json)
- 比赛记录中的 `winnerRatingChange` 和 `loserRatingChange` 应由系统写入，手动编辑时请保持一正一负且绝对值相同

## 设计说明

- 以黑白灰为主色，强调色使用克制的墨绿
- 页面结构偏印刷式数据看板，不使用渐变、夸张阴影和营销化模块
- 桌面端优先呈现清晰表格，移动端转为信息卡片
- 图表使用原生 SVG 绘制，避免额外依赖

## 已知限制

- GitHub OAuth Web Application 不能在纯前端直接完成 token 交换，因此必须配一个独立代理
- 浏览器直接读写仓库文件依赖 GitHub API 配额和 token 权限
- 当前比赛录入只按胜负计算积分，不读取每局比分的细节权重
