import {
  AccountHealth,
  AccountItem,
  DownloadProfile,
  DownloadQueueItem,
  LogEntry,
  OTSConfig,
  PendingQueueItem,
  QueueBatchAction,
  SpotifyCompanionPairing,
  SystemDiagnostics,
  UpdateInfo,
  YouTubeAuthentication,
  YouTubeAuthenticationStatus
} from "../types";

const config = {
  // Production UI is served by FastAPI, so use the current browser origin.
  // This also works behind Unraid's host/IP and reverse proxies.
  api_url: import.meta.env.VITE_API_URL || window.location.origin,
};

const DEFAULT_URL = config.api_url;
const STORAGE_KEY = "OTS_FASTAPI_URL";

export const DEFAULT_CONFIG: OTSConfig = await fetchOTSConfig()

// Default Download Profiles
export const DEFAULT_PROFILES: DownloadProfile[] = await fetchProfiles();

export function getTargetBackendUrl(): string {
  if (typeof window === "undefined") return DEFAULT_URL;
  return localStorage.getItem(STORAGE_KEY) || DEFAULT_URL;
}

export function setTargetBackendUrl(url: string): void {
  if (typeof window === "undefined") return;
  const cleaned = url.trim().replace(/\/$/, "");
  if (!cleaned) {
    localStorage.removeItem(STORAGE_KEY);
  } else {
    localStorage.setItem(STORAGE_KEY, cleaned);
  }
}

