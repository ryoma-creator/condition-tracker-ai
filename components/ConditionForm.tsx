import { useState, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Switch, TextInput } from 'react-native';
import { type ConditionLog, type ExerciseLog, type Meals, type SupplementLog, type ExtraSleep, DEFAULT_LOG } from '../lib/types';

type ScaleOption = { value: number; label: string };

const SLEEP_QUALITY: ScaleOption[] = [
  { value: 1, label: '最悪' }, { value: 2, label: '浅い' }, { value: 3, label: '普通' },
  { value: 4, label: '良い' }, { value: 5, label: '爆睡' },
];
const FATIGUE: ScaleOption[] = [
  { value: 1, label: '限界' }, { value: 2, label: '重い' }, { value: 3, label: '普通' },
  { value: 4, label: '少し' }, { value: 5, label: 'ゼロ' },
];
const FOCUS: ScaleOption[] = [
  { value: 1, label: '無理' }, { value: 2, label: '散漫' }, { value: 3, label: '普通' },
  { value: 4, label: '良い' }, { value: 5, label: 'ゾーン' },
];
const EXERCISE_TYPES = ['筋トレ', 'ウォーキング', 'ランニング', 'ストレッチ', 'その他'];
const SUPPLEMENT_LIST = ['プロテイン', 'マグネシウム', 'SleepWell', 'ビタミンD', 'クレアチン'];
const MEAL_KEYS = ['breakfast', 'lunch', 'dinner'] as const;
const MEAL_LABELS = { breakfast: '朝食', lunch: '昼食', dinner: '夕食' };
const TIMING_LABELS = { morning: '朝', afternoon: '昼', night: '夜' };
type MealKey = typeof MEAL_KEYS[number];

