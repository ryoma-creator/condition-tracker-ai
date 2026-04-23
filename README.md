# Condition Tracker

Personal health & condition tracking app built with Expo (React Native) + Supabase + OpenAI.

## Features

- **Sleep tracking** — bed/wake time, quality score, straight sleep flag, extra sleep logging
- **Condition scoring** — fatigue & focus on a 5-point scale with Pawapro-style grade display (S/A/B/C/D)
- **Exercise logging** — type, duration, outdoor flag, time of day
- **Meal tracking** — breakfast, lunch, dinner free text
- **Supplement logging** — per-supplement with timing (morning/afternoon/night) and amount
- **Sunlight exposure** — toggle + minutes
- **AI analysis** — pattern detection from past 30 days (danger / warning / good alerts)
- **AI chat** — ask questions based on past 14 days of data
- **Pro subscription** — AI features behind a Stripe paywall (¥500/month)

## Stack

- **Frontend**: Expo / React Native (iOS, Android, Web)
- **Backend**: Supabase (PostgreSQL + RLS + Auth)
- **AI**: OpenAI gpt-4o-mini
- **Payments**: Stripe Checkout + Webhooks
- **API**: Python serverless functions on Vercel (`condition-api`)
- **Deployment**: Vercel (Expo Web export)

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Create `.env.local`:

```
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
EXPO_PUBLIC_OPENAI_API_KEY=your_openai_api_key
EXPO_PUBLIC_API_URL=your_condition_api_vercel_url
```

### 3. Supabase setup

Run `supabase_setup.sql` and `supabase_subscriptions.sql` in the Supabase SQL Editor.

Then add extended columns:

```sql
alter table condition_logs
  add column if not exists supplement_logs jsonb default '[]',
  add column if not exists nap jsonb default null,
  add column if not exists sunlight boolean default false,
  add column if not exists sunlight_minutes int default 0,
  add column if not exists straight_sleep boolean default true,
  add column if not exists extra_sleep jsonb default null;
```

### 4. Run locally

```bash
# Web (browser)
npm run web

# iOS simulator
npm run ios

# Android emulator
npm run android
```

## Deploy to Vercel (Web)

The `vercel.json` is already configured. Connect this repo to Vercel, set the environment variables in the Vercel dashboard, and it will build automatically on every push.

## Related

- [`condition-api`](https://github.com/ryoma-creator/condition-api) — Python backend for Stripe and OpenAI
