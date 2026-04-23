import { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from 'react-native';
import { supabase } from '../../lib/supabase';
import { type ConditionLog } from '../../lib/types';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

const GRADES = [
  { face: '😄', label: 'S', bg: '#7f1d1d', text: '#fca5a5' },
  { face: '🙂', label: 'A', bg: '#78350f', text: '#fdba74' },
  { face: '😐', label: 'B', bg: '#713f12', text: '#fde047' },
  { face: '😟', label: 'C', bg: '#14532d', text: '#86efac' },
  { face: '😵', label: 'D', bg: '#1e3a8a', text: '#93c5fd' },
];

function calcGrade(log: ConditionLog) {
  const avg = (log.sleep_quality + log.fatigue + log.focus) / 3;
  return avg >= 4.5 ? GRADES[0] : avg >= 3.5 ? GRADES[1] : avg >= 2.5 ? GRADES[2] : avg >= 1.5 ? GRADES[3] : GRADES[4];
}

export default function CalendarScreen() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [logs, setLogs] = useState<Record<string, ConditionLog>>({});
  const [loading, setLoading] = useState(true);

  const loadMonth = useCallback(async (y: number, m: number) => {
    setLoading(true);
    const pad = (n: number) => String(n).padStart(2, '0');
    const from = `${y}-${pad(m + 1)}-01`;
    const lastDay = new Date(y, m + 1, 0).getDate();
    const to = `${y}-${pad(m + 1)}-${pad(lastDay)}`;
    const { data } = await supabase
      .from('condition_logs').select('*').gte('date', from).lte('date', to);
    const map: Record<string, ConditionLog> = {};
    if (data) data.forEach((l) => { map[l.date] = l as ConditionLog; });
    setLogs(map);
    setLoading(false);
  }, []);

  useEffect(() => { loadMonth(year, month); }, [year, month, loadMonth]);

  const prevMonth = () => {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
  };

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = new Date().toISOString().split('T')[0];
  const recordedCount = Object.keys(logs).length;

  return (
    <View style={s.container}>
      <View style={s.header}>
        <TouchableOpacity onPress={prevMonth} style={s.arrow}>
          <Text style={s.arrowTxt}>‹</Text>
        </TouchableOpacity>
        <View style={s.titleBlock}>
          <Text style={s.monthTitle}>{year}年 {month + 1}月</Text>
          <Text style={s.subTitle}>{recordedCount}日記録</Text>
        </View>
        <TouchableOpacity onPress={nextMonth} style={s.arrow}>
          <Text style={s.arrowTxt}>›</Text>
        </TouchableOpacity>
      </View>

      <View style={s.weekRow}>
        {WEEKDAYS.map((d, i) => (
          <Text key={d} style={[s.weekDay, i === 0 && s.sun, i === 6 && s.sat]}>{d}</Text>
        ))}
      </View>

      {loading
        ? <ActivityIndicator color="#6366f1" style={{ marginTop: 40 }} />
        : (
          <View style={s.grid}>
            {cells.map((day, idx) => {
              if (!day) return <View key={`e-${idx}`} style={s.cell} />;
              const pad = (n: number) => String(n).padStart(2, '0');
              const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`;
              const log = logs[dateStr];
              const isToday = dateStr === todayStr;
              const grade = log ? calcGrade(log) : null;
              return (
                <View key={dateStr} style={[s.cell, grade && { backgroundColor: grade.bg }, isToday && s.todayBorder]}>
                  <Text style={[s.dayNum, isToday && s.todayNum]}>{day}</Text>
                  {grade && <Text style={s.face}>{grade.face}</Text>}
                  {grade && <Text style={[s.gradeLabel, { color: grade.text }]}>{grade.label}</Text>}
                </View>
              );
            })}
          </View>
        )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', padding: 16 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 },
  arrow: { padding: 8 },
  arrowTxt: { color: '#6366f1', fontSize: 32, fontWeight: 'bold' },
  titleBlock: { alignItems: 'center' },
  monthTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  subTitle: { color: '#555', fontSize: 12, marginTop: 2 },
  weekRow: { flexDirection: 'row', marginBottom: 4 },
  weekDay: { flex: 1, textAlign: 'center', color: '#555', fontSize: 12, fontWeight: '600', paddingVertical: 6 },
  sun: { color: '#ef4444' },
  sat: { color: '#6366f1' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.285%', aspectRatio: 1, borderRadius: 10, padding: 2, marginVertical: 2, alignItems: 'center', justifyContent: 'center' },
  todayBorder: { borderWidth: 2, borderColor: '#6366f1' },
  dayNum: { color: '#666', fontSize: 11 },
  todayNum: { color: '#6366f1', fontWeight: 'bold' },
  face: { fontSize: 16 },
  gradeLabel: { fontSize: 9, fontWeight: '800', marginTop: 1 },
});