function ScalePicker({ title, options, value, onChange }: { title: string; options: ScaleOption[]; value: number; onChange: (v: number) => void }) {
  return (
    <View style={s.section}>
      <Text style={s.label}>{title}</Text>
      <View style={s.row}>
        {options.map((opt) => (
          <TouchableOpacity key={opt.value} style={[s.scaleBtn, value === opt.value && s.active]} onPress={() => onChange(opt.value)}>
            <Text style={[s.scaleTxt, value === opt.value && s.activeTxt]}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );
}

function TimeStepper({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  const [h, m] = value.split(':').map(Number);
  const setH = (nh: number) => onChange(`${String((nh + 24) % 24).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
  const setM = (nm: number) => onChange(`${String(h).padStart(2, '0')}:${String(nm).padStart(2, '0')}`);
  return (
    <View style={s.section}>
      <Text style={s.label}>{label}</Text>
      <View style={s.timeRow}>
        <View style={s.timeUnit}>
          <TouchableOpacity style={s.stepBtn} onPress={() => setH(h + 1)}><Text style={s.stepTxt}>▲</Text></TouchableOpacity>
          <Text style={s.timeVal}>{String(h).padStart(2, '0')}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => setH(h - 1)}><Text style={s.stepTxt}>▼</Text></TouchableOpacity>
        </View>
        <Text style={s.colon}>:</Text>
        <View style={s.timeUnit}>
          <TouchableOpacity style={s.stepBtn} onPress={() => setM(m === 0 ? 30 : 0)}><Text style={s.stepTxt}>▲</Text></TouchableOpacity>
          <Text style={s.timeVal}>{String(m).padStart(2, '0')}</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => setM(m === 0 ? 30 : 0)}><Text style={s.stepTxt}>▼</Text></TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

function calcHours(bed: string, wake: string): number {
  const [bh, bm] = bed.split(':').map(Number);
  const [wh, wm] = wake.split(':').map(Number);
  const diff = (wh * 60 + wm) - (bh * 60 + bm);
  return Math.round((diff < 0 ? diff + 24 * 60 : diff) / 60 * 10) / 10;
}

type Props = {
  initial?: Partial<ConditionLog>;
  onSave: (log: ConditionLog, sleepHours: number) => Promise<void>;
  saving: boolean;
  showDatePicker?: boolean;
  onDateChange?: (date: string) => void;
};

export default function ConditionForm({ initial, onSave, saving, showDatePicker = true, onDateChange }: Props) {
  const base = { ...DEFAULT_LOG(), ...initial };
  const [log, setLog] = useState<ConditionLog>(base);

  const sleepHours = useMemo(() => calcHours(log.bed_time, log.wake_time), [log.bed_time, log.wake_time]);
  const update = (key: keyof ConditionLog, val: unknown) => setLog((prev) => ({ ...prev, [key]: val }));

  const toggleExercise = (type: string) => {
    const exists = log.exercise_logs.find((l) => l.type === type);
    update('exercise_logs', exists
      ? log.exercise_logs.filter((l) => l.type !== type)
      : [...log.exercise_logs, { type, minutes: 30, outdoor: type === 'ウォーキング' || type === 'ランニング' }]
    );
  };

  const updateExercise = (type: string, field: keyof ExerciseLog, val: unknown) => {
    update('exercise_logs', log.exercise_logs.map((l) => l.type === type ? { ...l, [field]: val } : l));
  };

  const toggleSupplement = (name: string, timing: SupplementLog['timing']) => {
    const exists = log.supplement_logs.find((s) => s.name === name && s.timing === timing);
    update('supplement_logs', exists
      ? log.supplement_logs.filter((s) => !(s.name === name && s.timing === timing))
      : [...log.supplement_logs, { name, timing, amount: '' }]
    );
  };

  return (
    <ScrollView style={s.container} contentContainerStyle={s.content}>
      {showDatePicker && (
        <View style={s.section}>
          <Text style={s.label}>いつの記録？</Text>
          <View style={s.row}>
            {[0, 1, 2].map((n) => {
              const d = new Date(); d.setDate(d.getDate() - n);
              const str = d.toISOString().split('T')[0];
              const label = n === 0 ? '今日' : n === 1 ? '昨日' : '2日前';
              const displayDate = `${d.getMonth() + 1}/${d.getDate()}`;
              return (
                <TouchableOpacity key={str} style={[s.scaleBtn, log.date === str && s.active]} onPress={() => { update('date', str); onDateChange?.(str); }}>
                  <Text style={[s.scaleTxt, log.date === str && s.activeTxt]}>{label}</Text>
                  <Text style={[s.dateSub, log.date === str && s.activeTxt]}>{displayDate}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
          <TextInput
            style={s.dateInput}
            value={log.date}
            onChangeText={(v) => {
              update('date', v);
              if (/^\d{4}-\d{2}-\d{2}$/.test(v)) onDateChange?.(v);
            }}
            placeholder="YYYY-MM-DD（例: 2026-04-22）"
            placeholderTextColor="#333"
            keyboardType="numbers-and-punctuation"
          />
        </View>
      )}

      <View style={s.divider} /><Text style={s.blockTitle}>睡眠</Text>

      {/* 睡眠1 */}
      <View style={s.sleepBlock}>
        <Text style={s.sleepBlockLabel}>睡眠1</Text>
        <View style={s.sleepRow}>
          <View style={s.sleepCol}>
            <TimeStepper label="就寝" value={log.bed_time} onChange={(v) => update('bed_time', v)} />
          </View>
          <Text style={s.sleepArrow}>→</Text>
          <View style={s.sleepCol}>
            <TimeStepper label="起床" value={log.wake_time} onChange={(v) => update('wake_time', v)} />
          </View>
        </View>
        <View style={s.sleepBadge}>
          <Text style={s.sleepBadgeTxt}><Text style={s.highlight}>{sleepHours}時間</Text></Text>
        </View>
      </View>

      {/* 睡眠2（二度寝） */}
      {log.extra_sleep ? (
        <View style={s.sleepBlock}>
          <View style={s.sleepBlockHeader}>
            <Text style={s.sleepBlockLabel}>睡眠2</Text>
            <TouchableOpacity onPress={() => update('extra_sleep', null)}>
              <Text style={s.removeTxt}>✕ 削除</Text>
            </TouchableOpacity>
          </View>
          <View style={s.sleepRow}>
            <View style={s.sleepCol}>
              <TimeStepper
                label="就寝"
                value={(log.extra_sleep as ExtraSleep).start_time}
                onChange={(v) => update('extra_sleep', { ...(log.extra_sleep as ExtraSleep), start_time: v })}
              />
            </View>
            <Text style={s.sleepArrow}>→</Text>
            <View style={s.sleepCol}>
              <TimeStepper
                label="起床"
                value={(log.extra_sleep as ExtraSleep).end_time}
                onChange={(v) => update('extra_sleep', { ...(log.extra_sleep as ExtraSleep), end_time: v })}
              />
            </View>
          </View>
          <View style={s.sleepBadge}>
            <Text style={s.sleepBadgeTxt}><Text style={s.highlight}>{calcHours((log.extra_sleep as ExtraSleep).start_time, (log.extra_sleep as ExtraSleep).end_time)}時間</Text></Text>
          </View>
        </View>
      ) : (
        <TouchableOpacity style={s.addSleepBtn} onPress={() => update('extra_sleep', { start_time: '06:00', end_time: '08:00' })}>
          <Text style={s.addSleepTxt}>＋ 睡眠を追加（二度寝など）</Text>
        </TouchableOpacity>
      )}

      <ScalePicker title="睡眠の質" options={SLEEP_QUALITY} value={log.sleep_quality} onChange={(v) => update('sleep_quality', v)} />

      <View style={s.divider} /><Text style={s.blockTitle}>コンディション</Text>
      <ScalePicker title="疲労度（右が良い）" options={FATIGUE} value={log.fatigue} onChange={(v) => update('fatigue', v)} />
      <ScalePicker title="集中度" options={FOCUS} value={log.focus} onChange={(v) => update('focus', v)} />

      {/* 学習量 */}
      <View style={s.section}>
        <Text style={s.label}>学習量（時間）</Text>
        <View style={s.exRow}>
          <TouchableOpacity style={s.stepBtn} onPress={() => update('study_hours', Math.max(0, (log.study_hours ?? 0) - 0.5))}><Text style={s.stepTxt}>▼</Text></TouchableOpacity>
          <Text style={s.minVal}>{(log.study_hours ?? 0)}h</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => update('study_hours', Math.min(12, (log.study_hours ?? 0) + 0.5))}><Text style={s.stepTxt}>▲</Text></TouchableOpacity>
        </View>
      </View>
      <View style={s.toggleRow}>
        <Text style={s.toggleLbl}>コールドシャワー</Text>
        <Switch value={log.cold_shower} onValueChange={(v) => update('cold_shower', v)} trackColor={{ true: '#6366f1' }} thumbColor="#fff" />
      </View>

      <View style={s.divider} /><Text style={s.blockTitle}>食事</Text>
      {MEAL_KEYS.map((key) => (
        <View key={key} style={s.section}>
          <Text style={s.label}>{MEAL_LABELS[key]}</Text>
          <TextInput
            style={s.input}
            value={(log.meals as Meals)[key] ?? ''}
            onChangeText={(v) => update('meals', { ...log.meals, [key]: v })}
            placeholder="例: 自炊・鶏胸肉 / コンビニ / 外食"
            placeholderTextColor="#333"
          />
        </View>
      ))}

      <View style={s.divider} /><Text style={s.blockTitle}>運動</Text>
      <View style={s.tagRow}>
        {EXERCISE_TYPES.map((type) => {
          const sel = log.exercise_logs.find((l) => l.type === type);
          return (
            <TouchableOpacity key={type} style={[s.tag, sel && s.active]} onPress={() => toggleExercise(type)}>
              <Text style={[s.tagTxt, sel && s.activeTxt]}>{type}</Text>
            </TouchableOpacity>
          );
        })}
      </View>
      {log.exercise_logs.map((ex) => (
        <View key={ex.type} style={s.exCard}>
          <Text style={s.exType}>{ex.type}</Text>
          <View style={s.exRow}>
            <Text style={s.label}>時間</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => updateExercise(ex.type, 'minutes', Math.max(10, ex.minutes - 10))}><Text style={s.stepTxt}>▼</Text></TouchableOpacity>
            <Text style={s.minVal}>{ex.minutes}分</Text>
            <TouchableOpacity style={s.stepBtn} onPress={() => updateExercise(ex.type, 'minutes', Math.min(180, ex.minutes + 10))}><Text style={s.stepTxt}>▲</Text></TouchableOpacity>
          </View>
          {(ex.type === 'ウォーキング' || ex.type === 'ランニング') && (
            <View style={s.toggleRow}>
              <Text style={s.label}>屋外（日光あり）</Text>
              <Switch value={ex.outdoor ?? false} onValueChange={(v) => updateExercise(ex.type, 'outdoor', v)} trackColor={{ true: '#6366f1' }} thumbColor="#fff" />
            </View>
          )}
          <TimeStepper
            label="時間帯"
            value={ex.time_of_day && /^\d{2}:\d{2}$/.test(ex.time_of_day) ? ex.time_of_day : '12:00'}
            onChange={(v) => updateExercise(ex.type, 'time_of_day', v)}
          />
        </View>
      ))}

      <View style={s.divider} /><Text style={s.blockTitle}>日光浴</Text>
      <View style={s.toggleRow}>
        <Text style={s.toggleLbl}>日光を浴びた</Text>
        <Switch value={log.sunlight ?? false} onValueChange={(v) => update('sunlight', v)} trackColor={{ true: '#f59e0b' }} thumbColor="#fff" />
      </View>
      {log.sunlight && (
        <View style={s.exRow}>
          <Text style={s.label}>時間</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => update('sunlight_minutes', Math.max(5, (log.sunlight_minutes ?? 10) - 5))}><Text style={s.stepTxt}>▼</Text></TouchableOpacity>
          <Text style={s.minVal}>{log.sunlight_minutes ?? 10}分</Text>
          <TouchableOpacity style={s.stepBtn} onPress={() => update('sunlight_minutes', Math.min(120, (log.sunlight_minutes ?? 10) + 5))}><Text style={s.stepTxt}>▲</Text></TouchableOpacity>
        </View>
      )}

      <View style={s.divider} /><Text style={s.blockTitle}>サプリ・薬</Text>
      {SUPPLEMENT_LIST.map((name) => (
        <View key={name} style={s.suppCard}>
          <Text style={s.suppName}>{name}</Text>
          <View style={s.suppRow}>
            {(['morning', 'afternoon', 'night'] as const).map((timing) => {
              const entry = log.supplement_logs.find((sl) => sl.name === name && sl.timing === timing);
              return (
                <View key={timing} style={s.suppTiming}>
                  <TouchableOpacity style={[s.tag, entry && s.active]} onPress={() => toggleSupplement(name, timing)}>
                    <Text style={[s.tagTxt, entry && s.activeTxt]}>{TIMING_LABELS[timing]}</Text>
                  </TouchableOpacity>
                  {entry && (
                    <TextInput
                      style={s.amountInput}
                      value={entry.amount ?? ''}
                      onChangeText={(v) => update('supplement_logs', log.supplement_logs.map((sl) => sl.name === name && sl.timing === timing ? { ...sl, amount: v } : sl))}
                      placeholder="mg/g"
                      placeholderTextColor="#333"
                      keyboardType="numeric"
                    />
                  )}
                </View>
              );
            })}
          </View>
        </View>
      ))}

      <View style={s.divider} />
      <Text style={s.label}>メモ</Text>
      <TextInput
        style={s.textarea}
        value={log.memo}
        onChangeText={(v) => update('memo', v)}
        placeholder="体の状態・気づきなど"
        placeholderTextColor="#333"
        multiline
        numberOfLines={4}
      />

      <TouchableOpacity style={s.saveBtn} onPress={() => onSave(log, sleepHours)} disabled={saving}>
        <Text style={s.saveBtnTxt}>{saving ? '保存中...' : '保存する'}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  content: { padding: 24, paddingBottom: 56 },
  blockTitle: { fontSize: 15, fontWeight: '700', color: '#fff', marginBottom: 16 },
  section: { marginBottom: 20 },
  label: { fontSize: 13, color: '#666', marginBottom: 8 },
  row: { flexDirection: 'row', gap: 6 },
  scaleBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, borderColor: '#222', alignItems: 'center' },
  active: { backgroundColor: '#6366f1', borderColor: '#6366f1' },
  scaleTxt: { color: '#444', fontSize: 12 },
  activeTxt: { color: '#fff', fontWeight: '600' },
  dateSub: { color: '#444', fontSize: 10, marginTop: 2 },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  timeUnit: { alignItems: 'center', gap: 4 },
  colon: { color: '#fff', fontSize: 28, fontWeight: 'bold' },
  timeVal: { color: '#fff', fontSize: 28, fontWeight: 'bold', width: 56, textAlign: 'center' },
  stepBtn: { width: 36, height: 28, borderRadius: 8, borderWidth: 1, borderColor: '#2a2a2a', alignItems: 'center', justifyContent: 'center' },
  stepTxt: { color: '#666', fontSize: 12 },
  sleepBadge: { backgroundColor: '#1a1a1a', borderRadius: 10, padding: 12, marginBottom: 20 },
  sleepBadgeTxt: { color: '#666', fontSize: 14 },
  highlight: { color: '#6366f1', fontWeight: 'bold', fontSize: 16 },
  toggleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  toggleLbl: { fontSize: 15, color: '#ccc' },
  input: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 10, padding: 12, fontSize: 14 },
  tagRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
  tag: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#2a2a2a' },
  tagTxt: { color: '#555', fontSize: 13 },
  exCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 10, gap: 12 },
  exType: { color: '#fff', fontWeight: '600' },
  exRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  minVal: { color: '#fff', fontWeight: 'bold', fontSize: 15, minWidth: 40, textAlign: 'center' },
  suppCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, marginBottom: 10 },
  suppName: { color: '#ccc', fontSize: 14, fontWeight: '600', marginBottom: 10 },
  suppRow: { gap: 8 },
  suppTiming: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  amountInput: { flex: 1, backgroundColor: '#2a2a2a', color: '#fff', borderRadius: 8, padding: 8, fontSize: 13 },
  dateInput: { marginTop: 10, backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 10, padding: 12, fontSize: 14 },
  sleepBlock: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 12 },
  sleepBlockHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sleepBlockLabel: { color: '#666', fontSize: 12, fontWeight: '600', marginBottom: 8 },
  sleepRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sleepCol: { flex: 1 },
  sleepArrow: { color: '#444', fontSize: 18, marginTop: 12 },
  removeTxt: { color: '#ef4444', fontSize: 12 },
  addSleepBtn: { borderWidth: 1, borderColor: '#2a2a2a', borderStyle: 'dashed', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 16 },
  addSleepTxt: { color: '#6366f1', fontSize: 14 },
  divider: { height: 1, backgroundColor: '#1e1e1e', marginVertical: 20 },
  textarea: { backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 12, padding: 16, fontSize: 15, minHeight: 100, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, alignItems: 'center', marginTop: 28 },
  saveBtnTxt: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
