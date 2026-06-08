import React from 'react';
import { View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { DashboardScreen } from './src/screens/DashboardScreen';
import { ChatScreen } from './src/screens/ChatScreen';
import { SosButton } from './src/components/SosButton';
import { theme } from './src/theme';

const Tab = createBottomTabNavigator();

// Placeholders mínimos para tabs aún no desarrolladas (ver roadmap).
function Placeholder({ name }: { name: string }) {
  const { Text } = require('react-native');
  return (
    <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: theme.colors.muted }}>{name} — próximamente</Text>
    </View>
  );
}

export default function App() {
  return (
    <NavigationContainer>
      {/* SOS global sobre toda la navegación */}
      <View style={{ flex: 1 }}>
        <Tab.Navigator
          screenOptions={{ tabBarActiveTintColor: theme.colors.primary, headerShown: true }}
        >
          <Tab.Screen name="Inicio" component={DashboardScreen} />
          <Tab.Screen name="Diario" children={() => <Placeholder name="Diario" />} />
          <Tab.Screen name="Chat" component={ChatScreen} />
          <Tab.Screen name="Hábitos" children={() => <Placeholder name="Hábitos" />} />
          <Tab.Screen name="Perfil" children={() => <Placeholder name="Perfil" />} />
        </Tab.Navigator>
        <SosButton />
      </View>
    </NavigationContainer>
  );
}
