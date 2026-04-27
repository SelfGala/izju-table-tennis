import { loadLeagueData } from "./data.js";
import { buildLeagueTable, compareMatchesByTimelineDesc } from "./rating.js";
import {
  buildHash,
  createSvgLineChart,
  escapeHtml,
  formatCompactDate,
  formatDate,
  formatPercent,
  formatRating,
  parseHashRoute,
} from "./utils.js";

const app = document.querySelector("#app");

const STORAGE_KEYS = {
  language: "pingpang_language",
};

const COPY = {
  zh: {
    site: {
      title: "iZJU 乒乓球积分赛",
      subtitle: "浙江大学国际联合学院乒乓球积分系统",
    },
    language: {
      switch: "语言切换",
      zh: "中文",
      en: "English",
    },
    nav: {
      rankings: "积分榜",
      events: "赛事",
      matches: "比赛记录",
    },
    status: {
      upcoming: "未开赛",
      ongoing: "进行中",
      completed: "已结束",
      pending: "待定",
    },
    summary: {
      leader: "当前领跑",
      players: "注册球员",
      matches: "累计比赛",
      waiting: "等待录入比赛",
      initialRating: "本届球员以 {rating} 初始积分开始",
      mixedRating: "初始积分以名单配置为准",
      upcoming: "当前待开赛赛事 {count} 场",
      autoDelta: "每场自动计算双方积分变化",
    },
    rankings: {
      eyebrow: "积分排名",
      title: "排行榜",
      search: "搜索球员",
      searchPlaceholder: "输入姓名实时筛选",
      note: "官方排名始终按积分计算。",
      empty: "没有符合条件的球员。",
      rank: "排名",
      name: "姓名",
      rating: "积分",
      matches: "场次",
      rate: "胜率",
      recent: "最近比赛",
    },
    events: {
      eyebrow: "赛事列表",
      title: "全部赛事",
      intro: "点击任一赛事，查看名单、赛事积分榜和录入进度。",
      detailEyebrow: "赛事详情",
      missing: "未找到该赛事",
      back: "返回赛事列表",
      status: "赛事状态",
      players: "参赛人数",
      recorded: "已录比赛",
      lastMatch: "最近一场 {date}",
      notStarted: "尚未开始比赛",
      infoTitle: "赛事信息",
      infoIntro: "基础说明与当前状态",
      date: "比赛日期",
      location: "比赛地点",
      format: "赛制",
      note: "说明",
      standingsTitle: "赛事内积分榜",
      standingsIntro: "只统计该赛事已录入比赛",
      rosterTitle: "参赛名单",
      rosterIntro: "当前赛事注册球员",
      matchesTitle: "赛事比赛记录",
      matchesIntro: "只展示该赛事名下的已录入比赛",
      emptyMatches: "这项比赛还没开始录入对阵和比分。",
    },
    player: {
      eyebrow: "球员详情",
      missing: "未找到该球员",
      back: "返回排行榜",
      intro: "当前积分 {rating}，胜率 {winRate}，累计 {count} 场。",
      chartTitle: "积分变化",
      chartIntro: "按比赛日期累计更新",
      current: "当前积分",
      record: "总战绩",
      latest: "最近比赛",
      recentTitle: "最近 10 场",
      recentIntro: "对手、比分、积分变化与日期",
      opponentTitle: "对手记录",
      opponentIntro: "所有交手过的球员与胜负统计",
      date: "日期",
      opponent: "对手",
      score: "比分",
      delta: "积分变化",
      meetings: "交手",
      wins: "胜",
      losses: "负",
      noMatches: "暂无比赛",
      noOpponents: "暂无交手记录",
    },
    matches: {
      eyebrow: "比赛记录",
      title: "全部比赛",
      playerFilter: "按球员筛选",
      eventFilter: "按赛事筛选",
      allPlayers: "全部球员",
      allEvents: "全部赛事",
      clear: "清除筛选",
      shown: "已显示 {current} / {total} 场",
      empty: "当前筛选条件下没有比赛记录。",
      loadMore: "加载更多",
      winnerVerb: "胜",
    },
    common: {
      noData: "暂无数据",
      notStarted: "未开始",
      tbd: "待定",
      noDescription: "暂无补充说明",
      loading: "正在读取积分数据…",
      points: "分",
      matches: "场",
      chartLabel: "积分变化图",
    },
  },
  en: {
    site: {
      title: "iZJU Table Tennis League",
      subtitle: "ZJU-UIUC Institute Table Tennis Rating Board",
    },
    language: {
      switch: "Language switch",
      zh: "中文",
      en: "English",
    },
    nav: {
      rankings: "Rankings",
      events: "Events",
      matches: "Matches",
    },
    status: {
      upcoming: "Upcoming",
      ongoing: "Ongoing",
      completed: "Completed",
      pending: "TBD",
    },
    summary: {
      leader: "League leader",
      players: "Players",
      matches: "Matches",
      waiting: "Waiting for more matches",
      initialRating: "Most players started at {rating}",
      mixedRating: "Starting ratings follow the roster data",
      upcoming: "{count} upcoming event(s)",
      autoDelta: "Each result updates both ratings automatically",
    },
    rankings: {
      eyebrow: "Standings",
      title: "Leaderboard",
      search: "Search players",
      searchPlaceholder: "Type a name to filter instantly",
      note: "Official ordering always follows rating points.",
      empty: "No players match the current search.",
      rank: "Rank",
      name: "Name",
      rating: "Rating",
      matches: "Matches",
      rate: "Win rate",
      recent: "Last match",
    },
    events: {
      eyebrow: "Events",
      title: "All events",
      intro: "Open an event to inspect its roster, standings, and recorded matches.",
      detailEyebrow: "Event detail",
      missing: "Event not found",
      back: "Back to events",
      status: "Status",
      players: "Players",
      recorded: "Recorded matches",
      lastMatch: "Last match {date}",
      notStarted: "No recorded matches yet",
      infoTitle: "Event info",
      infoIntro: "Baseline information and current status",
      date: "Date",
      location: "Location",
      format: "Format",
      note: "Notes",
      standingsTitle: "Event standings",
      standingsIntro: "Computed only from matches in this event",
      rosterTitle: "Roster",
      rosterIntro: "Registered players for this event",
      matchesTitle: "Event matches",
      matchesIntro: "Only recorded matches under this event are shown here",
      emptyMatches: "No pairings or scores have been added to this event yet.",
    },
    player: {
      eyebrow: "Player detail",
      missing: "Player not found",
      back: "Back to leaderboard",
      intro: "Current rating {rating}, win rate {winRate}, {count} matches played.",
      chartTitle: "Rating trend",
      chartIntro: "Updated cumulatively by match date",
      current: "Current rating",
      record: "Overall record",
      latest: "Latest match",
      recentTitle: "Last 10 matches",
      recentIntro: "Opponent, score, rating swing, and date",
      opponentTitle: "Opponent record",
      opponentIntro: "Every opponent this player has faced",
      date: "Date",
      opponent: "Opponent",
      score: "Score",
      delta: "Rating delta",
      meetings: "Meetings",
      wins: "Wins",
      losses: "Losses",
      noMatches: "No matches yet",
      noOpponents: "No opponent record yet",
    },
    matches: {
      eyebrow: "Matches",
      title: "All matches",
      playerFilter: "Filter by player",
      eventFilter: "Filter by event",
      allPlayers: "All players",
      allEvents: "All events",
      clear: "Clear filters",
      shown: "Showing {current} / {total} matches",
      empty: "No matches match the current filters.",
      loadMore: "Load more",
      winnerVerb: "def.",
    },
    common: {
      noData: "No data",
      notStarted: "Not started",
      tbd: "TBD",
      noDescription: "No extra notes yet",
      loading: "Loading rating data…",
      points: "pts",
      matches: "matches",
      chartLabel: "Rating trend chart",
    },
  },
};

