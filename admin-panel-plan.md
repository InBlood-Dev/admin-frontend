# InBlood Admin Panel — Feature Plan

## Tech Stack

| Concern    | Choice                                      |
|------------|---------------------------------------------|
| Framework  | Next.js (App Router) — same as website      |
| UI         | shadcn/ui + Recharts for charts             |
| Auth       | Separate admin JWT (email/password)         |
| Location   | Separate Next.js app in `admin/`            |

---

## Sections & Features

### 1. Dashboard
- Total users, active today / week / month
- New signups over time (chart)
- Total matches made and messages sent
- Revenue — total, MRR, breakdown by plan
- Active premium subscriptions count
- Pending moderation queue count (badge)

### 2. User Management
- List all users with search and filters (gender, verified, premium, online, banned, joined date)
- View full user profile — photos, bio, tags, prompts, location, stats
- Ban / Unban user
- Force verify a user
- Reject verification with reason
- Delete user account
- View a user's matches, reports filed, and reports received
- Reset daily swipe limits for a specific user

### 3. Content Moderation
- View all reports (reporter, reported user, reason, status)
- Mark report as reviewed / dismissed / actioned
- View reported user's profile inline
- Ban user directly from a report
- Delete reported photos or stories
- Filter by: pending, reviewed, actioned

### 4. Stories Moderation
- View all active stories with media previews
- Delete any story
- Flag / review stories that have been reported

### 5. Verification Queue
- List users who have requested verification
- View submitted photo and selfie
- Approve or reject with a reason
- Sets `is_verified: true` on approval

### 6. Premium & Payments
- List all subscriptions — user, plan, status, start date, expiry
- View all payment transactions — order ID, amount, Cashfree status
- Manually grant or revoke premium access
- Cancel a subscription
- View failed / dropped payments

### 7. Push Notifications (Broadcast)
- Send a push notification to all users
- Send to a filtered segment (e.g. premium only, inactive users)
- View history of past broadcasts

### 8. App Config
- Force update toggle — set minimum app version
- Toggle maintenance mode on/off
- View / edit daily swipe limit for free users

---

## Out of Scope for MVP

- Full analytics dashboards (use Mixpanel / Amplitude externally)
- A/B test management
- Subscription plan editor
- Revenue charts (use Cashfree dashboard)
- Audit logs

---

## Summary

**8 sections · ~40 features**

Covers user safety (moderation, bans), revenue (payments, premium), and operations (notifications, app config).
