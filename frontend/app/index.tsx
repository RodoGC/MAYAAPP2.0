import { View, Text, StyleSheet, TouchableOpacity, Image, Animated } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, Redirect } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useState, useRef } from 'react';
 

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const BG_URL = process.env.EXPO_PUBLIC_LANDING_BG_URL;
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const [showIntro, setShowIntro] = useState(true);
  const introOpacity = useRef(new Animated.Value(1)).current;
  const localBg: any = (() => {
    try {
      return require('../assets/images/fondo.png');
    } catch {
      try {
        return require('../assets/images/app-image.png');
      } catch {
        return null;
      }
    }
  })();

  // Navegación inmediata cuando el usuario ya está autenticado

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('landing_bg_dataurl');
      if (saved) setBgDataUrl(saved);
    }
  }, []);

  useEffect(() => {
    if (showIntro) {
      const t = setTimeout(() => {
        Animated.timing(introOpacity, { toValue: 0, duration: 500, useNativeDriver: true }).start(() => {
          setShowIntro(false);
        });
      }, 7000);
      return () => clearTimeout(t);
    }
  }, [showIntro, introOpacity]);

 

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  if (!loading && user) {
    return <Redirect href="/(tabs)" />;
  }

  const bgSource: any =
    localBg ? localBg : (BG_URL ? { uri: BG_URL as string } : (bgDataUrl ? { uri: bgDataUrl as string } : undefined));

  return (
    <View style={styles.container}>
      {bgSource ? (
        <>
          <Image source={bgSource} style={styles.bgImage} resizeMode="cover" />
          <LinearGradient colors={["rgba(0,0,0,0.20)", "rgba(0,0,0,0.60)"]} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} style={styles.bgOverlay} />
        </>
      ) : null}
      {showIntro && (
        <Animated.View style={[styles.introOverlay, { opacity: introOpacity }]}>
          <View style={styles.introContent}>
            <Text style={styles.introTitle}>MayaApp</Text>
            <Text style={styles.introSubtitle}>Aprende el idioma Maya de forma divertida y efectiva</Text>
          </View>
        </Animated.View>
      )}
      <View style={styles.page}>
        <View style={styles.cardContent}>
          <Text style={styles.titleCard}>MayaApp</Text>
          <Text style={styles.subtitleCard}>Aprende el idioma Maya de forma divertida y efectiva</Text>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity style={styles.primaryButton} onPress={() => router.push('/signup')}>
            <Text style={styles.primaryButtonText}>Comenzar</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.secondaryButton} onPress={() => router.push('/login')}>
            <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    position: 'relative',
  },
  fullBg: {
    flex: 1,
    justifyContent: 'space-between',
    padding: 0,
    backgroundColor: '#000',
  },
  page: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  
  imageCardImage: {
    borderRadius: 24,
  },
  bgImage: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
    zIndex: 0,
    pointerEvents: 'none',
  },
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 0,
    pointerEvents: 'none',
  },
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#0f3f35',
    zIndex: 5,
    justifyContent: 'center',
    alignItems: 'center',
  },
  introContent: {
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  introTitle: {
    fontSize: 64,
    fontWeight: '800',
    color: '#58CC02',
    marginBottom: 12,
    textAlign: 'center',
  },
  introSubtitle: {
    fontSize: 20,
    color: '#FFFFFF',
    opacity: 0.95,
    textAlign: 'center',
  },
  cardContent: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 24,
    alignItems: 'center',
    zIndex: 2,
  },
  titleCard: {
    fontSize: 64,
    fontWeight: '800',
    color: '#58CC02',
    marginBottom: 8,
  },
  subtitleCard: {
    fontSize: 22,
    color: '#FFF',
    opacity: 0.95,
  },
  
  fullBgImage: {
    opacity: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#000000',
  },
  loadingText: {
    color: '#FFF',
    fontSize: 18,
  },
  header: {
    alignItems: 'center',
    marginTop: 24,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  title: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#FFF',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#FFF',
    opacity: 0.9,
  },
 
  buttonContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    bottom: 96,
    zIndex: 3,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#58CC02',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 8,
  },
  primaryButtonText: {
    color: '#FFF',
    fontSize: 18,
    fontWeight: 'bold',
  },
  secondaryButton: {
    backgroundColor: '#000',
    padding: 18,
    borderRadius: 16,
    alignItems: 'center',
    width: '100%',
    borderWidth: 2,
    borderColor: '#1CB0F6',
  },
  secondaryButtonText: {
    color: '#1CB0F6',
    fontSize: 18,
    fontWeight: 'bold',
  },
});
