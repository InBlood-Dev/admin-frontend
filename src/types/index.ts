// --- Admin Auth ---

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  role: 'super_admin' | 'moderator';
}

export interface LoginResponse {
  admin: AdminUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface RefreshResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiError {
  success: false;
  message: string;
  errors: { field: string; message: string }[];
}

// --- App Data ---

export interface User {
  id: string;
  name: string;
  age: number;
  gender: 'Man' | 'Woman' | 'Non-Binary' | 'Other';
  bio: string;
  photos: { id: string; url: string; isPrimary: boolean }[];
  interests: string[];
  tags: string[];
  prompts: { question: string; answer: string }[];
  location: { city: string; state: string; country: string };
  premium_tier: 'normal' | 'premium' | 'premium_plus';
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  is_online: boolean;
  is_banned: boolean;
  last_active: string;
  created_at: string;
  daily_swipes_remaining: number;
  daily_super_likes_remaining: number;
  stats: {
    matches: number;
    likes_received: number;
    super_likes_received: number;
    reports_filed: number;
    reports_received: number;
  };
}

export interface Match {
  match_id: string;
  user_a: string;
  user_b: string;
  matched_at: string;
  is_active: boolean;
}

export interface Report {
  id: string;
  reporter_id: string;
  reported_id: string;
  reason: string;
  description: string;
  reported_content_type: 'profile' | 'photo' | 'story' | 'message';
  reported_content_id?: string;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  action_taken?: string;
  created_at: string;
}

export interface Verification {
  id: string;
  user_id: string;
  user_name: string;
  selfie_url: string;
  photo_url: string;
  status: 'pending' | 'approved' | 'rejected';
  reject_reason?: string;
  submitted_at: string;
}

export interface Story {
  story_id: string;
  user_id: string;
  user_name: string;
  media_url: string;
  media_type: 'photo' | 'video';
  caption: string;
  created_at: string;
  expires_at: string;
  view_count: number;
  is_reported: boolean;
  report_count: number;
  is_deleted: boolean;
}

export interface Subscription {
  id: string;
  user_id: string;
  user_name: string;
  plan: 'monthly' | 'annual';
  tier: 'premium' | 'premium_plus';
  status: 'active' | 'cancelled' | 'expired';
  amount: number;
  started_at: string;
  expires_at: string;
}

export interface Transaction {
  id: string;
  order_id: string;
  cf_order_id: string;
  user_id: string;
  user_name: string;
  amount: number;
  plan: string;
  payment_status: 'created' | 'success' | 'failed' | 'dropped';
  payment_method: string;
  created_at: string;
}

export interface Notification {
  id: string;
  title: string;
  body: string;
  segment: 'all' | 'premium' | 'inactive' | 'new_users';
  sent_at: string;
  sent_by: string;
  recipients_count: number;
  status: 'sent' | 'failed' | 'scheduled';
}

export interface DashboardStats {
  total_users: number;
  active_today: number;
  active_this_week: number;
  active_this_month: number;
  total_matches: number;
  total_messages: number;
  premium_users: number;
  pending_verifications: number;
  pending_reports: number;
  revenue_this_month: number;
  mrr: number;
  new_users_today: number;
  new_users_this_week: number;
  stories_active: number;
}

export interface UserGrowthPoint {
  month: string;
  year: number;
  users: number;
}

export interface SignupsPoint {
  day: string;
  date: string;
  signups: number;
}

export interface RevenuePoint {
  month: string;
  year: number;
  revenue: number;
}

// --- Admin User Management ---

export interface AdminPhoto {
  id: string;
  url: string;
  thumbnail_url: string | null;
  order_index: number;
  is_primary: boolean;
  is_approved: boolean;
  uploaded_at: string | null;
}

export interface AdminSubscription {
  id: string;
  plan_type: string;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
}

export interface AdminUserProfile {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: 'Man' | 'Woman' | 'Non-Binary' | 'Other';
  bio: string | null;
  pronouns: string | null;
  sexual_orientation: string | null;
  job_title: string | null;
  company: string | null;
  education: string | null;
  drinking: string | null;
  smoking: string | null;
  exercise: string | null;
  pets: string | null;
  interests: string[];
  languages: string[];
  prompts: { question: string; answer: string; order_index?: number }[];
  opening_moves: { question: string; answer: string; order_index?: number }[];
  location: { city: string | null; state: string | null; country: string | null };
  photos: AdminPhoto[];
  tags: { id: string; name: string; category: string | null }[];
  relationship_types: { type: string; border_color: string | null }[];
  is_verified: boolean;
  is_premium: boolean;
  is_online: boolean;
  is_banned: boolean;
  is_discoverable: boolean;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  premium_tier: 'normal' | 'monthly' | 'annual';
  proximity_range: number | null;
  age_min: number | null;
  age_max: number | null;
  show_distance: string | null;
  show_last_active: boolean;
  last_active_at: string | null;
  created_at: string | null;
  stats: {
    matches: number;
    likes_received: number;
    super_likes_received: number;
    reports_filed: number;
    reports_received: number;
  };
  active_subscription: AdminSubscription | null;
  subscription_history: AdminSubscription[];
}

export interface AdminUserListItem {
  id: string;
  name: string;
  email: string;
  age: number;
  gender: string;
  primary_photo_url: string | null;
  location: { city: string | null; state: string | null; country: string | null };
  is_verified: boolean;
  is_premium: boolean;
  is_online: boolean;
  is_banned: boolean;
  verification_status: 'none' | 'pending' | 'approved' | 'rejected';
  premium_tier: 'normal' | 'monthly' | 'annual';
  match_count: number;
  last_active_at: string | null;
  created_at: string | null;
}

export interface AdminUserMatch {
  match_id: string;
  other_user: { id: string; name: string; photo_url: string | null };
  matched_at: string | null;
  is_active: boolean;
}

export interface AdminUserReport {
  id: string;
  reporter: { id: string; name: string };
  reported: { id: string; name: string };
  report_type: string | null;
  reason: string | null;
  description: string | null;
  status: string | null;
  created_at: string | null;
}

export interface PaginatedUsersResponse {
  users: AdminUserListItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedMatchesResponse {
  matches: AdminUserMatch[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// --- Admin Moderation ---

export interface AdminReport {
  id: string;
  reporter: { id: string; name: string } | null;
  reported_user: { id: string; name: string; is_banned: boolean } | null;
  report_type: string | null;
  reason: string | null;
  description: string | null;
  reported_message_id: string | null;
  status: 'pending' | 'reviewed' | 'dismissed' | 'actioned';
  action_taken: string | null;
  reviewed_by: { id: string; name: string } | null;
  reviewed_at: string | null;
  created_at: string;
}

export interface PaginatedReportsResponse {
  reports: AdminReport[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminStory {
  id: string;
  user: { id: string; name: string } | null;
  media_type: 'image' | 'video' | null;
  media_url: string | null;
  thumbnail_url: string | null;
  view_count: number;
  is_deleted: boolean;
  expires_at: string | null;
  created_at: string | null;
}

export interface PaginatedStoriesResponse {
  stories: AdminStory[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminVerification {
  id: string;
  user_id: string;
  user_name: string | null;
  user_email: string | null;
  selfie_url: string | null;
  primary_photo_url: string | null;
  status: 'pending' | 'approved' | 'rejected';
  rejection_reason: string | null;
  reviewed_at: string | null;
  created_at: string | null;
}

export interface PaginatedVerificationsResponse {
  verifications: AdminVerification[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// --- Admin Matches ---

export interface AdminMatch {
  id: string;
  user_a: { id: string | null; name: string; photo_url: string | null };
  user_b: { id: string | null; name: string; photo_url: string | null };
  matched_at: string | null;
  is_active: boolean;
  unmatched_at: string | null;
}

export interface PaginatedAdminMatchesResponse {
  matches: AdminMatch[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

// --- Admin Subscriptions & Payments ---

export interface AdminSubscriptionItem {
  id: string;
  user: { id: string; name: string } | null;
  plan_type: string | null;
  status: 'pending' | 'active' | 'cancelled' | 'expired';
  amount: number;
  started_at: string | null;
  expires_at: string | null;
  cancelled_at: string | null;
  created_at: string | null;
}

export interface PaginatedSubscriptionsResponse {
  subscriptions: AdminSubscriptionItem[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface AdminTransaction {
  id: string;
  order_id: string;
  cf_order_id: string | null;
  user: { id: string; name: string } | null;
  plan_type: string | null;
  amount: number;
  currency: string;
  status: 'created' | 'success' | 'failed' | 'dropped';
  payment_method: string | null;
  created_at: string | null;
}

export interface PaginatedTransactionsResponse {
  transactions: AdminTransaction[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface RevenueByPlan {
  plan_type: string;
  total_amount: number;
  count: number;
}

export interface GenderPoint {
  gender: string;
  count: number;
}

export interface AgeRangePoint {
  range: string;
  count: number;
}

export interface LocationPoint {
  name: string;
  count: number;
}

export interface LocationDistribution {
  states: LocationPoint[];
  cities: LocationPoint[];
}

export interface OrientationPoint {
  orientation: string;
  count: number;
}

export interface GenderByAgePoint {
  age_group: string;
  Man?: number;
  Woman?: number;
  'Non-Binary'?: number;
  Other?: number;
  [key: string]: string | number | undefined;
}

export interface GenderByStatePoint {
  state: string;
  total: number;
  Man?: number;
  Woman?: number;
  'Non-Binary'?: number;
  Other?: number;
  [key: string]: string | number | undefined;
}

export interface DemographicsSummary {
  gender_by_age: GenderByAgePoint[];
  gender_by_state: GenderByStatePoint[];
}

// --- Admin Plans ---

export interface PlanFeature {
  text: string;
  included: boolean;
}

export interface AdminPlan {
  id: string;
  plan_key: string;
  name: string;
  price: number;
  original_price: number | null;
  currency: string;
  duration_days: number;
  period_label: string;
  badge: string | null;
  badge_color: string | null;
  discount_label: string | null;
  features: PlanFeature[];
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
}

export interface CreatePlanPayload {
  plan_key: string;
  name: string;
  price: number;
  original_price?: number | null;
  currency?: string;
  duration_days: number;
  period_label: string;
  badge?: string | null;
  badge_color?: string | null;
  discount_label?: string | null;
  features: PlanFeature[];
  is_active?: boolean;
  sort_order?: number;
}

export type UpdatePlanPayload = Partial<CreatePlanPayload>;