const state = {
  data: null,
  route: parseHashRoute(),
  lang: getStoredLanguage(),
  search: "",
  matchFilter: "",
  eventFilter: "",
  matchesPage: 1,
  notice: "",
  error: "",
};

function getStoredLanguage() {
  try {
    const value = localStorage.getItem(STORAGE_KEYS.language);
    return value === "en" ? "en" : "zh";
  } catch {
    return "zh";
  }
}

function storeLanguage(lang) {
  try {
    localStorage.setItem(STORAGE_KEYS.language, lang);
  } catch {
    // Ignore storage failures in private browsing or restricted environments.
  }
}

function getCopy() {
  return COPY[state.lang] ?? COPY.zh;
}

function t(key, params = {}) {
  const parts = key.split(".");
  let value = getCopy();
  for (const part of parts) {
    value = value?.[part];
  }
  if (typeof value !== "string") {
    return key;
  }
  return value.replace(/\{(\w+)\}/g, (_, token) => String(params[token] ?? ""));
}

function getLocale() {
  return state.lang === "en" ? "en-US" : "zh-CN";
}

function formatDateText(dateString) {
  return formatDate(dateString, getLocale(), t("common.notStarted"));
}

function formatCompactDateText(dateString) {
  return formatCompactDate(dateString, getLocale(), t("common.notStarted"));
}

