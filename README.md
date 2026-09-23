# Meditation Application — Backend, Admin Dashboard & API Documentation

Welcome to the **Meditation App** repository (also known as **Anchor into Presence**). This application serves as a full-stack backend, administration portal, and API server built with **Next.js 15 (App Router)**, **TypeScript**, **MongoDB/Mongoose**, **AWS S3 / CloudFront**, **Firebase Cloud Messaging (FCM)**, and **Node-Cron**.

---

## 📋 Table of Contents

- [1. Backend & Database](#1-backend--database)
  - [Repository & Source Code Access](#repository--source-code-access)
  - [API Documentation](#api-documentation)
  - [Server, Hosting & Deployment Instructions](#server-hosting--deployment-instructions)
  - [Database Access & Schema Documentation](#database-access--schema-documentation)
  - [Authentication, Push Notifications & Background Jobs](#authentication-push-notifications--background-jobs)
  - [Backup & Migration Process](#backup--migration-process)
- [2. Admin Dashboard](#2-admin-dashboard)
  - [Source Code & Dashboard Access](#source-code--dashboard-access)
  - [Setup & Deployment Instructions](#setup--deployment-instructions)
  - [Admin Test Account](#admin-test-account)
  - [Dashboard Architecture & Content Management](#dashboard-architecture--content-management)
- [3. Third Party Services](#3-third-party-services)
  - [Complete External Services List](#complete-external-services-list)
  - [Payment & In-App Subscription Configuration](#payment--in-app-subscription-configuration)
  - [Storage, Email, FCM & API Configurations](#storage-email-fcm--api-configurations)
- [4. Developer Quickstart](#4-developer-quickstart)
  - [Environment Variables Blueprint](#environment-variables-blueprint)
  - [Local Installation & Development](#local-installation--development)

---

## 1. Backend & Database

### Repository & Source Code Access
- **Framework**: Next.js 15 (App Router) with React 19 & TypeScript.
- **Repository Directory**: `../file-path/meditation`
- **Architecture**: Unified Next.js full-stack repository containing serverless API routes (`src/app/api`), Admin portal pages (`src/app/admin`), Database models (`src/models`), and background cron jobs (`src/cron`).

### API Documentation

All API endpoints return JSON formatted as `{ status: boolean, message: string, data?: object }`.

#### A. Authentication APIs (`/api/auth/*`)
- `POST /api/auth/register`: Register new user account with email/password; triggers email OTP.
- `POST /api/auth/verify-otp`: Validate 6-digit email verification code.
- `POST /api/auth/resend-otp`: Resend verification code to registered email.
- `POST /api/auth/login`: User password login; returns JWT Bearer token.
- `POST /api/auth/forgot-password`: Request 6-digit password reset OTP email.
- `POST /api/auth/reset-password`: Reset account password using verified OTP token.
- `POST /api/auth/socialLogin`: Social authentication (Google / Apple) sign-in or auto-registration.
- `POST /api/auth/logout`: User session termination.

#### B. User Mobile APIs (`/api/users/*`) — *Requires `Authorization: Bearer <token>`*
- `GET /api/users/home`: Retrieve user home dashboard feed, featured categories, and activities.
- `GET /api/users/profile` & `POST /api/users/profile/update`: Fetch or update user profile details and subscription status.
- `GET / POST / DELETE /api/users/activities`: Fetch activities list, filter by category/tag, view detail, log progress/watch history.
- `GET / POST / DELETE /api/users/favorite`: Bookmark or remove activity from favorites.
- `GET / POST / DELETE /api/users/set-reminder`: Configure user daily/weekly meditation alarm notifications.
- `GET /api/users/user-track`: Aggregated meditation statistics (total minutes, streak days, category distribution).
- `GET / POST / DELETE /api/users/community/posts`: Social feed post listing, multi-image upload, and post deletion.
- `POST /api/users/community/posts/[postId]/likes`: Toggle like reaction on community post.
- `GET / POST / DELETE /api/users/community/posts/[postId]/comments`: Comment thread on community post.
- `POST /api/users/contact-support`: Submit support ticket inquiry.
- `GET /api/users/notifications`: Retrieve user notification inbox history.

#### C. Administrative APIs (`/api/admin/*`) — *Requires HTTP-Only `admin_session` cookie*
- `POST /api/admin/login` & `POST /api/admin/logout`: Admin portal login and logout.
- `GET / PATCH / DELETE /api/admin/users`: Manage user list, toggle block/unblock status, delete user.
- `GET / POST / PATCH / DELETE /api/admin/activities`: Create, list, update, and delete audio/video activities.
- `PATCH /api/admin/activities/status/[id]`: Toggle activity active/blocked status.
- `GET / POST / PATCH / DELETE /api/admin/category`: Manage activity taxonomy categories.
- `GET / POST / PATCH / DELETE /api/admin/faqs`: Manage Frequently Asked Questions.
- `GET / POST /api/admin/notification`: Dispatch push notifications to mobile users via FCM.
- `GET / POST /api/admin/content/[id]`: Update CMS legal content (Terms & Conditions, Privacy Policy).
- `GET / PATCH /api/admin/support`: Review and resolve user support tickets.

---

### Server, Hosting & Deployment Instructions

#### Prerequisites
- **Node.js**: v20.x or higher
- **Process Manager**: PM2 or Systemd
- **Web Server / Reverse Proxy**: Nginx with SSL (Let's Encrypt / Cloudflare)
- **Database**: MongoDB v6.0+

#### Production Deployment Steps

1. **Clone & Install Dependencies**:
   ```bash
   cd ../file-path/meditation
   npm install
   ```

2. **Configure Environment Variables**:
   Create `.env.local` with production values (MongoDB URI, AWS keys, SMTP, Firebase keys).

3. **Build Application**:
   ```bash
   npm run build
   ```

4. **Run with PM2 Process Manager**:
   ```bash
   pm2 start npm --name "meditation-app" -- run start -- -p 3022
   pm2 save
   ```

5. **Nginx Reverse Proxy Configuration**:
   ```nginx
   server {
       server_name admin.anchorintopresence.net;

       location / {
           proxy_pass http://127.0.0.1:3022;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_cache_bypass $http_upgrade;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       }
   }
   ```

---

### Database Access & Schema Documentation

The database utilizes **MongoDB** via **Mongoose ODM**. Schemas are located in `src/models/`:

| Model Name | File Location | Key Fields | Description |
| :--- | :--- | :--- | :--- |
| **User** | `src/models/User.ts` | `name`, `email`, `password`, `fcmToken`, `isVerified`, `isBlocked` | Mobile application user accounts. |
| **Admin** | `src/models/Admin.ts` | `email`, `password`, `name`, `role` | Portal administration accounts. |
| **Activity** | `src/models/Activity.ts` | `name`, `description`, `video`, `thumbnail`, `duration`, `category`, `tags` | Meditation sessions (audio/video files stored in S3). |
| **Category** | `src/models/Category.ts` | `name`, `description`, `status` | Category taxonomy for sorting activities. |
| **Tags** | `src/models/Tags.ts` | `name` | Metadata tags assigned to activities. |
| **Posts** | `src/models/Posts.ts` | `userId`, `message`, `images`, `postAnonymously`, `likesCount` | User social community feed posts. |
| **Comments** | `src/models/Comments.ts` | `postId`, `userId`, `comment` | User comments under community posts. |
| **Reactions** | `src/models/Reactions.ts` | `targetType`, `targetId`, `userId`, `type` | Post and comment likes tracking. |
| **UserScheduleNotification** | `src/models/UserScheduleNotification.ts` | `userId`, `time`, `weekday`, `date`, `status` | User custom reminder schedule alarms. |
| **UserActivityLogs** | `src/models/UserActivityLogs.ts` | `userId`, `activityId`, `totalVideoTime`, `videoTimestamp` | User progress & watch duration tracking. |
| **UserLoginStreak** | `src/models/UserLoginStreak.ts` | `userId`, `streakCount`, `lastLoginDate` | Gamified daily login streak calculations. |
| **UserPurchase** | `src/models/UserPurchase.ts` | `userId`, `productId`, `purchaseDate`, `planType` | In-App purchase & active subscription status. |
| **FavoriteActivities** | `src/models/FavoriteActivities.ts` | `userId`, `activityId` | User bookmarked favorite sessions. |
| **Content** | `src/models/Content.ts` | `title`, `description`, `type` | Dynamic CMS pages (Privacy Policy, Terms). |
| **Support** | `src/models/Support.ts` | `userId`, `title`, `description`, `status` | Customer support ticket tracking. |
| **Faq** | `src/models/Faq.ts` | `question`, `answer`, `status` | Dynamic FAQ knowledgebase items. |

---

### Authentication, Push Notifications & Background Jobs

1. **Authentication Architecture**:
   - **User API Token**: Uses standard JWT (`jsonwebtoken`). Tokens are generated on login/register and passed via `Authorization: Bearer <token>`.
   - **Admin Portal Cookie**: HTTP-only `admin_session` JWT cookie verified by Next.js Edge Middleware (`src/middleware.ts`).

2. **Push Notification Subsystem**:
   - Integrated with **Firebase Cloud Messaging (FCM)** using `firebase-admin` (`src/lib/firebaseAdmin.ts`).
   - Device tokens sent from mobile client are stored in `User.fcmToken`.
   - Dispatcher utility (`src/lib/sendNotificationToUser.ts`) pushes notifications directly to user mobile devices.

3. **Background Jobs Engine**:
   - Powered by `node-cron` (`src/cron/`).
   - Hooks into Next.js startup via `src/instrumentation.ts` to execute `restoreCronJobs()`.
   - Schedules date-specific and weekly recurring reminder notifications automatically without requiring external cron daemons.

---

### Backup & Migration Process

#### Database Backup (MongoDB)
- Run automated database dumps using `mongodump`:
  ```bash
  # Daily Backup Script
  mongodump --uri="mongodb://127.0.0.1:27017/meditation_db" --out="/var/backups/mongodb/$(date +%Y-%m-%d)"
  ```

#### Database Restoration / Migration
- Restore database dump to new host or instance:
  ```bash
  mongorestore --uri="mongodb://127.0.0.1:27017/meditation_db" /var/backups/mongodb/2026-08-31/meditation_db
  ```

---

## 2. Admin Dashboard

### Source Code & Dashboard Access
- **Dashboard Web Location**: `/admin` (e.g. `https://admin.anchorintopresence.net/admin/login`)
- **Source Code Directory**: `src/app/admin/` & `src/components/`

### Setup & Deployment Instructions
1. Ensure `BASE_URL` and `NEXT_PUBLIC_BASE_URL` in `.env.local` point to the admin web domain.
2. Build and start the Next.js application (Admin dashboard is served seamlessly alongside API routes).

### Admin Test Account
- **Default Email**: `tina@tinamoore.com` (configurable in `Admin` collection / `.env.local`).
- **Portal URL**: `/admin/login`

### Dashboard Architecture & Content Management

```
┌─────────────────────────────────────────────────────────────┐
│                   Admin Web Dashboard UI                    │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP-Only Cookie Authentication
                               ▼
┌─────────────────────────────────────────────────────────────┐
│           Next.js Edge Middleware (src/middleware.ts)        │
└──────────────────────────────┬──────────────────────────────┘
                               │ Validates Admin Role & JWT
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Admin API Routes (src/app/api/admin)          │
└──────────────┬───────────────────────────────┬──────────────┘
               │                               │
               ▼                               ▼
    ┌──────────────────────┐        ┌──────────────────────┐
    │  MongoDB Data Store  │        │   AWS S3 Storage     │
    │  (Users, Activities) │        │  (Video/Audio/Thumb) │
    └──────────────────────┘        └──────────────────────┘
```

1. **User Management**: Search, block/unblock, and purge accounts.
2. **Activity Management**: Upload high-resolution meditation videos/audio files directly to AWS S3, compute video duration, generate thumbnails, assign custom tags, and set scheduled publishing.
3. **Category & Taxonomy**: Create, edit, toggle, or remove content categories.
4. **Push Notifications**: Broadcast custom push notifications to registered app users.
5. **CMS Content**: Manage Terms & Conditions and Privacy Policy via WYSIWYG Quill Editor.
6. **Support Tickets**: Review incoming support requests and customer inquiries.

---

## 3. Third Party Services

### Complete External Services List

| Service Name | Category / Purpose | Integration Files |
| :--- | :--- | :--- |
| **AWS S3** | Media Storage (Audio, Video, Images, Thumbnails) | `src/lib/s3.ts` |
| **AWS CloudFront** | Content Delivery Network (CDN) for fast media streaming | `src/lib/getImageUrl.ts` |
| **Firebase Cloud Messaging (FCM)** | Mobile Push Notification Delivery | `src/lib/firebaseAdmin.ts`, `src/lib/sendNotificationToUser.ts` |
| **SendGrid / SMTP** | Email Delivery (OTP Verification, Password Reset, Support Alerts) | `src/lib/sendEmail.ts` |
| **Apple / Google Auth** | Mobile Social Authentication Sign-In | `src/app/api/auth/socialLogin/route.ts` |
| **App Store / Google Play In-App Purchase** | Mobile Subscriptions & Monetization tracking | `src/models/UserPurchase.ts`, `src/app/api/users/profile/route.ts` |

---

### Payment & In-App Subscription Configuration

- Mobile clients authenticate purchases with Apple App Store (StoreKit) or Google Play Billing.
- Purchase records are posted to `UserPurchase` model (`productId`, `purchaseDate`, `planType`).
- The backend dynamically calculates subscription validity (e.g. 30 days for monthly, 365 days for annual plans) and returns `subscriptionStatus` (`active`, `expired`, or `not bought`) in `GET /api/users/profile`.

---

### Storage, Email, FCM & API Configurations

```env
# AWS S3 & CloudFront Config
ACCESS_KEY=your_aws_access_key
Secret_access_key=your_aws_secret_key
Region=us-east-1
Bucket_Name=mindfully-083400432789-us-east-1-an
Cloudfront_URL=https://d1ckq51qwp5orx.cloudfront.net

# SendGrid / SMTP Config
MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_sendgrid_api_key
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=tina@tinamoore.com
MAIL_FROM_NAME="Anchor into Presence"

# Firebase FCM Service Account
# Located in: src/lib/serviceAccountKey.json
```

---

## 4. Developer Quickstart

### Environment Variables Blueprint

Create `.env.local` in root:

```env
MONGODB_URI=mongodb://127.0.0.1:27017/meditation_db
JWT_SECRET=your_jwt_secret_key
NODE_ENV=development
BASE_URL=http://localhost:3022
NEXT_PUBLIC_BASE_URL=http://localhost:3022
ADMIN_EMAIL=tina@tinamoore.com

MAIL_MAILER=smtp
MAIL_HOST=smtp.sendgrid.net
MAIL_PORT=587
MAIL_USERNAME=your_username
MAIL_PASSWORD=your_password
MAIL_ENCRYPTION=tls
MAIL_FROM_ADDRESS=tina@tinamoore.com
MAIL_FROM_NAME="Anchor into Presence"

ACCESS_KEY=your_aws_access_key
Secret_access_key=your_aws_secret_key
Region=us-east-1
Bucket_Name=your_s3_bucket
Cloudfront_URL=https://your_cloudfront.cloudfront.net
```

### Local Installation & Development

```bash
# 1. Install dependencies
npm install

# 2. Start development server (Port 3022 with Turbopack)
npm run dev

# 3. Access Admin Panel
# http://localhost:3022/admin/login
```
