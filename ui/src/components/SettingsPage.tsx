import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { StatusDot } from "@astryxdesign/core/StatusDot";
import { Switch } from "@astryxdesign/core/Switch";
import { Tab, TabList } from "@astryxdesign/core/TabList";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  Cpu,
  Download,
  Music,
  RefreshCw,
  RotateCcw,
  Save,
  Server,
  Sliders,
  Tag
} from "lucide-react";
import React, { useState } from "react";
import { getTargetBackendUrl, setTargetBackendUrl, testBackendConnection } from "../lib/api";
import { DownloadProfile, OTSConfig } from "../types";
import { PageHeader } from "./PageHeader";

interface SettingsPageProps {
  config: OTSConfig;
  profiles: DownloadProfile[];
  activeProfile: string;
  onUpdateValue: (key: string, value: any) => Promise<boolean>;
  onSave: () => Promise<boolean>;
  onReset: () => Promise<void>;
  onActivateProfile: (profileId: string) => Promise<boolean>;
  onSaveProfile: (profile: DownloadProfile) => Promise<DownloadProfile>;
  onDeleteProfile: (profileId: string) => Promise<boolean>;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({
  config,
  profiles,
  activeProfile,
  onUpdateValue,
  onSave,
  onReset,
  onActivateProfile,
}) => {
  const [activeTab, setActiveTab] = useState("general");
  const [localBackendUrl, setLocalBackendUrl] = useState(getTargetBackendUrl());
  const [isSavedNotice, setIsSavedNotice] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isTestingConn, setIsTestingConn] = useState(false);
  const [connStatus, setConnStatus] = useState<"idle" | "connected" | "failed">("idle");

  const handleSaveAll = async () => {
    setIsSaving(true);
    setTargetBackendUrl(localBackendUrl);
    await onSave();
    setIsSaving(false);
    setIsSavedNotice(true);
    setTimeout(() => setIsSavedNotice(false), 2500);
  };

  const handleTestConnection = async () => {
    setIsTestingConn(true);
    setConnStatus("idle");
    const ok = await testBackendConnection(localBackendUrl);
    setIsTestingConn(false);
    setConnStatus(ok ? "connected" : "failed");
  };

