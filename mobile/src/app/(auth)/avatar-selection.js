import React, { useState } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, FlatList } from 'react-native'
import { customAlert as Alert } from '../../components/CustomAlert';
import { useRouter } from 'expo-router';
import { AVATARS } from '../../constants/Avatars';
import { api } from '../../services/api';

export default function AvatarSelectionScreen() {
  const [selectedId, setSelectedId] = useState(null);
  const router = useRouter();

  const handleContinue = async () => {
    if (!selectedId) {
      Alert('Error', 'Please select an avatar to continue.');
      return;
    }
    
    try {
      await api.patch('/api/auth/me/', { avatar_id: selectedId });
      
      // Successfully updated, go to dashboard
      router.replace('/(tabs)');
    } catch (error) {
      console.log("Avatar save error:", error);
      Alert('Error', 'Failed to save avatar. Please try again.');
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
  title: { fontSize: 24, fontWeight: 'bold', marginTop: 60, marginBottom: 20 },
  avatarContainer: { margin: 10, padding: 5, borderRadius: 50, borderWidth: 2, borderColor: 'transparent' },
  selected: { borderColor: '#007bff' },
  avatar: { width: 80, height: 80, borderRadius: 40, backgroundColor: '#e0e0e0' },
  button: { marginTop: 30, backgroundColor: '#007bff', padding: 15, borderRadius: 10, width: '100%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 }
});


