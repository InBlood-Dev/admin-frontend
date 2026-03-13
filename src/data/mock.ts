import type { User, Match, Report, Verification, Subscription, DashboardStats, Story, Transaction, Notification } from '../types';

export const dashboardStats: DashboardStats = {
  total_users: 24_831,
  active_today: 3_412,
  active_this_week: 9_840,
  active_this_month: 18_200,
  total_matches: 89_210,
  total_messages: 1_423_800,
  premium_users: 1_892,
  pending_verifications: 47,
  pending_reports: 12,
  revenue_this_month: 284_500,
  mrr: 284_500,
  new_users_today: 189,
  new_users_this_week: 1_247,
  stories_active: 312,
};

export const users: User[] = [
  {
    id: 'u1', name: 'Ananya Sharma', age: 24, gender: 'Woman',
    bio: 'Coffee enthusiast & travel lover. Always planning the next trip.',
    photos: [{ id: 'p1', url: '', isPrimary: true }, { id: 'p1b', url: '', isPrimary: false }],
    interests: ['Travel', 'Coffee', 'Photography'],
    tags: ['Adventurer', 'Foodie', 'Night Owl'],
    prompts: [{ question: 'A perfect day looks like...', answer: 'Sunrise hike, brunch, and a sunset by the beach' }],
    location: { city: 'Mumbai', state: 'Maharashtra', country: 'India' },
    premium_tier: 'premium', verification_status: 'approved',
    is_online: true, is_banned: false, last_active: '2026-03-13T10:30:00Z',
    created_at: '2026-01-15T08:00:00Z',
    daily_swipes_remaining: 999, daily_super_likes_remaining: 999,
    stats: { matches: 34, likes_received: 210, super_likes_received: 8, reports_filed: 1, reports_received: 0 },
  },
  {
    id: 'u2', name: 'Rohan Mehta', age: 27, gender: 'Man',
    bio: 'Startup founder. Dog dad. Looking for my co-founder in life.',
    photos: [{ id: 'p2', url: '', isPrimary: true }],
    interests: ['Startups', 'Dogs', 'Fitness'],
    tags: ['Entrepreneur', 'Dog Lover', 'Gym Rat'],
    prompts: [{ question: 'My simple pleasures', answer: 'Morning runs with my golden retriever' }],
    location: { city: 'Delhi', state: 'Delhi', country: 'India' },
    premium_tier: 'premium_plus', verification_status: 'approved',
    is_online: false, is_banned: false, last_active: '2026-03-12T22:15:00Z',
    created_at: '2026-01-20T12:00:00Z',
    daily_swipes_remaining: 999, daily_super_likes_remaining: 999,
    stats: { matches: 52, likes_received: 340, super_likes_received: 15, reports_filed: 0, reports_received: 1 },
  },
  {
    id: 'u3', name: 'Priya Patel', age: 22, gender: 'Woman',
    bio: 'Art student. Chai over coffee. Let me sketch you.',
    photos: [{ id: 'p3', url: '', isPrimary: true }],
    interests: ['Art', 'Chai', 'Music'],
    tags: ['Creative', 'Introvert', 'Tea Lover'],
    prompts: [{ question: 'I geek out on', answer: 'Watercolor techniques and indie music' }],
    location: { city: 'Bangalore', state: 'Karnataka', country: 'India' },
    premium_tier: 'normal', verification_status: 'pending',
    is_online: true, is_banned: false, last_active: '2026-03-13T11:00:00Z',
    created_at: '2026-02-01T09:30:00Z',
    daily_swipes_remaining: 35, daily_super_likes_remaining: 2,
    stats: { matches: 12, likes_received: 98, super_likes_received: 3, reports_filed: 1, reports_received: 0 },
  },
  {
    id: 'u4', name: 'Arjun Singh', age: 29, gender: 'Man',
    bio: 'Musician by night, coder by day. Looking for someone who gets both.',
    photos: [{ id: 'p4', url: '', isPrimary: true }],
    interests: ['Music', 'Coding', 'Gaming'],
    tags: ['Musician', 'Gamer', 'Night Owl'],
    prompts: [{ question: 'My most controversial opinion', answer: 'Tabs > spaces, fight me' }],
    location: { city: 'Pune', state: 'Maharashtra', country: 'India' },
    premium_tier: 'normal', verification_status: 'none',
    is_online: false, is_banned: false, last_active: '2026-03-11T18:45:00Z',
    created_at: '2026-02-10T14:00:00Z',
    daily_swipes_remaining: 12, daily_super_likes_remaining: 0,
    stats: { matches: 8, likes_received: 45, super_likes_received: 1, reports_filed: 0, reports_received: 2 },
  },
  {
    id: 'u5', name: 'Kavya Reddy', age: 25, gender: 'Woman',
    bio: 'Bookworm. Plant mom. Yoga lover.',
    photos: [{ id: 'p5', url: '', isPrimary: true }, { id: 'p5b', url: '', isPrimary: false }],
    interests: ['Books', 'Yoga', 'Plants'],
    tags: ['Bookworm', 'Wellness', 'Minimalist'],
    prompts: [{ question: 'The way to my heart is', answer: 'A good book recommendation' }],
    location: { city: 'Hyderabad', state: 'Telangana', country: 'India' },
    premium_tier: 'premium', verification_status: 'approved',
    is_online: true, is_banned: false, last_active: '2026-03-13T09:20:00Z',
    created_at: '2026-01-25T10:00:00Z',
    daily_swipes_remaining: 999, daily_super_likes_remaining: 999,
    stats: { matches: 28, likes_received: 180, super_likes_received: 6, reports_filed: 1, reports_received: 0 },
  },
  {
    id: 'u6', name: 'Vikram Joshi', age: 31, gender: 'Man',
    bio: 'Chef. World traveler. Film buff. Currently perfecting my biryani recipe.',
    photos: [{ id: 'p6', url: '', isPrimary: true }],
    interests: ['Cooking', 'Travel', 'Movies'],
    tags: ['Foodie', 'Traveler', 'Film Buff'],
    prompts: [{ question: 'I will know its time to delete this app when', answer: 'Someone finally appreciates my biryani' }],
    location: { city: 'Chennai', state: 'Tamil Nadu', country: 'India' },
    premium_tier: 'normal', verification_status: 'rejected',
    is_online: false, is_banned: true, last_active: '2026-03-10T20:00:00Z',
    created_at: '2026-02-15T16:00:00Z',
    daily_swipes_remaining: 0, daily_super_likes_remaining: 0,
    stats: { matches: 5, likes_received: 30, super_likes_received: 0, reports_filed: 0, reports_received: 3 },
  },
  {
    id: 'u7', name: 'Meera Nair', age: 23, gender: 'Woman',
    bio: 'Dancer & dreamer. Life is better with rhythm.',
    photos: [{ id: 'p7', url: '', isPrimary: true }],
    interests: ['Dance', 'Fashion', 'Skincare'],
    tags: ['Dancer', 'Fashionista', 'Dreamer'],
    prompts: [{ question: 'My love language is', answer: 'Quality time and spontaneous dance-offs' }],
    location: { city: 'Kochi', state: 'Kerala', country: 'India' },
    premium_tier: 'premium_plus', verification_status: 'approved',
    is_online: true, is_banned: false, last_active: '2026-03-13T11:30:00Z',
    created_at: '2026-01-10T07:00:00Z',
    daily_swipes_remaining: 999, daily_super_likes_remaining: 999,
    stats: { matches: 41, likes_received: 290, super_likes_received: 12, reports_filed: 1, reports_received: 0 },
  },
  {
    id: 'u8', name: 'Aditya Kapoor', age: 26, gender: 'Man',
    bio: 'Gym rat. Love sunsets and long drives.',
    photos: [{ id: 'p8', url: '', isPrimary: true }],
    interests: ['Fitness', 'Cars', 'Photography'],
    tags: ['Gym Rat', 'Car Enthusiast', 'Photographer'],
    prompts: [{ question: 'A life goal of mine', answer: 'Drive the entire coastline of India' }],
    location: { city: 'Jaipur', state: 'Rajasthan', country: 'India' },
    premium_tier: 'normal', verification_status: 'none',
    is_online: false, is_banned: false, last_active: '2026-03-12T15:00:00Z',
    created_at: '2026-02-20T11:00:00Z',
    daily_swipes_remaining: 20, daily_super_likes_remaining: 1,
    stats: { matches: 10, likes_received: 65, super_likes_received: 2, reports_filed: 0, reports_received: 1 },
  },
];

