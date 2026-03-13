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