function formatPercentText(value) {
  return formatPercent(value, getLocale());
}

function formatRatingText(value) {
  return `${formatRating(value)} ${t("common.points")}`;
}

function formatRecordText(wins, losses) {
  return state.lang === "en" ? `${wins}W ${losses}L` : `${wins} 胜 ${losses} 负`;
}

function setMessage(type, message) {
  state.notice = type === "notice" ? message : "";
  state.error = type === "error" ? message : "";
}

function setLanguage(lang) {
  state.lang = lang === "en" ? "en" : "zh";
  storeLanguage(state.lang);
  renderApp();
}

function getNavItems() {
  return [
    { path: "/", label: t("nav.rankings") },
    { path: "/events", label: t("nav.events") },
    { path: "/matches", label: t("nav.matches") },
  ];
}

function getEventById(eventId) {
  return state.data.events.find((event) => event.id === eventId) ?? null;
}

function getEventMatches(eventId) {
  return state.data.matches
    .filter((match) => match.eventId === eventId)
    .sort(compareMatchesByTimelineDesc);
}

function getEventPlayers(event) {
  return state.data.players.filter((player) => event.playerIds.includes(player.id));
}

function getEventStandings(event) {
  return buildLeagueTable(getEventPlayers(event), getEventMatches(event.id));
}

function getEventStatusText(status) {
  return getCopy().status[status] ?? t("status.pending");
}

function getFilteredStandings() {
  const keyword = state.search.trim().toLowerCase();
  if (!keyword) return state.data.standings;
  return state.data.standings.filter((player) => player.name.toLowerCase().includes(keyword));
}

function getDisplayedMatches() {
  const filtered = [...state.data.matches]
    .sort(compareMatchesByTimelineDesc)
    .filter((match) => !state.matchFilter || match.winnerId === state.matchFilter || match.loserId === state.matchFilter)
    .filter((match) => !state.eventFilter || match.eventId === state.eventFilter);

  return {
    matches: filtered.slice(0, state.matchesPage * 12),
    total: filtered.length,
    hasMore: filtered.length > state.matchesPage * 12,
  };
}

function renderLanguageSwitch() {
  return `
    <div class="lang-switch" role="group" aria-label="${escapeHtml(t("language.switch"))}">
      <button type="button" class="lang-button ${state.lang === "zh" ? "is-active" : ""}" data-action="set-language" data-lang="zh">${escapeHtml(
        t("language.zh"),
      )}</button>
      <button type="button" class="lang-button ${state.lang === "en" ? "is-active" : ""}" data-action="set-language" data-lang="en">${escapeHtml(
        t("language.en"),
      )}</button>
    </div>
  `;
}

function renderHeader() {
  const currentPath = state.route.path.startsWith("/player/")
    ? "/"
    : state.route.path.startsWith("/events/")
      ? "/events"
      : state.route.path;

  return `
    <header class="site-header">
      <div class="header-inner">
        <div class="brand-block">
          <a href="${buildHash("/")}" class="brand-mark">${escapeHtml(t("site.title"))}</a>
          <p class="brand-subtitle">${escapeHtml(t("site.subtitle"))}</p>
        </div>
        <div class="header-actions">
          <nav class="site-nav" aria-label="${escapeHtml(t("nav.rankings"))}">
            ${getNavItems()
              .map(
                (item) => `
                  <a href="${buildHash(item.path)}" class="nav-link ${currentPath === item.path ? "is-active" : ""}">${item.label}</a>
                `,
              )
              .join("")}
          </nav>
          ${renderLanguageSwitch()}
        </div>
      </div>
    </header>
  `;
}

