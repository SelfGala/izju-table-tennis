import { buildLeagueTable, compareMatchesByTimeline } from "./rating.js";

let cache = null;

async function loadJson(path) {
  const response = await fetch(path, { cache: "no-store" });
  if (!response.ok) {
    throw new Error(`无法读取 ${path}`);
  }
  return response.json();
}

export async function loadLeagueData(force = false) {
  if (cache && !force) return cache;
  const players = await loadJson("./data/players.json");
  const eventEntries = await loadJson("./data/events/index.json");
  const eventBundles = await Promise.all(
    eventEntries.map(async (entry, eventOrder) => {
      const eventPath = `./data/events/${entry.path.replace(/^\.\//, "")}`;
      const event = {
        ...(await loadJson(eventPath)),
        eventOrder,
      };
      const matchEntries = await loadJson(`./data/events/${event.id}/matches/index.json`);
      const matches = await Promise.all(
        [...matchEntries]
          .sort((a, b) => (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER))
          .map(async (matchEntry, index) => {
            const match = await loadJson(
              `./data/events/${event.id}/${matchEntry.path.replace(/^\.\//, "")}`,
            );
            return {
              ...match,
              eventId: match.eventId ?? event.id,
              eventOrder,
              sequence: match.sequence ?? matchEntry.sequence ?? index + 1,
            };
          }),
      );
      return { event, matches };
    }),
  );

  const events = eventBundles.map((bundle) => bundle.event);
  const matches = eventBundles.flatMap((bundle) => bundle.matches).sort(compareMatchesByTimeline);
  validateLeagueData(players, events, matches);
  cache = {
    players,
    matches,
    events,
    ...buildLeagueTable(players, matches),
  };
  return cache;
}

export function setLeagueData(next) {
  cache = next;
}

function validateLeagueData(players, events, matches) {
  const playerIds = new Set(players.map((player) => player.id));
  const eventIds = new Set(events.map((event) => event.id));
  const issues = [];

  for (const event of events) {
    for (const playerId of event.playerIds ?? []) {
      if (!playerIds.has(playerId)) {
        issues.push(`赛事 ${event.id} 引用了不存在的球员 ${playerId}`);
      }
    }
  }

  for (const match of matches) {
    if (!eventIds.has(match.eventId)) {
      issues.push(`比赛 ${match.id} 引用了不存在的赛事 ${match.eventId}`);
    }
    if (!playerIds.has(match.winnerId)) {
      issues.push(`比赛 ${match.id} 的胜者 ${match.winnerId} 不在总名单里`);
    }
    if (!playerIds.has(match.loserId)) {
      issues.push(`比赛 ${match.id} 的负者 ${match.loserId} 不在总名单里`);
    }
    if (match.winnerId === match.loserId) {
      issues.push(`比赛 ${match.id} 的双方球员重复`);
    }

    const event = events.find((item) => item.id === match.eventId);
    if (event) {
      const roster = new Set(event.playerIds ?? []);
      for (const playerId of [match.winnerId, match.loserId]) {
        if (!roster.has(playerId)) {
          issues.push(`比赛 ${match.id} 中的球员 ${playerId} 不在赛事 ${event.id} 的名单里`);
        }
      }
      if (event.startDate && match.date < event.startDate) {
        issues.push(`比赛 ${match.id} 的日期 ${match.date} 早于赛事 ${event.id} 开始日期 ${event.startDate}`);
      }
      if (event.endDate && match.date > event.endDate) {
        issues.push(`比赛 ${match.id} 的日期 ${match.date} 晚于赛事 ${event.id} 结束日期 ${event.endDate}`);
      }
    }
  }

  if (issues.length) {
    console.warn("League data issues detected:\n" + issues.join("\n"));
  }
}
