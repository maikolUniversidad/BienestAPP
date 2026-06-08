import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { LoginScreen } from './src/screens/LoginScreen';
import { SosButton } from './src/components/SosButton';
import { isLoggedIn, signOut } from './src/lib/api';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();

function Placeholder({ name }: { name: string }) {
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.colors.muted }}>{name} — próximamente</Text>
    </View>
  );
}

export default function App() {
  const [authed, setAuthed] = useState<boolean | null>(null);

  useEffect(() => {
    isLoggedIn().then(setAuthed);
  }, []);

  if (authed === null) {
    return (
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={theme.colors.primary} />
      </View>
    );
  }

  if (!authed) return <LoginScreen onAuth={() => setAuthed(true)} />;

  const LogoutBtn = () => (
    <Pressable
      onPress={async () => {
        await signOut();
        setAuthed(false);
      }}
      style={{ marginRight: 14 }}
    >
      <Text style={{ color: theme.colors.sos, fontWeight: '600' }}>Salir</Text>
    </Pressable>
  );

  return (
    <NavigationContainer>
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: theme.colors.primary,
            headerShown: true,
            headerRight: LogoutBtn,
          }}
        >
          <Tab.Screen name="Inicio" component={DashboardScreen} />
          <Tab.Screen name="Diario" children={() => <Placeholder name="Diario" />} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Hábitos" children={() => <Placeholder name="Hábitos" />} />
          <Tab.Screen name="Perfil" children={() => <Placeholder name="Perfil" />} />
        </Tab.Navigator>
        {/* SOS global sobre toda la navegación */}
        <SosButton />
      </View>
    </NavigationContainer>
  );
}
