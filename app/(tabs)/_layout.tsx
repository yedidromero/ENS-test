// app/(tabs)/_layout.tsx
import { Tabs } from 'expo-router';
import React from 'react';
import { Platform } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Circle, Path } from 'react-native-svg';

// Vibración al tocar tabs (si ya lo tienes, lo mantenemos)
import { HapticTab } from '@/components/HapticTab';

/** Icono SVG para "User" estilo círculo + silueta (sin depender de fuentes) */
function UserCircleIcon({ color = '#000', size = 30 }: { color?: string; size?: number }) {
  const s = size;
  const stroke = 2;
  return (
    <Svg width={s} height={s} viewBox="0 0 24 24">
      {/* círculo exterior */}
      <Circle cx="12" cy="12" r={11 - stroke / 2} stroke={color} strokeWidth={stroke} fill="none" />
      {/* cabeza */}
      <Circle cx="12" cy="9" r="3" fill={color} />
      {/* hombros */}
      <Path
        d="M6.2 18c1.9-2.3 4.3-3.5 5.8-3.5s3.9 1.2 5.8 3.5"
        stroke={color}
        strokeWidth={stroke}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,        // solo iconos (como tu mock)
        tabBarButton: HapticTab,
        tabBarActiveTintColor: '#000', // iconos negros
        tabBarInactiveTintColor: '#000',
        tabBarStyle: Platform.select({
          ios: {
            position: 'absolute',
            backgroundColor: '#ff8a2b', // naranja
            borderTopWidth: 0,
            height: 56,
          },
          default: {
            backgroundColor: '#ff8a2b',
            borderTopWidth: 0,
            height: 56,
          },
        }),
        tabBarItemStyle: { paddingVertical: 4 },
      }}
    >
      {/* 1) HOME (círculo) */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused, size = 30 }) => (
            <MaterialCommunityIcons
              name={focused ? 'home-circle' : 'home-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 2) SEARCH (círculo) */}
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Search',
          tabBarIcon: ({ color, focused, size = 30 }) => (
            <Ionicons
              name={focused ? 'search-circle' : 'search-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 3) ADD (círculo con +) */}
      <Tabs.Screen
        name="add"
        options={{
          title: 'Add',
          tabBarIcon: ({ color, focused, size = 30 }) => (
            <Ionicons
              name={focused ? 'add-circle' : 'add-circle-outline'}
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 4) MOVIES (cámara vintage) */}
      <Tabs.Screen
        name="todos" // si tu ruta es "movies", cambia este name a "movies"
        options={{
          title: 'Movies',
          tabBarIcon: ({ color, /* focused, */ size = 30 }) => (
            <MaterialCommunityIcons
              name="video-vintage" // alternativas: 'movie-roll', 'movie-open-outline'
              size={size}
              color={color}
            />
          ),
        }}
      />

      {/* 5) PROFILE (SVG propio para evitar fallos de fuentes) */}
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size = 30 }) => <UserCircleIcon color={color as string} size={size} />,
        }}
      />
    </Tabs>
  );
}
