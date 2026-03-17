import api from './api';
import type {
  AdminUserListItem,
  AdminUserProfile,
  AdminUserMatch,
  AdminUserReport,
  AdminSubscription,
  PaginatedUsersResponse,
  PaginatedMatchesResponse,
} from '../types';

export interface ListUsersParams {
  page?: number;
  limit?: number;
  search?: string;
  gender?: string;
  is_verified?: boolean;
  is_premium?: boolean;
  is_banned?: boolean;
  is_online?: boolean;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface CreateUserData {
  name: string;
  email: string;
  gender: string;
  age: number;
}

export type UpdateUserData = Partial<{
  name: string;
  email: string;
  age: number;
  gender: string;
  bio: string | null;
  job_title: string | null;
  company: string | null;
  education: string | null;
  drinking: string | null;
  smoking: string | null;
  exercise: string | null;
  pets: string | null;
  pronouns: string | null;
  sexual_orientation: string | null;
  interests: string[];
  languages: string[];
  is_discoverable: boolean;
  proximity_range: number | null;
  age_min: number | null;
  age_max: number | null;
}>;

export interface UserReportsResponse {
  reports_filed: AdminUserReport[];
  reports_received: AdminUserReport[];
}

async function listUsers(params: ListUsersParams = {}): Promise<PaginatedUsersResponse> {
  const { data } = await api.get('/admin/users', { params });
  return data.data;
}

async function getUserProfile(userId: string): Promise<AdminUserProfile> {
  const { data } = await api.get(`/admin/users/${userId}`);
  return data.data;
}

async function createUser(payload: CreateUserData): Promise<AdminUserProfile> {
  const { data } = await api.post('/admin/users', payload);
  return data.data;
}

async function updateUser(userId: string, payload: UpdateUserData): Promise<AdminUserProfile> {
  const { data } = await api.put(`/admin/users/${userId}`, payload);
  return data.data;
}

async function banUser(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/ban`);
}

async function unbanUser(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/unban`);
}

async function forceVerifyUser(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/verify`);
}

async function rejectVerification(userId: string, reason: string): Promise<void> {
  await api.put(`/admin/users/${userId}/reject-verification`, { reason });
}

async function getUserMatches(
  userId: string,
  params: { page?: number; limit?: number } = {}
): Promise<PaginatedMatchesResponse> {
  const { data } = await api.get(`/admin/users/${userId}/matches`, { params });
  return data.data;
}

async function getUserReports(userId: string): Promise<UserReportsResponse> {
  const { data } = await api.get(`/admin/users/${userId}/reports`);
  return data.data;
}

async function grantSubscription(userId: string, planType: string): Promise<AdminSubscription> {
  const { data } = await api.post(`/admin/users/${userId}/subscription/grant`, { plan_type: planType });
  return data.data;
}

async function revokeSubscription(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/subscription/revoke`);
}

async function deleteUser(userId: string): Promise<void> {
  await api.delete(`/admin/users/${userId}`);
}

async function resetLimits(userId: string): Promise<void> {
  await api.put(`/admin/users/${userId}/reset-limits`);
}

const userService = {
  listUsers,
  getUserProfile,
  createUser,
  updateUser,
  banUser,
  unbanUser,
  forceVerifyUser,
  rejectVerification,
  getUserMatches,
  getUserReports,
  grantSubscription,
  revokeSubscription,
  deleteUser,
  resetLimits,
};

export default userService;
