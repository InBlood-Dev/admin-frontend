import api from './api';

export interface AppSettings {
  maintenance_mode: boolean;
  discovery_enabled: boolean;
  force_update_enabled: boolean;
  min_app_version: string;
  daily_swipe_limit: number;
  daily_super_like_limit: number;
  story_expiry_hours: number;
  max_photos: number;
  premium_whatsapp_group_url: string;
  paywall_enabled: boolean;
  paywall_browsing_threshold: number;
  paywall_chatting_threshold: number;
  updated_at: string | null;
}

async function getSettings(): Promise<AppSettings> {
  const { data } = await api.get('/admin/settings');
  return data.data;
}

async function updateSettings(updates: Partial<Omit<AppSettings, 'updated_at'>>): Promise<AppSettings> {
  const { data } = await api.put('/admin/settings', updates);
  return data.data;
}

const settingsService = {
  getSettings,
  updateSettings,
};

export default settingsService;
