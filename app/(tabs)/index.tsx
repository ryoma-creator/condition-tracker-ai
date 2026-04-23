import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { DEFAULT_LOG, type ConditionLog } from '../../lib/types';
import ConditionForm from '../../components/ConditionForm';

type Mode = 'new' | 'edit';

// 新しいカラムが存在しない場合のフォールバック用ベースペイロード
const basePayload = (log: ConditionLog, sleepHours: number) => ({
  date: log.date,
  bed_time: log.bed_time,
  wake_time: log.wake_time,
  sleep_hours: sleepHours,
  sleep_quality: log.sleep_quality,
  fatigue: log.fatigue,
  focus: log.focus,
  cold_shower: log.cold_shower,
  exercise_logs: log.exercise_logs ?? [],
  meals: log.meals ?? {},
  memo: log.memo ?? '',
});

const fullPayload = (log: ConditionLog, sleepHours: number) => ({
  ...basePayload(log, sleepHours),
  supplement_logs: log.supplement_logs ?? [],
  straight_sleep: log.straight_sleep ?? true,
  extra_sleep: log.extra_sleep ?? null,
  sunlight: log.sunlight ?? false,
  sunlight_minutes: log.sunlight_minutes ?? 0,
});

// カラム不足エラーか判定
const isColumnError = (msg: string) =>
  msg.includes('column') || msg.includes('does not exist') || msg.includes('42703');

export default function TodayScreen() {
  const [saving, setSaving] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [initialLog, setInitialLog] = useState<Partial<ConditionLog>>(DEFAULT_LOG());
  const [mode, setMode] = useState<Mode>('new');
  const [existingId, setExistingId] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('condition_logs').select('id').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => setHasPrev((data?.length ?? 0) > 0));
  }, []);

  const inheritFromPrev = async () => {
    setLoadingPrev(true);
    const { data } = await supabase.from('condition_logs').select('*').order('created_at', { ascending: false }).limit(1);
    if (data && data[0]) {
      const prev = data[0] as ConditionLog;
      setInitialLog({ ...prev, id: undefined, date: new Date().toISOString().split('T')[0] });
      setFormKey((k) => k + 1);
    }
    setLoadingPrev(false);
  };

  // 日付変更時：フォームは触らず、既存レコードの有無だけ確認してモード切替
  const handleDateChange = async (date: string) => {
    const { data } = await supabase.from('condition_logs').select('id').eq('date', date).maybeSingle();
    if (data) {
      setMode('edit');
      setExistingId(data.id as string);
    } else {
      setMode('new');
      setExistingId(null);
    }
  };

  const doSave = async (log: ConditionLog, sleepHours: number, userId: string, targetId: string | null) => {
    const full = fullPayload(log, sleepHours);
    const base = basePayload(log, sleepHours);

    if (targetId) {
      // update
      let { error } = await supabase.from('condition_logs').update(full).eq('id', targetId);
      if (error && isColumnError(error.message)) {
        ({ error } = await supabase.from('condition_logs').update(base).eq('id', targetId));
        if (!error) Alert.alert('保存した ✓', 'サプリ・日光情報は保存できませんでした。\nSupabaseでSQLを実行してください。');
      }
      return error;
    } else {
      // insert
      let { error } = await supabase.from('condition_logs').insert({ user_id: userId, ...full });
      if (error && isColumnError(error.message)) {
        ({ error } = await supabase.from('condition_logs').insert({ user_id: userId, ...base }));
        if (!error) Alert.alert('記録した ✓', 'サプリ・日光情報は保存できませんでした。\nSupabaseでSQLを実行してください。');
      }
      return error;
    }
  };

  const handleSave = async (log: ConditionLog, sleepHours: number) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    // 保存時点で再チェック（日付が変わっていることもある）
    const { data: existing } = await supabase
      .from('condition_logs').select('id').eq('date', log.date).maybeSingle();
    const targetId = existing?.id ?? existingId ?? null;

    if (targetId && mode === 'new') {
      // 新規のつもりが重複あり → 確認
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm(`${log.date} の記録が既にあります。上書きしますか？`)
        : await new Promise<boolean>((resolve) => Alert.alert(
            '既に記録があります', `${log.date} を上書きしますか？`,
            [{ text: 'キャンセル', onPress: () => resolve(false) },
             { text: '上書き', style: 'destructive', onPress: () => resolve(true) }],
          ));
      if (!ok) { setSaving(false); return; }
    }

    const error = await doSave(log, sleepHours, user.id, targetId);
    if (error) Alert.alert('保存エラー', error.message);
    else if (mode === 'new' && !targetId) Alert.alert('記録した ✓');
    else if (targetId) Alert.alert('上書き保存した ✓');

    setSaving(false);
  };

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>記録する</Text>
        <TouchableOpacity onPress={() => supabase.auth.signOut()}>
          <Text style={s.logout}>ログアウト</Text>
        </TouchableOpacity>
      </View>

      {mode === 'edit' && (
        <View style={s.editBanner}>
          <Text style={s.editBannerText}>✏️ この日付の記録が既にあります（上書き保存）</Text>
        </View>
      )}

      {hasPrev && mode === 'new' && (
        <TouchableOpacity style={s.inheritBtn} onPress={inheritFromPrev} disabled={loadingPrev}>
          {loadingPrev
            ? <ActivityIndicator color="#6366f1" size="small" />
            : <Text style={s.inheritBtnText}>↩ 前日から引き継ぐ（変更部分だけ直せばOK）</Text>}
        </TouchableOpacity>
      )}

      <ConditionForm
        key={formKey}
        initial={initialLog}
        onSave={handleSave}
        saving={saving}
        onDateChange={handleDateChange}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  logout: { fontSize: 13, color: '#444' },
  editBanner: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#1e1a2e', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#a78bfa' },
  editBannerText: { color: '#a78bfa', fontSize: 13, textAlign: 'center' },
  inheritBtn: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#6366f1' },
  inheritBtnText: { color: '#6366f1', fontSize: 13, textAlign: 'center' },
});
