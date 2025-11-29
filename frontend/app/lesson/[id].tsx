import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Animated,
  ActivityIndicator,
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
  const lessonId = Array.isArray(id) ? id[0] : id;
  const { user, refreshUser } = useAuth();

  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string>('');
  const [matchedPairs, setMatchedPairs] = useState<{ [key: string]: string }>({});
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [score, setScore] = useState(0);
  const [wrongAnswers, setWrongAnswers] = useState(0);
  const [loading, setLoading] = useState(true);
  const [fadeAnim] = useState(new Animated.Value(1));
  const [selectedSelection, setSelectedSelection] = useState<{ type: 'maya' | 'spanish', value: string } | null>(null);

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId]);

  const handleSelection = (type: 'maya' | 'spanish', value: string) => {
    if (showFeedback) return;

    // If nothing selected, select this
    if (!selectedSelection) {
      setSelectedSelection({ type, value });
      return;
    }

    // If clicking same type, switch selection
    if (selectedSelection.type === type) {
      setSelectedSelection({ type, value });
      return;
    }

    // If clicking opposite type, try to match
    const maya = type === 'maya' ? value : selectedSelection.value;
    const spanish = type === 'spanish' ? value : selectedSelection.value;

    // Update matched pairs
    const newMatched = { ...matchedPairs };
    newMatched[maya] = spanish;
    setMatchedPairs(newMatched);
    setSelectedSelection(null);
  };

  const loadLesson = async () => {
    try {
      const response = await api.get(`/api/lessons/${lessonId}`);
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
  const progress = lesson ? ((currentExerciseIndex) / lesson.exercises.length) * 100 : 0;

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
      try {
        await api.post('/api/lessons/lose-life');
        await refreshUser();
      } catch (error: any) {
        // Just log the error, don't exit the lesson
        console.log('Life lost:', error.response?.data);
      }
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
      setSelectedSelection(null);
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
      router.replace('/(tabs)');

    } catch (error) {
      console.error('Error completing lesson:', error);
      router.replace('/(tabs)');
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
      const isComplete = Object.keys(matchedPairs).length === pairs.length;

      return (
        <View style={styles.exerciseContainer}>
          <Text style={styles.question}>{currentExercise.question}</Text>

          <View style={styles.matchingContainer}>
            <View style={styles.matchingColumn}>
              <Text style={styles.columnTitle}>Maya</Text>
              {pairs.map((pair, index) => {
                const isMatched = matchedPairs[pair.maya] !== undefined;
                const isSelected = selectedSelection?.type === 'maya' && selectedSelection.value === pair.maya;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.matchingCard,
                      isSelected && styles.matchingCardSelected,
                      isMatched && styles.matchingCardMatched,
                    ]}
                    onPress={() => !isMatched && handleSelection('maya', pair.maya)}
                    disabled={showFeedback || isMatched}
                  >
                    <Text style={styles.matchingText}>{pair.maya}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.matchingColumn}>
              <Text style={styles.columnTitle}>Español</Text>
              {pairs.map((pair, index) => {
                const isMatched = Object.values(matchedPairs).includes(pair.spanish);
                const isSelected = selectedSelection?.type === 'spanish' && selectedSelection.value === pair.spanish;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.matchingCard,
                      isSelected && styles.matchingCardSelected,
                      isMatched && styles.matchingCardMatched,
                    ]}
                    onPress={() => !isMatched && handleSelection('spanish', pair.spanish)}
                    disabled={showFeedback || isMatched}
                  >
                    <Text style={styles.matchingText}>{pair.spanish}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          <View style={styles.matchedPairsContainer}>
          </View>
        </View>
      );
    }

    return null;
  };

  if (loading || !lesson) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#58CC02" />
        <Text style={styles.loadingText}>Cargando lección...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.closeButton}>
          <Ionicons name="close" size={28} color="#AFAFAF" />
        </TouchableOpacity>

        <View style={styles.progressContainer}>
          <View style={styles.progressBar}>
            <View style={[styles.progressFill, { width: `${progress}%` }]} />
          </View>
        </View>

        <View style={styles.heartsContainer}>
          <Ionicons name="heart" size={24} color="#FF4B4B" />
          <Text style={styles.heartsText}>{user?.lives || 0}</Text>
        </View>
      </View>

      <Animated.ScrollView
        style={[styles.content, { opacity: fadeAnim }]}
        contentContainerStyle={styles.contentContainer}
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
                <View>
                  {currentExercise.type === 'matching' ? (
                    <View>
                      <Text style={styles.feedbackSubtitle}>Pares correctos:</Text>
                      {currentExercise.pairs?.map((p, i) => (
                        <Text key={i} style={styles.feedbackSubtitle}>
                          {p.maya} = {p.spanish}
                        </Text>
                      ))}
                    </View>
                  ) : (
                    <Text style={styles.feedbackSubtitle}>
                      Respuesta correcta: {currentExercise.correct_answer}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
          <TouchableOpacity style={styles.continueButton} onPress={handleNext}>
            <Text style={[styles.continueButtonText, { color: isCorrect ? '#58CC02' : '#FF4B4B' }]}>
              Continuar
            </Text>
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
      )
      }
    </SafeAreaView >
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
  loadingText: {
    color: '#FFF',
    marginTop: 12,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  closeButton: {
    padding: 4,
  },
  progressContainer: {
    flex: 1,
  },
  progressBar: {
    height: 12,
    backgroundColor: '#333',
    borderRadius: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#58CC02',
    borderRadius: 6,
  },
  heartsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  heartsText: {
    color: '#FF4B4B',
    fontSize: 18,
    fontWeight: 'bold',
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
    color: '#FFF',
    textAlign: 'center',
  },
  optionsContainer: {
    gap: 12,
  },
  optionButton: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#333',
    backgroundColor: '#1C1C1E',
  },
  optionSelected: {
    borderColor: '#1CB0F6',
    backgroundColor: '#1C1C1E',
  },
  optionCorrect: {
    borderColor: '#58CC02',
    backgroundColor: '#1C1C1E',
  },
  optionIncorrect: {
    borderColor: '#FF4B4B',
    backgroundColor: '#1C1C1E',
  },
  optionText: {
    fontSize: 18,
    color: '#FFF',
    textAlign: 'center',
  },
  optionTextSelected: {
    fontWeight: '600',
    color: '#1CB0F6',
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
    borderColor: '#333',
    backgroundColor: '#1C1C1E',
  },
  matchingCardSelected: {
    borderColor: '#1CB0F6',
    backgroundColor: '#1C1C1E',
  },
  matchingCardMatched: {
    borderColor: '#58CC02',
    backgroundColor: '#1C1C1E',
  },
  matchingText: {
    fontSize: 16,
    color: '#FFF',
    textAlign: 'center',
  },
  matchedPairsContainer: {
    gap: 8,
  },
  matchedPair: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#333',
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
    borderTopColor: '#333',
    backgroundColor: '#000000',
  },
  checkButton: {
    backgroundColor: '#58CC02',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
  },
  checkButtonDisabled: {
    backgroundColor: '#333',
    opacity: 0.5,
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
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  feedbackCorrect: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: 2,
    borderColor: '#58CC02',
  },
  feedbackIncorrect: {
    backgroundColor: '#1C1C1E',
    borderTopWidth: 2,
    borderColor: '#FF4B4B',
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
  },
});