function getEndpoint(path: string): string {
  const base = getTargetBackendUrl().replace(/\/$/, "");
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${base}${cleanPath}`;
}

async function request(
  path: string,
  options: RequestInit = {}
): Promise<Response> {
  const url = getEndpoint(path);
  const headers = new Headers(options.headers || {});
  if (
    !headers.has("Content-Type") &&
    options.body &&
    !(typeof FormData !== "undefined" && options.body instanceof FormData)
  ) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(url, { ...options, headers });
}

export async function checkServerHealth(): Promise<{
  status: "online" | "offline";
  version: string;
  target: string;
}> {
  const target = getTargetBackendUrl();
  if (target) {
    try {
      const res = await fetch(`${target}/config/get`, { signal: AbortSignal.timeout(2000) });
      if (res.ok) {
        const data = await res.json();
        return { status: "online", version: data.version || "FastAPI Engine", target };
      }
    } catch {
      // Offline
    }
  }
  return {
    status: "offline",
    version: "",
    target: target || "No target backend URL configured",
  };
}

export async function testBackendConnection(targetUrl: string): Promise<boolean> {
  const target = getTargetBackendUrl();
  if (!target) return false;
  try {
    const res = await fetch(`${target}/config/get`, { signal: AbortSignal.timeout(2500) });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOTSConfig(): Promise<OTSConfig> {
  const res = await request("/config/get");
  if (!res.ok) throw new Error("Failed to fetch configuration");
  return await res.json();
}

export async function saveOTSConfig(): Promise<boolean> {
  try {
    const res = await request("/config/save", { method: "POST" });
    return res.ok;
  } catch (err) {
    console.error("Save config failed:", err);
    return false;
  }
}

export async function resetOTSConfig(): Promise<OTSConfig> {
  const res = await request("/config/reset", { method: "POST" });
  if (!res.ok) throw new Error("Failed to reset configuration");
  return await res.json();
}
export async function updateOTSConfigValue<K extends keyof OTSConfig>(
  key: K,
  value: OTSConfig[K]
): Promise<boolean> {
  const payload = {
    [key]: value,
  };

  const response = await request(`/config/set`, {
    method: "PATCH",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorData = await response.json();
    console.error(
      errorData.detail 
        ? (typeof errorData.detail === "string" ? errorData.detail : JSON.stringify(errorData.detail))
        : `Failed to update setting '${String(key)}' (Status ${response.status})`
    );
    return false
  } else {
    return response.ok
  }
}

export async function fetchDownloadQueue(): Promise<DownloadQueueItem[]> {
  const res = await request("/queue/downloads");
  if (!res.ok) throw new Error("Failed to fetch download queue");
  const data = await res.json();
  return Array.isArray(data) ? data : Object.values(data);
}

export async function addToQueue(
  item: string
): Promise<any> {

  const res = await request(`/query/url?q=${item}`, {
    method: "POST"
  });
  if (!res.ok) throw new Error("Failed to add to queue");
  return res.body
}

export async function executeQueueAction(
  local_id: number,
  action: "cancel" | "delete" | "retry"
): Promise<void> {
  const res = await request(
    `/queue/downloads/action?lid=${encodeURIComponent(local_id)}&action=${encodeURIComponent(action)}`,
    { method: "POST" }
  );
  if (!res.ok) throw new Error("Failed to execute queue action");
}

export async function executeQueueBatchAction(
  local_ids: number[],
  action: QueueBatchAction,
  options?: { profile_id?: string }
): Promise<void> {
  const res = await request("/queue/downloads/batch", {
    method: "POST",
    body: JSON.stringify({ local_ids, action, ...options }),
  });
  if (!res.ok) throw new Error("Failed to execute batch action");
}

export async function clearCompletedDownloads(): Promise<void> {
  const res = await request("/queue/downloads/clear?status=Downloaded");
  if (!res.ok) throw new Error("Failed to clear completed downloads");
}

export async function clearFailedDownloads(): Promise<void> {
  const res = await request("/queue/downloads/clear?status=Failed");
  if (!res.ok) throw new Error("Failed to clear failed downloads");
}

export async function retryFailedDownloads(): Promise<void> {
  const res = await request("/queue/downloads/retryfailed");
  if (!res.ok) throw new Error("Failed to retry failed downloads");
}

export async function toggleQueuePause(): Promise<boolean> {
  throw new Error("Not implemented yet")
  const diag = await fetchSystemDiagnostics();
  const currentPaused = diag.queue.paused;
  const newPaused = !currentPaused;
  const res = await request(`/queue/downloads/pause?paused=${newPaused ? "true" : "false"}`, {
    method: "POST",
  });
  if (!res.ok) throw new Error("Failed to toggle queue pause");
  return newPaused;
}

export async function fetchAccounts(): Promise<AccountItem[]> {
  const res = await request("/accounts/get");
  if (!res.ok) throw new Error("Failed to fetch accounts");
  return await res.json();
}

export async function addAccount(
  service: string,
  credentials: { username?: string; token?: string; password?: string }
): Promise<AccountItem> {
  if (credentials.password && !credentials.token) {
    credentials.token = credentials.password
  }
  const res = await request(`/accounts/add?service=${encodeURIComponent(service)}`, {
    method: "POST",
    body: JSON.stringify(credentials),
  });
  if (!res.ok) throw new Error("Failed to add account");
  const data = await res.json();
  return data.account || data;
}

export async function removeAccount(uuid: string): Promise<boolean> {
  const res = await request(`/accounts/remove?luuid=${encodeURIComponent(uuid)}`, {
    method: "POST",
  });
  return res.ok;
}

export async function reconnectAccounts(): Promise<boolean> {
  const res = await request("/accounts/reconnect", { method: "POST" });
  return res.ok;
}

export async function createSpotifyCompanionPairing(): Promise<SpotifyCompanionPairing | null> {
  const res = await request("/accounts/spotify/companion/pair", { method: "POST" });
  if (!res.ok) throw new Error("Failed to create companion pairing");
  return await res.json();
}

export async function fetchYouTubeAuthenticationStatus(): Promise<YouTubeAuthenticationStatus | null> {
  const res = await request("/accounts/youtube-auth/status");
  if (!res.ok) return null;
  return await res.json();
}

export async function configureYouTubeAuthentication(
  authentication: YouTubeAuthentication
): Promise<boolean> {
  const res = await request("/accounts/youtube-auth", {
    method: "POST",
    body: JSON.stringify(authentication),
  });
  return res.ok;
}

export async function uploadYouTubeCookies(
  file: File
): Promise<YouTubeAuthenticationStatus | null> {
  const form = new FormData();
  form.append("cookies", file);
  const res = await request("/accounts/youtube-auth/upload", {
    method: "POST",
    body: form,
  });
  if (!res.ok) throw new Error("Failed to upload YouTube cookies");
  return await res.json();
}

export async function fetchAccountHealth(): Promise<AccountHealth> {
  const res = await request("/accounts/health");
  if (!res.ok) throw new Error("Failed to fetch account health");
  return await res.json();
}

export async function fetchProfiles(): Promise<DownloadProfile[]> {
  const res = await request("/profiles");
  if (!res.ok) throw new Error("Failed to fetch download profiles");
  const data = await res.json();
  return Array.isArray(data) ? data : data.profiles || [];
}

export async function saveProfile(profile: DownloadProfile): Promise<DownloadProfile> {
  const res = await request("/profiles", {
    method: "POST",
    body: JSON.stringify(profile),
  });
  if (!res.ok) throw new Error("Failed to save profile");
  return await res.json();
}

export interface PlaylistAutomationStatus {
  configured: boolean;
  authenticated: boolean;
  redirect_uri: string;
  scope: string;
  credentials_source?: string;
  user?: {
    id?: string;
    display_name?: string;
    images?: Array<{ url?: string }>;
  } | null;
}

export interface SpotifyPlaylistSummary {
  id: string;
  name: string;
  owner: string;
  editable: boolean;
  collaborative: boolean;
  public: boolean;
  tracks: number;
  image: string;
}

export interface PlaylistAutomationTrack {
  id: string;
  uri: string;
  name: string;
  artist: string;
  album: string;
  album_artist?: string;
  release_date: string;
  track_number?: number;
  disc_number?: number;
  duration_ms?: number;
  explicit?: boolean;
  popularity?: number;
  bpm?: number;
  energy?: number;
  danceability?: number;
  valence?: number;
  source_playlist?: string;
  source_playlists?: string[];
}

export interface PlaylistSortChange {
  id: string;
  type: "duplicate" | "replace";
  track_uri?: string;
  original_uri?: string;
  track_id?: string;
  newTitle?: string;
  newArtist?: string;
  newAlbum?: string;
  newDate?: string;
  remTitle?: string;
  remArtist?: string;
  remAlbum?: string;
  remDate?: string;
}

export interface PlaylistSortPreview {
  playlist_id: string;
  name: string;
  changes: PlaylistSortChange[];
  stats: {
    original_count: number;
    duplicates_removed: number;
    versions_replaced: number;
    sorted: boolean;
  };
  preview_uris?: string[];
}

export interface PlaylistAutomationSortRule {
  id: string;
  field: string;
  descending: boolean;
}

export interface PlaylistAutomationConfig {
  id: string;
  name: string;
  target_playlist_id: string;
  source_playlist_ids: string[];
  sort_rules: PlaylistAutomationSortRule[];
  sort_enabled?: boolean;
  deduplicate?: boolean;
  dupe_preference?: string;
  version_replacer?: boolean;
  version_preference?: string;
  exclude_keywords?: string[];
  include_liked_songs?: boolean;
  exclude_liked_songs?: boolean;
  sample_per_source?: number | null;
  update_mode?: "replace" | "merge" | "append";
  automatic_group?: string;
  preserve_local_files?: boolean;
}

export interface PlaylistAutomationSchedule {
  id: string;
  config_id: string;
  cron_expression: string;
  enabled: boolean;
  last_run?: number | string | null;
  next_run?: number | null;
}

export interface PlaylistAutomationHistoryItem {
  id: string;
  timestamp: number;
  action: string;
  playlist_id: string;
  playlist_name: string;
  tracks_processed: number;
}

export interface PlaylistAutomationPreview {
  source_playlist_count: number;
  source_playlists?: PlaylistAutomationSourceSummary[];
  original_count: number;
  track_count: number;
  duplicates_removed: number;
  versions_replaced: number;
  tracks: PlaylistAutomationTrack[];
  uris: string[];
}

export async function deleteProfile(profileId: string): Promise<boolean> {
  const res = await request(`/profiles/${encodeURIComponent(profileId)}`, {
    method: "DELETE",
  });
  return res.ok;
}

export async function activateProfile(profileId: string): Promise<boolean> {
  const res = await request("/profiles/active", {
    method: "POST",
    body: JSON.stringify({ profile_id: profileId }),
  });
  return res.ok;
}

export async function fetchSystemDiagnostics(): Promise<SystemDiagnostics> {
  const res = await request("/system/diagnostics");
  if (!res.ok) throw new Error("Failed to fetch system diagnostics");
  return await res.json();
}

export async function fetchUpdateInfo(force = false): Promise<UpdateInfo> {
  const suffix = force ? "?force=true" : "";
  const res = await request(`/updates/check${suffix}`);
  if (!res.ok) throw new Error("Failed to check for updates");
  return await res.json();
}

export async function fetchLogs(): Promise<LogEntry[]> {
  const res = await request("/logs");
  if (!res.ok) throw new Error("Failed to fetch server logs");
  return await res.json();
}

export async function clearLogs(): Promise<void> {
  const res = await request("/logs/clear", { method: "POST" });
  if (!res.ok) throw new Error("Failed to clear server logs");
}


export async function fetchPendingQueue(): Promise<PendingQueueItem[]> {
  const res = await request("/queue/pending");
  if (!res.ok) throw new Error("Failed to fetch pending queue");
  const data = await res.json();
  return Array.isArray(data.items) ? data.items : Object.values(data);
}

export async function fetchExportDirectory(): Promise<string> {
  const res = await request("/exports/location");
  if (!res.ok) throw new Error("Failed to fetch export directory");
  return String((await res.json()).directory || "");
}

export async function fetchPlaylistBackupDirectory(): Promise<string> {
  const res = await request("/exports/playlist-backup-location");
  if (!res.ok) throw new Error("Failed to fetch playlist backup directory");
  return String((await res.json()).directory || "");
}

export async function savePlaylistBackupDirectory(directory: string): Promise<string | null> {
  const res = await request("/exports/playlist-backup-location", {
    method: "POST",
    body: JSON.stringify({ directory }),
  });
  if (!res.ok) return null;
  return String((await res.json()).directory || "") || null;
}

export async function saveTextExport(
  filename: string,
  content: string,
  directory = "",
): Promise<string | null> {
  const res = await request("/exports/write", {
    method: "POST",
    body: JSON.stringify({ filename, content, directory }),
  });
  if (!res.ok) return null;
  return String((await res.json()).path || "") || null;
}

export async function openExportFolder(playlistBackups = false): Promise<string | null> {
  const res = await request("/exports/open-folder", {
    method: "POST",
    body: JSON.stringify({ playlist_backups: playlistBackups }),
  });
  if (!res.ok) return null;
  return String((await res.json()).path || "") || null;
}

export interface PlaylistAutomationSourceSummary {
  id: string;
  name: string;
  track_count: number;
  included_track_count?: number;
  excluded_track_count?: number;
}

export interface PlaylistAutomationRunResult {
  success: boolean;
  configs_processed?: number;
  playlist_name?: string;
  tracks_processed?: number;
  source_playlist_count?: number;
  source_track_count?: number;
  result_track_count?: number;
  source_playlists?: PlaylistAutomationSourceSummary[];
  results?: Array<Record<string, unknown>>;
  error?: string;
}

export async function fetchPlaylistAutomationStatus(): Promise<PlaylistAutomationStatus | null> {
  try {
    const res = await request("/playlist-automation/status");
    if (!res.ok) throw new Error("Failed to fetch playlist automation status");
    return await res.json();
  } catch (err) {
    console.error("Fetch playlist automation status failed:", err);
    return null;
  }
}

export function getPlaylistAutomationLoginUrl(): string {
  return getEndpoint("/playlist-automation/login");
}

export async function configurePlaylistAutomation(payload: {
  client_id: string;
  client_secret: string;
  redirect_uri?: string;
}): Promise<PlaylistAutomationStatus | null> {
  try {
    const res = await request("/playlist-automation/config", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Could not save Spotify playlist credentials");
    return await res.json();
  } catch (err) {
    console.error("Configure playlist automation failed:", err);
    return null;
  }
}

export async function logoutPlaylistAutomation(): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/logout", {
      method: "POST",
    });
    return res.ok;
  } catch (err) {
    console.error("Playlist automation logout failed:", err);
    return false;
  }
}

export async function fetchPlaylistAutomationPlaylists(): Promise<
  SpotifyPlaylistSummary[]
> {
  try {
    const res = await request("/playlist-automation/playlists");
    if (!res.ok) throw new Error("Failed to fetch Spotify playlists");
    const data = await res.json();
    return Array.isArray(data.playlists) ? data.playlists : [];
  } catch (err) {
    console.error("Fetch Spotify playlists failed:", err);
    return [];
  }
}

export async function scanPlaylistAutomation(
  payload: Record<string, unknown>,
): Promise<PlaylistAutomationPreview | null> {
  try {
    const res = await request("/playlist-automation/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail ||
          "Failed to scan playlists",
      );
    return await res.json();
  } catch (err) {
    console.error("Scan playlists failed:", err);
    return null;
  }
}

export async function scanSelectedPlaylistsForSorting(
  payload: Record<string, unknown>,
): Promise<PlaylistSortPreview[]> {
  try {
    const res = await request("/playlist-automation/sort/scan", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail ||
          "Failed to scan playlists for sorting",
      );
    const data = await res.json();
    return Array.isArray(data.playlists) ? data.playlists : [];
  } catch (err) {
    console.error("Scan selected playlists failed:", err);
    return [];
  }
}

export async function applySelectedPlaylistSorting(
  payload: Record<string, unknown>,
): Promise<{
  success: boolean;
  playlist_name?: string;
  tracks_processed?: number;
} | null> {
  try {
    const res = await request("/playlist-automation/sort/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail ||
          "Failed to apply playlist sorting",
      );
    return await res.json();
  } catch (err) {
    console.error("Apply playlist sorting failed:", err);
    return null;
  }
}

export async function applyPlaylistAutomation(
  payload: Record<string, unknown>,
): Promise<{
  success: boolean;
  playlist_name?: string;
  tracks_processed?: number;
} | null> {
  try {
    const res = await request("/playlist-automation/apply", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    if (!res.ok)
      throw new Error(
        (await res.json().catch(() => ({}))).detail ||
          "Failed to update playlist",
      );
    return await res.json();
  } catch (err) {
    console.error("Apply playlist automation failed:", err);
    return null;
  }
}

export async function fetchPlaylistAutomationHistory(): Promise<
  PlaylistAutomationHistoryItem[]
> {
  try {
    const res = await request("/playlist-automation/history");
    if (!res.ok) throw new Error("Failed to fetch playlist history");
    const data = await res.json();
    return Array.isArray(data.history) ? data.history : [];
  } catch (err) {
    console.error("Fetch playlist automation history failed:", err);
    return [];
  }
}

export async function restorePlaylistAutomationHistory(
  id: string,
): Promise<boolean> {
  try {
    const res = await request(
      `/playlist-automation/history/${encodeURIComponent(id)}/restore`,
      { method: "POST" },
    );
    return res.ok;
  } catch (err) {
    console.error("Restore playlist history failed:", err);
    return false;
  }
}

export async function clearPlaylistAutomationHistory(): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/history", {
      method: "DELETE",
    });
    return res.ok;
  } catch (err) {
    console.error("Clear playlist history failed:", err);
    return false;
  }
}

export async function deletePlaylistAutomationHistory(
  id: string,
): Promise<boolean> {
  try {
    const res = await request(
      `/playlist-automation/history/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (err) {
    console.error("Delete playlist history failed:", err);
    return false;
  }
}

