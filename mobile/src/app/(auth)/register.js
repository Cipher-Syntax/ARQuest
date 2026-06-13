import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { useRouter, Link } from 'expo-router';
import theme from '../../theme/tokens';
import { api } from '../../services/api';
import { Eye, EyeOff } from 'lucide-react-native';

export default function RegisterScreen() {
  const router = useRouter();
  
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password_confirm: '',
    first_name: '',
    last_name: '',
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = (name, value) => {
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleRegister = async () => {
    if (!formData.username || !formData.email || !formData.password || !formData.password_confirm) {
      setError('Username, email, password, and password confirmation are required.');
      return;
    }

    if (formData.password !== formData.password_confirm) {
      setError('Passwords do not match.');
      return;
    }

    setError('');
    setIsLoading(true);

    try {
      await api.post('/api/auth/register/', formData);
      // Navigate to OTP verification and pass the email
      router.push({ pathname: "/(auth)/verify-otp", params: { email: formData.email } });
    } catch (err) {
      console.log('Registration error:', err);
      // Extract error message from Django DRF response if available
      let errorMessage = 'Registration failed. Please try again.';
      if (err.data && typeof err.data === 'object') {
        const firstErrorKey = Object.keys(err.data)[0];
        if (firstErrorKey) {
          const firstErrorValue = err.data[firstErrorKey];
          errorMessage = Array.isArray(firstErrorValue) ? firstErrorValue[0] : firstErrorValue;
        }
      }
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Register</Text>
      <Text style={styles.subtitle}>Create an account</Text>

      {error ? <Text style={styles.error}>{error}</Text> : null}

      <TextInput
        style={styles.input}
        placeholder="Username"
        placeholderTextColor={theme.colors.textMuted}
        value={formData.username}
        onChangeText={(text) => handleChange('username', text)}
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="Email"
        placeholderTextColor={theme.colors.textMuted}
        value={formData.email}
        onChangeText={(text) => handleChange('email', text)}
        keyboardType="email-address"
        autoCapitalize="none"
      />

      <TextInput
        style={styles.input}
        placeholder="First Name (Optional)"
        placeholderTextColor={theme.colors.textMuted}
        value={formData.first_name}
        onChangeText={(text) => handleChange('first_name', text)}
      />

      <TextInput
        style={styles.input}
        placeholder="Last Name (Optional)"
        placeholderTextColor={theme.colors.textMuted}
        value={formData.last_name}
        onChangeText={(text) => handleChange('last_name', text)}
      />

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Password"
          placeholderTextColor={theme.colors.textMuted}
          value={formData.password}
          onChangeText={(text) => handleChange('password', text)}
          secureTextEntry={!showPassword}
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowPassword(!showPassword)}
        >
          {showPassword ? (
            <EyeOff color={theme.colors.textMuted} size={20} />
          ) : (
            <Eye color={theme.colors.textMuted} size={20} />
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.passwordContainer}>
        <TextInput
          style={styles.passwordInput}
          placeholder="Confirm Password"
          placeholderTextColor={theme.colors.textMuted}
          value={formData.password_confirm}
          onChangeText={(text) => handleChange('password_confirm', text)}
          secureTextEntry={!showConfirmPassword}
        />
        <TouchableOpacity 
          style={styles.eyeIcon} 
          onPress={() => setShowConfirmPassword(!showConfirmPassword)}
        >
          {showConfirmPassword ? (
            <EyeOff color={theme.colors.textMuted} size={20} />
          ) : (
            <Eye color={theme.colors.textMuted} size={20} />
          )}
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.button} 
        onPress={handleRegister}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <Text style={styles.buttonText}>Register</Text>
        )}
      </TouchableOpacity>

      <Link href="/(auth)/login" asChild>
        <TouchableOpacity style={styles.link}>
          <Text style={styles.linkText}>Already have an account? Login</Text>
        </TouchableOpacity>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    backgroundColor: theme.colors.bgPrimary,
    justifyContent: 'center',
    padding: theme.spacing.lg,
  },
  title: {
    color: theme.colors.primary,
    fontSize: theme.typography.xxl,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: theme.spacing.sm,
  },
  subtitle: {
    color: theme.colors.textSecondary,
    fontSize: theme.typography.md,
    textAlign: 'center',
    marginBottom: theme.spacing.xl,
  },
  input: {
    backgroundColor: theme.colors.surface,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    marginBottom: theme.spacing.md,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  passwordInput: {
    flex: 1,
    color: theme.colors.textPrimary,
    padding: theme.spacing.md,
  },
  eyeIcon: {
    padding: theme.spacing.md,
  },
  button: {
    backgroundColor: theme.colors.primary,
    padding: theme.spacing.md,
    borderRadius: theme.radius.md,
    alignItems: 'center',
    marginTop: theme.spacing.md,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: theme.typography.md,
    fontWeight: 'bold',
  },
  error: {
    color: theme.colors.error,
    marginBottom: theme.spacing.md,
    textAlign: 'center',
  },
  link: {
    marginTop: theme.spacing.xl,
    alignItems: 'center',
    padding: theme.spacing.sm,
  },
  linkText: {
    color: theme.colors.primary,
    fontSize: theme.typography.md,
    fontWeight: '600',
  }
});
