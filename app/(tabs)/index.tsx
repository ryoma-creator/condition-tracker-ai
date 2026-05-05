import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';
import { DEFAULT_LOG, type ConditionLog } from '../../lib/types';
import ConditionForm from '../../components/ConditionForm';
import { useLanguage } from '../../contexts/LanguageContext';
import { LanguageSwitcher } from '../../components/LanguageSwitcher';
import { BackgroundSettings } from '../../components/BackgroundSettings';
import { BackgroundView } from '../../components/BackgroundView';

type Mode = 'new' | 'edit';

const fullPayload = (log: ConditionLog, sleepHours: number) => ({
  date: log.date, bed_time: log.bed_time, wake_time: log.wake_time,
  sleep_hours: sleepHours, sleep_quality: log.sleep_quality,
  fatigue: log.fatigue, focus: log.focus, mood: log.mood ?? 3,
  cold_shower: log.cold_shower,
  exercise_logs: log.exercise_logs ?? [], meals: log.meals ?? {}, memo: log.memo ?? '',
  supplement_logs: log.supplement_logs ?? [],
  straight_sleep: log.straight_sleep ?? true,
  extra_sleep: log.extra_sleep ?? null,
  sunlight: log.sunlight ?? false,
  sunlight_minutes: log.sunlight_minutes ?? 0,
  study_hours: log.study_hours ?? 0,
});

export default function TodayScreen() {
  const { t } = useLanguage();
  const [saving, setSaving] = useState(false);
  const [loadingPrev, setLoadingPrev] = useState(false);
  const [hasPrev, setHasPrev] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [initialLog, setInitialLog] = useState<Partial<ConditionLog>>(DEFAULT_LOG());
  const [mode, setMode] = useState<Mode>('new');
  const [existingId, setExistingId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [showBgSettings, setShowBgSettings] = useState(false);

  useEffect(() => {
    supabase.from('condition_logs').select('id').order('created_at', { ascending: false }).limit(1)
      .then(({ data }) => setHasPrev((data?.length ?? 0) > 0));
  }, []);

  const inheritFromPrev = async () => {
    setLoadingPrev(true);
    const { data } = await supabase.from('condition_logs').select('*').order('created_at', { ascending: false }).limit(1);
    if (data && data[0]) {
      const prev = data[0] as ConditionLog;
      const d = new Date();
      const localDate = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      setInitialLog({ ...prev, id: undefined, date: localDate });
      setFormKey((k) => k + 1);
    }
    setLoadingPrev(false);
  };

  const handleDateChange = async (date: string) => {
    const { data } = await supabase.from('condition_logs').select('id').eq('date', date).maybeSingle();
    if (data) { setMode('edit'); setExistingId(data.id as string); }
    else { setMode('new'); setExistingId(null); }
  };

  const doSave = async (log: ConditionLog, sleepHours: number, userId: string, targetId: string | null) => {
    const full = fullPayload(log, sleepHours);
    if (targetId) {
      const { error } = await supabase.from('condition_logs').update(full).eq('id', targetId);
      return error;
    } else {
      const { error } = await supabase.from('condition_logs').insert({ user_id: userId, ...full });
      return error;
    }
  };

  const handleSave = async (log: ConditionLog, sleepHours: number) => {
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }

    const { data: existing } = await supabase
      .from('condition_logs').select('id').eq('date', log.date).maybeSingle();
    const targetId = existing?.id ?? existingId ?? null;

    if (targetId && mode === 'new') {
      const ok = typeof window !== 'undefined' && window.confirm
        ? window.confirm(t.overwriteMsg(log.date))
        : await new Promise<boolean>((resolve) => Alert.alert(
            t.overwriteTitle, t.overwriteMsg(log.date),
            [{ text: t.cancel, onPress: () => resolve(false) },
             { text: t.overwrite, style: 'destructive', onPress: () => resolve(true) }],
          ));
      if (!ok) { setSaving(false); return; }
    }

    const error = await doSave(log, sleepHours, user.id, targetId);
    if (error) {
      setSaveError(error.message);
    } else {
      setSaveError(null);
      setSaved(true);
      setFormKey((k) => k + 1);
      setInitialLog(DEFAULT_LOG());
      setMode('new');
      setExistingId(null);
    }
    setSaving(false);
  };

  return (
    <BackgroundView style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>{t.todayTitle}</Text>
        <View style={s.headerRight}>
          <TouchableOpacity style={s.bgBtn} onPress={() => setShowBgSettings(true)}>
            <Text style={s.bgBtnTxt}>⚙</Text>
          </TouchableOpacity>
          <LanguageSwitcher />
          <TouchableOpacity onPress={() => supabase.auth.signOut()}>
            <Text style={s.logout}>{t.logout}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {saved && !saveError && (
        <View style={s.successBanner}>
          <Text style={s.successText}>{t.savedMsg}</Text>
        </View>
      )}
      {saveError && (
        <View style={s.errorBanner}>
          <Text style={s.errorText}>❌ {saveError}</Text>
        </View>
      )}
      {mode === 'edit' && !saveError && (
        <View style={s.editBanner}>
          <Text style={s.editBannerText}>{t.editBanner}</Text>
        </View>
      )}
      {hasPrev && mode === 'new' && (
        <TouchableOpacity style={s.inheritBtn} onPress={inheritFromPrev} disabled={loadingPrev}>
          {loadingPrev
            ? <ActivityIndicator color="#6366f1" size="small" />
            : <Text style={s.inheritBtnText}>{t.inheritBtn}</Text>}
        </TouchableOpacity>
      )}

      <ConditionForm
        key={formKey}
        initial={initialLog}
        onSave={handleSave}
        saving={saving}
        onDateChange={handleDateChange}
      />

      <BackgroundSettings visible={showBgSettings} onClose={() => setShowBgSettings(false)} />
    </BackgroundView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 24, paddingTop: 16, paddingBottom: 8 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff' },
  headerRight: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  bgBtn: { width: 30, height: 30, alignItems: 'center', justifyContent: 'center' },
  bgBtnTxt: { color: '#555', fontSize: 18 },
  logout: { fontSize: 13, color: '#444' },
  successBanner: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#0a2a0a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#4ade80' },
  successText: { color: '#4ade80', fontSize: 13, textAlign: 'center' },
  errorBanner: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#2a0a0a', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#ef4444' },
  errorText: { color: '#ef4444', fontSize: 13, fontWeight: '700' },
  editBanner: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#1e1a2e', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#a78bfa' },
  editBannerText: { color: '#a78bfa', fontSize: 13, textAlign: 'center' },
  inheritBtn: { marginHorizontal: 24, marginBottom: 8, backgroundColor: '#1a1a2e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#6366f1' },
  inheritBtnText: { color: '#6366f1', fontSize: 13, textAlign: 'center' },
});
