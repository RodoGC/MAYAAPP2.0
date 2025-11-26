import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import api from '../../utils/api';
import { DictionaryEntry } from '../../types';

export default function DictionaryScreen() {
  const [entries, setEntries] = useState<DictionaryEntry[]>([]);
  const [filteredEntries, setFilteredEntries] = useState<DictionaryEntry[]>([]);
  const [searchText, setSearchText] = useState('');

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

  const renderEntry = ({ item }: { item: DictionaryEntry }) => (
    <View style={styles.entryCard}>
      <View style={styles.entryContent}>
        <Text style={styles.mayaText}>{item.maya}</Text>
        <Text style={styles.spanishText}>{item.spanish}</Text>
      </View>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{item.category}</Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Diccionario Maya</Text>
      </View>

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Buscar en Maya o Español..."
          value={searchText}
          onChangeText={setSearchText}
          placeholderTextColor="#AFAFAF"
        />
        {searchText ? (
          <TouchableOpacity onPress={() => setSearchText('')}>
            <Ionicons name="close-circle" size={20} color="#777" />
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
            <Ionicons name="search" size={64} color="#AFAFAF" />
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: 16,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#000',
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  entryCard: {
    backgroundColor: '#FFF',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  entryContent: {
    flex: 1,
  },
  mayaText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1CB0F6',
    marginBottom: 4,
  },
  spanishText: {
    fontSize: 16,
    color: '#000',
  },
  categoryBadge: {
    backgroundColor: '#E7F5FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1CB0F6',
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