export async function comparePlaylistAutomation(
  playlist_ids: string[],
): Promise<{
  playlists_compared: number;
  duplicate_count: number;
  duplicates: Array<{
    name: string;
    artist: string;
    track_id: string;
    found_in_playlists: string[];
  }>;
} | null> {
  try {
    const res = await request("/playlist-automation/compare", {
      method: "POST",
      body: JSON.stringify({ playlist_ids }),
    });
    if (!res.ok) throw new Error("Failed to compare playlists");
    return await res.json();
  } catch (err) {
    console.error("Compare playlists failed:", err);
    return null;
  }
}

export async function removePlaylistAutomationTrack(
  playlist_id: string,
  track_uri: string,
): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/remove-track", {
      method: "POST",
      body: JSON.stringify({ playlist_id, track_uri }),
    });
    return res.ok;
  } catch (err) {
    console.error("Remove playlist duplicate failed:", err);
    return false;
  }
}

export async function ignorePlaylistAutomationTrack(
  track: PlaylistAutomationTrack,
): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/ignored", {
      method: "POST",
      body: JSON.stringify(track),
    });
    return res.ok;
  } catch (err) {
    console.error("Ignore playlist track failed:", err);
    return false;
  }
}

export async function fetchIgnoredPlaylistAutomationTracks(): Promise<
  Array<{ track_id: string; name: string; artist: string }>
