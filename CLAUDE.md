# Condition Tracker — Claude向け指示

## このアプリについて

Ryoma（田口龍馬）のコンディション管理アプリ。
**完全プライベート**。Supabase Auth + RLS で本人しかデータを見れない。
将来的にApp Storeで販売予定。

---

## Ryomaについて

- バックエンドエンジニア志望（アーキテクチャ重視）
- Next.js / React / TypeScript / Tailwind は知っている
- Expo / React Native は**初めて**なので、コードの「なぜ？」を一言添えること
- 面接対策中。アーキテクチャ思考を鍛えるため、設計判断の理由を必ず説明すること
- `any` 禁止、コンポーネント100行以内、コメント日本語

---

## アプリの目的

毎日のコンディション・学習ログを記録し、
AIが過去データを参照して「先週どうだったっけ？」「最近の傾向は？」に答えてくれる。

記録内容例：
- 今日の気分・体調（数値 or テキスト）
- コールドシャワーやったか
- 学習したこと
- 自由メモ

---

## 技術スタック

- **Expo** (React Native, TypeScript)
- **Supabase** (DB + Auth) — RLSでRyomaのデータのみアクセス可
- **OpenAI gpt-4o-mini** — 過去エントリを渡してAI回答
- **Expo Router** — ファイルベースルーティング

---

## Supabaseテーブル設計

```sql
-- entriesテーブル
create table entries (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users not null,
  created_at timestamptz default now(),
  date date default current_date,
  mood int check (mood between 1 and 5),     -- 気分 1-5
  energy int check (energy between 1 and 5), -- 体力 1-5
  cold_shower boolean default false,          -- コールドシャワー
  learning text,                              -- 今日学んだこと
  memo text,                                  -- 自由メモ
  ai_insight text                             -- AIの一言
);

-- RLS: 自分のデータのみ
alter table entries enable row level security;
create policy "own data only" on entries
  using (auth.uid() = user_id);
```

---

## 画面構成

```
/ (tabs)
├── /        今日の記録（入力フォーム）
├── /history 過去の記録一覧
└── /ai      AIに聞く（過去データを渡してチャット）
```

---

## 環境変数

`.env.local` を作成：
```
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=
```

---

## 実装順序

1. Expo Router セットアップ
2. Supabase Auth（メール+パスワード）
3. 今日の記録画面（入力 → DB保存）
4. 過去の記録一覧
5. AI チャット画面（過去エントリをコンテキストとして渡す）

---

## コード規約

- `any` 禁止
- コンポーネントは100行以内
- コメントは日本語
- 設計判断には必ず理由を一言添える
