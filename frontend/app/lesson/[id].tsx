import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Lesson, Exercise } from '../../types';

export default function LessonScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams();
  const { refreshUser } = useAuth();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [matchedPairs, setMatchedPairs] = useState<{[key: string]: string}>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    loadLesson();
  }, [id]);

  const loadLesson = async () => {
    try {
      const response = await api.get(`/api/lessons/${id}`);
      setLesson(response.data);
    } catch (error) {
      console.error('Error loading lesson:', error);
      Alert.alert('Error', 'No se pudo cargar la lección');
      router.back();
    } finally {
      setLoading(false);
    }
  };

  const currentExercise = lesson?.exercises[currentExerciseIndex];
  const progress = lesson ? ((currentExerciseIndex + 1) / lesson.exercises.length) * 100 : 0;

  const handleCheck = async () => {
    if (!currentExercise || !lesson) return;

    let correct = false;

    if (currentExercise.type === 'translate' || currentExercise.type === 'multiple_choice') {
      correct = selectedAnswer === currentExercise.correct_answer;
    } else if (currentExercise.type === 'matching') {
      const expectedPairs = currentExercise.pairs || [];
      correct = expectedPairs.every(pair => 
        matchedPairs[pair.maya] === pair.spanish
      );
    }

    setIsCorrect(correct);
    setShowFeedback(true);

    if (correct) {
      setScore(score + 1);
    } else {
      setWrongAnswers(wrongAnswers + 1);
      await api.post('/api/lessons/lose-life');
      await refreshUser();
    }

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleNext = () => {
    if (!lesson) return;

    if (currentExerciseIndex < lesson.exercises.length - 1) {
      setCurrentExerciseIndex(currentExerciseIndex + 1);
      setSelectedAnswer('');
      setMatchedPairs({});
      setShowFeedback(false);
      setIsCorrect(false);
    } else {
      completeLesson();
    }
  };

  const completeLesson = async () => {
    if (!lesson) return;

    const scorePercent = (score / lesson.exercises.length) * 100;
    const xpEarned = Math.round((scorePercent / 100) * lesson.xp_reward);

    try {
      await api.post(`/api/lessons/${lesson.id}/complete`, {
        lesson_id: lesson.id,
        score: scorePercent,
        xp_earned: xpEarned,
      });

      await refreshUser();

      Alert.alert(
        '¡Lección Completada!',
        `¡Bien hecho!\n\nPuntuación: ${Math.round(scorePercent)}%\nXP ganado: ${xpEarned}`,
        [
          {
            text: 'Continuar',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error completing lesson:', error);
      Alert.alert('Error', 'No se pudo guardar el progreso');
    }
  };

  const handleMatchPair = (maya: string, spanish: string) => {
    const newMatched = { ...matchedPairs };
    
    if (newMatched[maya] === spanish) {
      delete newMatched[maya];
    } else {
      newMatched[maya] = spanish;
    }
    
    setMatchedPairs(newMatched);
  };

  const renderExercise = () => {
    if (!currentExercise) return null;

    if (currentExercise.type === 'translate' || currentExercise.type === 'multiple_choice') {
      return (
        <View style={styles.exerciseContainer}>
          <Text style={styles.question}>{currentExercise.question}</Text>
          
          <View style={styles.optionsContainer}>
            {currentExercise.options?.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.optionButton,
                  selectedAnswer === option && styles.optionSelected,
                  showFeedback && selectedAnswer === option && isCorrect && styles.optionCorrect,
                  showFeedback && selectedAnswer === option && !isCorrect && styles.optionIncorrect,
                ]}
                onPress={() => !showFeedback && setSelectedAnswer(option)}
                disabled={showFeedback}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedAnswer === option && styles.optionTextSelected,
                  ]}
                >
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      );
    }

    if (currentExercise.type === 'matching') {
      const pairs = currentExercise.pairs || [];
      
      return (
        <View style={styles.exerciseContainer}>
          <Text style={styles.question}>{currentExercise.question}</Text>
          
          <View style={styles.matchingContainer}>
            <View style={styles.matchingColumn}>
              <Text style={styles.columnTitle}>Maya</Text>
              {pairs.map((pair, index) => (
                <View key={index} style={styles.matchingCard}>
                  <Text style={styles.matchingText}>{pair.maya}</Text>
                </View>
              ))}
            </View>

            <View style={styles.matchingColumn}>
              <Text style={styles.columnTitle}>Español</Text>
              {pairs.map((pair, index) => {
                const isMatched = Object.values(matchedPairs).includes(pair.spanish);
                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.matchingCard,
                      isMatched && styles.matchingCardMatched,
                    ]}
                    onPress={() => {
                      const mayaKey = pairs.find(p => !matchedPairs[p.maya])?.maya;
                      if (mayaKey) {
                        handleMatchPair(mayaKey, pair.spanish);
                      }
                    }}
                    disabled={showFeedback}
                  >
                    <Text style={styles.matchingText}>{pair.spanish}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
          
          <View style={styles.matchedPairsContainer}>
            {Object.entries(matchedPairs).map(([maya, spanish]) => (
              <View key={maya} style={styles.matchedPair}>
                <Text style={styles.matchedPairText}>{maya} → {spanish}</Text>
              </View>
            ))}
          </View>
        </View>
      );
    }

    return null;
  };

  if (loading || !lesson) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Cargando...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#777" />
        </TouchableOpacity>
        
        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>
      </View>

      <Animated.ScrollView 
        style={styles.content}
        contentContainerStyle={styles.contentContainer}
        opacity={fadeAnim}
      >
        {renderExercise()}
      </Animated.ScrollView>

      {showFeedback && (
        <View style={[styles.feedbackBar, isCorrect ? styles.feedbackCorrect : styles.feedbackIncorrect]}>
          <View style={styles.feedbackContent}>
            <Ionicons 
              name={isCorrect ? 'checkmark-circle' : 'close-circle'} 
              size={32} 
              color="#FFF" 
            />
            <View style={styles.feedbackTextContainer}>
              <Text style={styles.feedbackTitle}>
                {isCorrect ? '¡Correcto!' : 'Incorrecto'}
              </Text>
              {!isCorrect && currentExercise && (
                <Text style={styles.feedbackSubtitle}>
                  Respuesta correcta: {currentExercise.correct_answer}
                </Text>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
            <Text style={styles.continueButtonText}>Continuar</Text>
          </TouchableOpacity>
        </View>
      )}

      {!showFeedback && (
        <View style={styles.bottomBar}>
          <TouchableOpacity
            style={[
              styles.checkButton,
              (!selectedAnswer && Object.keys(matchedPairs).length === 0) && styles.checkButtonDisabled,
            ]}
            onPress={handleCheck}
            disabled={!selectedAnswer && Object.keys(matchedPairs).length === 0}
          >
            <Text style={styles.checkButtonText}>Verificar</Text>
          </TouchableOpacity>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#E5E5E5',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 6,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 24,
  },
  exerciseContainer: {
    gap: 32,
  },
  question: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#000',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  optionSelected: {
    borderColor: '#1CB0F6',
    backgroundColor: '#E7F5FF',
  },
  optionCorrect: {
    borderColor: '#58CC02',
    backgroundColor: '#D7FFB8',
  },
  optionIncorrect: {
    borderColor: '#FF4B4B',
    backgroundColor: '#FFE5E5',
  },
  optionText: {
    fontSize: 18,
    color: '#000',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '600',
  },
  matchingContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  matchingColumn: {
    flex: 1,
    gap: 12,
  },
  columnTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1CB0F6',
    textAlign: 'center',
    marginBottom: 8,
  },
  matchingCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E5E5',
    backgroundColor: '#FFF',
  },
  matchingCardMatched: {
    borderColor: '#58CC02',
    backgroundColor: '#D7FFB8',
  },
  matchingText: {
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
  },
  matchedPairsContainer: {
    gap: 8,
  },
  matchedPair: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#E7F5FF',
  },
  matchedPairText: {
    fontSize: 14,
    color: '#1CB0F6',
    textAlign: 'center',
    fontWeight: '600',
  },
  bottomBar: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E5E5E5',
  },
  checkButton: {
    backgroundColor: '#58CC02',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: '#E5E5E5',
  },
  checkButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedbackBar: {
    padding: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  feedbackCorrect: {
    backgroundColor: '#58CC02',
  },
  feedbackIncorrect: {
    backgroundColor: '#FF4B4B',
  },
  feedbackContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  feedbackTextContainer: {
    flex: 1,
  },
  feedbackTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  feedbackSubtitle: {
    fontSize: 14,
    color: '#FFF',
    marginTop: 4,
  },
  continueButton: {
    backgroundColor: '#FFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 12,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#58CC02',
  },
});
