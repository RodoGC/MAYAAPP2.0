import React from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';

interface TipsModalProps {
    visible: boolean;
    onClose: () => void;
    tips: {
        title: string;
        grammar: string[];
        pronunciation?: string[];
        vocabulary: string[];
    } | null;
}

export default function TipsModal({ visible, onClose, tips }: TipsModalProps) {
    if (!tips) return null;
    const lang = process.env.EXPO_PUBLIC_TIPS_SPEECH_LANG || 'es-MX';
    const speakAll = () => {
        const parts: string[] = [];
        parts.push(`Consejos: ${tips!.title}`);
        if (tips!.grammar && tips!.grammar.length) parts.push('Gramática: ' + tips!.grammar.join('. '));
        if (tips!.pronunciation && tips!.pronunciation.length) parts.push('Pronunciación: ' + tips!.pronunciation.join('. '));
        if (tips!.vocabulary && tips!.vocabulary.length) parts.push('Vocabulario: ' + tips!.vocabulary.join(', '));
        Speech.speak(parts.join('. '), { language: lang });
    };

    const handleClose = () => {
        try {
            Speech.stop();
        } catch {}
        onClose();
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={handleClose}
        >
            <View style={styles.centeredView}>
                <View style={styles.modalView}>
                    <View style={styles.header}>
                        <View style={styles.headerLeftRow}>
                            <TouchableOpacity onPress={speakAll} style={styles.speakAllButton}>
                                <Ionicons name="volume-high" size={22} color="#1CB0F6" />
                            </TouchableOpacity>
                            <Text style={styles.modalTitle}>{tips.title}</Text>
                        </View>
                        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
                            <Ionicons name="close" size={24} color="#AFAFAF" />
                        </TouchableOpacity>
                    </View>

                    <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="book" size={20} color="#58CC02" />
                                <Text style={styles.sectionTitle}>Gramática</Text>
                            </View>
                            {tips.grammar.map((rule, index) => (
                                <View key={index} style={styles.card}>
                                    <Text style={styles.text}>{rule}</Text>
                                </View>
                            ))}
                        </View>

                        {tips.pronunciation && tips.pronunciation.length > 0 && (
                            <View style={styles.section}>
                                <View style={styles.sectionHeader}>
                                    <TouchableOpacity onPress={() => Speech.speak(tips.pronunciation!.join('. '), { language: lang })}>
                                        <Ionicons name="mic" size={20} color="#1CB0F6" />
                                    </TouchableOpacity>
                                    <Text style={styles.sectionTitle}>Pronunciación</Text>
                                </View>
                                {tips.pronunciation.map((rule, index) => (
                                    <View key={index} style={styles.card}>
                                        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Text style={styles.text}>{rule}</Text>
                                            <TouchableOpacity onPress={() => Speech.speak(rule, { language: lang })} style={{ paddingLeft: 12 }}>
                                                <Ionicons name="volume-high" size={20} color="#FFF" />
                                            </TouchableOpacity>
                                        </View>
                                    </View>
                                ))}
                            </View>
                        )}

                        <View style={styles.section}>
                            <View style={styles.sectionHeader}>
                                <Ionicons name="list" size={20} color="#FF9600" />
                                <Text style={styles.sectionTitle}>Vocabulario</Text>
                            </View>
                            {tips.vocabulary.map((word, index) => (
                                <View key={index} style={styles.card}>
                                    <Text style={styles.text}>{word}</Text>
                                </View>
                            ))}
                        </View>
                    </ScrollView>

                    <View style={styles.footer}>
                        <TouchableOpacity style={styles.button} onPress={handleClose}>
                            <Text style={styles.buttonText}>Entendido</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    centeredView: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
    },
    modalView: {
        backgroundColor: '#1C1C1E',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: '85%',
        width: '100%',
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 4,
        elevation: 5,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 20,
        borderBottomWidth: 1,
        borderBottomColor: '#333',
    },
    headerLeftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    closeButton: {
        padding: 4,
    },
    speakAllButton: {
        padding: 4,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FFF',
    },
    card: {
        backgroundColor: '#2C2C2E',
        padding: 16,
        borderRadius: 12,
        marginBottom: 8,
    },
    text: {
        fontSize: 16,
        color: '#E5E5E5',
        lineHeight: 24,
    },
    footer: {
        padding: 20,
        borderTopWidth: 1,
        borderTopColor: '#333',
        backgroundColor: '#1C1C1E',
    },
    button: {
        backgroundColor: '#58CC02',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center',
    },
    buttonText: {
        color: 'white',
        fontWeight: 'bold',
        fontSize: 16,
    },
});
