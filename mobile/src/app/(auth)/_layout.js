import { Stack } from 'expo-router';
import theme from '../../theme/tokens';

export default function AuthLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: theme.colors.bgPrimary },
      headerTintColor: theme.colors.textPrimary,
      headerTitleStyle: { fontWeight: 'bold' },
      headerShown: false,
    }}>
      <Stack.Screen name="login" options={{ title: 'Login' }} />
    </Stack>
  );
}
