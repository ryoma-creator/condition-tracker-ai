import { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity, Alert, Modal, Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import { type ConditionLog } from '../../lib/types';
import ConditionForm from '../../components/ConditionForm';

// S=赤橙 A=橙黄 B=黄 C=緑 D=青（パワプロ式）
type ConditionGrade = { face: string; label: string; bg: string; text: string; filter: string };

const GRADES: ConditionGrade[] = [
  { face: '😄', label: 'S', bg: '#4a1010', text: '#f87171', filter: 'sepia(1) saturate(10) hue-rotate(320deg)' },
  { face: '🙂', label: 'A', bg: '#3a2010', text: '#fb923c', filter: 'sepia(1) saturate(8) hue-rotate(15deg)' },
  { face: '😐', label: 'B', bg: '#2d2a12', text: '#facc15', filter: 'none' },
  { face: '😟', label: 'C', bg: '#14532d', text: '#4ade80', filter: 'sepia(1) saturate(6) hue-rotate(85deg) brightness(1.3)' },
  { face: '😵', label: 'D', bg: '#1e3a5f', text: '#60a5fa', filter: 'sepia(1) saturate(6) hue-rotate(185deg) brightness(1.4)' },
];

function calcGrade(avg: number): ConditionGrade {
  if (avg >= 4.5) return GRADES[0];
  if (avg >= 3.5) return GRADES[1];
  if (avg >= 2.5) return GRADES[2];
  if (avg >= 1.5) return GRADES[3];
  return GRADES[4];
}

// 個別ステータス値（1〜5）のグレードと色
function statGrade(val: number): { label: string; color: string } {
  if (val >= 5) return { label: 'S', color: '#f87171' };
  if (val >= 4) return { label: 'A', color: '#fb923c' };
  if (val >= 3) return { label: 'B', color: '#facc15' };
  if (val >= 2) return { label: 'C', color: '#4ade80' };
  return { label: 'D', color: '#60a5fa' };
}

function GradeFace({ grade }: { grade: ConditionGrade }) {
  return (
    <View style={[s.gradeBadge, { backgroundColor: grade.bg }]}>
      <Text style={[
        s.gradeFace,
        Platform.OS === 'web' && grade.filter !== 'none'
          ? ({ filter: grade.filter } as object)
          : undefined,
      ]}>{grade.face}</Text>
      <Text style={[s.gradeLabel, { color: grade.text }]}>{grade.label}</Text>
    </View>
  );
}

function StatChip({ label, val }: { label: string; val: number }) {
  const g = statGrade(val);
  return (
    <View style={s.statChip}>
      <Text style={s.statKey}>{label} </Text>
      <Text style={[s.statNum, { color: g.color }]}>{val}</Text>
      <Text style={[s.statGrd, { color: g.color }]}>{g.label}</Text>
    </View>
  );
}

function EntryCard({ entry, onEdit, onDelete }: { entry: ConditionLog; onEdit: () => void; onDelete: () => void }) {
  const [confirmDel, setConfirmDel] = useState(false);
  const exLogs = entry.exercise_logs ?? [];
  const meals = entry.meals ?? {};
  const supLogs = entry.supplement_logs ?? [];
  const avg = (entry.sleep_quality + entry.fatigue + entry.focus) / 3;
  const grade = calcGrade(avg);
  const extraSleep = entry.extra_sleep as { start_time: string; end_time?: string; minutes?: number } | null | undefined;

  return (
    <View style={s.card}>
      <View style={s.cardHeader}>
        <Text style={s.cardDate}>{entry.date}</Text>
        <View style={s.cardActions}>
          <TouchableOpacity style={s.editBtn} onPress={onEdit}>
            <Text style={s.editBtnTxt}>編集</Text>
          </TouchableOpacity>
          {confirmDel ? (
            <View style={s.confirmRow}>
              <Text style={s.confirmText}>本当に削除？</Text>
              <TouchableOpacity style={s.confirmYesBtn} onPress={onDelete}>
                <Text style={s.confirmYesTxt}>削除</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setConfirmDel(false)}>
                <Text style={s.confirmNo}>やめる</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={s.deleteBtn} onPress={() => setConfirmDel(true)}>
              <Text style={s.deleteBtnTxt}>削除</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* コンディションバッジ＋スタッツ */}
      <View style={s.condRow}>
        <GradeFace grade={grade} />
        <View style={s.condStats}>
          <Text style={s.sleepLine}>
            😴 {entry.bed_time} → {entry.wake_time}（{entry.sleep_hours}h）
            {entry.straight_sleep === false ? <Text style={s.brokenTag}> ✗直</Text> : null}
          </Text>
          {extraSleep && (
            <Text style={s.extraSleepLine}>
              ↩ 睡眠2 {extraSleep.start_time}〜{extraSleep.end_time ?? `${extraSleep.minutes}分`}
            </Text>
          )}
          <View style={s.statsRow}>
            <StatChip label="質" val={entry.sleep_quality} />
            <StatChip label="疲労" val={entry.fatigue} />
            <StatChip label="集中" val={entry.focus} />
            {entry.cold_shower && <Text style={s.cold}>🚿</Text>}
          </View>
        </View>
      </View>

      {exLogs.length > 0 && (
        <Text style={s.detail}>💪 {exLogs.map((l) => {
          const t = l.time_of_day === 'morning' ? '朝' : l.time_of_day === 'afternoon' ? '昼' : l.time_of_day === 'night' ? '夜' : '';
          return `${l.type}${l.minutes}分${l.outdoor ? '(外)' : ''}${t ? `[${t}]` : ''}`;
        }).join(' / ')}</Text>
      )}

      {(meals.breakfast || meals.lunch || meals.dinner) && (
        <Text style={s.detail}>🍽 朝:{meals.breakfast ?? '-'} 昼:{meals.lunch ?? '-'} 夜:{meals.dinner ?? '-'}</Text>
      )}

      {supLogs.length > 0 && (
        <Text style={s.detail}>💊 {supLogs.map((sl) => `${sl.name}${sl.amount ? `(${sl.amount})` : ''}/${sl.timing === 'morning' ? '朝' : sl.timing === 'afternoon' ? '昼' : '夜'}`).join(' ')}</Text>
      )}

      {entry.memo ? <Text style={s.memo}>{entry.memo}</Text> : null}
    </View>
  );
}

const isColumnError = (msg: string) =>
  msg.includes('column') || msg.includes('does not exist') || msg.includes('42703');

function EditModal({ entry, onClose, onSaved }: { entry: ConditionLog; onClose: () => void; onSaved: () => void }) {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const handleSave = async (log: ConditionLog, sleepHours: number) => {
    setSaving(true);
    setSaveError(null);

    const full = {
      date: log.date, bed_time: log.bed_time, wake_time: log.wake_time,
      sleep_hours: sleepHours, sleep_quality: log.sleep_quality,
      fatigue: log.fatigue, focus: log.focus, cold_shower: log.cold_shower,
      exercise_logs: log.exercise_logs ?? [], meals: log.meals ?? {},
      supplement_logs: log.supplement_logs ?? [],
      straight_sleep: log.straight_sleep ?? true, extra_sleep: log.extra_sleep ?? null,
      sunlight: log.sunlight ?? false, sunlight_minutes: log.sunlight_minutes ?? 0,
      memo: log.memo ?? '',
    };
    const base = {
      date: log.date, bed_time: log.bed_time, wake_time: log.wake_time,
      sleep_hours: sleepHours, sleep_quality: log.sleep_quality,
      fatigue: log.fatigue, focus: log.focus, cold_shower: log.cold_shower,
      exercise_logs: log.exercise_logs ?? [], meals: log.meals ?? {},
      memo: log.memo ?? '',
    };

    let { error } = await supabase.from('condition_logs').update(full).eq('id', entry.id as string);
    // カラム不足ならベースだけで再試行
    if (error && isColumnError(error.message)) {
      ({ error } = await supabase.from('condition_logs').update(base).eq('id', entry.id as string));
    }

    setSaving(false);
    if (error) {
      setSaveError(error.message);
    } else {
      onSaved();
      onClose();
    }
  };

  return (
    <Modal visible animationType="slide" presentationStyle="pageSheet">
      <View style={s.modalContainer}>
        <View style={s.modalHeader}>
          <Text style={s.modalTitle}>{entry.date} を編集</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 20, bottom: 20, left: 20, right: 20 }}>
            <Text style={s.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        {saveError && (
          <View style={s.modalError}>
            <Text style={s.modalErrorText}>❌ {saveError}</Text>
          </View>
        )}
        <ConditionForm initial={entry} onSave={handleSave} saving={saving} showDatePicker />
      </View>
    </Modal>
  );
}

