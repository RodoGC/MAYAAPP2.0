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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { DictionaryEntry } from '../../types';
import axios from 'axios';
import { Audio } from 'expo-av';
import { Buffer } from 'buffer';

// API Key constant (to be filled by user)
const MS_TRANSLATOR_KEY = '';
const MS_TRANSLATOR_REGION = 'centralus';
const MS_TRANSLATOR_ENDPOINT = 'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=yua&from=es';

export default function DictionaryScreen() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DictionaryEntry[]>([]);
  const [searchText, setSearchText] = useState('');

  // Translator State
  const [translationInput, setTranslationInput] = useState('');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);

  useEffect(() => {
    loadDictionary();
  }, []);

  useEffect(() => {
    if (searchText) {
      const filtered = entries.filter(
        (entry) =>
          entry.maya.toLowerCase().includes(searchText.toLowerCase()) ||
          entry.spanish.toLowerCase().includes(searchText.toLowerCase())
      );
      setFilteredEntries(filtered);
    } else {
      setFilteredEntries(entries);
    }
  }, [searchText, entries]);

  const loadDictionary = async () => {
    try {
      const response = await api.get('/api/dictionary');
      setEntries(response.data);
      setFilteredEntries(response.data);
    } catch (error) {
      console.error('Error loading dictionary:', error);
    }
  };

  const handleTranslate = async () => {
    if (!translationInput.trim()) return;

    if (!MS_TRANSLATOR_KEY) {
      Alert.alert('Error', 'Falta la API Key de Microsoft Translator');
      return;
    }

    setIsTranslating(true);
    try {
      const response = await axios.post(
        MS_TRANSLATOR_ENDPOINT,
        [{ Text: translationInput }],
        {
          headers: {
            'Ocp-Apim-Subscription-Key': MS_TRANSLATOR_KEY,
            'Ocp-Apim-Subscription-Region': MS_TRANSLATOR_REGION,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data && response.data[0] && response.data[0].translations) {
        setTranslatedText(response.data[0].translations[0].text);
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

    if (!MS_TRANSLATOR_KEY) {
      Alert.alert('Error', 'Falta la API Key de Microsoft Translator');
      return;
    }

    try {
      // Call our backend proxy instead of Microsoft directly
      // This avoids CORS issues on web/localhost
      const response = await api.post('/api/speak', {
        text: text,
        api_key: MS_TRANSLATOR_KEY,
        region: MS_TRANSLATOR_REGION
      }, {
        responseType: 'arraybuffer' // We expect binary audio data
      });

      // Convert binary to base64 for Expo AV
      const audioData = Buffer.from(response.data, 'binary').toString('base64');
      const uri = `data:audio/mp3;base64,${audioData}`;

      const { sound } = await Audio.Sound.createAsync({ uri });
      await sound.playAsync();

    } catch (error) {
      console.error('Error playing audio:', error);
      Alert.alert('Error', 'No se pudo reproducir el audio.');
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
            <Text style={styles.resultLabel}>Resultado:</Text>
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
  resultLabel: {
    fontSize: 12,
    color: '#AFAFAF',
    marginBottom: 4,
  },
  resultText: {
    fontSize: 18,
    color: '#58CC02',
    fontWeight: 'bold',
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
