import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Pressable,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import brandLogo from '../../assets/images/icon.png';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Unit } from '../../types';
import HeartsGame from '../../components/HeartsGame';
import TipsModal from '../../components/TipsModal';

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [tipsVisible, setTipsVisible] = useState(false);
  const [currentTips, setCurrentTips] = useState<any>(null);
  const [showHeartTooltip, setShowHeartTooltip] = useState(false);
  const [showFlameTooltip, setShowFlameTooltip] = useState(false);
  const [showStarTooltip, setShowStarTooltip] = useState(false);
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    loadLessons();
    loadStats();
  }, []);

  const loadLessons = async () => {
    try {
      const response = await api.get('/api/lessons');
      setUnits(response.data);
    } catch (error) {
      console.error('Error loading lessons:', error);
      Alert.alert('Error', 'No se pudieron cargar las lecciones');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadLessons(), loadStats(), refreshUser()]);
    setRefreshing(false);
  };

  const handleLessonPress = (lessonId: string, locked: boolean) => {
    if (locked) {
      Alert.alert('Lección bloqueada', 'Completa la lección anterior para desbloquear esta');
      return;
    }
    if (user && user.lives === 0) {
      Alert.alert('Sin vidas', 'Juega al mini-juego (toca el corazón) para recuperar vidas');
      return;
    }
    router.push(`/lesson/${lessonId}`);
  };

  const handleTipsPress = async (unitNumber: number) => {
    try {
      const response = await api.get(`/api/tips/${unitNumber}`);
      setCurrentTips(response.data);
      setTipsVisible(true);
    } catch (error) {
      console.error('Error loading tips:', error);
      Alert.alert('Error', 'No se pudieron cargar los consejos');
    }
  };

  const loadStats = async () => {
    try {
      const response = await api.get('/api/user/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  const xp = user?.xp || 0;
  const level = user?.level ?? Math.floor(xp / 100);
  const nextLevelXp = (level + 1) * 100;
  const starsRemaining = Math.max(0, nextLevelXp - xp);
  const progressPct = stats?.progress_percentage || 0;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.brandRow}>
            <Image source={brandLogo as any} style={styles.brandLogo} />
            <Text style={styles.headerTitle}>MayaApp</Text>
          </View>
        </View>
        <View style={styles.headerRight}>
          <Pressable
            style={styles.stat}
            onHoverIn={() => setShowFlameTooltip(true)}
            onHoverOut={() => setShowFlameTooltip(false)}
          >
            <Ionicons name="flame" size={24} color="#FF9600" />
            <Text style={styles.statText}>{user?.streak || 0}</Text>
            {showFlameTooltip && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>Tu racha sube completando lecciones cada día.</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.stat}
            onPress={() => setShowGame(true)}
            onHoverIn={() => setShowHeartTooltip(true)}
            onHoverOut={() => setShowHeartTooltip(false)}
          >
            <Ionicons name="heart" size={24} color="#FF4B4B" />
            <Text style={styles.statText}>{user?.lives || 0}</Text>
            {showHeartTooltip && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>Presiona el corazón para jugar el minijuego y recuperar corazones.</Text>
              </View>
            )}
          </Pressable>
          <Pressable
            style={styles.stat}
            onHoverIn={() => setShowStarTooltip(true)}
            onHoverOut={() => setShowStarTooltip(false)}
          >
            <Ionicons name="star" size={24} color="#FFC800" />
            <Text style={styles.statText}>{xp}</Text>
            {showStarTooltip && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>Te faltan {starsRemaining} estrellas para subir de nivel.</Text>
              </View>
            )}
          </Pressable>
        </View>
      </View>

      <View style={styles.progressSection}>
        <View style={styles.progressHeader}>
          <Text style={styles.progressTitle}>Progreso</Text>
          <Text style={styles.progressPercentage}>{progressPct}%</Text>
        </View>
        <View style={styles.progressBarContainer}>
          <View style={[styles.progressBar, { width: `${progressPct}%` }]} />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#58CC02" />
        }
      >
        <Text style={styles.welcomeText}>¡Hola, {user?.username}!</Text>
        <Text style={styles.levelText}>Nivel {user?.level || 0}</Text>

        {units.map((unit) => (
          <View key={unit.unit} style={styles.unitContainer}>
            <View style={styles.unitHeader}>
              <View>
                <Text style={styles.unitTitle}>Unidad {unit.unit}</Text>
                <Text style={styles.unitSubtitle}>{unit.title}</Text>
              </View>
              <TouchableOpacity
                style={styles.tipsButton}
                onPress={() => handleTipsPress(unit.unit)}
              >
                <Ionicons name="information-circle" size={24} color="#1CB0F6" />
                <Text style={styles.tipsButtonText}>Tips</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.lessonsPath}>
              {unit.lessons.map((lesson) => (
                <TouchableOpacity
                  key={lesson.id}
                  style={[
                    styles.lessonNode,
                    lesson.completed && styles.lessonCompleted,
                    lesson.locked && styles.lessonLocked,
                  ]}
                  onPress={() => handleLessonPress(lesson.id, lesson.locked || false)}
                  disabled={lesson.locked}
                >
                  <View style={styles.lessonCircle}>
                    {lesson.locked ? (
                      <Ionicons name="lock-closed" size={32} color="#AFAFAF" />
                    ) : lesson.completed ? (
                      <Ionicons name="checkmark-circle" size={32} color="#58CC02" />
                    ) : (
                      <Ionicons name="book" size={32} color="#1CB0F6" />
                    )}
                  </View>
                  <Text style={styles.lessonTitle}>{lesson.title}</Text>
                  <Text style={styles.lessonXP}>+{lesson.xp_reward} XP</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>

      <HeartsGame
        visible={showGame}
        onClose={() => setShowGame(false)}
        onSuccess={() => {
          refreshUser();
          setShowGame(false);
        }}
      />

      <TipsModal
        visible={tipsVisible}
        onClose={() => setTipsVisible(false)}
        tips={currentTips}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
    zIndex: 2,
  },
  headerLeft: {
    flex: 1,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  brandLogo: {
    width: 28,
    height: 28,
    borderRadius: 6,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#58CC02',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    position: 'relative',
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FFF',
  },
  tooltip: {
    position: 'absolute',
    top: 28,
    left: 0,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#1C1C1E',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
    zIndex: 10,
  },
  tooltipText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 4,
  },
  levelText: {
    fontSize: 16,
    color: '#AFAFAF',
    marginBottom: 24,
  },
  unitContainer: {
    marginBottom: 32,
  },
  unitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  unitTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  unitSubtitle: {
    fontSize: 16,
    color: '#AFAFAF',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  tipsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1CB0F6',
  },
  lessonsPath: {
    gap: 16,
  },
  progressSection: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
    position: 'relative',
    zIndex: 1,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
  },
  progressPercentage: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#58CC02',
  },
  progressBarContainer: {
    height: 10,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 6,
  },
  lessonNode: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  lessonCompleted: {
    borderColor: '#58CC02',
    backgroundColor: '#0A2A0A',
  },
  lessonLocked: {
    opacity: 0.5,
    backgroundColor: '#111',
  },
  lessonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    textAlign: 'center',
  },
  lessonXP: {
    fontSize: 12,
    color: '#AFAFAF',
    marginTop: 4,
  },
});
