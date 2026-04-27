# 校内乒乓球积分赛

一个用于展示校内乒乓球赛事、积分榜和比赛记录的静态网站，适合直接部署到 GitHub Pages。

## 网站内容

- 积分榜：按当前积分展示球员排名。
- 赛事页：查看各赛事的参赛名单、状态和积分情况。
- 比赛记录：按时间查看历史比赛，并支持按球员筛选。
- 球员详情：查看个人积分变化和近期战绩。

## 数据文件

- `data/players.json`：全站总报名名单、球员基础信息和初始积分。
- `data/events/index.json`：赛事目录入口。
- `data/events/<event-id>/event.json`：单个赛事的信息、状态和参赛名单。
- `data/events/<event-id>/matches/index.json`：该赛事的比赛目录。
- `data/events/<event-id>/matches/*.json`：单场比赛文件，建议带 `sequence` 字段表示录入顺序。

## 积分计算规则

- 默认初始积分：`1500`
- 采用 Elo 变体计算每场积分变化：

```text
expected = 1 / (1 + 10^((opponent_rating - player_rating) / 400))
new_rating = old_rating + K * (score - expected)
```

- 胜者 `score = 1`，负者 `score = 0`
- K 值规则：前 10 场为 `64`，第 11 到 30 场为 `32`，第 31 场起为 `16`
- 双方所处区间不同时，取较低的 K 值

## 本地预览

这是一个纯静态站点，不需要构建。可以直接在仓库根目录运行：

```bash
python3 -m http.server 4173
```

然后访问 `http://localhost:4173`。

## 维护建议

- 新增球员时，保持 `initialRating` 字段完整。
- 新增赛事时，先在 `data/events/index.json` 注册，再创建对应赛事目录。
- 录入比赛时，确保 `winnerId`、`loserId`、`score`、`date` 和 `sequence` 格式正确。
- 如果有多场赛事，系统会按 `startDate` 排赛事顺序，再按每场 `sequence` 计算积分。
- 如果手动维护比赛数据，`winnerRatingChange` 与 `loserRatingChange` 应保持绝对值相同、符号相反。