export default function HistoryScreen() {
  const [entries, setEntries] = useState<ConditionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [editTarget, setEditTarget] = useState<ConditionLog | null>(null);

  const loadEntries = useCallback(async () => {
    const { data } = await supabase
      .from('condition_logs').select('*').order('date', { ascending: false }).limit(30);
    if (data) setEntries(data as ConditionLog[]);
    setLoading(false);
  }, []);

  useEffect(() => { loadEntries(); }, [loadEntries]);

  const doDelete = async (entry: ConditionLog) => {
    const { error } = await supabase.from('condition_logs').delete().eq('id', entry.id as string);
    if (error) Alert.alert('削除エラー', error.message);
    else loadEntries();
  };

  if (loading) return <ActivityIndicator style={{ flex: 1, backgroundColor: '#0f0f0f' }} color="#6366f1" />;

  return (
    <View style={{ flex: 1, backgroundColor: '#0f0f0f' }}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>記録一覧</Text>
        {entries.length === 0 && <Text style={s.empty}>まだ記録がありません</Text>}
        {entries.map((e) => (
          <EntryCard
            key={e.id}
            entry={e}
            onEdit={() => setEditTarget(e)}
            onDelete={() => doDelete(e)}
          />
        ))}
      </ScrollView>

      {editTarget && (
        <EditModal
          entry={editTarget}
          onClose={() => setEditTarget(null)}
          onSaved={() => { loadEntries(); setEditTarget(null); }}
        />
      )}
    </View>
  );
}

