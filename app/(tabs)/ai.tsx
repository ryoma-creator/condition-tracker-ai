import { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, StyleSheet, ActivityIndicator, Modal, Linking } from 'react-native';
import OpenAI from 'openai';
import { supabase } from '../../lib/supabase';

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? '';

// Proモーダル
function ProModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  const handleSubscribe = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const res = await fetch(`${API_URL}/api/create_checkout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: user.id, email: user.email }),
    });
    const { checkout_url } = await res.json() as { checkout_url: string };
    await Linking.openURL(checkout_url);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={pm.overlay}>
        <View style={pm.box}>
          <Text style={pm.icon}>⚡</Text>
          <Text style={pm.title}>AI分析はPro機能です</Text>
          <Text style={pm.desc}>過去のコンディションデータから{'\n'}パターン・危険な傾向を分析します</Text>
          <Text style={pm.price}>¥500 / 月</Text>
          <TouchableOpacity style={pm.btn} onPress={handleSubscribe}>
            <Text style={pm.btnTxt}>Proにアップグレード</Text>
          </TouchableOpacity>
          <TouchableOpacity style={pm.closeBtn} onPress={onClose}>
            <Text style={pm.closeTxt}>今はしない</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const pm = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.8)', justifyContent: 'center', alignItems: 'center', padding: 32 },
  box: { backgroundColor: '#1a1a1a', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%' },
  icon: { fontSize: 40, marginBottom: 16 },
  title: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 10 },
  desc: { fontSize: 14, color: '#888', textAlign: 'center', lineHeight: 22, marginBottom: 20 },
  price: { fontSize: 28, fontWeight: 'bold', color: '#6366f1', marginBottom: 24 },
  btn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 16, width: '100%', alignItems: 'center', marginBottom: 12 },
  btnTxt: { color: '#fff', fontSize: 16, fontWeight: '700' },
  closeBtn: { padding: 8 },
  closeTxt: { color: '#555', fontSize: 14 },
});

const openai = new OpenAI({
  apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true,
});

type Message = { role: 'user' | 'assistant'; content: string };
type Tab = 'analysis' | 'chat';

type Alert = {
  level: 'danger' | 'warning' | 'good';
  title: string;
  detail: string;
};

type Analysis = {
  alerts: Alert[];
  summary: string;
};

const QUICK_QUESTIONS = [
  '今日の状態で何を優先すべき？',
  '最近パフォーマンスが落ちている原因は？',
  '睡眠を改善するには？',
  '今週のコンディションまとめて',
];

const ALERT_COLORS = {
  danger: '#ef4444',
  warning: '#f59e0b',
  good: '#22c55e',
};

const ALERT_ICONS = {
  danger: '🚨',
  warning: '⚠️',
  good: '✅',
};

// 過去データを文字列に変換
async function fetchContext(limit = 14) {
  const { data } = await supabase
    .from('condition_logs')
    .select('date, bed_time, wake_time, sleep_hours, sleep_quality, fatigue, focus, cold_shower, exercise_logs, meals, supplements, memo')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (!data || data.length === 0) return null;

  return data.map((e) => {
    const exLogs = (e.exercise_logs ?? []) as { type: string; minutes: number }[];
    const exStr = exLogs.length > 0 ? exLogs.map((l) => `${l.type}${l.minutes}分`).join('+') : '×';
    const meals = e.meals as Record<string, string> ?? {};
    const mealStr = `朝${meals.breakfast ?? '-'} 昼${meals.lunch ?? '-'} 夜${meals.dinner ?? '-'}`;
    const supStr = (e.supplements ?? []).join(',') || 'なし';
    return `${e.date}: 就寝${e.bed_time}→起床${e.wake_time}(${e.sleep_hours}h/質${e.sleep_quality}) 疲労${e.fatigue} 集中${e.focus} コールド${e.cold_shower ? '◯' : '×'} 運動:${exStr} 食事:${mealStr} サプリ:${supStr}${e.memo ? ` メモ:${e.memo}` : ''}`;
  }).join('\n');
}

// パターン分析タブ
function AnalysisTab() {
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [step, setStep] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const runAnalysis = async () => {
    setLoading(true);
    setElapsed(0);

    const timer = setInterval(() => setElapsed((s) => s + 1), 1000);

    // 60秒でタイムアウト
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60000);

    try {
      setStep('過去30日のデータを取得中...');
      const context = await fetchContext(30);

      if (!context) {
        setAnalysis({ alerts: [], summary: '記録が少なすぎます。数日記録を続けると分析できます。' });
        setAnalyzed(true);
        return;
      }

      const recordCount = context.split('\n').length;
      setStep(`${recordCount}件のデータをAIに送信中...`);
      await new Promise((r) => setTimeout(r, 300));

      setStep('AIが分析中... (通常15〜30秒)');

      const response = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [
          {
            role: 'system',
            content: `あなたはコンディション分析の専門家。以下のデータからパターンと危険な傾向を分析してください。

データ：
${context}

以下のJSON形式で返してください（他のテキスト不要）：
{
  "alerts": [
    {
      "level": "danger" | "warning" | "good",
      "title": "短いタイトル（15字以内）",
      "detail": "具体的な説明（例：睡眠6h以下の翌日は集中度が平均1.5低い）"
    }
  ],
  "summary": "全体的な傾向の一言まとめ（40字以内）"
}

danger: 今すぐ対処すべき危険な傾向
warning: 注意が必要な傾向
good: 良い習慣・改善されている点

アラートは最大5個。データから読み取れる具体的な相関関係を示すこと。`,
          },
        ],
        // @ts-expect-error signal はSDKの型定義にないが fetch レベルで有効
        signal: controller.signal,
      });

      setStep('結果を整形中...');
      const content = response.choices[0].message.content ?? '{}';
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      const parsed = JSON.parse(jsonMatch ? jsonMatch[0] : content) as Analysis;
      setAnalysis(parsed);
      setAnalyzed(true);

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '不明なエラー';
      const isTimeout = msg.includes('abort') || msg.includes('AbortError');
      setAnalysis({
        alerts: [],
        summary: isTimeout
          ? 'タイムアウト（60秒）しました。ネット接続を確認して再試行してください。'
          : `エラー: ${msg}`,
      });
      setAnalyzed(true);
    } finally {
      clearInterval(timer);
      clearTimeout(timeout);
      setLoading(false);
      setStep('');
    }
  };

  return (
    <ScrollView style={styles.tabContent} contentContainerStyle={styles.tabContentInner}>
      <Text style={styles.analysisTitle}>コンディション分析</Text>
      <Text style={styles.analysisSubtitle}>過去の記録から危険な傾向・パターンを検出します</Text>

      <TouchableOpacity style={styles.analyzeBtn} onPress={runAnalysis} disabled={loading}>
        {loading
          ? <ActivityIndicator color="#fff" />
          : <Text style={styles.analyzeBtnText}>{analyzed ? '再分析する' : '分析する'}</Text>}
      </TouchableOpacity>

      {loading && (
        <View style={styles.stepBox}>
          <Text style={styles.stepText}>{step}</Text>
          <Text style={styles.elapsedText}>{elapsed}秒経過</Text>
        </View>
      )}

      {analysis && (
        <View style={styles.analysisResult}>
          <View style={styles.summaryBox}>
            <Text style={styles.summaryText}>{analysis.summary}</Text>
          </View>

          {analysis.alerts.map((alert, i) => (
            <View key={i} style={[styles.alertCard, { borderLeftColor: ALERT_COLORS[alert.level] }]}>
              <View style={styles.alertHeader}>
                <Text style={styles.alertIcon}>{ALERT_ICONS[alert.level]}</Text>
                <Text style={[styles.alertTitle, { color: ALERT_COLORS[alert.level] }]}>{alert.title}</Text>
              </View>
              <Text style={styles.alertDetail}>{alert.detail}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

// チャットタブ
function ChatTab() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    setInput('');
    setLoading(true);

    const newMessages: Message[] = [...messages, { role: 'user', content: text }];
    setMessages(newMessages);

    const context = await fetchContext(14);

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: `あなたはRyomaのコンディションコーチ。
過去14日のデータ：
${context ?? 'まだ記録がありません'}

・日本語・短く端的に答えること
・データがない場合は「記録を続けると分析できます」と伝える`,
        },
        ...newMessages,
      ],
    });

    const aiContent = response.choices[0].message.content ?? '';
    setMessages([...newMessages, { role: 'assistant', content: aiContent }]);
    setLoading(false);
  };

  return (
    <View style={styles.chatContainer}>
      <ScrollView style={styles.messages} contentContainerStyle={styles.messagesContent}>
        {messages.length === 0 && (
          <View>
            <Text style={styles.hint}>過去のデータをもとに答えます</Text>
            <View style={styles.quickBtns}>
              {QUICK_QUESTIONS.map((q) => (
                <TouchableOpacity key={q} style={styles.quickBtn} onPress={() => sendMessage(q)}>
                  <Text style={styles.quickBtnText}>{q}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}
        {messages.map((m, i) => (
          <View key={i} style={[styles.bubble, m.role === 'user' ? styles.userBubble : styles.aiBubble]}>
            <Text style={styles.bubbleText}>{m.content}</Text>
          </View>
        ))}
        {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 16 }} />}
      </ScrollView>

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="質問する..."
          placeholderTextColor="#444"
          returnKeyType="send"
          onSubmitEditing={() => sendMessage(input)}
        />
        <TouchableOpacity style={styles.sendBtn} onPress={() => sendMessage(input)} disabled={loading}>
          <Text style={styles.sendBtnText}>送信</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AIScreen() {
  const [tab, setTab] = useState<Tab>('analysis');
  const [isPro, setIsPro] = useState(false);
  const [showProModal, setShowProModal] = useState(false);

  // サブスク状態を確認
  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) return;
      supabase.from('subscriptions').select('status').eq('user_id', user.id).single()
        .then(({ data }) => setIsPro(data?.status === 'active'));
    });
  }, []);

  const handleTabPress = (t: Tab) => {
    if (!isPro) { setShowProModal(true); return; }
    setTab(t);
  };

  return (
    <View style={styles.container}>
      <ProModal visible={showProModal} onClose={() => setShowProModal(false)} />

      <View style={styles.tabBar}>
        <TouchableOpacity style={[styles.tabBtn, tab === 'analysis' && styles.tabBtnActive]} onPress={() => handleTabPress('analysis')}>
          <Text style={[styles.tabBtnText, tab === 'analysis' && styles.tabBtnTextActive]}>
            パターン分析 {!isPro && '🔒'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={[styles.tabBtn, tab === 'chat' && styles.tabBtnActive]} onPress={() => handleTabPress('chat')}>
          <Text style={[styles.tabBtnText, tab === 'chat' && styles.tabBtnTextActive]}>
            チャット {!isPro && '🔒'}
          </Text>
        </TouchableOpacity>
      </View>

      {tab === 'analysis' ? <AnalysisTab /> : <ChatTab />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f' },
  tabBar: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#1e1e1e' },
  stepBox: { backgroundColor: '#1a1a2e', borderRadius: 12, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#2d2d4e', alignItems: 'center', gap: 6 },
  stepText: { color: '#a5b4fc', fontSize: 14, textAlign: 'center' },
  elapsedText: { color: '#555', fontSize: 12 },
  tabBtn: { flex: 1, paddingVertical: 14, alignItems: 'center' },
  tabBtnActive: { borderBottomWidth: 2, borderBottomColor: '#6366f1' },
  tabBtnText: { color: '#555', fontSize: 14 },
  tabBtnTextActive: { color: '#6366f1', fontWeight: '600' },

  // 分析タブ
  tabContent: { flex: 1 },
  tabContentInner: { padding: 24, paddingBottom: 48 },
  analysisTitle: { fontSize: 20, fontWeight: 'bold', color: '#fff', marginBottom: 6 },
  analysisSubtitle: { fontSize: 13, color: '#555', marginBottom: 24, lineHeight: 20 },
  analyzeBtn: { backgroundColor: '#6366f1', borderRadius: 12, padding: 14, alignItems: 'center', marginBottom: 28 },
  analyzeBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  analysisResult: { gap: 12 },
  summaryBox: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, marginBottom: 4 },
  summaryText: { color: '#aaa', fontSize: 14, lineHeight: 22 },
  alertCard: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 16, borderLeftWidth: 3 },
  alertHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 6 },
  alertIcon: { fontSize: 16 },
  alertTitle: { fontSize: 15, fontWeight: '700' },
  alertDetail: { color: '#888', fontSize: 13, lineHeight: 20 },

  // チャットタブ
  chatContainer: { flex: 1 },
  messages: { flex: 1 },
  messagesContent: { padding: 20, paddingBottom: 8 },
  hint: { color: '#555', textAlign: 'center', marginTop: 32, marginBottom: 20, fontSize: 14 },
  quickBtns: { gap: 10 },
  quickBtn: { backgroundColor: '#1a1a1a', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a2a' },
  quickBtnText: { color: '#aaa', fontSize: 14 },
  bubble: { borderRadius: 16, padding: 14, marginBottom: 12, maxWidth: '85%' },
  userBubble: { backgroundColor: '#6366f1', alignSelf: 'flex-end' },
  aiBubble: { backgroundColor: '#1a1a1a', alignSelf: 'flex-start' },
  bubbleText: { color: '#fff', fontSize: 15, lineHeight: 22 },
  inputRow: { flexDirection: 'row', padding: 16, gap: 12, borderTopWidth: 1, borderTopColor: '#222' },
  input: { flex: 1, backgroundColor: '#1a1a1a', color: '#fff', borderRadius: 24, paddingHorizontal: 20, paddingVertical: 12, fontSize: 15 },
  sendBtn: { backgroundColor: '#6366f1', borderRadius: 24, paddingHorizontal: 20, justifyContent: 'center' },
  sendBtnText: { color: '#fff', fontWeight: '600' },
});
