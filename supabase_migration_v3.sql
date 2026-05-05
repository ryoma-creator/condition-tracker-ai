-- ユーザー設定テーブル（カスタムサプリ等）
CREATE TABLE IF NOT EXISTS user_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users ON DELETE CASCADE,
  custom_supplements text[] DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own settings only" ON user_settings
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
