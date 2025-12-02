import React, { useEffect, useState, useRef } from 'react';
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
  Animated,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons, FontAwesome5, MaterialCommunityIcons } from '@expo/vector-icons';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../utils/api';
import { Unit, Lesson } from '../../types';
import HeartsGame from '../../components/HeartsGame';
import TipsModal from '../../components/TipsModal';
const brandLogo = require('../../assets/images/icon.png');

export default function HomeScreen() {
  const router = useRouter();
  const { user, refreshUser } = useAuth();
  const xp = user?.xp || 0;
  const level = user?.level ?? Math.floor(xp / 100);
  const lastActiveDateText = (() => {
    try {
      const la = user?.last_activity ? new Date(user.last_activity) : null;
      return la ? la.toLocaleDateString('es-MX', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';
    } catch {
      return '—';
    }
  })();
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showGame, setShowGame] = useState(false);
  const [tipsVisible, setTipsVisible] = useState(false);
  const [currentTips, setCurrentTips] = useState<any>(null);
  const [showHeartTooltip, setShowHeartTooltip] = useState(false);
  const [showStarTooltip, setShowStarTooltip] = useState(false);
  const [showFlameTooltip, setShowFlameTooltip] = useState(false);
  const [stats, setStats] = useState<any>(null);
  const [completedSet, setCompletedSet] = useState<Set<string>>(new Set());
  const [showConfetti, setShowConfetti] = useState(false);
  const avatarGlow = useRef(new Animated.Value(0)).current;
  const prevLevelRef = useRef<number>(level);
  const texture: any = (() => {
    try {
      return require('../../assets/images/fondo.png');
    } catch {
      return null;
    }
  })();

  const loadLessons = React.useCallback(async () => {
    try {
      const response = await api.get('/api/lessons');
      setUnits(response.data);
      try {
        const nowCompleted = new Set<string>();
        for (const u of response.data as any[]) {
          for (const l of u.lessons) {
            if (l.completed) nowCompleted.add(l.id);
          }
        }
        let hasNewCompletion = false;
        for (const id of nowCompleted) {
          if (!completedSet.has(id)) { hasNewCompletion = true; break; }
        }
        setCompletedSet(nowCompleted);
        if (hasNewCompletion) setShowConfetti(true);
      } catch {}
    } catch (error) {
      console.error('Error loading lessons:', error);
      Alert.alert('Error', 'No se pudieron cargar las lecciones');
    } finally {
      setLoading(false);
    }
  }, [completedSet]);

  const loadStats = React.useCallback(async () => {
    try {
      const response = await api.get('/api/user/stats');
      setStats(response.data);
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  }, []);

  useEffect(() => {
    loadLessons();
    loadStats();
  }, [loadLessons, loadStats]);


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

  

  const nextLevelXp = (level + 1) * 100;
  const starsRemaining = Math.max(0, nextLevelXp - xp);
  const progressPct = stats?.progress_percentage || 0;
  const [barWidth, setBarWidth] = useState(0);
  const stripeX = useRef(new Animated.Value(0)).current;
  const nearLevelUp = progressPct >= 90 || (user ? (((user.level + 1) * 100) - (user.xp || 0)) <= 10 : false);
  useEffect(() => {
    if (barWidth > 0 && (nearLevelUp || progressPct >= 95)) {
      stripeX.setValue(-barWidth * 0.3);
      const loop = Animated.loop(
        Animated.timing(stripeX, { toValue: barWidth, duration: 1200, useNativeDriver: true })
      );
      loop.start();
      return () => loop.stop();
    }
  }, [barWidth, nearLevelUp, progressPct, stripeX]);

  useEffect(() => {
    const prev = prevLevelRef.current;
    if (level > prev) {
      avatarGlow.setValue(0);
      Animated.timing(avatarGlow, { toValue: 1, duration: 600, useNativeDriver: false }).start(() => {
        Animated.timing(avatarGlow, { toValue: 0, duration: 800, useNativeDriver: false }).start();
      });
    }
    prevLevelRef.current = level;
  }, [level, avatarGlow]);

  

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#58CC02" />
      </View>
    );
  }
  const completedLessons = units.reduce((acc, u) => acc + u.lessons.filter(l => !!l.completed).length, 0);
  const highestUnitCompleted = units.filter(u => u.lessons.some(l => !!l.completed)).reduce((max, u) => Math.max(max, u.unit), 0);

  const buildBadges = () => {
    const out: { key: string; title: string; icon: React.ReactElement }[] = [];
    if (completedLessons >= 1) out.push({ key: 'first', title: 'Primeros pasos', icon: <Ionicons name="checkmark-circle" size={18} color="#58CC02" /> });
    if (completedLessons >= 5) out.push({ key: 'apprentice', title: 'Aprendiz (5)', icon: <MaterialCommunityIcons name="star-three-points" size={18} color="#FFC800" /> });
    if (progressPct >= 25) out.push({ key: 'quarter', title: 'Progreso 25%', icon: <Ionicons name="trophy" size={18} color="#FF9600" /> });
    if ((user?.streak || 0) >= 3) out.push({ key: 'streak3', title: 'Racha 3+', icon: <Ionicons name="flame" size={18} color="#FF9600" /> });
    if (highestUnitCompleted >= 1) out.push({ key: 'u1', title: 'Unidad 1', icon: <MaterialCommunityIcons name="hand-wave" size={18} color="#1CB0F6" /> });
    if ((user?.level || 0) >= 1) out.push({ key: 'level1', title: 'Nivel 1', icon: <FontAwesome5 name="medal" size={16} color="#1CB0F6" /> });
    return out;
  };

  const StreakInline = () => {
    const streak = user?.streak || 0;
    const pulse = useRef(new Animated.Value(1)).current;
    useEffect(() => {
      if (streak > 0) {
        const loop = Animated.loop(
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.1, duration: 700, useNativeDriver: true }),
            Animated.timing(pulse, { toValue: 1.0, duration: 700, useNativeDriver: true }),
          ])
        );
        loop.start();
        return () => loop.stop();
      }
    }, [streak, pulse]);
    return (
      <View style={styles.streakInlineWrap}>
        <Animated.View style={{ transform: [{ scale: pulse }] }}>
          <Ionicons name="flame" size={18} color="#FF9600" />
        </Animated.View>
        <Text style={styles.streakInlineText}>{streak}</Text>
      </View>
    );
  };

  const getUnitIcon = (u: Unit) => {
    const t = (u.title || '').toLowerCase();
    const size = 22;
    const color = '#1CB0F6';
    if (t.includes('salud')) return <MaterialCommunityIcons name="hand-wave" size={size} color={color} />;
    if (t.includes('comida') || t.includes('alimento')) return <MaterialCommunityIcons name="food-fork-drink" size={size} color={color} />;
    if (t.includes('animal')) return <MaterialCommunityIcons name="paw" size={size} color={color} />;
    if (t.includes('númer') || t.includes('numero')) return <FontAwesome5 name="calculator" size={18} color={color} />;
    if (t.includes('cultura') || t.includes('templo') || t.includes('pirámide') || t.includes('piramide')) return <FontAwesome5 name="landmark" size={18} color={color} />;
    return <MaterialCommunityIcons name="book-open-variant" size={size} color={color} />;
  };

  

  const getLessonMeta = (lesson: Lesson): { label: string; icon: any } => {
    const hasAudio = (lesson.exercises || []).some((e) => !!e.audio_file);
    if (hasAudio) return { label: 'Escucha', icon: 'headphones' };
    const hasMatching = (lesson.exercises || []).some((e: any) => e.type === 'matching' || (e.pairs && e.pairs.length));
    if (hasMatching) return { label: 'Vocabulario', icon: 'format-list-bulleted' };
    const hasMC = (lesson.exercises || []).some((e: any) => e.type === 'multiple_choice');
    if (hasMC) return { label: 'Gramática', icon: 'format-font' };
    return { label: 'Vocabulario', icon: 'format-list-bulleted' };
  };

  const ConfettiOverlay = ({ onFinish }: { onFinish: () => void }) => {
    const colors = ['#58CC02', '#1CB0F6', '#FF9600', '#FFC800', '#FF4B4B'];
    const count = 24;
    const { width, height } = Dimensions.get('window');
    const piecesRef = useRef(
      Array.from({ length: count }, () => ({
        y: new Animated.Value(-20),
        r: new Animated.Value(0),
        left: Math.random() * width,
        size: 6 + Math.random() * 10,
        color: colors[Math.floor(Math.random() * colors.length)],
      }))
    );

    useEffect(() => {
      Animated.stagger(
        30,
        piecesRef.current.map(p =>
          Animated.parallel([
            Animated.timing(p.y, { toValue: height + 40, duration: 1600, useNativeDriver: true }),
            Animated.timing(p.r, { toValue: 1, duration: 1600, useNativeDriver: true }),
          ])
        )
      ).start(() => onFinish());
    }, [height, onFinish]);

    return (
      <View style={{ ...StyleSheet.absoluteFillObject, zIndex: 20, pointerEvents: 'none' }}>
        {piecesRef.current.map((p, i) => (
          <Animated.View
            key={i}
            style={{
              position: 'absolute',
              left: p.left,
              width: p.size,
              height: p.size,
              borderRadius: p.size / 2,
              backgroundColor: p.color,
              transform: [
                { translateY: p.y },
                { rotate: p.r.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '360deg'] }) },
              ],
              opacity: p.r.interpolate({ inputRange: [0, 0.9, 1], outputRange: [1, 1, 0] }),
            }}
          />
        ))}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {texture ? (
        <Image source={texture} style={styles.bgTexture} resizeMode="cover" />
      ) : null}
      {showConfetti && <ConfettiOverlay onFinish={() => setShowConfetti(false)} />}
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
            onHoverIn={() => setShowFlameTooltip(true)}
            onHoverOut={() => setShowFlameTooltip(false)}
          >
            <StreakInline />
            {showFlameTooltip && (
              <View style={styles.tooltip}>
                <Text style={styles.tooltipText}>Racha: {user?.streak || 0} • Último día activo: {lastActiveDateText}</Text>
                <Text style={styles.tooltipText}>Consejo: completa una lección o juega el minijuego cada día.</Text>
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
          <View style={styles.progressHeaderRight}>
            <Text style={styles.progressPercentage}>{progressPct}%</Text>
          </View>
        </View>
        <View style={styles.progressBarContainer} onLayout={(e) => setBarWidth(e.nativeEvent.layout.width)}>
          <View style={[styles.progressBar, { width: `${progressPct}%`, backgroundColor: nearLevelUp ? '#FFC800' : '#1CB0F6' }]} />
          {(nearLevelUp || progressPct >= 95) && barWidth > 0 ? (
            <Animated.View style={[styles.progressShimmer, { transform: [{ translateX: stripeX }] }]} />
          ) : null}
        </View>
      </View>

      {(() => {
        const badges = buildBadges();
        return badges.length ? (
          <View style={styles.badgesSection}>
            <Text style={styles.badgesTitle}>Insignias desbloqueadas</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.badgesRow}>
              {badges.map(b => (
                <View key={b.key} style={styles.badgeCard}>
                  <View style={styles.badgeIcon}>{b.icon}</View>
                  <Text style={styles.badgeText}>{b.title}</Text>
                </View>
              ))}
            </ScrollView>
          </View>
        ) : null;
      })()}

      

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#58CC02" />
        }
      >
        <Text style={styles.welcomeText}>¡Hola, {user?.username}!</Text>
        <View style={styles.levelRow}>
          <FontAwesome5 name="landmark" size={16} color="#1CB0F6" />
          <Text style={styles.levelText}>Nivel {user?.level || 0}</Text>
        </View>

        {units.map((unit) => (
          <View key={unit.unit} style={styles.unitContainer}>
            <View style={styles.unitHeader}>
              <View style={styles.unitTitleRow}>
                {getUnitIcon(unit)}
                <View>
                  <View style={styles.unitTitleWithTips}>
                    <Text style={styles.unitTitle}>Unidad {unit.unit}</Text>
                  </View>
                  <Text style={styles.unitSubtitle}>{unit.title}</Text>
                </View>
              </View>
              <TouchableOpacity
                style={styles.tipsButton}
                onPress={() => handleTipsPress(unit.unit)}
              >
                <MaterialCommunityIcons name="lightbulb-on" size={20} color="#FFC800" style={styles.tipsLightIcon} />
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
                  {(!lesson.completed) ? (() => {
                    const meta = getLessonMeta(lesson);
                    return (
                      <View style={styles.lessonMeta}>
                        <MaterialCommunityIcons name={meta.icon} size={16} color="#AFAFAF" />
                        <Text style={styles.lessonMetaText}>{meta.label}</Text>
                      </View>
                    );
                  })() : null}
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
    position: 'relative',
  },
  bgTexture: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.08,
    zIndex: 0,
    pointerEvents: 'none',
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
  avatarFrame: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1C1C1E',
    borderWidth: 2,
    borderColor: '#333',
  },
  avatarImageSmall: {
    width: 28,
    height: 28,
    borderRadius: 14,
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
  levelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
  unitTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  unitTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FFF',
  },
  unitTitleWithTips: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  tipsInlineButton: {
    padding: 4,
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
    borderColor: '#1CB0F6',
  },
  tipsLightIcon: {
    shadowColor: '#FFC800',
    shadowOpacity: 0.6,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 0 },
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
  progressHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
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
    backgroundColor: '#1CB0F6',
    borderRadius: 6,
  },
  progressShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: 60,
    borderRadius: 6,
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  streakInlineWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  streakInlineText: {
    color: '#FF9600',
    fontSize: 14,
    fontWeight: '700',
  },
  streakSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  streakIconWrap: {
    backgroundColor: '#1C1C1E',
    borderRadius: 24,
    padding: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  streakTextWrap: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  streakLabel: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  streakValue: {
    color: '#FF9600',
    fontSize: 24,
    fontWeight: '800',
  },
  badgesSection: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#000000',
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  badgesTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  badgesRow: {
    gap: 8,
  },
  badgeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#333',
    marginRight: 8,
  },
  badgeIcon: {
    marginRight: 8,
  },
  badgeText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
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
  lessonMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  lessonMetaText: {
    fontSize: 12,
    color: '#AFAFAF',
    textAlign: 'center',
  },
  lessonXP: {
    fontSize: 12,
    color: '#AFAFAF',
    marginTop: 4,
  },
});
