# 校内乒乓球积分赛

一个用于展示校内乒乓球赛事、积分榜和比赛记录的静态网站。

## 网站内容

- 积分榜：按当前积分展示球员排名。
- 赛事页：查看各赛事的参赛名单、状态和积分情况。
- 比赛记录：按时间查看历史比赛，并支持按球员筛选。
- 球员详情：查看个人积分变化和近期战绩。

## 数据文件

- `data/players.json`：球员基础信息和初始积分。
- `data/matches.json`：比赛结果、比分和每场积分变动。
- `data/events.json`：赛事信息、状态和参赛球员列表。

## 积分计算规则

- 默认初始积分：`1000`
- 采用 Elo 变体计算每场积分变化：

```text
expected = 1 / (1 + 10^((opponent_rating - player_rating) / 400))
new_rating = old_rating + K * (score - expected)
```

- 胜者 `score = 1`，负者 `score = 0`
- K 值规则：前 10 场为 `64`，第 11 到 30 场为 `32`，第 31 场起为 `16`
- 双方所处区间不同时，取较低的 K 值


## 维护建议

- 新增球员时，保持 `initialRating` 字段完整。
- 录入比赛时，确保 `winnerId`、`loserId`、`score` 和 `date` 格式正确。
- 如果手动维护比赛数据，`winnerRatingChange` 与 `loserRatingChange` 应保持绝对值相同、符号相反。
