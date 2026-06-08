import React, { useEffect, useState } from 'react';
import {
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api, CrisisProtocol } from '../lib/api';
import { CrisisModal } from '../components/CrisisModal';
import { theme } from '../theme';

interface Msg {
  role: 'user' | 'assistant';
  content: string;
}

export function ChatScreen() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState('');
  const [crisis, setCrisis] = useState<CrisisProtocol | null>(null);

  useEffect(() => {
    api.startConversation().then((c) => setConversationId(c.id)).catch(() => undefined);
  }, []);

  async function send() {
    if (!input.trim() || !conversationId) return;
    const text = input.trim();
    setInput('');
    setMessages((m) => [...m, { role: 'user', content: text }]);
    try {
      const res = await api.sendMessage(conversationId, text);
      setMessages((m) => [...m, { role: 'assistant', content: res.message.content }]);
      if (res.crisisProtocol?.active) setCrisis(res.crisisProtocol);
    } catch {
      setMessages((m) => [
        ...m,
        { role: 'assistant', content: 'No pude responder ahora. ¿Intentamos de nuevo?' },
      ]);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <View style={styles.disclaimer}>
        <Text style={styles.disclaimerText}>
          Acompañamiento de bienestar · No reemplaza atención profesional
        </Text>
      </View>

      <FlatList
        data={messages}
        keyExtractor={(_, i) => String(i)}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <View style={[styles.bubble, item.role === 'user' ? styles.user : styles.assistant]}>
            <Text style={item.role === 'user' ? styles.userText : styles.assistantText}>
              {item.content}
            </Text>
          </View>
        )}
      />

      <View style={styles.inputRow}>
        <TextInput
          style={styles.input}
          value={input}
          onChangeText={setInput}
          placeholder="Escribe cómo te sientes…"
          multiline
        />
        <Pressable style={styles.sendBtn} onPress={send}>
          <Text style={styles.sendText}>Enviar</Text>
        </Pressable>
      </View>

      <CrisisModal protocol={crisis} onClose={() => setCrisis(null)} />
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  disclaimer: { backgroundColor: theme.colors.surface, padding: 8 },
  disclaimerText: { fontSize: 12, color: theme.colors.muted, textAlign: 'center' },
  bubble: { padding: 12, borderRadius: 14, marginBottom: 8, maxWidth: '85%' },
  user: { backgroundColor: theme.colors.primary, alignSelf: 'flex-end' },
  assistant: { backgroundColor: theme.colors.surface, alignSelf: 'flex-start' },
  userText: { color: 'white' },
  assistantText: { color: theme.colors.text },
  inputRow: { flexDirection: 'row', padding: 8, borderTopWidth: 1, borderTopColor: '#eee' },
  input: { flex: 1, padding: 12, backgroundColor: theme.colors.surface, borderRadius: 12, maxHeight: 100 },
  sendBtn: { justifyContent: 'center', paddingHorizontal: 16 },
  sendText: { color: theme.colors.primary, fontWeight: '700' },
});
