import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Pressable,
  Alert,
  Platform,
  Image,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../contexts/AuthContext';
import api, { absoluteUrl } from '../../utils/api';

interface UserStats {
  username: string;
  xp: number;
  level: number;
  lives: number;
  streak: number;
  lessons_completed: number;
  total_lessons: number;
  progress_percentage: number;
}

export default function ProfileScreen() {
  const router = useRouter();
  const { user, logout, refreshUser } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);
  const [profileImage, setProfileImage] = useState<string | null>(null);
  
  const glowAnim = useRef(new Animated.Value(0)).current;
  const prevLevelRef = useRef<number | null>(null);

  const loadProfileImage = useCallback(async () => {
    try {
      if (user?.profile_image_url) {
        setProfileImage(absoluteUrl(user.profile_image_url));
        return;
      }
      const savedImage = await AsyncStorage.getItem('profile_image');
      if (savedImage) setProfileImage(savedImage);
    } catch {}
  }, [user?.profile_image_url]);

  useEffect(() => {
    loadStats();
    loadProfileImage();
  }, [loadProfileImage]);

  useEffect(() => {
    const currentLevel = user?.level ?? 0;
    if (prevLevelRef.current !== null && prevLevelRef.current !== currentLevel) {
      const pulse = () => {
        Animated.sequence([
          Animated.timing(glowAnim, { toValue: 1, duration: 600, useNativeDriver: true }),
          Animated.timing(glowAnim, { toValue: 0, duration: 600, useNativeDriver: true }),
        ]).start(({ finished }) => {
          if (finished) {
            if ((pulse as any).count === undefined) (pulse as any).count = 0;
            (pulse as any).count += 1;
            if ((pulse as any).count < 3) pulse();
          }
        });
      };
      (pulse as any).count = 0;
      pulse();
    }
    prevLevelRef.current = currentLevel;
  }, [user?.level, glowAnim]);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/user/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  

  useEffect(() => {
    loadProfileImage();
  }, [loadProfileImage]);

  

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (status !== 'granted') {
      Alert.alert('Permiso denegado', 'Necesitamos acceso a tu galería para cambiar la foto.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      const uri = result.assets[0].uri;
      try {
        const form = new FormData();
        const name = `profile-${user?.id || 'me'}.jpg`;
        if (Platform.OS === 'web') {
          const blob = await (await fetch(uri)).blob();
          form.append('file', blob, name);
        } else {
          form.append('file', { uri, name, type: 'image/jpeg' } as any);
        }
        const response = await api.post('/api/user/profile-image', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        const url = response.data.url as string;
        const abs = absoluteUrl(url);
        setProfileImage(abs);
        await AsyncStorage.setItem('profile_image', abs);
        await refreshUser();
      } catch {
        Alert.alert('Error', 'No se pudo subir la imagen');
      }
    }
  };

  const handleLogout = async () => {
    if (Platform.OS === 'web') {
      if (window.confirm('¿Estás seguro que quieres salir?')) {
        await logout();
        // Force reload to ensure clean state
        window.location.href = '/';
      }
    } else {
      Alert.alert(
        'Cerrar Sesión',
        '¿Estás seguro que quieres salir?',
        [
          { text: 'Cancelar', style: 'cancel' },
          {
            text: 'Salir',
            style: 'destructive',
            onPress: async () => {
              await logout();
              router.replace('/');
            },
          },
        ]
      );
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userCard}>
          <TouchableOpacity onPress={pickImage}>
            <Animated.View style={[styles.ceremonialFrame, { opacity: glowAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.7] }) }]}>
            <LinearGradient
              colors={(user?.level || 0) > 0 ? ['#FFC800', '#FF9600', '#FFC800'] : ['#333', '#222', '#333']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ceremonialFrameInner}
             >
                {profileImage ? (
                  <Image source={{ uri: profileImage }} style={styles.avatarImage} />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <Ionicons name="person" size={48} color="#FFF" />
                  </View>
                )}
                <View style={styles.editIcon}>
                  <Ionicons name="camera" size={16} color="#FFF" />
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <Text style={[
            styles.username,
            user?.username === 'rodogc' && styles.usernameAccent,
          ]}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={20} color="#FFC800" />
            <Text style={styles.levelText}>
              {(() => {
                const lvl = user?.level || 0;
                if (lvl === 0) return 'Aprendiz Maya';
                if (lvl === 1) return 'Explorador';
                return `Nivel ${lvl}`;
              })()}
            </Text>
          </View>
          <View style={styles.levelProgressContainer}>
            <Text style={styles.levelProgressTitle}>Progreso de Nivel</Text>
            {(() => {
              const lvl = user?.level || 0;
              const currentXp = (stats?.xp ?? user?.xp ?? 0);
              const getThreshold = (level: number) => 100 + level * 100;
              let sumPrev = 0;
              for (let i = 0; i < lvl; i += 1) sumPrev += getThreshold(i);
              const xpInLevel = Math.max(0, currentXp - sumPrev);
              const threshold = getThreshold(lvl);
              const xpToNext = Math.max(0, threshold - xpInLevel);
              const progressPct = Math.min(100, Math.round(((threshold - xpToNext) / threshold) * 100));
              return (
                <View>
                  <View style={styles.levelProgressBarContainer}>
                    <View style={[styles.levelProgressBar, { width: `${progressPct}%` }]} />
                  </View>
                  <Text style={styles.levelProgressRemaining}>Faltan {xpToNext} XP para Nivel {lvl + 1}</Text>
                </View>
              );
            })()}
          </View>
        </View>

        

        <View style={styles.statsGrid}>
          <View style={styles.statCard}>
            <Ionicons name="flame" size={32} color="#FF9600" />
            <Text style={styles.statValue}>{stats?.streak || 0}</Text>
            <Text style={styles.statLabel}>Días seguidos</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="heart" size={32} color="#FF4B4B" />
            <Text style={styles.statValue}>{stats?.lives || 0}/5</Text>
            <Text style={styles.statLabel}>Vidas</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="star" size={32} color="#FFC800" />
            <Text style={styles.statValue}>{stats?.xp || 0}</Text>
            <Text style={styles.statLabel}>XP Total</Text>
          </View>

          <View style={styles.statCard}>
            <Ionicons name="checkmark-circle" size={32} color="#58CC02" />
            <Text style={styles.statValue}>
              {stats?.lessons_completed || 0}/{stats?.total_lessons || 0}
            </Text>
            <Text style={styles.statLabel}>Lecciones</Text>
          </View>
        </View>

        

        <Pressable style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF4B4B" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>MayaApp v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#1C1C1E',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  ceremonialFrame: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
    marginBottom: 16,
  },
  ceremonialFrameInner: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 5,
  },
  avatarPlaceholder: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#58CC02',
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  editIcon: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#1CB0F6',
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#1C1C1E',
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  usernameAccent: {
    color: '#1CB0F6',
  },
  email: {
    fontSize: 14,
    color: '#AFAFAF',
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#333',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFC800',
  },
  levelProgressContainer: {
    width: '100%',
    marginTop: 12,
  },
  levelProgressTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
    textAlign: 'center',
  },
  levelProgressBarContainer: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  levelProgressBar: {
    height: '100%',
    backgroundColor: '#1CB0F6',
    borderRadius: 6,
  },
  levelProgressRemaining: {
    marginTop: 6,
    fontSize: 12,
    color: '#AFAFAF',
    textAlign: 'center',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    minWidth: '47%',
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FFF',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#AFAFAF',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58CC02',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 6,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FF4B4B',
    marginBottom: 24,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4B4B',
  },
  footer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  footerText: {
    fontSize: 14,
    color: '#555',
  },
});
