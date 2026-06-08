import React from 'react';
import { Linking, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { CrisisProtocol } from '../lib/api';
import { theme } from '../theme';

/**
 * Modal del protocolo de crisis. UI sobria, sin gamificación.
 * Mensaje de contención + líneas de emergencia + conectar con call center.
 */
export function CrisisModal({
  protocol,
  onClose,
}: {
  protocol: CrisisProtocol | null;
  onClose: () => void;
}) {
  if (!protocol?.active) return null;

  return (
    <Modal visible transparent animationType="fade">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <Text style={styles.title}>Estoy aquí contigo</Text>
          <Text style={styles.message}>{protocol.containmentMessage}</Text>

          {protocol.emergencyLines.map((l) => (
            <Pressable
              key={l.number}
              style={styles.callBtn}
              onPress={() => Linking.openURL(`tel:${l.number}`)}
            >
              <Text style={styles.callText}>
                Llamar {l.label} · {l.number}
              </Text>
            </Pressable>
          ))}

          <Pressable style={styles.connectBtn} onPress={onClose}>
            <Text style={styles.connectText}>Conectar con acompañamiento</Text>
          </Pressable>

          <Text style={styles.disclaimer}>
            Este acompañamiento no reemplaza la atención profesional ni los servicios de emergencia.
          </Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(20,30,35,0.85)', justifyContent: 'center', padding: 24 },
  card: { backgroundColor: 'white', borderRadius: 20, padding: 24 },
  title: { fontSize: 22, fontWeight: '700', color: theme.colors.text, marginBottom: 12 },
  message: { fontSize: 16, color: theme.colors.text, marginBottom: 20, lineHeight: 22 },
  callBtn: { backgroundColor: theme.colors.sos, padding: 16, borderRadius: 12, marginBottom: 10 },
  callText: { color: 'white', fontWeight: '700', textAlign: 'center', fontSize: 16 },
  connectBtn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, marginBottom: 16 },
  connectText: { color: 'white', fontWeight: '700', textAlign: 'center', fontSize: 16 },
  disclaimer: { fontSize: 12, color: theme.colors.muted, textAlign: 'center' },
});
