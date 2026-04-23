import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Linking, Alert } from 'react-native';
import { supabase } from '../../lib/supabase';

// バックエンドのURL（Vercelにデプロイ後に変える）
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

type SubStatus = 'active' | 'cancelled' | 'inactive' | null;

export default function SubscriptionScreen() {
  const [status, setStatus] = useState<SubStatus>(null);
  const [loading, setLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState(false);

  // 課金状態を確認
  useEffect(() => {
    const checkSubscription = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setLoading(false); return; }

      const { data } = await supabase
        .from('subscriptions')
        .select('status')
        .eq('user_id', user.id)
        .single();

      setStatus((data?.status as SubStatus) ?? 'inactive');
      setLoading(false);
    };

    checkSubscription();
  }, []);

  const handleSubscribe = async () => {
    setCheckoutLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    try {
      // バックエンドにチェックアウトセッションを作成してもらう
      const res = await fetch(`${API_URL}/api/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.id, email: user.email }),
      });

      const { checkout_url } = await res.json() as { checkout_url: string };

      // StripeのページをブラウザOrアプリ内で開く
      await Linking.openURL(checkout_url);
    } catch {
      Alert.alert('エラー', '決済ページを開けませんでした');
    }

    setCheckoutLoading(false);
  };

  if (loading) return <ActivityIndicator style={{ flex: 1 }} color="#6366f1" />;

  return (
    <View style={s.container}>
      {status === 'active' ? (
        // 課金済みユーザー
        <View style={s.activeBox}>
          <Text style={s.activeIcon}>✅</Text>
          <Text style={s.activeTitle}>Pro プラン有効</Text>
          <Text style={s.activeDesc}>すべての機能が使えます</Text>
        </View>
      ) : (
        // 未課金ユーザー
        <View style={s.paywallBox}>
          <Text style={s.paywallTitle}>Condition Tracker Pro</Text>
          <Text style={s.price}>¥500 / 月</Text>

          <View style={s.features}>
            {[
              '無制限の記録',
              'AIパターン分析',
              'AIチャット（過去データ参照）',
              '全デバイスで同期',
            ].map((f) => (
              <View key={f} style={s.featureRow}>
                <Text style={s.featureCheck}>✓</Text>
                <Text style={s.featureText}>{f}</Text>
              </View>
            ))}
          </View>

          <TouchableOpacity style={s.subscribeBtn} onPress={handleSubscribe} disabled={checkoutLoading}>
            {checkoutLoading
              ? <ActivityIndicator color="#fff" />
              : <Text style={s.subscribeBtnText}>今すぐ始める</Text>}
          </TouchableOpacity>

          <Text style={s.note}>いつでもキャンセル可能 · Stripe で安全に決済</Text>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f0f0f', justifyContent: 'center', padding: 32 },
  activeBox: { alignItems: 'center', gap: 12 },
  activeIcon: { fontSize: 48 },
  activeTitle: { fontSize: 24, fontWeight: 'bold', color: '#22c55e' },
  activeDesc: { fontSize: 15, color: '#666' },
  paywallBox: { gap: 24 },
  paywallTitle: { fontSize: 26, fontWeight: 'bold', color: '#fff', textAlign: 'center' },
  price: { fontSize: 36, fontWeight: 'bold', color: '#6366f1', textAlign: 'center' },
  features: { backgroundColor: '#1a1a1a', borderRadius: 16, padding: 20, gap: 14 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureCheck: { color: '#6366f1', fontSize: 16, fontWeight: 'bold' },
  featureText: { color: '#ccc', fontSize: 15 },
  subscribeBtn: { backgroundColor: '#6366f1', borderRadius: 14, padding: 18, alignItems: 'center' },
  subscribeBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  note: { color: '#444', fontSize: 12, textAlign: 'center' },
});