export const matches: Match[] = [
  { match_id: 'm1', user_a: 'u1', user_b: 'u2', matched_at: '2026-03-10T14:00:00Z', is_active: true },
  { match_id: 'm2', user_a: 'u3', user_b: 'u4', matched_at: '2026-03-09T18:30:00Z', is_active: true },
  { match_id: 'm3', user_a: 'u5', user_b: 'u6', matched_at: '2026-03-08T12:00:00Z', is_active: false },
  { match_id: 'm4', user_a: 'u7', user_b: 'u8', matched_at: '2026-03-11T20:00:00Z', is_active: true },
  { match_id: 'm5', user_a: 'u1', user_b: 'u5', matched_at: '2026-03-12T09:00:00Z', is_active: true },
];

export const reports: Report[] = [
  { id: 'r1', reporter_id: 'u1', reported_id: 'u6', reason: 'Inappropriate photos', description: 'Profile contains explicit content that violates guidelines', reported_content_type: 'photo', reported_content_id: 'p6', status: 'pending', created_at: '2026-03-12T10:00:00Z' },
  { id: 'r2', reporter_id: 'u3', reported_id: 'u4', reason: 'Harassment in messages', description: 'Sending threatening and abusive messages repeatedly', reported_content_type: 'message', status: 'pending', created_at: '2026-03-11T15:00:00Z' },
  { id: 'r3', reporter_id: 'u5', reported_id: 'u8', reason: 'Fake profile', description: 'Using someone elses photos, reverse image search confirms', reported_content_type: 'profile', status: 'reviewed', created_at: '2026-03-10T08:00:00Z' },
  { id: 'r4', reporter_id: 'u7', reported_id: 'u2', reason: 'Spam messages', description: 'Sending promotional links in every conversation', reported_content_type: 'message', status: 'actioned', action_taken: 'Warning issued', created_at: '2026-03-09T12:00:00Z' },
  { id: 'r5', reporter_id: 'u2', reported_id: 'u6', reason: 'Offensive bio', description: 'Bio contains hate speech and slurs', reported_content_type: 'profile', status: 'pending', created_at: '2026-03-12T18:00:00Z' },
  { id: 'r6', reporter_id: 'u8', reported_id: 'u4', reason: 'Inappropriate story', description: 'Posted explicit content in story', reported_content_type: 'story', reported_content_id: 'st3', status: 'pending', created_at: '2026-03-13T06:00:00Z' },
];