function renderSummary() {
  const totalMatches = state.data.matches.length;
  const totalPlayers = state.data.players.length;
  const leader = state.data.standings[0] ?? null;
  const upcomingEvents = state.data.events.filter((event) => event.status === "upcoming").length;
  const initialRatings = [...new Set(state.data.players.map((player) => player.initialRating ?? 1500))];
  const initialRatingText =
    initialRatings.length === 1
      ? t("summary.initialRating", { rating: formatRatingText(initialRatings[0]) })
      : t("summary.mixedRating");

  return `
    <section class="summary-grid">
      <article class="summary-card summary-card-accent">
        <p class="eyebrow">${escapeHtml(t("summary.leader"))}</p>
        <h2>${leader ? escapeHtml(leader.name) : escapeHtml(t("common.noData"))}</h2>
        <p class="summary-meta">${leader ? escapeHtml(formatRatingText(leader.currentRating)) : escapeHtml(t("summary.waiting"))}</p>
      </article>
      <article class="summary-card">
        <p class="eyebrow">${escapeHtml(t("summary.players"))}</p>
        <h2>${totalPlayers}</h2>
        <p class="summary-meta">${escapeHtml(initialRatingText)}</p>
      </article>
      <article class="summary-card">
        <p class="eyebrow">${escapeHtml(t("summary.matches"))}</p>
        <h2>${totalMatches}</h2>
        <p class="summary-meta">${escapeHtml(upcomingEvents ? t("summary.upcoming", { count: upcomingEvents }) : t("summary.autoDelta"))}</p>
      </article>
    </section>
  `;
}

