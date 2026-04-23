import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarStyle: { backgroundColor: '#0f0f0f', borderTopColor: '#222' },
        tabBarActiveTintColor: '#6366f1',
        tabBarInactiveTintColor: '#555',
        headerStyle: { backgroundColor: '#0f0f0f' },
        headerTintColor: '#fff',
      }}
    >
      <Tabs.Screen name="index" options={{ title: '今日' }} />
      <Tabs.Screen name="history" options={{ title: '記録' }} />
      <Tabs.Screen name="ai" options={{ title: 'AI' }} />
      <Tabs.Screen name="subscription" options={{ href: null }} />
    </Tabs>
  );
}
