import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import theme from '../../theme/tokens';
import { Camera } from 'lucide-react-native';

export default function ARScreen() {
  return (
    <View style={styles.container}>
      <View style={styles.cameraPlaceholder}>
        <Camera size={64} color={theme.colors.textMuted} />
        <Text style={styles.text}>AR Camera Placeholder</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000', // Camera usually has black background behind it
  },
  cameraPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    color: theme.colors.textMuted,
    fontSize: theme.typography.md,
    marginTop: theme.spacing.md,
  }
});
