import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { AVATARS } from '../../constants/Avatars';

export default function AvatarSelectionScreen() {
  const [selectedId, setSelectedId] = useState(null);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selectedId) {
      Alert.alert('Error', 'Please select an avatar to continue.');
      return;
    }
    
    try {
      // Typically use the project's API context, but here is the raw fetch
      // Assumes token is handled by the framework or saved locally.
      await fetch('http://10.0.2.2:8000/api/authentication/users/me/', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          // 'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({ avatar_id: selectedId })
      });
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Error', 'Failed to save avatar.');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose Your Avatar</Text>
      <FlatList
        data={AVATARS}
        numColumns={3}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.avatarContainer, selectedId === item.id && styles.selected]}
            onPress={() => setSelectedId(item.id)}
          >
            <Image source={{ uri: item.uri }} style={styles.avatar} />
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity style={styles.button} onPress={handleContinue}>
        <Text style={styles.buttonText}>Continue</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 20, alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  avatarContainer: { margin: 10, padding: 5, borderRadius: 50, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#007bff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0' },
  button: { marginTop: 30, backgroundColor: '#007bff', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});