function renderEventsPage() {
  const events = [...state.data.events]
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.eventOrder - b.eventOrder)
    .reverse();
  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("events.eyebrow"))}</p>
          <h1>${escapeHtml(t("events.title"))}</h1>
        </div>
        <p class="panel-intro">${escapeHtml(t("events.intro"))}</p>
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
                  <span class="status-pill status-${event.status}">${escapeHtml(getEventStatusText(event.status))}</span>
                </div>
                <p class="event-summary">${escapeHtml(event.summary || t("common.noDescription"))}</p>
                <dl class="event-meta-grid">
                  <div><dt>${escapeHtml(t("events.date"))}</dt><dd>${escapeHtml(formatDateText(event.startDate))}</dd></div>
                  <div><dt>${escapeHtml(t("events.location"))}</dt><dd>${escapeHtml(event.location || t("common.tbd"))}</dd></div>
                  <div><dt>${escapeHtml(t("events.players"))}</dt><dd>${event.playerIds.length}</dd></div>
                  <div><dt>${escapeHtml(t("events.recorded"))}</dt><dd>${eventMatches.length}</dd></div>
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
            <p class="eyebrow">${escapeHtml(t("events.detailEyebrow"))}</p>
            <h1>${escapeHtml(t("events.missing"))}</h1>
          </div>
          <a class="button button-outline" href="${buildHash("/events")}">${escapeHtml(t("events.back"))}</a>
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
          <p class="eyebrow">${escapeHtml(t("events.detailEyebrow"))}</p>
          <h1>${escapeHtml(event.name)}</h1>
          <p class="panel-intro">${escapeHtml(event.summary || t("common.noDescription"))}</p>
        </div>
        <a class="button button-outline" href="${buildHash("/events")}">${escapeHtml(t("events.back"))}</a>
      </div>
      <section class="summary-grid">
        <article class="summary-card summary-card-accent">
          <p class="eyebrow">${escapeHtml(t("events.status"))}</p>
          <h2>${escapeHtml(getEventStatusText(event.status))}</h2>
          <p class="summary-meta">${escapeHtml(event.season)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">${escapeHtml(t("events.players"))}</p>
          <h2>${eventPlayers.length}</h2>
          <p class="summary-meta">${escapeHtml(`${t("events.date")} ${formatDateText(event.startDate)}`)}</p>
        </article>
        <article class="summary-card">
          <p class="eyebrow">${escapeHtml(t("events.recorded"))}</p>
          <h2>${eventMatches.length}</h2>
          <p class="summary-meta">${escapeHtml(lastMatchDate ? t("events.lastMatch", { date: formatDateText(lastMatchDate) }) : t("events.notStarted"))}</p>
        </article>
      </section>
      <section class="detail-grid event-detail-grid">
        <article class="detail-panel">
          <div class="subhead">
            <h2>${escapeHtml(t("events.infoTitle"))}</h2>
            <p>${escapeHtml(t("events.infoIntro"))}</p>
          </div>
          <dl class="event-meta-list">
            <div><dt>${escapeHtml(t("events.date"))}</dt><dd>${escapeHtml(formatDateText(event.startDate))}${event.endDate ? ` - ${escapeHtml(formatDateText(event.endDate))}` : ""}</dd></div>
            <div><dt>${escapeHtml(t("events.location"))}</dt><dd>${escapeHtml(event.location || t("common.tbd"))}</dd></div>
            <div><dt>${escapeHtml(t("events.format"))}</dt><dd>${escapeHtml(event.format || t("events.title"))}</dd></div>
            <div><dt>${escapeHtml(t("events.note"))}</dt><dd>${escapeHtml(event.description || t("common.noDescription"))}</dd></div>
          </dl>
        </article>
        <article class="detail-panel">
          <div class="subhead">
            <h2>${escapeHtml(t("events.standingsTitle"))}</h2>
            <p>${escapeHtml(t("events.standingsIntro"))}</p>
          </div>
          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t("rankings.rank"))}</th>
                  <th>${escapeHtml(t("rankings.name"))}</th>
                  <th>${escapeHtml(t("rankings.rating"))}</th>
                  <th>${escapeHtml(t("rankings.matches"))}</th>
                  <th>${escapeHtml(t("rankings.rate"))}</th>
                </tr>
              </thead>
              <tbody>
                ${eventData.standings
                  .map(
                    (player) => `
                      <tr>
                        <td>${player.rank}</td>
                        <td><a href="${buildHash(`/player/${player.id}`)}">${escapeHtml(player.name)}</a></td>
                        <td>${escapeHtml(formatRatingText(player.currentRating))}</td>
                        <td>${player.totalMatches}</td>
                        <td>${escapeHtml(formatPercentText(player.winRate))}</td>
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
            <h2>${escapeHtml(t("events.rosterTitle"))}</h2>
            <p>${escapeHtml(t("events.rosterIntro"))}</p>
          </div>
          <div class="roster-grid">
            ${eventPlayers
              .map(
                (player) => `
                  <a href="${buildHash(`/player/${player.id}`)}" class="roster-item">
                    <span>${escapeHtml(player.name)}</span>
                    <strong>${escapeHtml(formatRatingText(player.initialRating ?? 1000))}</strong>
                  </a>
                `,
              )
              .join("")}
          </div>
        </article>
        <article class="detail-panel">
          <div class="subhead">
            <h2>${escapeHtml(t("events.matchesTitle"))}</h2>
            <p>${escapeHtml(t("events.matchesIntro"))}</p>
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
                          <div class="match-date">${escapeHtml(formatCompactDateText(match.date))}</div>
                          <div class="match-main">
                            <p class="match-title">
                              <strong>${escapeHtml(winner?.name ?? match.winnerId)}</strong>
                              <span>${escapeHtml(t("matches.winnerVerb"))}</span>
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
              : `<div class="empty-block">${escapeHtml(t("events.emptyMatches"))}</div>`
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
          <p class="eyebrow">${escapeHtml(t("rankings.eyebrow"))}</p>
          <h1>${escapeHtml(t("rankings.title"))}</h1>
        </div>
        <div class="panel-toolbar">
          <label class="search-field">
            <span class="field-label">${escapeHtml(t("rankings.search"))}</span>
            <input
              type="search"
              placeholder="${escapeHtml(t("rankings.searchPlaceholder"))}"
              value="${escapeHtml(state.search)}"
              data-role="player-search"
            />
          </label>
        </div>
      </div>
      <p class="panel-intro">${escapeHtml(t("rankings.note"))}</p>
      ${
        players.length
          ? `
            <div class="ranking-table-wrap">
              <table class="ranking-table">
                <thead>
                  <tr>
                    <th>${escapeHtml(t("rankings.rank"))}</th>
                    <th>${escapeHtml(t("rankings.name"))}</th>
                    <th>${escapeHtml(t("rankings.rating"))}</th>
                    <th>${escapeHtml(t("rankings.matches"))}</th>
                    <th>${escapeHtml(t("rankings.rate"))}</th>
                    <th>${escapeHtml(t("rankings.recent"))}</th>
                  </tr>
                </thead>
                <tbody>
                  ${players
                    .map(
                      (player) => `
                        <tr class="clickable-row" data-player-id="${player.id}">
                          <td>${player.rank}</td>
                          <td><a href="${buildHash(`/player/${player.id}`)}">${escapeHtml(player.name)}</a></td>
                          <td>${escapeHtml(formatRatingText(player.currentRating))}</td>
                          <td>${player.totalMatches}</td>
                          <td>${escapeHtml(formatPercentText(player.winRate))}</td>
                          <td>${escapeHtml(formatCompactDateText(player.lastMatchDate))}</td>
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
                        <div><dt>${escapeHtml(t("rankings.rating"))}</dt><dd>${escapeHtml(formatRatingText(player.currentRating))}</dd></div>
                        <div><dt>${escapeHtml(t("rankings.matches"))}</dt><dd>${player.totalMatches}</dd></div>
                        <div><dt>${escapeHtml(t("rankings.rate"))}</dt><dd>${escapeHtml(formatPercentText(player.winRate))}</dd></div>
                        <div><dt>${escapeHtml(t("rankings.recent"))}</dt><dd>${escapeHtml(formatCompactDateText(player.lastMatchDate))}</dd></div>
                      </dl>
                    </article>
                  `,
                )
                .join("")}
            </div>
          `
          : `<div class="empty-block">${escapeHtml(t("rankings.empty"))}</div>`
      }
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
            <p class="eyebrow">${escapeHtml(t("player.eyebrow"))}</p>
            <h1>${escapeHtml(t("player.missing"))}</h1>
          </div>
          <a class="button button-outline" href="${buildHash("/")}">${escapeHtml(t("player.back"))}</a>
        </div>
      </section>
    `;
  }

  return `
    <section class="panel">
      <div class="panel-head player-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("player.eyebrow"))}</p>
          <h1>${escapeHtml(player.name)}</h1>
          <p class="panel-intro">${escapeHtml(
            t("player.intro", {
              rating: formatRatingText(player.currentRating),
              winRate: formatPercentText(player.winRate),
              count: player.totalMatches,
            }),
          )}</p>
        </div>
        <a class="button button-outline" href="${buildHash("/")}">${escapeHtml(t("player.back"))}</a>
      </div>
      <section class="player-layout">
        <article class="chart-panel">
          <div class="subhead">
            <h2>${escapeHtml(t("player.chartTitle"))}</h2>
            <p>${escapeHtml(t("player.chartIntro"))}</p>
          </div>
          ${createSvgLineChart(player.ratingHistory, {
            locale: getLocale(),
            emptyLabel: t("common.noData"),
            ariaLabel: t("common.chartLabel"),
          })}
        </article>
        <article class="stats-panel">
          <div class="mini-stat">
            <span>${escapeHtml(t("player.current"))}</span>
            <strong>${escapeHtml(formatRatingText(player.currentRating))}</strong>
          </div>
          <div class="mini-stat">
            <span>${escapeHtml(t("player.record"))}</span>
            <strong>${escapeHtml(formatRecordText(player.wins, player.losses))}</strong>
          </div>
          <div class="mini-stat">
            <span>${escapeHtml(t("player.latest"))}</span>
            <strong>${escapeHtml(formatDateText(player.lastMatchDate))}</strong>
          </div>
        </article>
      </section>
      <section class="detail-grid">
        <article class="detail-panel">
          <div class="subhead">
            <h2>${escapeHtml(t("player.recentTitle"))}</h2>
            <p>${escapeHtml(t("player.recentIntro"))}</p>
          </div>
          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t("player.date"))}</th>
                  <th>${escapeHtml(t("player.opponent"))}</th>
                  <th>${escapeHtml(t("player.score"))}</th>
                  <th>${escapeHtml(t("player.delta"))}</th>
                </tr>
              </thead>
              <tbody>
                ${
                  player.recentMatches.length
                    ? player.recentMatches
                        .map(
                          (match) => `
                            <tr>
                              <td>${escapeHtml(formatCompactDateText(match.date))}</td>
                              <td>${escapeHtml(match.opponentName)}</td>
                              <td>${escapeHtml(match.score)}</td>
                              <td class="${match.ratingChange > 0 ? "positive" : "negative"}">${match.ratingChange > 0 ? "+" : ""}${match.ratingChange}</td>
                            </tr>
                          `,
                        )
                        .join("")
                    : `<tr><td colspan="4" class="empty-cell">${escapeHtml(t("player.noMatches"))}</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </article>
        <article class="detail-panel">
          <div class="subhead">
            <h2>${escapeHtml(t("player.opponentTitle"))}</h2>
            <p>${escapeHtml(t("player.opponentIntro"))}</p>
          </div>
          <div class="detail-table-wrap">
            <table class="detail-table">
              <thead>
                <tr>
                  <th>${escapeHtml(t("player.opponent"))}</th>
                  <th>${escapeHtml(t("player.meetings"))}</th>
                  <th>${escapeHtml(t("player.wins"))}</th>
                  <th>${escapeHtml(t("player.losses"))}</th>
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
                    : `<tr><td colspan="4" class="empty-cell">${escapeHtml(t("player.noOpponents"))}</td></tr>`
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
  const eventOptions = [...state.data.events]
    .sort((a, b) => a.startDate.localeCompare(b.startDate) || a.eventOrder - b.eventOrder)
    .reverse()
    .map(
      (event) => `
        <option value="${event.id}" ${state.eventFilter === event.id ? "selected" : ""}>${escapeHtml(event.name)}</option>
      `,
    )
    .join("");

  return `
    <section class="panel">
      <div class="panel-head">
        <div>
          <p class="eyebrow">${escapeHtml(t("matches.eyebrow"))}</p>
          <h1>${escapeHtml(t("matches.title"))}</h1>
        </div>
        <div class="filter-row">
          <label class="search-field select-field">
            <span class="field-label">${escapeHtml(t("matches.playerFilter"))}</span>
            <select data-role="match-filter">
              <option value="">${escapeHtml(t("matches.allPlayers"))}</option>
              ${playerOptions}
            </select>
          </label>
          <label class="search-field select-field">
            <span class="field-label">${escapeHtml(t("matches.eventFilter"))}</span>
            <select data-role="event-filter">
              <option value="">${escapeHtml(t("matches.allEvents"))}</option>
              ${eventOptions}
            </select>
          </label>
          <button class="button button-outline filter-clear" type="button" data-action="clear-filters">${escapeHtml(t("matches.clear"))}</button>
        </div>
      </div>
      ${
        matches.length
          ? `
            <div class="match-list">
              ${matches
                .map((match) => {
                  const winner = state.data.playerMap.get(match.winnerId);
                  const loser = state.data.playerMap.get(match.loserId);
                  const event = match.eventId ? getEventById(match.eventId) : null;
                  return `
                    <article class="match-row">
                      <div class="match-date">${escapeHtml(formatCompactDateText(match.date))}</div>
                      <div class="match-main">
                        <p class="match-title">
                          <strong>${escapeHtml(winner?.name ?? match.winnerId)}</strong>
                          <span>${escapeHtml(t("matches.winnerVerb"))}</span>
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
              <span>${escapeHtml(t("matches.shown", { current: matches.length, total }))}</span>
              ${hasMore ? `<button class="button button-outline" data-action="load-more">${escapeHtml(t("matches.loadMore"))}</button>` : ""}
            </div>
          `
          : `<div class="empty-block">${escapeHtml(t("matches.empty"))}</div>`
      }
    </section>
  `;
}

function renderApp() {
  document.documentElement.lang = state.lang === "en" ? "en" : "zh-CN";
  document.title = t("site.title");

  if (!state.data) {
    app.innerHTML = `
      <div class="shell">
        ${renderHeader()}
        <main class="main-content">
          <section class="panel loading-panel">
            <p>${escapeHtml(t("common.loading"))}</p>
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
    content = `${renderSummary()}${renderRankings()}`;
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
      return;
    }
    if (target.matches("[data-role='event-filter']")) {
      state.eventFilter = target.value;
      state.matchesPage = 1;
      renderApp();
    }
  });

  app.addEventListener("click", (event) => {
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

    const languageButton = target.closest("[data-action='set-language']");
    if (languageButton) {
      setLanguage(languageButton.dataset.lang);
      return;
    }

    const actionTarget = target.closest("[data-action]");
    const action = actionTarget?.dataset.action;
    if (action === "load-more") {
      state.matchesPage += 1;
      renderApp();
      return;
    }
    if (action === "clear-filters") {
      state.matchFilter = "";
      state.eventFilter = "";
      state.matchesPage = 1;
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
