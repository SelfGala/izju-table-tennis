import { loadLeagueData, setLeagueData } from "./data.js";
import {
  checkCollaborator,
  clearSession,
  exchangeCodeForToken,
  fetchAuthenticatedUser,
  getLoginUrl,
  getStoredToken,
  getStoredUser,
  updateMatchesFile,
} from "./github.js";
import { buildLeagueTable, calculateRatingDelta, getDefaultRating, getNextMatchId } from "./rating.js";
import {
  buildHash,
  createSvgLineChart,
  escapeHtml,
  formatCompactDate,
  formatDate,
  formatPercent,
  formatRating,
  parseHashRoute,
  scoreLooksValid,
} from "./utils.js";

const app = document.querySelector("#app");

const state = {
  data: null,
  route: parseHashRoute(),
  search: "",
  matchFilter: "",
  matchesPage: 1,
  auth: {
    token: getStoredToken(),
    user: getStoredUser(),
    isCollaborator: false,
    ready: false,
  },
  notice: "",
  error: "",
};

function setMessage(type, message) {
  state.notice = type === "notice" ? message : "";
  state.error = type === "error" ? message : "";
}

function getNavItems() {
  return [
    { path: "/", label: "积分榜" },
    { path: "/events", label: "赛事" },
    { path: "/matches", label: "比赛记录" },
  ];
}

function getEventById(eventId) {
  return state.data.events.find((event) => event.id === eventId) ?? null;
}

function getEventMatches(eventId) {
  return state.data.matches
    .filter((match) => match.eventId === eventId)
    .sort((a, b) => b.date.localeCompare(a.date));
}

function getEventPlayers(event) {
  return state.data.players.filter((player) => event.playerIds.includes(player.id));
}

function getEventStandings(event) {
  return buildLeagueTable(getEventPlayers(event), getEventMatches(event.id));
}

function getEventStatusText(status) {
  const map = {
    upcoming: "未开赛",
    ongoing: "进行中",
    completed: "已结束",
  };
  return map[status] ?? "待定";
}

function getFilteredStandings() {
  const keyword = state.search.trim().toLowerCase();
  if (!keyword) return state.data.standings;
  return state.data.standings.filter((player) => player.name.toLowerCase().includes(keyword));
}

function getDisplayedMatches() {
  const filter = state.matchFilter;
  const filtered = [...state.data.matches]
    .sort((a, b) => b.date.localeCompare(a.date))
    .filter((match) => !filter || match.winnerId === filter || match.loserId === filter);
  return {
    matches: filtered.slice(0, state.matchesPage * 12),
    total: filtered.length,
    hasMore: filtered.length > state.matchesPage * 12,
  };
}

function renderHeader() {
  const currentPath = state.route.path.startsWith("/player/")
    ? "/"
    : state.route.path.startsWith("/events/")
      ? "/events"
      : state.route.path;
  const loginUrl = getLoginUrl();
  const authControl = state.auth.user
    ? `<button class="button button-text" data-action="logout">退出 ${escapeHtml(
        state.auth.user.login,
      )}</button>`
    : loginUrl
      ? `<a class="button button-outline" href="${loginUrl}">GitHub 登录</a>`
      : `<span class="header-note">请先在 config.js 配置 GitHub OAuth</span>`;

  return `
    <header class="site-header">
      <div class="header-inner">
        <div class="brand-block">
          <a href="${buildHash("/")}" class="brand-mark">${escapeHtml(window.APP_CONFIG.siteTitle)}</a>
          <p class="brand-subtitle">浙江大学国际联合学院乒乓球积分系统</p>
        </div>
        <div class="header-actions">
          <nav class="site-nav" aria-label="主导航">
            ${getNavItems()
              .map(
                (item) => `
                  <a href="${buildHash(item.path)}" class="nav-link ${
                    currentPath === item.path ? "is-active" : ""
                  }">${item.label}</a>
                `,
              )
              .join("")}
          </nav>
          ${authControl}
        </div>
      </div>
    </header>
  `;
}