export const verifications: Verification[] = [
  { id: 'v1', user_id: 'u3', user_name: 'Priya Patel', selfie_url: '', photo_url: '', status: 'pending', submitted_at: '2026-03-12T14:00:00Z' },
  { id: 'v2', user_id: 'u4', user_name: 'Arjun Singh', selfie_url: '', photo_url: '', status: 'pending', submitted_at: '2026-03-12T16:00:00Z' },
  { id: 'v3', user_id: 'u8', user_name: 'Aditya Kapoor', selfie_url: '', photo_url: '', status: 'pending', submitted_at: '2026-03-13T08:00:00Z' },
  { id: 'v4', user_id: 'u1', user_name: 'Ananya Sharma', selfie_url: '', photo_url: '', status: 'approved', submitted_at: '2026-03-08T10:00:00Z' },
  { id: 'v5', user_id: 'u6', user_name: 'Vikram Joshi', selfie_url: '', photo_url: '', status: 'rejected', reject_reason: 'Face not clearly visible in selfie', submitted_at: '2026-03-07T09:00:00Z' },
];

export const stories: Story[] = [
  { story_id: 'st1', user_id: 'u1', user_name: 'Ananya Sharma', media_url: '', media_type: 'photo', caption: 'Morning vibes ☀️', created_at: '2026-03-13T07:00:00Z', expires_at: '2026-03-14T07:00:00Z', view_count: 45, is_reported: false, report_count: 0, is_deleted: false },
  { story_id: 'st2', user_id: 'u7', user_name: 'Meera Nair', media_url: '', media_type: 'video', caption: 'Dance practice session', created_at: '2026-03-13T09:00:00Z', expires_at: '2026-03-14T09:00:00Z', view_count: 78, is_reported: false, report_count: 0, is_deleted: false },
  { story_id: 'st3', user_id: 'u4', user_name: 'Arjun Singh', media_url: '', media_type: 'photo', caption: 'Late night jam', created_at: '2026-03-13T00:30:00Z', expires_at: '2026-03-14T00:30:00Z', view_count: 23, is_reported: true, report_count: 2, is_deleted: false },
  { story_id: 'st4', user_id: 'u5', user_name: 'Kavya Reddy', media_url: '', media_type: 'photo', caption: 'New plant baby 🌱', created_at: '2026-03-13T10:00:00Z', expires_at: '2026-03-14T10:00:00Z', view_count: 56, is_reported: false, report_count: 0, is_deleted: false },
  { story_id: 'st5', user_id: 'u2', user_name: 'Rohan Mehta', media_url: '', media_type: 'video', caption: 'Doggo being doggo', created_at: '2026-03-12T20:00:00Z', expires_at: '2026-03-13T20:00:00Z', view_count: 112, is_reported: false, report_count: 0, is_deleted: false },
  { story_id: 'st6', user_id: 'u3', user_name: 'Priya Patel', media_url: '', media_type: 'photo', caption: 'Sketching at the cafe', created_at: '2026-03-13T08:15:00Z', expires_at: '2026-03-14T08:15:00Z', view_count: 31, is_reported: true, report_count: 1, is_deleted: false },
];