const s = StyleSheet.create({
  content: { padding: 20, paddingBottom: 48 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 16 },
  empty: { color: '#555', textAlign: 'center', marginTop: 60 },
  card: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 16, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  cardDate: { color: '#6366f1', fontSize: 14, fontWeight: '700' },
  cardActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  editBtn: { backgroundColor: '#2a2a3e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  editBtnTxt: { color: '#6366f1', fontSize: 12 },
  deleteBtn: { backgroundColor: '#2a1a1a', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 4 },
  deleteBtnTxt: { color: '#ef4444', fontSize: 12 },
  confirmRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  confirmText: { color: '#ef4444', fontSize: 12 },
  confirmYesBtn: { backgroundColor: '#ef4444', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 4 },
  confirmYesTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
  confirmNo: { color: '#555', fontSize: 12 },
  condRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginBottom: 10 },
  gradeBadge: { borderRadius: 12, paddingVertical: 8, paddingHorizontal: 12, alignItems: 'center', minWidth: 52 },
  gradeFace: { fontSize: 22 },
  gradeLabel: { fontSize: 13, fontWeight: '800', marginTop: 2 },
  condStats: { flex: 1, gap: 4 },
  sleepLine: { color: '#aaa', fontSize: 13 },
  brokenTag: { color: '#ef4444', fontSize: 11 },
  extraSleepLine: { color: '#888', fontSize: 12 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statChip: { flexDirection: 'row', alignItems: 'baseline', gap: 1 },
  statKey: { color: '#555', fontSize: 12 },
  statNum: { fontSize: 14, fontWeight: '700' },
  statGrd: { fontSize: 10, fontWeight: '800' },
  cold: { fontSize: 14 },
  detail: { color: '#666', fontSize: 13, marginTop: 4 },
  memo: { color: '#555', fontSize: 13, marginTop: 8, fontStyle: 'italic' },
  modalContainer: { flex: 1, backgroundColor: '#0f0f0f' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingBottom: 8 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  closeBtn: { color: '#aaa', fontSize: 24, fontWeight: 'bold', paddingHorizontal: 4 },
  modalError: { marginHorizontal: 20, marginBottom: 8, backgroundColor: '#2a0a0a', borderRadius: 10, padding: 12, borderWidth: 1, borderColor: '#ef4444' },
  modalErrorText: { color: '#ef4444', fontSize: 13 },
});
