import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { api } from '../lib/api';
import { theme } from '../theme';

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>{title}</Text>
      {children}
    </View>
  );
}

export function DashboardScreen() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    api.dashboard().then(setData).catch(() => undefined);
  }, []);

  return (
    <ScrollView style={styles.container} contentContainerStyle={{ padding: 16 }}>
      <Text style={styles.h1}>Hola 👋</Text>

      <Card title="Ánimo de hoy">
        <Text style={styles.value}>
          {data?.moodToday ? `${data.moodToday.label} (${data.moodToday.intensity}/5)` : 'Sin registro'}
        </Text>
      </Card>

      <Card title="Racha de hábitos">
        <Text style={styles.value}>{data?.habitStreak ?? 0} días</Text>
      </Card>

      <Card title="Mascota">
        <Text style={styles.value}>
          {data?.pet ? `${data.pet.name} · nivel ${data.pet.level} · 😊 ${data.pet.happiness}` : '—'}
        </Text>
      </Card>

      <Card title="Recomendaciones">
        {(data?.recommendations ?? []).map((r: string, i: number) => (
          <Text key={i} style={styles.rec}>
            • {r}
          </Text>
        ))}
      </Card>

      {(data?.alerts ?? []).length > 0 && (
        <View style={styles.alert}>
          <Text style={styles.alertText}>{data.alerts[0].message}</Text>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  h1: { fontSize: 26, fontWeight: '800', color: theme.colors.text, marginBottom: 16 },
  card: { backgroundColor: theme.colors.surface, borderRadius: 16, padding: 16, marginBottom: 12 },
  cardTitle: { fontSize: 13, color: theme.colors.muted, marginBottom: 6 },
  value: { fontSize: 18, fontWeight: '700', color: theme.colors.text },
  rec: { fontSize: 15, color: theme.colors.text, marginVertical: 2 },
  alert: { backgroundColor: theme.colors.warning, borderRadius: 12, padding: 14 },
  alertText: { color: 'white', fontWeight: '600' },
});