export const subscriptions: Subscription[] = [
  { id: 's1', user_id: 'u1', user_name: 'Ananya Sharma', plan: 'monthly', tier: 'premium', status: 'active', amount: 499, started_at: '2026-03-01T00:00:00Z', expires_at: '2026-04-01T00:00:00Z' },
  { id: 's2', user_id: 'u2', user_name: 'Rohan Mehta', plan: 'annual', tier: 'premium_plus', status: 'active', amount: 3999, started_at: '2026-01-20T00:00:00Z', expires_at: '2027-01-20T00:00:00Z' },
  { id: 's3', user_id: 'u5', user_name: 'Kavya Reddy', plan: 'monthly', tier: 'premium', status: 'active', amount: 499, started_at: '2026-02-15T00:00:00Z', expires_at: '2026-03-15T00:00:00Z' },
  { id: 's4', user_id: 'u7', user_name: 'Meera Nair', plan: 'annual', tier: 'premium_plus', status: 'active', amount: 3999, started_at: '2026-01-10T00:00:00Z', expires_at: '2027-01-10T00:00:00Z' },
  { id: 's5', user_id: 'u6', user_name: 'Vikram Joshi', plan: 'monthly', tier: 'premium', status: 'cancelled', amount: 499, started_at: '2026-02-01T00:00:00Z', expires_at: '2026-03-01T00:00:00Z' },
];

