const DEFAULT_RATING = 1500;

export function compareMatchesByTimeline(a, b) {
  return (
    a.date.localeCompare(b.date) ||
    (a.eventOrder ?? Number.MAX_SAFE_INTEGER) - (b.eventOrder ?? Number.MAX_SAFE_INTEGER) ||
    (a.sequence ?? Number.MAX_SAFE_INTEGER) - (b.sequence ?? Number.MAX_SAFE_INTEGER) ||
    String(a.id).localeCompare(String(b.id))
  );
}

export function compareMatchesByTimelineDesc(a, b) {
  return compareMatchesByTimeline(b, a);
}

function getKFactor(matchCount) {
  if (matchCount < 10) return 64;
  if (matchCount < 30) return 32;
  return 16;
}

function getExpectedScore(playerRating, opponentRating) {
  return 1 / (1 + 10 ** ((opponentRating - playerRating) / 400));
}

export function calculateRatingDelta(winnerRating, loserRating, winnerMatches, loserMatches) {
  const k = Math.min(getKFactor(winnerMatches), getKFactor(loserMatches));
  const winnerExpected = getExpectedScore(winnerRating, loserRating);
  const winnerDelta = Math.round(k * (1 - winnerExpected));
  return {
    winnerDelta,
    loserDelta: -winnerDelta,
    k,
  };
}

export function buildLeagueTable(players, matches) {
  const playerMap = new Map(
    players.map((player) => [
      player.id,
      {
        ...player,
        currentRating: player.initialRating ?? DEFAULT_RATING,
        wins: 0,
        losses: 0,
        totalMatches: 0,
        lastMatchDate: null,
        ratingHistory: [
          {
            date: player.joinDate,
            rating: player.initialRating ?? DEFAULT_RATING,
            matchId: null,
          },
        ],
        recentMatches: [],
        opponents: new Map(),
      },
    ]),
  );

  const sortedMatches = [...matches].sort(compareMatchesByTimeline);

  const enrichedMatches = [];

  for (const match of sortedMatches) {
    const winner = playerMap.get(match.winnerId);
    const loser = playerMap.get(match.loserId);
    if (!winner || !loser) continue;

    const winnerDelta =
      typeof match.winnerRatingChange === "number" && typeof match.loserRatingChange === "number"
        ? match.winnerRatingChange
        : calculateRatingDelta(
            winner.currentRating,
            loser.currentRating,
            winner.totalMatches,
            loser.totalMatches,
          ).winnerDelta;

    const loserDelta =
      typeof match.loserRatingChange === "number" ? match.loserRatingChange : -winnerDelta;

    const enrichedMatch = {
      ...match,
      winnerRatingChange: winnerDelta,
      loserRatingChange: loserDelta,
    };

    enrichedMatches.push(enrichedMatch);

    winner.currentRating += winnerDelta;
    loser.currentRating += loserDelta;
    winner.wins += 1;
    loser.losses += 1;
    winner.totalMatches += 1;
    loser.totalMatches += 1;
    winner.lastMatchDate = match.date;
    loser.lastMatchDate = match.date;

    winner.ratingHistory.push({ date: match.date, rating: winner.currentRating, matchId: match.id });
    loser.ratingHistory.push({ date: match.date, rating: loser.currentRating, matchId: match.id });

    winner.recentMatches.unshift({
      ...enrichedMatch,
      result: "win",
      opponentId: loser.id,
      opponentName: loser.name,
      ratingChange: winnerDelta,
    });
    loser.recentMatches.unshift({
      ...enrichedMatch,
      result: "loss",
      opponentId: winner.id,
      opponentName: winner.name,
      ratingChange: loserDelta,
    });

    const winnerOpponent = winner.opponents.get(loser.id) ?? {
      opponentId: loser.id,
      opponentName: loser.name,
      wins: 0,
      losses: 0,
    };
    winnerOpponent.wins += 1;
    winner.opponents.set(loser.id, winnerOpponent);

    const loserOpponent = loser.opponents.get(winner.id) ?? {
      opponentId: winner.id,
      opponentName: winner.name,
      wins: 0,
      losses: 0,
    };
    loserOpponent.losses += 1;
    loser.opponents.set(winner.id, loserOpponent);
  }

  const standings = Array.from(playerMap.values())
    .map((player) => ({
      ...player,
      winRate: player.totalMatches ? player.wins / player.totalMatches : 0,
      recentMatches: player.recentMatches.slice(0, 10),
      opponents: Array.from(player.opponents.values()).sort((a, b) => {
        const aTotal = a.wins + a.losses;
        const bTotal = b.wins + b.losses;
        return bTotal - aTotal || b.wins - a.wins || a.opponentName.localeCompare(b.opponentName, "zh-CN");
      }),
    }))
    .sort((a, b) => {
      return b.currentRating - a.currentRating || b.winRate - a.winRate || a.name.localeCompare(b.name, "zh-CN");
    })
    .map((player, index) => ({
      ...player,
      rank: index + 1,
    }));

  return {
    standings,
    playerMap: new Map(standings.map((player) => [player.id, player])),
    matches: enrichedMatches,
  };
}

export function getNextMatchId(matches) {
  const maxId = matches.reduce((max, match) => {
    const value = Number.parseInt(String(match.id).replace(/^m/, ""), 10);
    return Number.isNaN(value) ? max : Math.max(max, value);
  }, 0);
  return `m${String(maxId + 1).padStart(3, "0")}`;
}

export function getDefaultRating() {
  return DEFAULT_RATING;
}
