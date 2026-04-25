export function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatDate(dateString) {
  if (!dateString) return "未开始";
  const formatter = new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  return formatter.format(new Date(dateString));
}

export function formatCompactDate(dateString) {
  if (!dateString) return "未开始";
  return dateString.replaceAll("-", ".");
}

export function formatRating(value) {
  return `${Math.round(value)}`;
}

export function formatPercent(value) {
  return `${Math.round(value * 100)}%`;
}

export function parseHashRoute() {
  const hash = window.location.hash.replace(/^#/, "") || "/";
  const [pathPart, queryString] = hash.split("?");
  const path = pathPart.startsWith("/") ? pathPart : `/${pathPart}`;
  const params = new URLSearchParams(queryString ?? "");
  const segments = path.split("/").filter(Boolean);
  return { path, params, segments };
}

export function buildHash(path, params = {}) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      search.set(key, value);
    }
  });
  const query = search.toString();
  return `#${path}${query ? `?${query}` : ""}`;
}

export function scoreLooksValid(score) {
  return /^\d{1,2}:\d{1,2}(,\d{1,2}:\d{1,2})*$/.test(score.trim());
}

export function getBaseUrl() {
  const basePath = window.APP_CONFIG?.basePath ?? "";
  return `${window.location.origin}${basePath}`;
}

export function getRedirectUri() {
  const redirectPath = window.APP_CONFIG?.oauth?.redirectPath ?? "/";
  return `${getBaseUrl()}${redirectPath}`;
}

export function toBase64Unicode(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

export function fromBase64Unicode(value) {
  const binary = atob(value);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function createSvgLineChart(points, width = 560, height = 220) {
  if (!points.length) {
    return `<div class="chart-empty">暂无积分变化</div>`;
  }

  const padding = { top: 18, right: 10, bottom: 24, left: 12 };
  const minValue = Math.min(...points.map((point) => point.rating));
  const maxValue = Math.max(...points.map((point) => point.rating));
  const span = Math.max(maxValue - minValue, 1);
  const innerWidth = width - padding.left - padding.right;
  const innerHeight = height - padding.top - padding.bottom;

  const path = points
    .map((point, index) => {
      const x = padding.left + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1));
      const y = padding.top + innerHeight - ((point.rating - minValue) / span) * innerHeight;
      return `${index === 0 ? "M" : "L"} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  const ticks = [0, 0.5, 1].map((ratio) => {
    const y = padding.top + innerHeight - ratio * innerHeight;
    const value = Math.round(minValue + ratio * span);
    return {
      y,
      value,
    };
  });

  const firstLabel = points[0]?.date ?? "";
  const lastLabel = points[points.length - 1]?.date ?? "";

  return `
    <svg viewBox="0 0 ${width} ${height}" class="chart-svg" aria-label="积分变化图" role="img">
      ${ticks
        .map(
          (tick) => `
            <line x1="${padding.left}" y1="${tick.y}" x2="${width - padding.right}" y2="${tick.y}" class="chart-grid" />
            <text x="${padding.left}" y="${tick.y - 6}" class="chart-label">${tick.value}</text>
          `,
        )
        .join("")}
      <path d="${path}" class="chart-line" />
      ${points
        .map((point, index) => {
          const x =
            padding.left + (points.length === 1 ? innerWidth / 2 : (innerWidth * index) / (points.length - 1));
          const y = padding.top + innerHeight - ((point.rating - minValue) / span) * innerHeight;
          return `<circle cx="${x}" cy="${y}" r="3" class="chart-dot"><title>${point.date} ${point.rating}</title></circle>`;
        })
        .join("")}
      <text x="${padding.left}" y="${height - 6}" class="chart-axis">${firstLabel}</text>
      <text x="${width - padding.right}" y="${height - 6}" text-anchor="end" class="chart-axis">${lastLabel}</text>
    </svg>
  `;
}
