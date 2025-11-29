import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Modal,
    ActivityIndicator,
    Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../utils/api';
import { useAuth } from '../contexts/AuthContext';

interface HeartsGameProps {
    visible: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

const QUESTIONS = [
    { q: '¿Cómo se dice "Hola"?', options: ["Ba'ax ka wa'alik", "Nib óolal", "Xen"], a: "Ba'ax ka wa'alik" },
    { q: '¿Qué significa "Nib óolal"?', options: ["Adiós", "Gracias", "Por favor"], a: "Gracias" },
    { q: '¿Cómo se dice "Uno"?', options: ["Ka'", "Jum", "Óox"], a: "Jum" },
    { q: '¿Qué color es "Chak"?', options: ["Azul", "Rojo", "Verde"], a: "Rojo" },
    { q: '¿Qué significa "Maama"?', options: ["Padre", "Madre", "Abuela"], a: "Madre" },
];

export default function HeartsGame({ visible, onClose, onSuccess }: HeartsGameProps) {
    const { refreshUser } = useAuth();
    const [loading, setLoading] = useState(false);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [score, setScore] = useState(0);
    const [gameOver, setGameOver] = useState(false);

    // Pick random question on open
    React.useEffect(() => {
        if (visible) {
            setCurrentQuestion(Math.floor(Math.random() * QUESTIONS.length));
            setScore(0);
            setGameOver(false);
        }
    }, [visible]);

    const handleAnswer = async (selected: string) => {
        if (selected === QUESTIONS[currentQuestion].a) {
            setLoading(true);
            try {
                const response = await api.post('/api/user/gain-life');
                if (response.data.success) {
                    await refreshUser();
                    Alert.alert('¡Correcto!', 'Has recuperado 1 vida ❤️');
                    onSuccess();
                } else {
                    Alert.alert('¡Correcto!', response.data.message || 'Vidas llenas');
                }
            } catch (error) {
                console.error(error);
                Alert.alert('Error', 'No se pudo conectar con el servidor');
            } finally {
                setLoading(false);
                onClose();
            }
        } else {
            Alert.alert('Incorrecto', 'Inténtalo de nuevo la próxima vez');
            onClose();
        }
    };

    const q = QUESTIONS[currentQuestion];

    return (
        <Modal visible={visible} transparent animationType="slide">
            <View style={styles.container}>
                <View style={styles.card}>
                    <View style={styles.header}>
                        <Text style={styles.title}>Recuperar Vida</Text>
                        <TouchableOpacity onPress={onClose}>
                            <Ionicons name="close" size={24} color="#FFF" />
                        </TouchableOpacity>
                    </View>

                    <Text style={styles.subtitle}>Responde correctamente para ganar un corazón:</Text>

                    <View style={styles.questionContainer}>
                        <Text style={styles.question}>{q.q}</Text>
                    </View>

                    <View style={styles.options}>
                        {q.options.map((opt) => (
                            <TouchableOpacity
                                key={opt}
                                style={styles.optionButton}
                                onPress={() => handleAnswer(opt)}
                                disabled={loading}
                            >
                                <Text style={styles.optionText}>{opt}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>

                    {loading && <ActivityIndicator size="large" color="#58CC02" style={{ marginTop: 20 }} />}
                </View>
            </View>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.8)',
        justifyContent: 'center',
        padding: 20,
    },
    card: {
        backgroundColor: '#1C1C1E',
        borderRadius: 20,
        padding: 20,
        borderWidth: 1,
        borderColor: '#333',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 20,
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FF4B4B',
    },
    subtitle: {
        color: '#AFAFAF',
        marginBottom: 20,
        textAlign: 'center',
    },
    questionContainer: {
        backgroundColor: '#333',
        padding: 20,
        borderRadius: 12,
        marginBottom: 20,
    },
    question: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        textAlign: 'center',
    },
    options: {
        gap: 12,
    },
    optionButton: {
        backgroundColor: '#58CC02',
        padding: 16,
        borderRadius: 12,
        alignItems: 'center',
    },
    optionText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
