# Pulse | Internal Messaging Hub 🌲

A premium, high-performance internal message board built with **Next.js 15 (Turbopack)** and **Supabase**. Pulse features a sophisticated "Forest Green" theme, real-time messaging, file attachments, and custom emoji support.

## 🚀 Features

- **Real-time Messaging**: Instant message delivery using Supabase Realtime.
- **Forest Green Theme**: Organic, premium dark and light modes with glassmorphism.
- **Multilingual Support**: Default Japanese (JA) with easy English (EN) toggle.
- **File Attachments**: 📎 Support for images (with previews) and general file uploads.
- **Custom Emojis**: 😀 Support for community-requested and built-in "starter" emojis.
- **Authentication**: Secure Magic Link login via Supabase Auth.

## 🛠️ Technology Stack

- **Frontend**: Next.js (App Router), TypeScript, CSS Modules.
- **Backend/Database**: Supabase (PostgreSQL, Realtime, Storage).
- **Icons**: Lucide React.
- **Styling**: Vanilla CSS with CSS Variables for theme management.

## 🚦 Getting Started

### 1. Clone the repository
```bash
git clone https://github.com/ryo0094/ryo-msgboard.git
cd ryo-msgboard
```

### 2. Install dependencies
```bash
npm install
```

### 3. Setup Supabase
Create a project on [Supabase](https://supabase.com) and run the following in the SQL Editor:

#### A. Core Tables & Realtime
```sql
-- Tables for Profiles, Channels, Messages, and Emojis
-- (Refer to architecture.md for the full schema setup)
```

#### B. Storage Buckets
Create the following buckets with Public access:
- `message-attachments`
- `custom-emojis`
- `avatars`

### 4. Environment Variables
Create a `.env.local` file with your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 5. Run the development server
```bash
npm run dev
# OR use the helper script if on Windows
.\dev.bat
```

## 📜 License
Internal Project - Pulse POC.
