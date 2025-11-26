import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';

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
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<UserStats | null>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    try {
      const response = await api.get('/api/user/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
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
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Mi Perfil</Text>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
        <View style={styles.userCard}>
          <View style={styles.avatar}>
            <Ionicons name="person" size={48} color="#FFF" />
          </View>
          <Text style={styles.username}>{user?.username}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          <View style={styles.levelBadge}>
            <Ionicons name="star" size={20} color="#FFC800" />
            <Text style={styles.levelText}>Nivel {user?.level || 0}</Text>
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

        <View style={styles.progressCard}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressTitle}>Progreso General</Text>
            <Text style={styles.progressPercentage}>{stats?.progress_percentage || 0}%</Text>
          </View>
          <View style={styles.progressBarContainer}>
            <View 
              style={[
                styles.progressBar, 
                { width: `${stats?.progress_percentage || 0}%` }
              ]} 
            />
          </View>
        </View>

        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={24} color="#FF4B4B" />
          <Text style={styles.logoutText}>Cerrar Sesión</Text>
        </TouchableOpacity>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Maay v1.0</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1CB0F6',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#FFF',
    padding: 24,
    borderRadius: 16,
    alignItems: 'center',
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#1CB0F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  username: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginBottom: 4,
  },
  email: {
    fontSize: 14,
    color: '#777',
    marginBottom: 12,
  },
  levelBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#FFF9E5',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  levelText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFC800',
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
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
  progressCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    color: '#000',
  },
  progressPercentage: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58CC02',
  },
  progressBarContainer: {
    height: 12,
    backgroundColor: '#E5E5E5',
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
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
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
    color: '#777',
  },
});
