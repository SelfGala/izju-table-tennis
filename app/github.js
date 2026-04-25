import { fromBase64Unicode, getRedirectUri, toBase64Unicode } from "./utils.js";

const TOKEN_KEY = "pingpang_github_token";
const USER_KEY = "pingpang_github_user";

function getConfig() {
  return window.APP_CONFIG ?? {};
}

export function getStoredToken() {
  return sessionStorage.getItem(TOKEN_KEY) ?? "";
}

export function storeToken(token) {
  if (token) {
    sessionStorage.setItem(TOKEN_KEY, token);
  } else {
    sessionStorage.removeItem(TOKEN_KEY);
  }
}

export function getStoredUser() {
  const raw = sessionStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function storeUser(user) {
  if (user) {
    sessionStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    sessionStorage.removeItem(USER_KEY);
  }
}

export function clearSession() {
  storeToken("");
  storeUser(null);
}

export function getLoginUrl() {
  const clientId = getConfig().oauth?.clientId;
  if (!clientId || clientId.includes("your_")) return "";
  const state = crypto.randomUUID();
  sessionStorage.setItem("pingpang_oauth_state", state);
  const url = new URL("https://github.com/login/oauth/authorize");
  url.searchParams.set("client_id", clientId);
  url.searchParams.set("redirect_uri", getRedirectUri());
  url.searchParams.set("scope", "public_repo read:user");
  url.searchParams.set("state", state);
  return url.toString();
}

async function apiRequest(path, token, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });
  return response;
}

export async function exchangeCodeForToken(code, state) {
  const savedState = sessionStorage.getItem("pingpang_oauth_state");
  if (!savedState || savedState !== state) {
    throw new Error("OAuth state 校验失败，请重新登录。");
  }
  const proxyUrl = getConfig().oauth?.proxyUrl;
  if (!proxyUrl || proxyUrl.includes("your-oauth-proxy")) {
    throw new Error("尚未配置 OAuth 代理地址。");
  }
  const response = await fetch(proxyUrl, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      code,
      redirectUri: getRedirectUri(),
    }),
  });
  if (!response.ok) {
    throw new Error("GitHub 登录失败，请检查 OAuth 代理配置。");
  }
  const data = await response.json();
  if (!data.access_token) {
    throw new Error("OAuth 代理未返回 access token。");
  }
  storeToken(data.access_token);
  sessionStorage.removeItem("pingpang_oauth_state");
  return data.access_token;
}

export async function fetchAuthenticatedUser(token) {
  const response = await apiRequest("/user", token);
  if (!response.ok) {
    throw new Error("无法获取 GitHub 用户信息。");
  }
  const user = await response.json();
  storeUser(user);
  return user;
}

export async function checkCollaborator(token, username) {
  const { repoOwner, repoName } = getConfig();
  if (!repoOwner || !repoName || repoOwner.includes("your-") || repoName.includes("your-")) {
    return false;
  }
  const response = await apiRequest(`/repos/${repoOwner}/${repoName}/collaborators/${username}`, token);
  return response.status === 204;
}

export async function readMatchesFile(token) {
  const { repoOwner, repoName, repoBranch = "main" } = getConfig();
  const response = await apiRequest(`/repos/${repoOwner}/${repoName}/contents/data/matches.json?ref=${repoBranch}`, token);
  if (!response.ok) {
    throw new Error("无法读取仓库中的 matches.json。");
  }
  const data = await response.json();
  return {
    sha: data.sha,
    matches: JSON.parse(fromBase64Unicode(data.content.replaceAll("\n", ""))),
  };
}

export async function updateMatchesFile(token, matches, message) {
  const { repoOwner, repoName, repoBranch = "main" } = getConfig();
  const current = await readMatchesFile(token);
  const response = await apiRequest(`/repos/${repoOwner}/${repoName}/contents/data/matches.json`, token, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: toBase64Unicode(JSON.stringify(matches, null, 2)),
      sha: current.sha,
      branch: repoBranch,
    }),
  });
  if (!response.ok) {
    throw new Error("提交比赛记录失败，请检查仓库权限和 OAuth scope。");
  }
  return response.json();
}
