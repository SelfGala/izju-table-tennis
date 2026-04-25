import { buildLeagueTable } from "./rating.js";

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
  const [players, matches] = await Promise.all([
    loadJson("./data/players.json"),
    loadJson("./data/matches.json"),
  ]);
  cache = {
    players,
    matches,
    ...buildLeagueTable(players, matches),
  };
  return cache;
}

export function setLeagueData(next) {
  cache = next;
}
