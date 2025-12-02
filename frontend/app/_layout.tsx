import React, { useEffect } from 'react';
import { Stack } from 'expo-router';
import { AuthProvider } from '../contexts/AuthContext';
import { StatusBar } from 'expo-status-bar';
import { Platform } from 'react-native';

// Root layout component
export default function RootLayout() {
  useEffect(() => {
    if (Platform.OS === 'web' && typeof document !== 'undefined') {
      try {
        const html = document.documentElement;
        const body = document.body;
        html.style.overflow = 'hidden';
        body.style.overflow = 'hidden';
      } catch {}
    }
  }, []);
  return (
    <AuthProvider>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="lesson/[id]" />
      </Stack>
    </AuthProvider>
  );
}
