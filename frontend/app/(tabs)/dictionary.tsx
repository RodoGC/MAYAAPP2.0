import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Platform,
  Image,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../../utils/api';
import { DictionaryEntry } from '../../types';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Buffer } from 'buffer';
import { useFocusEffect } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MS_TRANSLATOR_ENDPOINT = '/api/translate';

const CHIPS = [
  { key: 'Verbos', icon: 'gesture', color: '#58CC02' },
  { key: 'Sustantivos', icon: 'format-letter-case', color: '#1CB0F6' },
  { key: 'Frases', icon: 'format-quote-close', color: '#FFC800' },
  { key: 'Comida', icon: 'food-fork-drink', color: '#FF9600' },
  { key: 'Animales', icon: 'paw', color: '#A05A2C' },
] as const;

export default function DictionaryScreen() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DictionaryEntry[]>([]);
  const [searchText, setSearchText] = useState('');

  // Translator State
  const [translationInput, setTranslationInput] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [speechRate, setSpeechRate] = useState(0.95);
  const [webVoices, setWebVoices] = useState<any[]>([]);
  const [selectedVoice, setSelectedVoice] = useState<string | null>(null);
  const [webPaused, setWebPaused] = useState(false);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  const [detailVisible, setDetailVisible] = useState(false);
  const [detailEntry, setDetailEntry] = useState<DictionaryEntry | null>(null);
  const texture: any = (() => {
    try {
      return require('../../assets/images/fondo.png');
    } catch {
      return null;
    }
  })();

  const accent = '#58CC02';
  const inputGlow = useRef(new Animated.Value(0)).current;
  const btnScale = useRef(new Animated.Value(1)).current;
  const resultAnim = useRef(new Animated.Value(0)).current;
  const searchGlow = useRef(new Animated.Value(0)).current;
  const isWeb = Platform.OS === 'web';

  useEffect(() => {
    loadDictionary();
  }, []);

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const update = () => {
        const v = window.speechSynthesis.getVoices().filter(x => /es/i.test(x.lang));
        setWebVoices(v);
        if (!selectedVoice && v.length) setSelectedVoice(v[0].name);
      };
      update();
      (window.speechSynthesis as any).onvoiceschanged = update;
    }
  }, [selectedVoice]);

  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem('favorites_words');
        if (raw) setFavorites(JSON.parse(raw));
      } catch {}
    })();
  }, []);

  useFocusEffect(React.useCallback(() => {
    return () => {
      if (Platform.OS === 'web' && typeof window !== 'undefined') {
        window.speechSynthesis.cancel();
        setWebPaused(false);
      } else {
        Speech.stop();
      }
    };
  }, []));

  useEffect(() => {
    let list = entries;
    if (searchText) {
      list = list.filter(
        (entry) =>
          entry.maya.toLowerCase().includes(searchText.toLowerCase()) ||
          entry.spanish.toLowerCase().includes(searchText.toLowerCase())
      );
    }
    if (activeTag) {
      list = list.filter((entry) => (entry.category || '').toLowerCase().includes(activeTag.toLowerCase()));
    }
    list = list.sort((a, b) => a.maya.localeCompare(b.maya));
    setFilteredEntries(list);
  }, [searchText, entries, activeTag]);

  const loadDictionary = async () => {
    try {
      const response = await api.get('/api/dictionary');
      const sorted = [...response.data].sort((a: DictionaryEntry, b: DictionaryEntry) => a.maya.localeCompare(b.maya));
      setEntries(sorted);
      setFilteredEntries(sorted);
    } catch (error) {
      console.error('Error loading dictionary:', error);
    }
  };

  const normalize = (s: string) => s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Zñáéíóúü\s]/g, ' ')
    .trim();

  const translateFallback = (text: string) => {
    if (!text) return '';
    const tokens = normalize(text).split(/\s+/);
    const map = new Map<string, string>();
    for (const e of entries) {
      map.set(normalize(e.spanish), e.maya);
    }
    const out = tokens.map(t => map.get(t) || t).join(' ');
    return out;
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;

    setIsTranslating(true);
    try {
      const response = await api.post(MS_TRANSLATOR_ENDPOINT, { text: translationInput, from_lang: 'es', to_lang: 'yua' });
      const viaApi = response.data && response.data.text ? String(response.data.text) : '';
      const finalText = viaApi || translateFallback(translationInput);
      if (!finalText) {
        Alert.alert('Sin traducción', 'Prueba con otra palabra o frase corta');
      }
      setTranslatedText(finalText);
      resultAnim.setValue(0);
      Animated.parallel([
        Animated.timing(resultAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } catch {
      const fallback = translateFallback(translationInput);
      setTranslatedText(fallback);
      resultAnim.setValue(0);
      Animated.parallel([
        Animated.timing(resultAnim, { toValue: 1, duration: 250, useNativeDriver: true }),
      ]).start();
    } finally {
      setIsTranslating(false);
    }
  };

  const toggleFavorite = async (word: string) => {
    const exists = favorites.includes(word);
    const next = exists ? favorites.filter(w => w !== word) : [...favorites, word];
    setFavorites(next);
    try {
      await AsyncStorage.setItem('favorites_words', JSON.stringify(next));
    } catch {}
  };

  const openDetail = (item: DictionaryEntry) => {
    setDetailEntry(item);
    setDetailVisible(true);
  };

  const playAudio = async (text: string) => {
    if (!text) return;
    if (Platform.OS !== 'web') {
      try {
        Speech.speak(text, { rate: 0.95 });
        return;
      } catch {}
    }

    try {
      const response = await api.post(
        '/api/speak',
        { text },
        { responseType: 'arraybuffer' }
      );

      if (Platform.OS === 'web') {
        const blob = new Blob([response.data], { type: 'audio/mp3' });
        const url = URL.createObjectURL(blob);
        const audio = new window.Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        await audio.play();
        return;
      }

      const audioData = Buffer.from(response.data, 'binary').toString('base64');
      const uri = `data:audio/mp3;base64,${audioData}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();
      sound.setOnPlaybackStatusUpdate(async (status: any) => {
        if (status.didJustFinish) {
          await sound.unloadAsync();
        }
      });

    } catch (error) {
      console.error('Error playing audio:', error);
      if (Platform.OS === 'web' && typeof window !== 'undefined' && 'speechSynthesis' in window) {
        try {
          const utter = new SpeechSynthesisUtterance(text);
          const voices = window.speechSynthesis.getVoices();
          const preferred = selectedVoice
            ? voices.find(v => v.name === selectedVoice)
            : voices.find(v => /es|es-MX|es-ES/i.test(v.lang));
          if (preferred) utter.voice = preferred;
          utter.rate = speechRate;
          window.speechSynthesis.speak(utter);
          return;
        } catch (e) {
          console.error('WebSpeech fallback failed:', e);
        }
      }
      Alert.alert('Error', 'No se pudo reproducir el audio.');
    }
  };

  const stopSpeaking = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.speechSynthesis.cancel();
      setWebPaused(false);
    } else {
      Speech.stop();
    }
  };

  const pauseSpeaking = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.speechSynthesis.pause();
      setWebPaused(true);
    } else {
      Speech.stop();
    }
  };

  const resumeSpeaking = () => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.speechSynthesis.resume();
      setWebPaused(false);
    }
  };

  const decRate = () => setSpeechRate(r => Math.max(0.5, Math.round((r - 0.05) * 100) / 100));
  const incRate = () => setSpeechRate(r => Math.min(1.5, Math.round((r + 0.05) * 100) / 100));
  const nextVoice = () => {
    if (Platform.OS === 'web' && webVoices.length) {
      const idx = webVoices.findIndex(v => v.name === selectedVoice);
      const next = webVoices[(idx + 1) % webVoices.length];
      setSelectedVoice(next.name);
    }
  };

  const renderEntry = ({ item }: { item: DictionaryEntry }) => {
    const fav = favorites.includes(item.maya);
    return (
      <TouchableOpacity style={styles.entryCard} onPress={() => openDetail(item)}>
        <View style={styles.entryContent}>
          <View style={styles.titleRow}>
            <Text style={styles.mayaText}>{item.maya}</Text>
            <TouchableOpacity style={styles.favButton} onPress={() => toggleFavorite(item.maya)}>
              <Ionicons name={fav ? 'star' : 'star-outline'} size={18} color={fav ? '#FFC800' : '#AFAFAF'} />
            </TouchableOpacity>
          </View>
          <Text style={styles.spanishText}>{item.spanish}</Text>
        </View>
        <View style={styles.rightContent}>
          <View style={styles.categoryBadge}>
            <Text style={styles.categoryText}>{item.category}</Text>
          </View>
          <TouchableOpacity
            style={styles.audioButton}
            onPress={() => playAudio(item.maya)}
          >
            <Ionicons name="volume-high" size={24} color="#1CB0F6" />
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {texture ? (
        <Image source={texture} style={styles.bgTexture} resizeMode="cover" />
      ) : null}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diccionario Maya</Text>
      </View>

      <View style={styles.translatorContainer}>
        <Text style={styles.sectionTitle}>Traductor en tiempo real (Español - Maya)</Text>
        <View style={styles.translatorBox}>
          <Animated.View
            style={[
              styles.translatorInputWrap,
              {
                shadowColor: accent,
                shadowOpacity: inputGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.55] }),
                shadowRadius: inputGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 12] }),
                shadowOffset: { width: 0, height: 0 },
                borderColor: inputGlow.interpolate({ inputRange: [0, 1], outputRange: ['#333', accent] }),
              },
            ]}
          >
            <TextInput
              style={styles.translatorInput}
              placeholder="Escribe en español..."
              placeholderTextColor="#AFAFAF"
              value={translationInput}
              onChangeText={setTranslationInput}
              multiline
              onFocus={() => {
                Animated.timing(inputGlow, { toValue: 1, duration: 220, useNativeDriver: false }).start();
              }}
              onBlur={() => {
                Animated.timing(inputGlow, { toValue: 0, duration: 220, useNativeDriver: false }).start();
              }}
            />
          </Animated.View>
          <Animated.View style={{ transform: [{ scale: btnScale }] }}>
            <TouchableOpacity
              style={styles.translateButton}
              onPress={handleTranslate}
              disabled={isTranslating}
              onPressIn={() => Animated.timing(btnScale, { toValue: 0.97, duration: 80, useNativeDriver: true }).start()}
              onPressOut={() => Animated.timing(btnScale, { toValue: 1, duration: 80, useNativeDriver: true }).start()}
            >
              {isTranslating ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.translateButtonText}>Traducir</Text>
              )}
            </TouchableOpacity>
          </Animated.View>
        </View>
        {translatedText ? (
          <Animated.View
            style={[
              styles.resultBox,
              {
                transform: [{ translateY: resultAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
                opacity: resultAnim,
              },
            ]}
          >
            <View style={styles.resultHeader}>
              <Text style={styles.resultLabel}>Resultado:</Text>
              <TouchableOpacity
                style={styles.resultAction}
                onPress={() => playAudio(translatedText)}
              >
                <Ionicons name="volume-high" size={22} color="#1CB0F6" />
              </TouchableOpacity>
            </View>
            <View style={styles.controlsRow}>
              <TouchableOpacity style={styles.controlButton} onPress={stopSpeaking}>
                <Ionicons name="stop" size={18} color="#FFF" />
              </TouchableOpacity>
              {isWeb ? (
                webPaused ? (
                  <TouchableOpacity style={styles.controlButton} onPress={resumeSpeaking}>
                    <Ionicons name="play" size={18} color="#FFF" />
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity style={styles.controlButton} onPress={pauseSpeaking}>
                    <Ionicons name="pause" size={18} color="#FFF" />
                  </TouchableOpacity>
                )
              ) : null}
              <TouchableOpacity style={styles.controlButton} onPress={decRate}>
                <Text style={styles.controlText}>-</Text>
              </TouchableOpacity>
              <Text style={styles.rateText}>{speechRate.toFixed(2)}x</Text>
              <TouchableOpacity style={styles.controlButton} onPress={incRate}>
                <Text style={styles.controlText}>+</Text>
              </TouchableOpacity>
              {isWeb && webVoices.length ? (
                <TouchableOpacity style={styles.voiceButton} onPress={nextVoice}>
                  <Text style={styles.voiceText}>{selectedVoice || 'voz'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.resultText}>{translatedText}</Text>
          </Animated.View>
        ) : null}
      </View>

      <Animated.View
        style={[
          styles.searchContainer,
          {
            shadowColor: accent,
            shadowOpacity: searchGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 0.45] }),
            shadowRadius: searchGlow.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }),
            shadowOffset: { width: 0, height: 0 },
            borderColor: searchGlow.interpolate({ inputRange: [0, 1], outputRange: ['#333', accent] }),
          },
        ]}
      >
        <Ionicons name="search" size={20} color="#AFAFAF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en el diccionario..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#AFAFAF"
          onFocus={() => Animated.timing(searchGlow, { toValue: 1, duration: 200, useNativeDriver: false }).start()}
          onBlur={() => Animated.timing(searchGlow, { toValue: 0, duration: 200, useNativeDriver: false }).start()}
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#AFAFAF" />
          </TouchableOpacity>
        ) : null}
      </Animated.View>

      <View style={styles.chipsRow}>
        {CHIPS.map(chip => {
          const active = activeTag === chip.key;
          return (
            <TouchableOpacity
              key={chip.key}
              style={[styles.chip, active && { backgroundColor: '#1C2A34', borderColor: accent }]}
              onPress={() => setActiveTag(active ? null : chip.key)}
            >
              <MaterialCommunityIcons name={chip.icon as any} size={14} color={active ? accent : '#AFAFAF'} />
              <Text style={[styles.chipText, active && { color: '#FFF' }]}>{chip.key}</Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item, index) => `${item.maya}-${index}`}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color="#333" />
            <Text style={styles.emptyText}>No se encontraron resultados</Text>
          </View>
        }
      />

      <Modal visible={detailVisible} transparent animationType="fade" onRequestClose={() => setDetailVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            {detailEntry ? (
              <>
                {detailEntry.image_url ? (
                  <Image source={{ uri: detailEntry.image_url as any }} style={styles.modalImage} />
                ) : (
                  <View style={styles.modalImage} />
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.modalTitle}>{detailEntry.maya}</Text>
                  <TouchableOpacity onPress={() => playAudio(detailEntry.maya)}>
                    <Ionicons name="volume-high" size={22} color="#1CB0F6" />
                  </TouchableOpacity>
                </View>
                <Text style={styles.modalSubtitle}>{detailEntry.spanish}</Text>
                <Text style={styles.modalExample}>{(() => {
                  const cat = (detailEntry.category || '').toLowerCase();
                  if (cat.includes('animal')) return `Ejemplo: Hoy vi un ${detailEntry.spanish} en el bosque.`;
                  if (cat.includes('comida')) return `Ejemplo: Me gusta la ${detailEntry.spanish}.`;
                  if (cat.includes('frase')) return `Ejemplo: Dijo: "${detailEntry.spanish}".`;
                  if (cat.includes('verbo')) return `Ejemplo: Quiero ${detailEntry.spanish} mañana.`;
                  return `Ejemplo: Aprendo ${detailEntry.spanish}.`;
                })()}</Text>
                <View style={{ marginTop: 12, alignItems: 'flex-end' }}>
                  <TouchableOpacity onPress={() => setDetailVisible(false)} style={[styles.controlButton, { backgroundColor: '#1CB0F6', borderColor: '#1CB0F6' }]}>
                    <Text style={{ color: '#000', fontWeight: '700' }}>Cerrar</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>
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
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFF',
    marginBottom: 8,
  },
  translatorContainer: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#333',
  },
  translatorBox: {
    flexDirection: 'row',
    gap: 8,
  },
  translatorInputWrap: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  translatorInput: {
    backgroundColor: '#1C1C1E',
    borderRadius: 16,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
  },
  translateButton: {
    backgroundColor: '#58CC02',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  translateButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 12,
    backgroundColor: '#0F1F2A',
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1CB0F6',
  },
  resultHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  resultLabel: {
    fontSize: 12,
    color: '#AFAFAF',
    marginBottom: 4,
  },
  resultAction: {
    padding: 4,
  },
  resultText: {
    fontSize: 18,
    color: '#58CC02',
    fontWeight: 'bold',
  },
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 8,
    marginBottom: 8,
  },
  controlButton: {
    backgroundColor: '#2C2C2E',
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  controlText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  rateText: {
    color: '#AFAFAF',
    fontSize: 12,
  },
  voiceButton: {
    backgroundColor: '#1CB0F6',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  voiceText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1C1C1E',
    margin: 16,
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#FFF',
  },
  chipsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    marginTop: -8,
    marginBottom: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#1C1C1E',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  chipText: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  entryCard: {
    backgroundColor: '#1C1C1E',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
  },
  entryContent: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'space-between',
  },
  favButton: {
    padding: 4,
  },
  mayaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#58CC02',
    marginBottom: 4,
  },
  spanishText: {
    fontSize: 16,
    color: '#FFF',
  },
  rightContent: {
    alignItems: 'flex-end',
    gap: 8,
  },
  categoryBadge: {
    backgroundColor: '#333',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#58CC02',
  },
  audioButton: {
    padding: 4,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalCard: {
    width: '100%',
    maxWidth: 520,
    backgroundColor: '#0F1F2A',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#1CB0F6',
    padding: 16,
  },
  modalImage: {
    width: '100%',
    height: 180,
    borderRadius: 12,
    backgroundColor: '#1C1C1E',
    marginBottom: 12,
  },
  modalTitle: {
    color: '#58CC02',
    fontSize: 22,
    fontWeight: '800',
  },
  modalSubtitle: {
    color: '#FFF',
    fontSize: 16,
    marginBottom: 8,
  },
  modalExample: {
    color: '#AFAFAF',
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 64,
  },
  emptyText: {
    fontSize: 16,
    color: '#AFAFAF',
    marginTop: 16,
  },
});
