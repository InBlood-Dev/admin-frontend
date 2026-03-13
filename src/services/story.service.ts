import api from './api';
import type {
  AdminStory,
  PaginatedStoriesResponse,
} from '../types';

export interface ListStoriesParams {
  page?: number;
  limit?: number;
  media_type?: 'image' | 'video';
  show_deleted?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

async function listStories(params: ListStoriesParams = {}): Promise<PaginatedStoriesResponse> {
  const { data } = await api.get('/admin/stories', { params });
  return data.data;
}

async function deleteStory(storyId: string): Promise<AdminStory> {
  const { data } = await api.put(`/admin/stories/${storyId}/delete`);
  return data.data;
}

async function restoreStory(storyId: string): Promise<AdminStory> {
  const { data } = await api.put(`/admin/stories/${storyId}/restore`);
  return data.data;
}

async function clearStory(storyId: string): Promise<AdminStory> {
  const { data } = await api.put(`/admin/stories/${storyId}/clear`);
  return data.data;
}

const storyService = {
  listStories,
  deleteStory,
  restoreStory,
  clearStory,
};

export default storyService;