  return (
    <div className="space-y-5" id="settings-view">
      {/* Reusable PageHeader for Settings */}
      <PageHeader
        id="settings-page-header"
        icon={<Sliders className="w-5 h-5" />}
        title="Settings & Configuration"
        badge={isSavedNotice ? { label: "Saved Successfully", variant: "success" } : undefined}
        description="Configure downloader concurrency, metadata embedding, directory paths, and audio profiles"
        actions={
          <>
            <Button
              variant="ghost"
              size="sm"
              label="Reset Defaults"
              icon={<RotateCcw className="w-3.5 h-3.5" />}
              onClick={onReset}
              id="btn-settings-reset"
            />
            <Button
              variant="primary"
              size="sm"
              label="Save Configuration"
              icon={<Save className="w-3.5 h-3.5" />}
              onClick={handleSaveAll}
              isLoading={isSaving}
              id="btn-settings-save"
            />
          </>
        }
        bottomContent={
          <div className="overflow-x-auto h-8">
            <TabList
              value={activeTab}
              onChange={(tabId) => setActiveTab(tabId)}
              size="sm"
            >
              <Tab
                value="general"
                label="General & Workers"
                icon={<Cpu className="w-3.5 h-3.5" />}
              />
              <Tab
                value="audio"
                label="Audio & Output"
                icon={<Music className="w-3.5 h-3.5" />}
              />
              <Tab
                value="profiles"
                label="Download Profiles"
                icon={<Download className="w-3.5 h-3.5" />}
              />
              <Tab
                value="metadata"
                label="ID3 Tagging"
                icon={<Tag className="w-3.5 h-3.5" />}
              />
              <Tab
                value="backend"
                label="Backend API"
                icon={<Server className="w-3.5 h-3.5" />}
              />
            </TabList>
          </div>
        }
      />

      {/* Tab Panels */}

      {/* 1. General & Workers */}
      {activeTab === "general" && (
        <div className="space-y-4" id="settings-tab-general">
          <Card padding={4} elevation="low">
            <div className="flex items-center gap-2 mb-4">
              <Cpu className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Worker Thread Concurrency & Parameters
              </h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Maximum Download Workers
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={config.maximum_download_workers || 2}
                  onChange={(e) => onUpdateValue("maximum_download_workers", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Simultaneous file streams. Keep at 2–3 to avoid rate limits on streaming accounts.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Queue Polling Workers
                </label>
                <input
                  type="number"
                  min={1}
                  max={8}
                  value={config.maximum_queue_workers || 4}
                  onChange={(e) => onUpdateValue("maximum_queue_workers", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Background threads parsing track links and gathering album tracklists.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Download Delay (Seconds)
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={0}
                  value={config.download_delay || 1.5}
                  onChange={(e) => onUpdateValue("download_delay", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Artificial delay between item downloads to simulate organic playback requests.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Download Delay Variance (Seconds)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min={0}
                  value={config.download_delay_variance || 0.5}
                  onChange={(e) => onUpdateValue("download_delay_variance", parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Adds random variance (± seconds) to delay to break static automation footprints.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  API Retry Attempts
                </label>
                <input
                  type="number"
                  min={1}
                  max={10}
                  value={config.api_retry_max_attempts || 3}
                  onChange={(e) => onUpdateValue("api_retry_max_attempts", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Maximum retries for failed chunks before moving to the Failed state.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Retry Worker Delay (Minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={60}
                  value={config.retry_worker_delay || 5}
                  onChange={(e) => onUpdateValue("retry_worker_delay", parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Cool-down window before re-triggering downloads for rate-limited objects.
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  Max Search Results per Service
                </label>
                <input
                  type="number"
                  min={5}
                  max={100}
                  value={config.max_search_results || 20}
                  onChange={(e) => onUpdateValue("max_search_results", parseInt(e.target.value) || 20)}
                  className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Limits the maximum items fetched per single query across service catalogs.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                Concurrency &amp; Automation Toggles
              </h4>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 space-y-4">
                <div className="pt-2 first:pt-0">
                  <Switch
                    label="Automatic Worker Account Rotation"
                    description="Rotate across all authenticated accounts of the same service to distribute download load."
                    value={Boolean(config.rotate_active_account_number)}
                    onChange={(checked) => onUpdateValue("rotate_active_account_number", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    label="Automatic Retry Worker"
                    description="Automatically re-enqueue items that failed due to temporary network timeouts or rate limits."
                    value={Boolean(config.enable_retry_worker)}
                    onChange={(checked) => onUpdateValue("enable_retry_worker", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    label="Cache API Connection Calls"
                    description="Enable local memory caching of API metadata retrievals to significantly accelerate duplicate searches."
                    value={Boolean(config.cache_api_calls)}
                    onChange={(checked) => onUpdateValue("cache_api_calls", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    label="Debug Logging Mode"
                    description="Output verbose payload diagnostics, authentication tokens, and raw HTTP responses to the log viewer."
                    value={Boolean(config.debug_mode)}
                    onChange={(checked) => onUpdateValue("debug_mode", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                UI &amp; Visual Preference Toggles
              </h4>

              <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 space-y-4">
                <div className="pt-2 first:pt-0">
                  <Switch
                    label="Show Search Thumbnails"
                    description="Display high-resolution cover artwork thumbnails directly in search catalog results."
                    value={Boolean(config.show_search_thumbnails)}
                    onChange={(checked) => onUpdateValue("show_search_thumbnails", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    label="Show Download Thumbnails"
                    description="Display media artwork inside the download queue cards for immediate item recognition."
                    value={Boolean(config.show_download_thumbnails)}
                    onChange={(checked) => onUpdateValue("show_download_thumbnails", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="pt-4">
                  <Switch
                    label="Disable Download Popups"
                    description="Do not display instant banner messages or toast notifications when sending new files to queue."
                    value={Boolean(config.disable_download_popups)}
                    onChange={(checked) => onUpdateValue("disable_download_popups", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>
              </div>
            </div>

            <div className="mt-6 pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-2">
                Service Search Filters
              </h4>
              <p className="text-[11px] text-neutral-500 mb-4">
                Toggle which specific media categories are targeted and requested during universal search queries.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <Switch
                    label="Tracks"
                    value={Boolean(config.enable_search_tracks)}
                    onChange={(checked) => onUpdateValue("enable_search_tracks", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="p-3 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <Switch
                    label="Albums"
                    value={Boolean(config.enable_search_albums)}
                    onChange={(checked) => onUpdateValue("enable_search_albums", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="p-3 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <Switch
                    label="Playlists"
                    value={Boolean(config.enable_search_playlists)}
                    onChange={(checked) => onUpdateValue("enable_search_playlists", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="p-3 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <Switch
                    label="Artists"
                    value={Boolean(config.enable_search_artists)}
                    onChange={(checked) => onUpdateValue("enable_search_artists", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="p-3 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <Switch
                    label="Podcasts"
                    value={Boolean(config.enable_search_podcasts)}
                    onChange={(checked) => onUpdateValue("enable_search_podcasts", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>

                <div className="p-3 rounded-lg border border-neutral-200/50 dark:border-neutral-800/60 bg-neutral-50/50 dark:bg-neutral-900/30">
                  <Switch
                    label="Audiobooks"
                    value={Boolean(config.enable_search_audiobooks)}
                    onChange={(checked) => onUpdateValue("enable_search_audiobooks", checked)}
                    labelPosition="start"
                    labelSpacing="spread"
                  />
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 2. Audio & Output */}
      {activeTab === "audio" && (
        <div className="space-y-4" id="settings-tab-audio">
          <Card padding={4} elevation="low">
            <div className="flex items-center gap-2 mb-4">
              <Music className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                Download Paths &amp; File Formatting
              </h3>
            </div>

            <div className="space-y-4">
              <TextInput
                label="Destination Music Folder"
                type="text"
                value={config.audio_download_path || "/music/OnTheSpot"}
                onChange={(val) => onUpdateValue("audio_download_path", val)}
                description="Root directory where all downloaded music will be structured and saved."
                size="md"
              />

              <TextInput
                label="Track File Name Pattern"
                type="text"
                value={config.track_path_formatter || "{artist}/{album}/{track_number} - {title}"}
                onChange={(val) => onUpdateValue("track_path_formatter", val)}
                description="Available tags: {artist}, {album}, {track_number}, {title}, {year}, {genre}"
                size="md"
              />

              <TextInput
                label="Playlist Folder Pattern"
                type="text"
                value={config.playlist_path_formatter || "Playlists/{playlist_name}/{track_number} - {title}"}
                onChange={(val) => onUpdateValue("playlist_path_formatter", val)}
                description="Subdirectory naming convention for queued playlist items."
                size="md"
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <TextInput
                  label="Podcast Directory Pattern"
                  type="text"
                  value={config.podcast_path_formatter || "Podcasts/{podcast_name}/{release_date} - {title}"}
                  onChange={(val) => onUpdateValue("podcast_path_formatter", val)}
                  description="Subdirectory naming convention for podcast series."
                  size="md"
                />

                <TextInput
                  label="Podcast File Format"
                  type="text"
                  value={config.podcast_file_format || "mp3"}
                  onChange={(val) => onUpdateValue("podcast_file_format", val)}
                  description="Default target audio container for voice streams (e.g., mp3, m4a)."
                  size="md"
                />

                <TextInput
                  label="Album Cover Image Format"
                  type="text"
                  value={config.album_cover_format || "jpg"}
                  onChange={(val) => onUpdateValue("album_cover_format", val)}
                  description="Format for separate folder cover assets (e.g., jpg, png)."
                  size="md"
                />

                <div>
                  <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                    Audio Resampling Sample Rate (Hertz)
                  </label>
                  <input
                    type="number"
                    min={22050}
                    max={192000}
                    step={100}
                    value={config.file_hertz || 44100}
                    onChange={(e) => onUpdateValue("file_hertz", parseInt(e.target.value) || 44100)}
                    className="w-full px-3 py-1.5 text-xs rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-neutral-400"
                  />
                  <p className="text-[11px] text-neutral-500 mt-1">
                    Forces output audio resampling. Standard defaults are 44100 or 48000.
                  </p>
                </div>
              </div>

              <div className="pt-5 border-t border-neutral-200 dark:border-neutral-800 space-y-4">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500">
                  Output &amp; Streaming Customization
                </h4>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 space-y-4">
                  <div className="pt-2 first:pt-0">
                    <Switch
                      label="Use Playlist Path Structure"
                      description="Automatically isolate queued playlist tracks inside the custom playlist subdirectory pattern instead of standard artist/album layout."
                      value={Boolean(config.use_playlist_path)}
                      onChange={(checked) => onUpdateValue("use_playlist_path", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Create M3U8 Playlist Files"
                      description="Generate standard .m3u8 playlist files inside playlist folders for external media scrapers."
                      value={Boolean(config.create_m3u_file)}
                      onChange={(checked) => onUpdateValue("create_m3u_file", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Save Separate Album Artwork Image"
                      description="Extract and save folder.jpg or cover.jpg alongside audio tracks inside directory folders."
                      value={Boolean(config.save_album_cover)}
                      onChange={(checked) => onUpdateValue("save_album_cover", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Apply Custom Conversion Bitrate"
                      description="Convert output tracks utilizing specified constant bitrate presets where supported."
                      value={Boolean(config.use_custom_file_bitrate)}
                      onChange={(checked) => onUpdateValue("use_custom_file_bitrate", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Raw Media Download"
                      description="Write directly streamed chunks straight to file storage without executing merging or decoding operations."
                      value={Boolean(config.raw_media_download)}
                      onChange={(checked) => onUpdateValue("raw_media_download", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Discard Unsynced Lyrics"
                      description="Filter lyrics download routines and only store time-synchronized lyric packages (.lrc format)."
                      value={Boolean(config.only_download_synced_lyrics)}
                      onChange={(checked) => onUpdateValue("only_download_synced_lyrics", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 3. Download Profiles */}
      {activeTab === "profiles" && (
        <div className="space-y-4" id="settings-tab-profiles">
          <Card padding={4} elevation="low">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-2">
                  <Download className="w-4 h-4 text-neutral-500" />
                  <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                    Audio Quality Profiles
                  </h3>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Select which quality profile is applied by default when queuing new items
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {profiles.map((prof) => {
                const isActive = prof.id === (config.active_download_profile || activeProfile);
                return (
                  <Card
                    key={prof.id}
                    padding={4}
                    elevation="low"
                    id={`profile-card-${prof.id}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                            {prof.name}
                          </h4>
                          {isActive && (
                            <Badge variant="success" label="Active Default" />
                          )}
                        </div>
                        <p className="text-xs font-mono text-neutral-500 mt-1">
                          Format: {prof.format} • Bitrate: {prof.bitrate}
                        </p>
                      </div>

                      {!isActive && (
                        <Button
                          variant="secondary"
                          size="sm"
                          label="Set Default"
                          onClick={() => onActivateProfile(prof.id)}
                        />
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-500 flex items-center justify-between">
                      <span>Cover Art: {prof.embed_cover ? "Embedded" : "No"}</span>
                      <span>Lyrics: {prof.embed_lyrics ? "Embedded" : "No"}</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          </Card>
        </div>
      )}

      {/* 4. ID3 Tagging & Metadata */}
      {activeTab === "metadata" && (
        <div className="space-y-4" id="settings-tab-metadata">
          <Card padding={4} elevation="low">
            <div className="flex items-center gap-2 mb-4">
              <Tag className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                ID3 Tag Embedding &amp; Lyrics
              </h3>
            </div>

            <div className="space-y-6">
              <div>
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                  ID3 Container Text Fields
                </h4>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 space-y-4">
                  <div className="pt-2 first:pt-0">
                    <Switch
                      label="Embed Track Title"
                      description="Write the title metadata parameter into target media headers."
                      value={Boolean(config.embed_name)}
                      onChange={(checked) => onUpdateValue("embed_name", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Artist Tag"
                      description="Write the primary artist name/creator parameter to the ID3 block."
                      value={Boolean(config.embed_artist)}
                      onChange={(checked) => onUpdateValue("embed_artist", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Album Tag"
                      description="Write track's parent album or collection title to the ID3 container."
                      value={Boolean(config.embed_album)}
                      onChange={(checked) => onUpdateValue("embed_album", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Album Artist Tag"
                      description="Write the primary artist of the album block specifically to its dedicated field."
                      value={Boolean(config.embed_albumartist)}
                      onChange={(checked) => onUpdateValue("embed_albumartist", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Genre Tags"
                      description="Lookup and fetch genre categorizations from databases and inject metadata tags."
                      value={Boolean(config.embed_genre)}
                      onChange={(checked) => onUpdateValue("embed_genre", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Release Year &amp; Date"
                      description="Write release year, month, and full date identifiers to headers."
                      value={Boolean(config.embed_year)}
                      onChange={(checked) => onUpdateValue("embed_year", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>
                </div>
              </div>

              <div className="border-t border-neutral-200 dark:border-neutral-800 pt-5">
                <h4 className="text-xs font-bold uppercase tracking-wider text-neutral-400 dark:text-neutral-500 mb-3">
                  Rich Elements &amp; Lyrics Tagging
                </h4>

                <div className="divide-y divide-neutral-100 dark:divide-neutral-800/60 space-y-4">
                  <div className="pt-2 first:pt-0">
                    <Switch
                      label="Embed Album Artwork"
                      description="Embed high-resolution artwork directly into the file's ID3 / FLAC metadata blocks."
                      value={Boolean(config.embed_cover)}
                      onChange={(checked) => onUpdateValue("embed_cover", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Download Synced Lyrics (.lrc)"
                      description="Fetch synchronized subtitle-style lyric files and store them alongside output tracks."
                      value={Boolean(config.save_lrc_file)}
                      onChange={(checked) => onUpdateValue("save_lrc_file", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Lyrics in Audio File"
                      description="Embed lyric text lines into USLT or SYLT metadata frames of the audio file."
                      value={Boolean(config.embed_lyrics)}
                      onChange={(checked) => onUpdateValue("embed_lyrics", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Explicit Content Advisory"
                      description="Insert parental advisory classification tags to identify explicit lyrics."
                      value={Boolean(config.embed_explicit)}
                      onChange={(checked) => onUpdateValue("embed_explicit", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>

                  <div className="pt-4">
                    <Switch
                      label="Embed Branding Comments"
                      description="Inject 'Downloaded with OnTheSpot' brand comment markers inside container structures."
                      value={Boolean(config.embed_branding)}
                      onChange={(checked) => onUpdateValue("embed_branding", checked)}
                      labelPosition="start"
                      labelSpacing="spread"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* 5. Backend Connection */}
      {activeTab === "backend" && (
        <div className="space-y-4" id="settings-tab-backend">
          <Card padding={4} elevation="low">
            <div className="flex items-center gap-2 mb-4">
              <Server className="w-4 h-4 text-neutral-500" />
              <h3 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
                FastAPI Backend Endpoint
              </h3>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-neutral-700 dark:text-neutral-300 mb-1.5">
                  OnTheSpot FastAPI Server URL
                </label>
                <div className="flex flex-col sm:flex-row gap-2">
                  <div className="flex-1">
                    <TextInput
                      label="Backend URL"
                      isLabelHidden={true}
                      value={localBackendUrl}
                      onChange={(val) => setLocalBackendUrl(val)}
                      placeholder="http://localhost:8000"
                      size="md"
                    />
                  </div>
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    label="Test Connection"
                    icon={<RefreshCw className="w-3.5 h-3.5" />}
                    onClick={handleTestConnection}
                    isLoading={isTestingConn}
                  />
                </div>
                <p className="text-[11px] text-neutral-500 mt-1">
                  Point this UI to your local or remote OnTheSpot daemon. If unreachable, the UI falls back to simulated offline state.
                </p>
              </div>

              {connStatus !== "idle" && (
                <div
                  className={`p-3 rounded-lg border text-xs flex items-center gap-2.5 ${
                    connStatus === "connected"
                      ? "border-green-300 bg-green-50 dark:bg-green-950/20 text-green-800 dark:text-green-300"
                      : "border-red-300 bg-red-50 dark:bg-red-950/20 text-red-800 dark:text-red-300"
                  }`}
                >
                  <StatusDot
                    variant={connStatus === "connected" ? "success" : "error"}
                    label={connStatus === "connected" ? "Connected" : "Disconnected"}
                  />
                  <span>
                    {connStatus === "connected"
                      ? `Successfully connected to FastAPI daemon at ${localBackendUrl}`
                      : `Could not reach ${localBackendUrl}. Using local mock state.`}
                  </span>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}
    </div>
  );
};
