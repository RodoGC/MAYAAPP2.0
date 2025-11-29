import { View, Text, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useAuth } from '../contexts/AuthContext';
import React, { useEffect, useState } from 'react';
 

export default function Index() {
  const router = useRouter();
  const { user, loading } = useAuth();
  const BG_URL = process.env.EXPO_PUBLIC_LANDING_BG_URL;
  const [bgDataUrl, setBgDataUrl] = useState<string | null>(null);
  const localBg: any = (() => {
    try {
      return require('../assets/images/landing-bg.png');
    } catch {
      try {
        return require('../assets/landing-bg.jpg');
      } catch {
        return null;
      }
    }
  })();

  useEffect(() => {
    if (!loading && user) {
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = window.localStorage.getItem('landing_bg_dataurl');
      if (saved) setBgDataUrl(saved);
    }
  }, []);

 

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Cargando...</Text>
      </View>
    );
  }

  const bgSource: any =
    localBg ? localBg : (BG_URL ? { uri: BG_URL as string } : (bgDataUrl ? { uri: bgDataUrl as string } : undefined));

  return (
    <LinearGradient colors={["#0b2e27", "#0f3f35", "#13463a"]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }} style={styles.gradientBg}>
      <View style={styles.page}>
        <View style={styles.imageCard}>
          {bgSource ? (
            <Image source={bgSource} style={styles.bgImage} resizeMode="contain" />
          ) : null}
          <View style={styles.cardOverlay} />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.45)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={styles.fadeBottom}
          />
          <View style={styles.cardContent}>
            <Text style={styles.titleCard}>MayaApp</Text>
            <Text style={styles.subtitleCard}>Aprende el idioma Maya de forma divertida y efectiva</Text>
          </View>
        </View>
        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={styles.primaryButton}
            onPress={() => router.push('/signup')}
          >
            <Text style={styles.primaryButtonText}>Comenzar</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={() => router.push('/login')}
          >
            <Text style={styles.secondaryButtonText}>Ya tengo cuenta</Text>
          </TouchableOpacity>
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
    justifyContent: 'space-between',
    padding: 24,
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
  imageCard: {
    alignSelf: 'center',
    width: '90%',
    maxWidth: 768,
    aspectRatio: 1,
    borderRadius: 24,
    overflow: 'hidden',
    backgroundColor: '#000',
    marginTop: 16,
  },
  imageCardImage: {
    borderRadius: 24,
  },
  bgImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    pointerEvents: 'none',
  },
  cardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.25)',
    pointerEvents: 'none',
  },
  fadeBottom: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: '35%',
    zIndex: 1,
    pointerEvents: 'none',
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
    color: '#FFF',
    marginBottom: 8,
  },
  subtitleCard: {
    fontSize: 22,
    color: '#FFF',
    opacity: 0.95,
  },
  gradientBg: {
    flex: 1,
    backgroundColor: '#000',
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
  bgOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.35)',
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
    gap: 16,
    alignSelf: 'center',
    width: '90%',
    maxWidth: 768,
    marginTop: 16,
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