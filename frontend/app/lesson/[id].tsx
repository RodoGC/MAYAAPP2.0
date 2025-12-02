import React, { useEffect, useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Animated,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Lesson } from '../../types';
import * as Speech from 'expo-speech';
import { Audio as ExpoAudio } from 'expo-av';
import { Asset } from 'expo-asset';
import * as Haptics from 'expo-haptics';

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

  const PALETTE = ['#1CB0F6', '#FF4B4B', '#FFC800', '#58CC02', '#A970FF', '#FF7F50'];
  const getColorByMaya = (maya: string, pairs: { maya: string; spanish: string }[]) => {
    const idx = pairs.findIndex(p => p.maya === maya);
    const c = PALETTE[idx % PALETTE.length] || '#58CC02';
    return c;
  };
  const getColorBySpanish = (spanish: string, pairs: { maya: string; spanish: string }[]) => {
    const entry = Object.entries(matchedPairs).find(([, s]) => s === spanish);
    if (!entry) return '#58CC02';
    return getColorByMaya(entry[0], pairs);
  };

  

  

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

  const loadLesson = useCallback(async () => {
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
  }, [lessonId, router]);

  useEffect(() => {
    if (lessonId) {
      loadLesson();
    }
  }, [lessonId, loadLesson]);

  

  const currentExercise = lesson?.exercises[currentExerciseIndex];
  const progress = lesson ? ((currentExerciseIndex) / lesson.exercises.length) * 100 : 0;

  const okSound: any = (() => {
    try { return require('../../assets/sounds/duolingo_correct.mp3'); } catch {}
    return null;
  })();

  const badSound: any = (() => {
    try { return require('../../assets/sounds/duolingo_wrong.mp3'); } catch {}
    return null;
  })();

  const webOkRef = useRef<any>(null);
  const webBadRef = useRef<any>(null);
  const webCtxRef = useRef<any>(null);
  const okRef = useRef<ExpoAudio.Sound | null>(null);
  const badRef = useRef<ExpoAudio.Sound | null>(null);

  useEffect(() => {
    if (Platform.OS === 'web') {
      (async () => {
        let okUrl: string | undefined;
        let badUrl: string | undefined;
        try {
          if (okSound) {
            const a = Asset.fromModule(okSound);
            await a.downloadAsync().catch(() => {});
            okUrl = (a as any).localUri || a.uri;
          }
        } catch {}
        try {
          if (badSound) {
            const b = Asset.fromModule(badSound);
            await b.downloadAsync().catch(() => {});
            badUrl = (b as any).localUri || b.uri;
          }
        } catch {}
        const envOk = (process as any).env?.EXPO_PUBLIC_CORRECT_SOUND_URL as string | undefined;
        const envBad = (process as any).env?.EXPO_PUBLIC_INCORRECT_SOUND_URL as string | undefined;
        const toAbs = (u?: string) => {
          if (!u) return undefined;
          try { return new URL(u, window.location.origin).toString(); } catch { return u; }
        };
        const finalOk = toAbs(okUrl || envOk);
        const finalBad = toAbs(badUrl || envBad);
        if (finalOk) {
          try {
            const el = new (window as any).Audio(finalOk);
            el.preload = 'auto';
            (el as any).crossOrigin = 'anonymous';
            el.volume = 1;
            webOkRef.current = el;
          } catch {}
        }
        if (finalBad) {
          try {
            const el = new (window as any).Audio(finalBad);
            el.preload = 'auto';
            (el as any).crossOrigin = 'anonymous';
            el.volume = 1;
            webBadRef.current = el;
          } catch {}
        }
      })();
    }
    (async () => {
      try {
        await ExpoAudio.setAudioModeAsync({ playsInSilentModeIOS: true });
      } catch {}
    })();
    const ok = okRef.current;
    const bad = badRef.current;
    return () => {
      ok?.unloadAsync().catch(() => {});
      bad?.unloadAsync().catch(() => {});
    };
  }, [okSound, badSound]);

  const ensureWebCtx = () => {
    try {
      const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
      if (!webCtxRef.current) webCtxRef.current = new Ctx();
      webCtxRef.current.resume().catch(() => {});
      return webCtxRef.current;
    } catch {
      return null;
    }
  };

  const playBeepWeb = (freq: number, duration = 160) => {
    try {
      const ctx = ensureWebCtx();
      if (!ctx) return;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0.001, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.6, ctx.currentTime + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration / 1000);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration / 1000);
    } catch {}
  };

  const playLocalSound = async (mod: any, correct: boolean) => {
    try {
      const asset = Asset.fromModule(mod);
      await asset.downloadAsync().catch(() => {});
      const uri: string = (asset as any).localUri || asset.uri;
      if (Platform.OS === 'web') {
        const el = correct ? webOkRef.current : webBadRef.current;
        const urlAbs = (() => { try { return new URL(uri, window.location.origin).toString(); } catch { return uri; } })();
          const audio = el || new (window as any).Audio(urlAbs);
          (audio as any).crossOrigin = 'anonymous';
          audio.volume = 1;
          audio.currentTime = 0;
          let started = false;
          audio.onplaying = () => { started = true; };
          try {
            await audio.play();
            setTimeout(() => {
              if (!started) {
                if (correct) {
                  playBeepWeb(880, 140);
                  setTimeout(() => playBeepWeb(660, 140), 160);
                } else {
                  playBeepWeb(220, 200);
                }
              }
            }, 300);
            return;
          } catch {
            try {
              const Ctx: any = (window as any).AudioContext || (window as any).webkitAudioContext;
              const ctx = new Ctx();
              await ctx.resume();
            const res = await fetch(urlAbs);
              const buf = await res.arrayBuffer();
              const audioBuf = await ctx.decodeAudioData(buf);
              const src = ctx.createBufferSource();
              src.buffer = audioBuf;
              src.connect(ctx.destination);
              src.start(0);
              return;
            } catch {}
            if (correct) {
              playBeepWeb(880, 140);
              setTimeout(() => playBeepWeb(660, 140), 160);
            } else {
              playBeepWeb(220, 200);
            }
            return;
          }
      }

      const ref = correct ? okRef : badRef;
      if (!ref.current) {
        const created = await ExpoAudio.Sound.createAsync(mod, { shouldPlay: false });
        ref.current = created.sound;
      }
      const soundObj = ref.current!;
      await soundObj.setPositionAsync(0);
      await soundObj.playAsync().catch(() => {
        Speech.speak(correct ? 'Correcto' : 'Incorrecto', { language: 'es-MX', rate: 1 });
      });
    } catch {
      if (Platform.OS === 'web') {
        if (correct) {
          playBeepWeb(880, 140);
          setTimeout(() => playBeepWeb(660, 140), 160);
        } else {
          playBeepWeb(220, 200);
        }
      } else {
        Speech.speak(correct ? 'Correcto' : 'Incorrecto', { language: 'es-MX', rate: 1 });
      }
    }
  };

  const playFeedback = (correct: boolean) => {
    if (okSound || badSound) {
      const mod = correct ? okSound : badSound;
      if (mod) {
        playLocalSound(mod, correct);
        if (!correct && Platform.OS === 'web') {
          setTimeout(() => {
            playBeepWeb(220, 180);
          }, 80);
        }
      }
    } else if (Platform.OS === 'web') {
      const okUrl = (process as any).env?.EXPO_PUBLIC_CORRECT_SOUND_URL as string | undefined;
      const badUrl = (process as any).env?.EXPO_PUBLIC_INCORRECT_SOUND_URL as string | undefined;
      const url = correct ? okUrl : badUrl;
      if (url) {
        try {
          const audio = new (window as any).Audio(url);
          audio.play().catch(() => {
            if (correct) {
              playBeepWeb(880, 140);
              setTimeout(() => playBeepWeb(660, 140), 160);
            } else {
              playBeepWeb(220, 200);
            }
          });
        } catch {
          if (correct) {
            playBeepWeb(880, 140);
            setTimeout(() => playBeepWeb(660, 140), 160);
          } else {
            playBeepWeb(220, 200);
          }
        }
      } else {
        if (correct) {
          playBeepWeb(880, 140);
          setTimeout(() => playBeepWeb(660, 140), 160);
        } else {
          playBeepWeb(220, 200);
        }
      }
    } else {
      const okUrl = (process as any).env?.EXPO_PUBLIC_CORRECT_SOUND_URL as string | undefined;
      const badUrl = (process as any).env?.EXPO_PUBLIC_INCORRECT_SOUND_URL as string | undefined;
      const url = correct ? okUrl : badUrl;
      if (url) {
        ExpoAudio.Sound.createAsync({ uri: url }, { shouldPlay: true }).catch(() => {
          Speech.speak(correct ? 'Correcto' : 'Incorrecto', { language: 'es-MX', rate: 1 });
        });
      } else {
        Speech.speak(correct ? 'Correcto' : 'Incorrecto', { language: 'es-MX', rate: 1 });
      }
    }
    Haptics.notificationAsync(correct ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Error);
  };

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
    playFeedback(correct);

    if (correct) {
      setScore(score + 1);
    } else {
      setWrongAnswers(wrongAnswers + 1);
      try {
        await api.post('/api/lessons/lose-life');
      } catch (error: any) {
        console.log('Life lost:', error?.response?.data || error?.message);
      }
      try {
        await refreshUser();
      } catch {
        console.log('Refresh user failed after lose-life');
      }
      // Esperar a que el usuario presione "Continuar" (sin auto-avance)
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
              {pairs.map((pair, index) => {
                const isMatched = matchedPairs[pair.maya] !== undefined;
                const isSelected = selectedSelection?.type === 'maya' && selectedSelection.value === pair.maya;

                return (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.matchingCard,
                      isSelected && styles.matchingCardSelected,
                      isMatched && { borderColor: getColorByMaya(pair.maya, pairs) },
                    ]}
                    onPress={() => {
                      if (showFeedback) return;
                      if (isMatched) {
                        const nm = { ...matchedPairs };
                        delete nm[pair.maya];
                        setMatchedPairs(nm);
                        setSelectedSelection(null);
                        return;
                      }
                      handleSelection('maya', pair.maya);
                    }}
                    disabled={showFeedback}
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
                      isMatched && { borderColor: getColorBySpanish(pair.spanish, pairs) },
                    ]}
                    onPress={() => {
                      if (showFeedback) return;
                      if (isMatched) {
                        const mayaKey = Object.entries(matchedPairs).find(([, s]) => s === pair.spanish)?.[0];
                        if (mayaKey) {
                          const nm = { ...matchedPairs };
                          delete nm[mayaKey];
                          setMatchedPairs(nm);
                          setSelectedSelection(null);
                          return;
                        }
                      }
                      handleSelection('spanish', pair.spanish);
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
          <TouchableOpacity
            style={[styles.checkButton, { backgroundColor: '#1C1C1E', marginTop: 12, borderWidth: 2, borderColor: '#333' }]}
            onPress={() => {
              if (showFeedback) return;
              setMatchedPairs({});
              setSelectedSelection(null);
              setSelectedAnswer('');
            }}
          >
            <Text style={[styles.checkButtonText, { color: '#1CB0F6' }]}>Cambiar respuestas</Text>
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
