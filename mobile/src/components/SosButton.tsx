import React, { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import * as Location from 'expo-location';
import { api } from '../lib/api';
import { theme } from '../theme';

const TYPES: { key: string; label: string }[] = [
  { key: 'MEDICAL', label: 'Emergencia médica' },
  { key: 'EMOTIONAL_CRISIS', label: 'Crisis emocional' },
  { key: 'ACCIDENT', label: 'Accidente' },
  { key: 'VIOLENCE', label: 'Violencia' },
  { key: 'OTHER', label: 'Otro' },
];

/** Botón SOS persistente (FAB) visible en toda la app. */
export function SosButton() {
  const [open, setOpen] = useState(false);
  const [sent, setSent] = useState<any>(null);

  async function trigger(type: string) {
    let location: { latitude: number; longitude: number } | undefined;
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        const pos = await Location.getCurrentPositionAsync({});
        location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude };
      }
    } catch {
      /* ubicación opcional */
    }
    const res = await api.sos(type, location);
    setSent(res);
  }

  return (
    <>
      <Pressable style={styles.fab} onPress={() => setOpen(true)} accessibilityLabel="Botón SOS">
        <Text style={styles.fabText}>SOS</Text>
      </Pressable>

      <Modal visible={open} transparent animationType="slide" onRequestClose={() => setOpen(false)}>
        <View style={styles.backdrop}>
          <View style={styles.sheet}>
            {!sent ? (
              <>
                <Text style={styles.title}>¿Qué tipo de emergencia?</Text>
                {TYPES.map((t) => (
                  <Pressable key={t.key} style={styles.option} onPress={() => trigger(t.key)}>
                    <Text style={styles.optionText}>{t.label}</Text>
                  </Pressable>
                ))}
                <Pressable onPress={() => setOpen(false)}>
                  <Text style={styles.cancel}>Cancelar</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.title}>Estamos contigo</Text>
                <Text style={styles.body}>
                  Tu solicitud fue registrada. Un operador te atenderá. Si es una emergencia vital,
                  llama directamente:
                </Text>
                {sent.emergencyLines?.map((l: any) => (
                  <Text key={l.number} style={styles.line}>
                    {l.label}: {l.number}
                  </Text>
                ))}
                <Pressable
                  onPress={() => {
                    setSent(null);
                    setOpen(false);
                  }}
                >
                  <Text style={styles.cancel}>Cerrar</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: theme.colors.sos,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 6,
  },
  fabText: { color: 'white', fontWeight: '800', fontSize: 18 },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: 'white', padding: 24, borderTopLeftRadius: 20, borderTopRightRadius: 20 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 16, color: theme.colors.text },
  body: { color: theme.colors.muted, marginBottom: 12 },
  option: { padding: 16, backgroundColor: theme.colors.surface, borderRadius: 12, marginBottom: 8 },
  optionText: { fontSize: 16, color: theme.colors.text },
  line: { fontSize: 18, fontWeight: '700', color: theme.colors.sos, marginVertical: 4 },
  cancel: { textAlign: 'center', color: theme.colors.muted, marginTop: 12, padding: 8 },
});
