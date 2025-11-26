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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Unit } from '../../types';

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadLessons();
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
    await Promise.all([loadLessons(), refreshUser()]);
    setRefreshing(false);
  };

  const handleLessonPress = (lessonId: string, locked: boolean) => {
    if (locked) {
      Alert.alert('Lección bloqueada', 'Completa la lección anterior para desbloquear esta');
      return;
    }
    if (user && user.lives === 0) {
      Alert.alert('Sin vidas', 'Revisa una lección completada para recuperar vidas');
      return;
    }
    router.push(`/lesson/${lessonId}`);
  };

  const handleTipsPress = async (unitNumber: number) => {
    try {
      const response = await api.get(`/api/tips/${unitNumber}`);
      Alert.alert(
        response.data.title,
        `Gramática:\n${response.data.grammar.join('\n\n')}\n\nVocabulario:\n${response.data.vocabulary.join('\n')}`,
        [{ text: 'Cerrar' }]
      );
    } catch (error) {
      console.error('Error loading tips:', error);
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.headerTitle}>Maay</Text>
        </View>
        <View style={styles.headerRight}>
          <View style={styles.stat}>
            <Ionicons name="flame" size={24} color="#FF9600" />
            <Text style={styles.statText}>{user?.streak || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="heart" size={24} color="#FF4B4B" />
            <Text style={styles.statText}>{user?.lives || 0}</Text>
          </View>
          <View style={styles.stat}>
            <Ionicons name="star" size={24} color="#FFC800" />
            <Text style={styles.statText}>{user?.xp || 0}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F7F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E5E5',
  },
  headerLeft: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1CB0F6',
  },
  headerRight: {
    flexDirection: 'row',
    gap: 16,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000',
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
    color: '#000',
    marginBottom: 4,
  },
  levelText: {
    fontSize: 16,
    color: '#777',
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
    color: '#000',
  },
  unitSubtitle: {
    fontSize: 16,
    color: '#777',
  },
  tipsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#E7F5FF',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
  },
  tipsButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1CB0F6',
  },
  lessonsPath: {
    gap: 16,
  },
  lessonNode: {
    alignItems: 'center',
    padding: 12,
    backgroundColor: '#FFF',
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lessonCompleted: {
    backgroundColor: '#E8F5E9',
  },
  lessonLocked: {
    backgroundColor: '#F5F5F5',
    opacity: 0.6,
  },
  lessonCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#F7F7F7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  lessonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
    textAlign: 'center',
  },
  lessonXP: {
    fontSize: 12,
    color: '#777',
    marginTop: 4,
  },
});