function renderSummary() {
  const totalMatches = state.data.matches.length;
  const totalPlayers = state.data.players.length;
  const leader = state.data.standings[0];
  const upcomingEvents = state.data.events.filter((event) => event.status === "upcoming").length;
  const initialRatings = [...new Set(state.data.players.map((player) => player.initialRating ?? 1500))];
  const initialRatingText =
    initialRatings.length === 1 ? `本届球员以 ${initialRatings[0]} 初始积分开始` : "初始积分以名单配置为准";
  return `
    <section class="summary-grid">
      <article class="summary-card">
        <p class="eyebrow">当前领跑</p>
        <h2>${leader ? escapeHtml(leader.name) : "暂无数据"}</h2>
        <p class="summary-meta">${leader ? `${formatRating(leader.currentRating)} 分` : "等待录入比赛"}</p>
      </article>
      <article class="summary-card">
        <p class="eyebrow">注册球员</p>
        <h2>${totalPlayers}</h2>
        <p class="summary-meta">${initialRatingText}</p>
      </article>
      <article class="summary-card">
        <p class="eyebrow">累计比赛</p>
        <h2>${totalMatches}</h2>
        <p class="summary-meta">${upcomingEvents ? `当前待开赛赛事 ${upcomingEvents} 场` : "每场自动计算双方积分变化"}</p>
      </article>
    </section>
  `;
}