export const transactions: Transaction[] = [
  { id: 't1', order_id: 'ORD-20260301-001', cf_order_id: 'CF_001234', user_id: 'u1', user_name: 'Ananya Sharma', amount: 499, plan: 'Premium Monthly', payment_status: 'success', payment_method: 'UPI', created_at: '2026-03-01T10:15:00Z' },
  { id: 't2', order_id: 'ORD-20260120-002', cf_order_id: 'CF_001100', user_id: 'u2', user_name: 'Rohan Mehta', amount: 3999, plan: 'Plus Annual', payment_status: 'success', payment_method: 'Credit Card', created_at: '2026-01-20T14:30:00Z' },
  { id: 't3', order_id: 'ORD-20260215-003', cf_order_id: 'CF_001201', user_id: 'u5', user_name: 'Kavya Reddy', amount: 499, plan: 'Premium Monthly', payment_status: 'success', payment_method: 'UPI', created_at: '2026-02-15T09:00:00Z' },
  { id: 't4', order_id: 'ORD-20260312-004', cf_order_id: 'CF_001350', user_id: 'u8', user_name: 'Aditya Kapoor', amount: 499, plan: 'Premium Monthly', payment_status: 'failed', payment_method: 'Debit Card', created_at: '2026-03-12T16:45:00Z' },
  { id: 't5', order_id: 'ORD-20260313-005', cf_order_id: 'CF_001355', user_id: 'u4', user_name: 'Arjun Singh', amount: 999, plan: 'Plus Monthly', payment_status: 'dropped', payment_method: 'UPI', created_at: '2026-03-13T08:20:00Z' },
  { id: 't6', order_id: 'ORD-20260110-006', cf_order_id: 'CF_001050', user_id: 'u7', user_name: 'Meera Nair', amount: 3999, plan: 'Plus Annual', payment_status: 'success', payment_method: 'Credit Card', created_at: '2026-01-10T11:00:00Z' },
  { id: 't7', order_id: 'ORD-20260201-007', cf_order_id: 'CF_001150', user_id: 'u6', user_name: 'Vikram Joshi', amount: 499, plan: 'Premium Monthly', payment_status: 'success', payment_method: 'Net Banking', created_at: '2026-02-01T13:30:00Z' },
  { id: 't8', order_id: 'ORD-20260311-008', cf_order_id: 'CF_001340', user_id: 'u3', user_name: 'Priya Patel', amount: 499, plan: 'Premium Monthly', payment_status: 'created', payment_method: 'UPI', created_at: '2026-03-11T20:00:00Z' },
];

export const notifications: Notification[] = [
  { id: 'n1', title: 'Valentine\'s Week Special!', body: 'Get 50% off on Premium this week. Swipe unlimited and find your match!', segment: 'all', sent_at: '2026-02-07T10:00:00Z', sent_by: 'Admin', recipients_count: 24831, status: 'sent' },
  { id: 'n2', title: 'We miss you!', body: 'New people are waiting to meet you. Come back and see who liked your profile.', segment: 'inactive', sent_at: '2026-03-01T12:00:00Z', sent_by: 'Admin', recipients_count: 5400, status: 'sent' },
  { id: 'n3', title: 'Premium Exclusive: Super Likes x5', body: 'As a premium member, enjoy 5 free super likes today!', segment: 'premium', sent_at: '2026-03-10T09:00:00Z', sent_by: 'Admin', recipients_count: 1892, status: 'sent' },
  { id: 'n4', title: 'Complete your profile', body: 'Profiles with prompts get 3x more matches. Add yours now!', segment: 'new_users', sent_at: '2026-03-12T14:00:00Z', sent_by: 'Admin', recipients_count: 1247, status: 'sent' },
];

export const userGrowthData = [
  { month: 'Oct', users: 8200 },
  { month: 'Nov', users: 12400 },
  { month: 'Dec', users: 16100 },
  { month: 'Jan', users: 19500 },
  { month: 'Feb', users: 22300 },
  { month: 'Mar', users: 24831 },
];

export const revenueData = [
  { month: 'Oct', revenue: 82000 },
  { month: 'Nov', revenue: 134000 },
  { month: 'Dec', revenue: 189000 },
  { month: 'Jan', revenue: 221000 },
  { month: 'Feb', revenue: 256000 },
  { month: 'Mar', revenue: 284500 },
];

export const signupsData = [
  { day: 'Mon', signups: 142 },
  { day: 'Tue', signups: 168 },
  { day: 'Wed', signups: 195 },
  { day: 'Thu', signups: 156 },
  { day: 'Fri', signups: 210 },
  { day: 'Sat', signups: 245 },
  { day: 'Sun', signups: 189 },
];

export const revenueByPlan = [
  { plan: 'Premium Monthly', amount: 94_501, count: 189 },
  { plan: 'Premium Annual', amount: 47_988, count: 12 },
  { plan: 'Plus Monthly', amount: 62_937, count: 63 },
  { plan: 'Plus Annual', amount: 79_980, count: 20 },
];
