import React, { useEffect, useState } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { DictionaryEntry } from '../../types';
import axios from 'axios';
import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import { Buffer } from 'buffer';
import { useFocusEffect } from '@react-navigation/native';

const MS_TRANSLATOR_ENDPOINT = '/api/translate';

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
    if (searchText) {
      const filtered = entries
        .filter(
          (entry) =>
            entry.maya.toLowerCase().includes(searchText.toLowerCase()) ||
            entry.spanish.toLowerCase().includes(searchText.toLowerCase())
        )
        .sort((a, b) => a.maya.localeCompare(b.maya));
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(entries);
    }
  }, [searchText, entries]);

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

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;

    setIsTranslating(true);
    try {
      const response = await api.post(MS_TRANSLATOR_ENDPOINT, { text: translationInput, from_lang: 'es', to_lang: 'yua' });
      if (response.data && response.data.text) {
        setTranslatedText(response.data.text);
      } else {
        Alert.alert('Error', 'No se pudo obtener la traducción');
      }
    } catch (error) {
      console.error('Translation error:', error);
      Alert.alert('Error', 'No se pudo traducir el texto');
    } finally {
      setIsTranslating(false);
    }
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

  const renderEntry = ({ item }: { item: DictionaryEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryContent}>
        <Text style={styles.mayaText}>{item.maya}</Text>
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
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diccionario Maya</Text>
      </View>

      <View style={styles.translatorContainer}>
        <Text style={styles.sectionTitle}>Traductor en tiempo real (Español - Maya)</Text>
        <View style={styles.translatorBox}>
          <TextInput
            style={styles.translatorInput}
            placeholder="Escribe en español..."
            placeholderTextColor="#AFAFAF"
            value={translationInput}
            onChangeText={setTranslationInput}
            multiline
          />
          <TouchableOpacity
            style={styles.translateButton}
            onPress={handleTranslate}
            disabled={isTranslating}
          >
            {isTranslating ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.translateButtonText}>Traducir</Text>
            )}
          </TouchableOpacity>
        </View>
        {translatedText ? (
          <View style={styles.resultBox}>
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
              {Platform.OS === 'web' ? (
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
              {Platform.OS === 'web' && webVoices.length ? (
                <TouchableOpacity style={styles.voiceButton} onPress={nextVoice}>
                  <Text style={styles.voiceText}>{selectedVoice || 'voz'}</Text>
                </TouchableOpacity>
              ) : null}
            </View>
            <Text style={styles.resultText}>{translatedText}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#AFAFAF" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en el diccionario..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#AFAFAF"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#AFAFAF" />
          </TouchableOpacity>
        ) : null}
      </View>

      <FlatList
        data={filteredEntries}
        renderItem={renderEntry}
        keyExtractor={(item, index) => `${item.maya}-${index}`}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={64} color="#333" />
            <Text style={styles.emptyText}>No se encontraron resultados</Text>
          </View>
        }
      />
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
  translatorInput: {
    flex: 1,
    backgroundColor: '#1C1C1E',
    borderRadius: 12,
    padding: 12,
    color: '#FFF',
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  translateButton: {
    backgroundColor: '#58CC02',
    borderRadius: 12,
    paddingHorizontal: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  translateButtonText: {
    color: '#FFF',
    fontWeight: 'bold',
  },
  resultBox: {
    marginTop: 12,
    backgroundColor: '#1C1C1E',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#333',
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
    borderRadius: 12,
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