function renderEventsPage() {
  const events = [...state.data.events].sort((a, b) => a.startDate.localeCompare(b.startDate)).reverse();
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">赛事列表</p>
          <h1>全部赛事</h1>
        </div>
        <p class="panel-intro">点击任一赛事，查看名单、赛事积分榜和录入进度。</p>
      </div>
      <div class="event-list">
        ${events
          .map((event) => {
            const eventMatches = getEventMatches(event.id);
            return `
              <article class="event-card" data-event-id="${event.id}">
                <div class="event-card-top">
                  <div>
                    <p class="eyebrow">${escapeHtml(event.season)}</p>
                    <h2><a href="${buildHash(`/events/${event.id}`)}">${escapeHtml(event.name)}</a></h2>
                  </div>
                  <span class="status-pill status-${event.status}">${getEventStatusText(event.status)}</span>
                </div>
                <p class="event-summary">${escapeHtml(event.summary)}</p>
                <dl class="event-meta-grid">
                  <div><dt>日期</dt><dd>${formatDate(event.startDate)}</dd></div>
                  <div><dt>地点</dt><dd>${escapeHtml(event.location || "待定")}</dd></div>
                  <div><dt>参赛人数</dt><dd>${event.playerIds.length}</dd></div>
                  <div><dt>已录比赛</dt><dd>${eventMatches.length}</dd></div>
                </dl>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderEventDetail(eventId) {
  const event = getEventById(eventId);
  if (!event) {
    return `
      <section class="panel">
        <div class="panel-head compact">
          <div>
            <p class="eyebrow">赛事详情</p>
            <h1>未找到该赛事</h1>
          </div>
          <a class="button button-outline" href="${buildHash("/events")}">返回赛事列表</a>
        </div>
      </section>
    `;
  }

  const eventMatches = getEventMatches(event.id);
  const eventPlayers = getEventPlayers(event);
  const eventData = getEventStandings(event);
  const lastMatchDate = eventMatches[0]?.date ?? "";

  return `
    <section class="panel">
      <div class="panel-head player-head">
        <div>
          <p class="eyebrow">赛事详情</p>
          <h1>${escapeHtml(event.name)}</h1>
          <p class="panel-intro">${escapeHtml(event.summary)}</p>
        </div>
        <a class="button button-outline" href="${buildHash("/events")}">返回赛事列表</a>
      </div>
      <section class="summary-grid">
        <article class="summary-card">
          <p class="eyebrow">赛事状态</p>
          <h2>${getEventStatusText(event.status)}</h2>
          <p class="summary-meta">${escapeHtml(event.season)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">参赛人数</p>
          <h2>${eventPlayers.length}</h2>
          <p class="summary-meta">${formatDate(event.startDate)} 开始</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">已录比赛</p>
          <h2>${eventMatches.length}</h2>
          <p class="summary-meta">${lastMatchDate ? `最近一场 ${formatDate(lastMatchDate)}` : "尚未开始比赛"}</p>
        </article>
      </section>
      <section class="detail-grid event-detail-grid">
        <article class="detail-panel">
          <div class="subhead">
            <h2>赛事信息</h2>
            <p>基础说明与当前状态</p>
          </div>
          <dl class="event-meta-list">
            <div><dt>比赛日期</dt><dd>${formatDate(event.startDate)}${event.endDate ? ` - ${formatDate(event.endDate)}` : ""}</dd></div>
            <div><dt>比赛地点</dt><dd>${escapeHtml(event.location || "待定")}</dd></div>
            <div><dt>赛制</dt><dd>${escapeHtml(event.format || "校内积分赛")}</dd></div>
            <div><dt>说明</dt><dd>${escapeHtml(event.description || "暂无补充说明")}</dd></div>
          </dl>
        </article>
        <article class="detail-panel">
          <div class="subhead">
            <h2>赛事内积分榜</h2>
            <p>只统计该赛事已录入比赛</p>
          </div>
          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>排名</th>
                  <th>姓名</th>
                  <th>积分</th>
                  <th>场次</th>
                  <th>胜率</th>
                </tr>
              </thead>
              <tbody>
                ${eventData.standings
                  .map(
                    (player) => `
                      <tr>
                        <td>${player.rank}</td>
                        <td><a href="${buildHash(`/player/${player.id}`)}">${escapeHtml(player.name)}</a></td>
                        <td>${formatRating(player.currentRating)}</td>
                        <td>${player.totalMatches}</td>
                        <td>${formatPercent(player.winRate)}</td>
                      </tr>
                    `,
                  )
                  .join("")}
              </tbody>
            </table>
          </div>
        </article>
      </section>
      <section class="detail-grid event-detail-grid">
        <article class="detail-panel">
          <div class="subhead">
            <h2>参赛名单</h2>
            <p>当前赛事注册球员</p>
          </div>
          <div class="roster-grid">
            ${eventPlayers
              .map(
                (player) => `
                  <a href="${buildHash(`/player/${player.id}`)}" class="roster-item">
                    <span>${escapeHtml(player.name)}</span>
                    <strong>${formatRating(player.initialRating ?? 1000)}</strong>
                  </a>
                `,
              )
              .join("")}
          </div>
        </article>
        <article class="detail-panel">
          <div class="subhead">
            <h2>赛事比赛记录</h2>
            <p>只展示该赛事名下的已录入比赛</p>
          </div>
          ${
            eventMatches.length
              ? `<div class="match-list compact-match-list">
                  ${eventMatches
                    .slice(0, 12)
                    .map((match) => {
                      const winner = state.data.playerMap.get(match.winnerId);
                      const loser = state.data.playerMap.get(match.loserId);
                      return `
                        <article class="match-row">
                          <div class="match-date">${formatCompactDate(match.date)}</div>
                          <div class="match-main">
                            <p class="match-title">
                              <strong>${escapeHtml(winner?.name ?? match.winnerId)}</strong>
                              <span>胜</span>
                              <strong>${escapeHtml(loser?.name ?? match.loserId)}</strong>
                            </p>
                            <p class="match-score">${escapeHtml(match.score)}</p>
                          </div>
                          <div class="match-rating">
                            <span class="positive">+${match.winnerRatingChange}</span>
                            <span class="negative">${match.loserRatingChange}</span>
                          </div>
                        </article>
                      `;
                    })
                    .join("")}
                </div>`
              : `<div class="empty-block">这项比赛还没开始录入对阵和比分。</div>`
          }
        </article>
      </section>
    </section>
  `;
}

function renderRankings() {
  const players = getFilteredStandings();
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">积分排名</p>
          <h1>排行榜</h1>
        </div>
        <label class="search-field">
          <span class="field-label">搜索球员</span>
          <input
            type="search"
            placeholder="输入姓名实时筛选"
            value="${escapeHtml(state.search)}"
            data-role="player-search"
          />
        </label>
      </div>
      <div class="ranking-table-wrap">
        <table class="ranking-table">
          <thead>
            <tr>
              <th>排名</th>
              <th>姓名</th>
              <th>积分</th>
              <th>场次</th>
              <th>胜率</th>
              <th>最近比赛</th>
            </tr>
          </thead>
          <tbody>
            ${players
              .map(
                (player) => `
                  <tr class="clickable-row" data-player-id="${player.id}">
                    <td>${player.rank}</td>
                    <td><a href="${buildHash(`/player/${player.id}`)}">${escapeHtml(player.name)}</a></td>
                    <td>${formatRating(player.currentRating)}</td>
                    <td>${player.totalMatches}</td>
                    <td>${formatPercent(player.winRate)}</td>
                    <td>${formatCompactDate(player.lastMatchDate)}</td>
                  </tr>
                `,
              )
              .join("")}
          </tbody>
        </table>
      </div>
      <div class="ranking-cards">
        ${players
          .map(
            (player) => `
              <article class="player-card" data-player-id="${player.id}">
                <div class="player-card-top">
                  <p class="card-rank">#${player.rank}</p>
                  <a href="${buildHash(`/player/${player.id}`)}" class="player-name">${escapeHtml(player.name)}</a>
                </div>
                <dl class="stat-grid">
                  <div><dt>积分</dt><dd>${formatRating(player.currentRating)}</dd></div>
                  <div><dt>场次</dt><dd>${player.totalMatches}</dd></div>
                  <div><dt>胜率</dt><dd>${formatPercent(player.winRate)}</dd></div>
                  <div><dt>最近比赛</dt><dd>${formatCompactDate(player.lastMatchDate)}</dd></div>
                </dl>
              </article>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function renderPlayerDetail(playerId) {
  const player = state.data.playerMap.get(playerId);
  if (!player) {
    return `
      <section class="panel">
        <div class="panel-head compact">
          <div>
            <p class="eyebrow">球员详情</p>
            <h1>未找到该球员</h1>
          </div>
          <a class="button button-outline" href="${buildHash("/")}">返回排行榜</a>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-head player-head">
        <div>
          <p class="eyebrow">球员详情</p>
          <h1>${escapeHtml(player.name)}</h1>
          <p class="panel-intro">
            当前积分 ${formatRating(player.currentRating)}，胜率 ${formatPercent(player.winRate)}，累计 ${player.totalMatches} 场。
          </p>
        </div>
        <a class="button button-outline" href="${buildHash("/")}">返回排行榜</a>
      </div>
      <section class="player-layout">
        <article class="chart-panel">
          <div class="subhead">
            <h2>积分变化</h2>
            <p>按比赛日期累计更新</p>
          </div>
          ${createSvgLineChart(player.ratingHistory)}
        </article>
        <article class="stats-panel">
          <div class="mini-stat">
            <span>当前积分</span>
            <strong>${formatRating(player.currentRating)}</strong>
          </div>
          <div class="mini-stat">
            <span>总战绩</span>
            <strong>${player.wins} 胜 ${player.losses} 负</strong>
          </div>
          <div class="mini-stat">
            <span>最近比赛</span>
            <strong>${formatDate(player.lastMatchDate)}</strong>
          </div>
        </article>
      </section>
      <section class="detail-grid">
        <article class="detail-panel">
          <div class="subhead">
            <h2>最近 10 场</h2>
            <p>对手、比分、积分变化与日期</p>
          </div>
          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>日期</th>
                  <th>对手</th>
                  <th>比分</th>
                  <th>积分变化</th>
                </tr>
              </thead>
              <tbody>
                ${
                  player.recentMatches.length
                    ? player.recentMatches
                        .map(
                          (match) => `
                            <tr>
                              <td>${formatCompactDate(match.date)}</td>
                              <td>${escapeHtml(match.opponentName)}</td>
                              <td>${escapeHtml(match.score)}</td>
                              <td class="${match.ratingChange > 0 ? "positive" : "negative"}">${
                                match.ratingChange > 0 ? "+" : ""
                              }${match.ratingChange}</td>
                            </tr>
                          `,
                        )
                        .join("")
                    : `<tr><td colspan="4" class="empty-cell">暂无比赛</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>
        <article class="detail-panel">
          <div class="subhead">
            <h2>对手记录</h2>
            <p>所有交手过的球员与胜负统计</p>
          </div>
          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>对手</th>
                  <th>交手</th>
                  <th>胜</th>
                  <th>负</th>
                </tr>
              </thead>
              <tbody>
                ${
                  player.opponents.length
                    ? player.opponents
                        .map(
                          (opponent) => `
                            <tr>
                              <td>${escapeHtml(opponent.opponentName)}</td>
                              <td>${opponent.wins + opponent.losses}</td>
                              <td>${opponent.wins}</td>
                              <td>${opponent.losses}</td>
                            </tr>
                          `,
                        )
                        .join("")
                    : `<tr><td colspan="4" class="empty-cell">暂无交手记录</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>
      </section>
    </section>
  `;
}

function renderMatchesPage() {
  const { matches, total, hasMore } = getDisplayedMatches();
  const playerOptions = state.data.standings
    .map(
      (player) => `
        <option value="${player.id}" ${state.matchFilter === player.id ? "selected" : ""}>${escapeHtml(player.name)}</option>
      `,
    )
    .join("");

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">比赛记录</p>
          <h1>全部比赛</h1>
        </div>
        <label class="search-field select-field">
          <span class="field-label">按球员筛选</span>
          <select data-role="match-filter">
            <option value="">全部球员</option>
            ${playerOptions}
          </select>
        </label>
      </div>
      <div class="match-list">
        ${matches
          .map((match) => {
            const winner = state.data.playerMap.get(match.winnerId);
            const loser = state.data.playerMap.get(match.loserId);
            const event = match.eventId ? getEventById(match.eventId) : null;
            return `
              <article class="match-row">
                <div class="match-date">${formatCompactDate(match.date)}</div>
                <div class="match-main">
                  <p class="match-title">
                    <strong>${escapeHtml(winner?.name ?? match.winnerId)}</strong>
                    <span>胜</span>
                    <strong>${escapeHtml(loser?.name ?? match.loserId)}</strong>
                  </p>
                  <p class="match-score">${escapeHtml(match.score)}</p>
                  ${event ? `<p class="match-event"><a href="${buildHash(`/events/${event.id}`)}">${escapeHtml(event.name)}</a></p>` : ""}
                </div>
                <div class="match-rating">
                  <span class="positive">+${match.winnerRatingChange}</span>
                  <span class="negative">${match.loserRatingChange}</span>
                </div>
              </article>
            `;
          })
          .join("")}
      </div>
      <div class="list-foot">
        <span>已显示 ${matches.length} / ${total} 场</span>
        ${hasMore ? `<button class="button button-outline" data-action="load-more">加载更多</button>` : ""}
      </div>
    </section>
  `;
}

function renderAdminPanel() {
  if (!state.auth.ready) {
    return `
      <section class="panel admin-panel">
        <div class="panel-head compact">
          <div>
            <p class="eyebrow">管理功能</p>
            <h1>比赛录入</h1>
          </div>
        </div>
        <p class="panel-intro">正在检查 GitHub 登录状态。</p>
      </section>
    `;
  }

  if (!state.auth.user || !state.auth.isCollaborator) {
    return "";
  }

  const options = state.data.standings
    .map((player) => `<option value="${player.id}">${escapeHtml(player.name)}</option>`)
    .join("");
  const eventOptions = state.data.events
    .map((event) => `<option value="${event.id}">${escapeHtml(event.name)}</option>`)
    .join("");

  return `
    <section class="panel admin-panel">
      <div class="panel-head compact">
        <div>
          <p class="eyebrow">管理功能</p>
          <h1>录入新比赛</h1>
        </div>
        <p class="panel-intro">提交后将直接更新仓库中的 <code>data/matches.json</code>。</p>
      </div>
      <form class="admin-form" data-role="match-form">
        <label>
          <span>所属赛事</span>
          <select name="eventId" required>
            <option value="">选择赛事</option>
            ${eventOptions}
          </select>
        </label>
        <label>
          <span>比赛日期</span>
          <input type="date" name="date" value="${new Date().toISOString().slice(0, 10)}" required />
        </label>
        <label>
          <span>胜者</span>
          <select name="winnerId" required>
            <option value="">选择球员</option>
            ${options}
          </select>
        </label>
        <label>
          <span>负者</span>
          <select name="loserId" required>
            <option value="">选择球员</option>
            ${options}
          </select>
        </label>
        <label class="full-row">
          <span>比分</span>
          <input type="text" name="score" placeholder="11:9,11:7,11:5" required />
        </label>
        <div class="form-actions full-row">
          <button class="button button-solid" type="submit">提交比赛</button>
        </div>
      </form>
    </section>
  `;
}

function renderApp() {
  if (!state.data) {
    app.innerHTML = `
      <div class="shell">
        ${renderHeader()}
        <main class="main-content">
          <section class="panel loading-panel">
            <p>正在读取积分数据…</p>
          </section>
        </main>
      </div>
    `;
    return;
  }

  let content = "";
  if (state.route.path === "/matches") {
    content = renderMatchesPage();
  } else if (state.route.path === "/events") {
    content = renderEventsPage();
  } else if (state.route.path.startsWith("/events/")) {
    content = renderEventDetail(state.route.segments[1]);
  } else if (state.route.path.startsWith("/player/")) {
    content = renderPlayerDetail(state.route.segments[1]);
  } else {
    content = `${renderSummary()}${renderRankings()}${renderAdminPanel()}`;
  }

  app.innerHTML = `
    <div class="shell">
      ${renderHeader()}
      <main class="main-content">
        ${state.notice ? `<div class="banner banner-notice">${escapeHtml(state.notice)}</div>` : ""}
        ${state.error ? `<div class="banner banner-error">${escapeHtml(state.error)}</div>` : ""}
        ${content}
      </main>
    </div>
  `;
}

async function hydrateAuth() {
  const searchParams = new URLSearchParams(window.location.search);
  const code = searchParams.get("code");
  const stateValue = searchParams.get("state");

  try {
    if (code && stateValue) {
      const token = await exchangeCodeForToken(code, stateValue);
      state.auth.token = token;
      const nextUrl = `${window.location.pathname}${window.location.hash || "#/"}`;
      window.history.replaceState({}, "", nextUrl);
      state.route = parseHashRoute();
    }

    if (state.auth.token) {
      state.auth.user = await fetchAuthenticatedUser(state.auth.token);
      state.auth.isCollaborator = await checkCollaborator(state.auth.token, state.auth.user.login);
    }
  } catch (error) {
    clearSession();
    state.auth.token = "";
    state.auth.user = null;
    state.auth.isCollaborator = false;
    setMessage("error", error.message);
  } finally {
    state.auth.ready = true;
    renderApp();
  }
}

async function submitMatch(form) {
  const formData = new FormData(form);
  const eventId = String(formData.get("eventId") ?? "");
  const winnerId = formData.get("winnerId");
  const loserId = formData.get("loserId");
  const score = String(formData.get("score") ?? "").trim();
  const date = String(formData.get("date") ?? "");

  if (!eventId) {
    throw new Error("请选择所属赛事。");
  }
  if (!winnerId || !loserId || winnerId === loserId) {
    throw new Error("请分别选择胜者与负者。");
  }
  if (!scoreLooksValid(score)) {
    throw new Error("比分格式应为 11:9,11:7,11:5。");
  }
  if (!date) {
    throw new Error("请选择比赛日期。");
  }
  const latestDate = state.data.matches.reduce((latest, match) => {
    return !latest || match.date > latest ? match.date : latest;
  }, "");
  if (latestDate && date < latestDate) {
    throw new Error(`新比赛日期不能早于当前最后一场 ${latestDate}。`);
  }
  const event = getEventById(eventId);
  if (!event) {
    throw new Error("所选赛事不存在。");
  }
  if (!event.playerIds.includes(winnerId) || !event.playerIds.includes(loserId)) {
    throw new Error("所选球员不在该赛事名单中。");
  }

  const winner = state.data.playerMap.get(winnerId);
  const loser = state.data.playerMap.get(loserId);
  if (!winner || !loser) {
    throw new Error("参赛球员不存在。");
  }

  const delta = calculateRatingDelta(
    winner.currentRating ?? getDefaultRating(),
    loser.currentRating ?? getDefaultRating(),
    winner.totalMatches,
    loser.totalMatches,
  );

  const nextMatch = {
    id: getNextMatchId(state.data.matches),
    eventId,
    date,
    winnerId,
    loserId,
    score,
    winnerRatingChange: delta.winnerDelta,
    loserRatingChange: delta.loserDelta,
  };

  const nextMatches = [...state.data.matches, nextMatch].sort((a, b) => a.date.localeCompare(b.date));
  await updateMatchesFile(
    state.auth.token,
    nextMatches,
    `chore(match): add ${winner.name} vs ${loser.name} on ${date}`,
  );

  const nextData = {
    players: state.data.players,
    matches: nextMatches,
    events: state.data.events,
    ...buildLeagueTable(state.data.players, nextMatches),
  };
  setLeagueData(nextData);
  state.data = nextData;
  setMessage("notice", "比赛已提交，页面数据已刷新。");
  renderApp();
}

function attachEvents() {
  app.addEventListener("input", (event) => {
    const target = event.target;
    if (target.matches("[data-role='player-search']")) {
      state.search = target.value;
      renderApp();
    }
  });

  app.addEventListener("change", (event) => {
    const target = event.target;
    if (target.matches("[data-role='match-filter']")) {
      state.matchFilter = target.value;
      state.matchesPage = 1;
      renderApp();
    }
  });

  app.addEventListener("click", async (event) => {
    const target = event.target;
    const row = target.closest("[data-player-id]");
    if (row && !target.closest("a")) {
      window.location.hash = buildHash(`/player/${row.dataset.playerId}`);
      return;
    }
    const eventCard = target.closest("[data-event-id]");
    if (eventCard && !target.closest("a")) {
      window.location.hash = buildHash(`/events/${eventCard.dataset.eventId}`);
      return;
    }

    const action = target.dataset.action;
    if (action === "load-more") {
      state.matchesPage += 1;
      renderApp();
      return;
    }
    if (action === "logout") {
      clearSession();
      state.auth = { token: "", user: null, isCollaborator: false, ready: true };
      setMessage("notice", "已退出 GitHub 登录。");
      renderApp();
    }
  });

  app.addEventListener("submit", async (event) => {
    const form = event.target;
    if (!form.matches("[data-role='match-form']")) return;
    event.preventDefault();
    setMessage("notice", "");
    setMessage("error", "");
    renderApp();
    const button = form.querySelector("button[type='submit']");
    button.disabled = true;
    button.textContent = "提交中...";
    try {
      await submitMatch(form);
      form.reset();
    } catch (error) {
      setMessage("error", error.message);
      renderApp();
    }
  });

  window.addEventListener("hashchange", () => {
    state.route = parseHashRoute();
    setMessage("notice", "");
    setMessage("error", "");
    renderApp();
  });
}

async function start() {
  attachEvents();
  renderApp();
  state.data = await loadLeagueData();
  renderApp();
  hydrateAuth();
}

start().catch((error) => {
  app.innerHTML = `
    <div class="shell">
      <main class="main-content">
        <div class="banner banner-error">${escapeHtml(error.message)}</div>
      </main>
    </div>
  `;
});