> {
  try {
    const res = await request("/playlist-automation/ignored");
    if (!res.ok) throw new Error("Failed to fetch ignored tracks");
    const data = await res.json();
    return Array.isArray(data.items) ? data.items : [];
  } catch (err) {
    console.error("Fetch ignored playlist tracks failed:", err);
    return [];
  }
}

export async function removeIgnoredPlaylistAutomationTracks(
  track_ids: string[],
): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/ignored", {
      method: "DELETE",
      body: JSON.stringify({ track_ids }),
    });
    return res.ok;
  } catch (err) {
    console.error("Remove ignored playlist tracks failed:", err);
    return false;
  }
}

export async function fetchPlaylistAutomationConfigs(): Promise<
  PlaylistAutomationConfig[]
> {
  try {
    const res = await request("/playlist-automation/configs");
    if (!res.ok) throw new Error("Failed to fetch automation configs");
    const data = await res.json();
    return Array.isArray(data.configs) ? data.configs : [];
  } catch (err) {
    console.error("Fetch automation configs failed:", err);
    return [];
  }
}

export async function savePlaylistAutomationConfig(
  value: Partial<PlaylistAutomationConfig>,
): Promise<PlaylistAutomationConfig | null> {
  try {
    const res = await request("/playlist-automation/configs", {
      method: "POST",
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error("Failed to save automation config");
    return await res.json();
  } catch (err) {
    console.error("Save automation config failed:", err);
    return null;
  }
}

export async function deletePlaylistAutomationConfig(
  id: string,
): Promise<boolean> {
  try {
    const res = await request(
      `/playlist-automation/configs/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (err) {
    console.error("Delete automation config failed:", err);
    return false;
  }
}

export async function reorderPlaylistAutomationConfigs(
  config_ids: string[],
): Promise<PlaylistAutomationConfig[] | null> {
  try {
    const res = await request("/playlist-automation/configs/reorder", {
      method: "POST",
      body: JSON.stringify({ config_ids }),
    });
    if (!res.ok) throw new Error("Failed to reorder automation configs");
    const data = await res.json();
    return Array.isArray(data.configs) ? data.configs : [];
  } catch (err) {
    console.error("Reorder automation configs failed:", err);
    return null;
  }
}

export async function runPlaylistAutomationConfig(
  id: string,
): Promise<PlaylistAutomationRunResult> {
  try {
    const res = await request(
      `/playlist-automation/configs/${encodeURIComponent(id)}/run`,
      { method: "POST" },
    );
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      return {
        success: false,
        error: String(payload.detail || "Failed to run playlist automation"),
      };
    }
    return (await res.json()) as PlaylistAutomationRunResult;
  } catch (err) {
    console.error("Run automation config failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to run playlist automation",
    };
  }
}

export async function runAllPlaylistAutomationConfigs(): Promise<{
  success: boolean;
  configs_processed?: number;
  results?: Array<Record<string, unknown>>;
  error?: string;
} | null> {
  try {
    const res = await request("/playlist-automation/configs/run-all", {
      method: "POST",
    });
    if (!res.ok) {
      const payload = await res.json().catch(() => ({}));
      throw new Error(String(payload.detail || "Failed to run playlist sorting configs"));
    }
    return (await res.json()) as {
      success: boolean;
      configs_processed?: number;
      results?: Array<Record<string, unknown>>;
      error?: string;
    };
  } catch (err) {
    console.error("Run all playlist configs failed:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to run playlist sorting configs",
    };
  }
}

export async function fetchPlaylistAutomationSchedules(): Promise<
  PlaylistAutomationSchedule[]
> {
  try {
    const res = await request("/playlist-automation/schedules");
    if (!res.ok) throw new Error("Failed to fetch automation schedules");
    const data = await res.json();
    return Array.isArray(data.schedules) ? data.schedules : [];
  } catch (err) {
    console.error("Fetch automation schedules failed:", err);
    return [];
  }
}

export async function savePlaylistAutomationSchedule(
  value: Partial<PlaylistAutomationSchedule>,
): Promise<PlaylistAutomationSchedule | null> {
  try {
    const res = await request("/playlist-automation/schedules", {
      method: "POST",
      body: JSON.stringify(value),
    });
    if (!res.ok) throw new Error("Failed to save automation schedule");
    return await res.json();
  } catch (err) {
    console.error("Save automation schedule failed:", err);
    return null;
  }
}

export async function deletePlaylistAutomationSchedule(
  id: string,
): Promise<boolean> {
  try {
    const res = await request(
      `/playlist-automation/schedules/${encodeURIComponent(id)}`,
      { method: "DELETE" },
    );
    return res.ok;
  } catch (err) {
    console.error("Delete automation schedule failed:", err);
    return false;
  }
}

export async function fetchPlaylistAutomationBackups(): Promise<
  Array<{ filename: string; created_at: number; playlists: number }>
> {
  try {
    const res = await request("/playlist-automation/backups");
    if (!res.ok) throw new Error("Failed to fetch playlist backups");
    const data = await res.json();
    return Array.isArray(data.backups) ? data.backups : [];
  } catch (err) {
    console.error("Fetch playlist backups failed:", err);
    return [];
  }
}

export async function createPlaylistAutomationBackup(
  playlist_ids: string[],
): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/backups", {
      method: "POST",
      body: JSON.stringify({ playlist_ids }),
    });
    return res.ok;
  } catch (err) {
    console.error("Create playlist backup failed:", err);
    return false;
  }
}

export async function restorePlaylistAutomationBackup(
  filename: string,
  target_playlist_id = "",
): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/backups/restore", {
      method: "POST",
      body: JSON.stringify({ filename, target_playlist_id }),
    });
    return res.ok;
  } catch (err) {
    console.error("Restore playlist backup failed:", err);
    return false;
  }
}

export function downloadPlaylistAutomationConfig(): void {
  window.open(getEndpoint("/playlist-automation/export/config"), "_blank");
}

export async function importPlaylistAutomationConfig(
  value: Record<string, unknown>,
): Promise<boolean> {
  try {
    const res = await request("/playlist-automation/import/config", {
      method: "POST",
      body: JSON.stringify(value),
    });
    return res.ok;
  } catch (err) {
    console.error("Import playlist automation config failed:", err);
    return false;
  }
}

export async function exportPlaylistAutomationCsv(
  tracks: PlaylistAutomationTrack[],
): Promise<Blob | null> {
  try {
    const res = await request("/playlist-automation/export/csv", {
      method: "POST",
      body: JSON.stringify({ tracks }),
    });
    if (!res.ok) throw new Error("Failed to export playlist CSV");
    return await res.blob();
  } catch (err) {
    console.error("Export playlist CSV failed:", err);
    return null;
  }
}

export async function exportSelectedPlaylistsCsv(
  playlist_ids: string[],
): Promise<Blob | null> {
  try {
    const res = await request("/playlist-automation/export/playlists-csv", {
      method: "POST",
      body: JSON.stringify({ playlist_ids }),
    });
    if (!res.ok) throw new Error("Failed to export selected playlists");
    return await res.blob();
  } catch (err) {
    console.error("Export selected playlists failed:", err);
    return null;
  }
}

export function getSelectedPlaylistsCsvUrl(playlist_ids: string[]): string {
  return `${getEndpoint("/playlist-automation/export/playlists-csv")}?playlist_ids=${encodeURIComponent(playlist_ids.join(","))}`;
}

export async function saveSelectedPlaylistsCsv(
  playlist_ids: string[],
  directory = "",
): Promise<string | null> {
  try {
    const res = await request(
      "/playlist-automation/export/playlists-csv-file",
      { method: "POST", body: JSON.stringify({ playlist_ids, directory }) },
    );
    if (!res.ok) throw new Error("Failed to save selected playlists CSV");
    return String((await res.json()).path || "") || null;
  } catch (err) {
    console.error("Save selected playlists CSV failed:", err);
    return null;
  }
}

export async function savePlaylistAutomationConfigFile(
  directory = "",
): Promise<string | null> {
  try {
    const res = await request("/playlist-automation/export/config-file", {
      method: "POST",
      body: JSON.stringify({ directory }),
    });
    if (!res.ok) throw new Error("Failed to save playlist automation config");
    return String((await res.json()).path || "") || null;
  } catch (err) {
    console.error("Save playlist automation config failed:", err);
    return null;
  }
}

export async function removePendingItems(pendingIds: string[]): Promise<boolean> {
  const res = await request("/queue/pending/remove", {
    method: "POST",
    body: JSON.stringify({ pending_ids: pendingIds }),
  });
  return res.ok;
}

export async function clearAllPending(): Promise<void> {
  const res = await request("/queue/pending/clear", { method: "POST" });
  if (!res.ok) throw new Error("Failed to clear all pending items");
}
