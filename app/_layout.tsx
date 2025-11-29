import { Stack } from 'expo-router';
import { View } from 'react-native';
import NavigationMenu from './components/NavigationMenu';

export default function RootLayout() {
  return (
    <View style={{ flex: 1 }}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'white' },
        }}
      />
      <NavigationMenu />
    </View>
  );
}