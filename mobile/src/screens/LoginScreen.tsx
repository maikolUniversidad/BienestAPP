import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { api } from '../lib/api';
import { theme } from '../theme';

/** Pantalla de login/registro del afiliado. */
export function LoginScreen({ onAuth }: { onAuth: () => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('afiliado@demo.co');
  const [password, setPassword] = useState('Bienestar123');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setError(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        await api.login(email.trim(), password);
      } else {
        await api.register({ email: email.trim(), password, firstName, lastName });
      }
      onAuth();
    } catch {
      setError(mode === 'login' ? 'Credenciales inválidas' : 'No se pudo registrar');
    } finally {
      setLoading(false);
    }
  }

  return (
    <KeyboardAvoidingView style={styles.c} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Text style={styles.brand}>BienestAPP</Text>
      <Text style={styles.sub}>Tu bienestar, acompañado</Text>

      {mode === 'register' && (
        <>
          <TextInput style={styles.input} placeholder="Nombre" value={firstName} onChangeText={setFirstName} />
          <TextInput style={styles.input} placeholder="Apellido" value={lastName} onChangeText={setLastName} />
        </>
      )}
      <TextInput
        style={styles.input}
        placeholder="Correo"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput style={styles.input} placeholder="Contraseña" secureTextEntry value={password} onChangeText={setPassword} />

      <Pressable style={styles.btn} onPress={submit} disabled={loading}>
        {loading ? <ActivityIndicator color="#fff" /> : (
          <Text style={styles.btnText}>{mode === 'login' ? 'Ingresar' : 'Crear cuenta'}</Text>
        )}
      </Pressable>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={styles.switch}>
          {mode === 'login' ? '¿No tienes cuenta? Regístrate' : '¿Ya tienes cuenta? Inicia sesión'}
        </Text>
      </Pressable>

      <Text style={styles.disclaimer}>
        Acompañamiento de bienestar. No reemplaza atención médica ni psicológica profesional.
      </Text>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  c: { flex: 1, justifyContent: 'center', padding: 28, backgroundColor: theme.colors.bg },
  brand: { fontSize: 34, fontWeight: '800', color: theme.colors.primary, textAlign: 'center' },
  sub: { fontSize: 14, color: theme.colors.muted, textAlign: 'center', marginBottom: 28 },
  input: { borderWidth: 1, borderColor: '#dfe5e3', borderRadius: 12, padding: 14, marginBottom: 12, fontSize: 16 },
  btn: { backgroundColor: theme.colors.primary, padding: 16, borderRadius: 12, alignItems: 'center', marginTop: 4 },
  btnText: { color: 'white', fontWeight: '700', fontSize: 16 },
  error: { color: theme.colors.sos, textAlign: 'center', marginTop: 12 },
  switch: { color: theme.colors.secondary, textAlign: 'center', marginTop: 18 },
  disclaimer: { fontSize: 12, color: theme.colors.muted, textAlign: 'center', marginTop: 28 },
});
