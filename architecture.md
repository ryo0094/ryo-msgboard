# Pulse Architecture & Database Schema

## Overview
Pulse is a real-time message board built with Next.js and Supabase.

## Database Schema (PostgreSQL)

### Profiles
Stores user-specific settings and profile information.
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique,
  display_name text,
  avatar_url text,
  status text default 'online',
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Channels
List of available channels.
```sql
create table channels (
  id uuid default gen_random_uuid() primary key,
  name text not null unique,
  description text,
  is_private boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);
```

### Messages
The core message data.
```sql
create table messages (
  id uuid default gen_random_uuid() primary key,
  channel_id uuid references channels(id) on delete cascade not null,
  user_id uuid references auth.users(id) on delete cascade not null,
  content text not null,
  file_url text, -- For image/file uploads
  file_type text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);
```

### Custom Emojis
```sql
create table custom_emojis (
  id uuid default gen_random_uuid() primary key,
  name text not null unique, -- e.g., 'party-parrot'
  image_url text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  created_by uuid references auth.users(id)
);
```

## Storage Buckets
1. `message-attachments`: For files and images shared in chat.
2. `custom-emojis`: For user-uploaded emojis.
3. `avatars`: For user profile pictures.

## Realtime
Enabled for the `messages` table to ensure "instant" delivery across all clients.
