// app/(tabs)/add.tsx
import React, { useEffect, useMemo, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  Alert,
  TextInput,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppKitButton } from '@reown/appkit-wagmi-react-native';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';

type Status = 'watching' | 'completed';
type HistoryItem = {
  id: string;
  title: string;
  poster?: any;         // require('...') para assets locales
  posterUri?: string;   // o URL remota
  progress: number;     // 0..100
  status: Status;
  updatedAt: number;    // Date.now()
};

const STORAGE_KEY = 'history:items';

/* ===== Header con logo y acciones ===== */
function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/* ===== Chips de filtro ===== */
function FilterChip({
  label,
  active,
  onPress,
  count,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  count?: number;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[
        styles.chip,
        active ? styles.chipActive : styles.chipInactive,
      ]}
    >
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}{typeof count === 'number' ? ` (${count})` : ''}
      </Text>
    </TouchableOpacity>
  );
}

/* ===== Barra de progreso ===== */
function Progress({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <View style={styles.progressBar}>
      <View style={[styles.progressFill, { width: `${v}%` }]} />
    </View>
  );
}

/* ===== Tarjeta del historial ===== */
function HistoryCard({
  item,
  onToggleStatus,
  onRemove,
  onResume,
}: {
  item: HistoryItem;
  onToggleStatus: () => void;
  onRemove: () => void;
  onResume: () => void;
}) {
  const badgeLabel = item.status === 'watching' ? 'Watching' : 'Completed';
  const badgeStyle = item.status === 'watching' ? styles.badgeWatching : styles.badgeCompleted;

  return (
    <View style={styles.cardItem}>
      <View style={styles.posterWrap}>
        {!!item.poster && (
          <Image source={item.poster} style={styles.poster} resizeMode="cover" />
        )}
        {!!item.posterUri && !item.poster && (
          <Image source={{ uri: item.posterUri }} style={styles.poster} resizeMode="cover" />
        )}
        {!item.poster && !item.posterUri && (
          <View style={[styles.poster, styles.posterFallback]}>
            <MaterialCommunityIcons name="clapperboard" size={36} color="#eee" />
          </View>
        )}

        {/* Cinta film arriba */}
        <View style={styles.filmHolesRow}>
          {Array.from({ length: 12 }).map((_, i) => <View key={i} style={styles.filmHole} />)}
        </View>

        {/* Overlay degradado para legibilidad */}
        <View style={styles.posterGradient} />

        {/* Título sobre la imagen */}
        <Text numberOfLines={1} style={styles.posterTitle}>{item.title}</Text>

        {/* Badge estado */}
        <View style={[styles.badge, badgeStyle]}>
          <Text style={styles.badgeText}>{badgeLabel}</Text>
        </View>

        {/* Progreso al fondo */}
        <View style={styles.posterProgress}>
          <Progress value={item.progress} />
          <Text style={styles.progressTiny}>{item.progress}%</Text>
        </View>
      </View>

      {/* Acciones */}
      <View style={styles.actionsRow}>
        <TouchableOpacity onPress={onResume} style={[styles.actionBtn, styles.actionPrimary]}>
          <Ionicons name="play" size={16} color="#000" />
          <Text style={styles.actionPrimaryText}>Resume</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onToggleStatus} style={[styles.actionBtn, styles.actionGhost]}>
          <Ionicons name={item.status === 'watching' ? 'checkmark-done' : 'refresh'} size={16} color="#ffd36b" />
          <Text style={styles.actionGhostText}>
            {item.status === 'watching' ? 'Mark completed' : 'Mark watching'}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={onRemove} style={[styles.iconBtn]}>
          <Ionicons name="trash" size={18} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function AddScreen() {
  // ===== Estado de wallet (mismo patrón que profile.tsx) =====
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const isReadyConnected = useMemo(
    () => Boolean(isConnected && address && walletClient),
    [isConnected, address, walletClient]
  );

  const shortAddr = (addr?: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

  // ===== Historial (con persistencia) =====
  const [items, setItems] = useState<HistoryItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'watching' | 'completed'>('all');
  const [query, setQuery] = useState('');

  // Carga inicial (si no existe, sembramos demo)
  useEffect(() => {
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw) {
          setItems(JSON.parse(raw));
        } else {
          const demo: HistoryItem[] = [
            {
              id: '1',
              title: 'DanDaDan',
              poster: require('@/assets/images/DanDaDan.jpg'),
              progress: 62,
              status: 'watching',
              updatedAt: Date.now(),
            },
            {
              id: '2',
              title: 'History of Mangas',
              poster: require('@/assets/images/history.png'),
              progress: 100,
              status: 'completed',
              updatedAt: Date.now() - 86400_000,
            },
            {
              id: '3',
              title: 'Top Manga Picks',
              poster: require('@/assets/images/manga.png'),
              progress: 35,
              status: 'watching',
              updatedAt: Date.now() - 3600_000,
            },
            {
              id: '4',
              title: 'Coming Hero 1',
              poster: require('@/assets/images/coming1.png'),
              progress: 100,
              status: 'completed',
              updatedAt: Date.now() - 2 * 86400_000,
            },
          ];
          setItems(demo);
          await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(demo));
        }
      } catch (e) {
        console.log('Error loading history', e);
      }
    })();
  }, []);

  const save = async (next: HistoryItem[]) => {
    setItems(next);
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {}
  };

  const toggleStatus = (id: string) => {
    const next = items.map(it =>
      it.id === id
        ? { ...it, status: it.status === 'watching' ? 'completed' : 'watching', updatedAt: Date.now() }
        : it
    );
    save(next);
  };

  const removeItem = (id: string) => {
    Alert.alert('Eliminar', '¿Quitar este elemento del historial?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => save(items.filter(it => it.id !== id)) },
    ]);
  };

  const clearAll = () => {
    Alert.alert('Limpiar historial', '¿Borrar todo el historial?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Borrar todo', style: 'destructive', onPress: () => save([]) },
    ]);
  };

  const resumeItem = (id: string) => {
    const it = items.find(x => x.id === id);
    Alert.alert('Resume', it ? `Reanudando: ${it.title}` : 'Reanudando…');
  };

  // Filtros/búsqueda
  const watchingCount = items.filter(x => x.status === 'watching').length;
  const completedCount = items.filter(x => x.status === 'completed').length;

  const filtered = items
    .filter(x => (filter === 'all' ? true : x.status === filter))
    .filter(x => x.title.toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => b.updatedAt - a.updatedAt);

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground
        source={require('@/assets/images/fondo.png')}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        {/* Header con logo; a la derecha address y disconnect si hay conexión */}
        <AppHeader
          right={
            isReadyConnected ? (
              <>
                <Text style={styles.addressTiny}>{shortAddr(address!)}</Text>
                <TouchableOpacity onPress={() => disconnect()} style={styles.logoutBtn}>
                  <Text style={styles.logoutLabel}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : null
          }
        />

        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
            {!isReadyConnected ? (
              <View style={styles.cardLogin}>
                <Text style={styles.loginTitle}>Log in / Sign up</Text>
                <AppKitButton label="Connect Wallet" />
                <Text style={styles.note}>Conecta tu wallet para ver tu historial.</Text>
              </View>
            ) : (
              <>
                {/* Título sección */}
                <Text style={styles.sectionTitle}>History</Text>

                {/* Fila superior: buscador + limpiar */}
                <View style={styles.topControls}>
                  <View style={styles.searchWrap}>
                    <Ionicons name="search" size={16} color="#ffd36b" />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search your history…"
                      placeholderTextColor="#f7d9a6"
                      style={styles.searchInput}
                      autoCorrect={false}
                    />
                  </View>
                  <TouchableOpacity onPress={clearAll} style={styles.clearAllBtn}>
                    <Ionicons name="trash" size={16} color="#000" />
                    <Text style={styles.clearAllText}>Clean</Text>
                  </TouchableOpacity>
                </View>

                {/* Chips de filtro */}
                <View style={styles.filtersRow}>
                  <FilterChip label="All" active={filter === 'all'} onPress={() => setFilter('all')} count={items.length} />
                  <FilterChip label="Watching" active={filter === 'watching'} onPress={() => setFilter('watching')} count={watchingCount} />
                  <FilterChip label="Completed" active={filter === 'completed'} onPress={() => setFilter('completed')} count={completedCount} />
                </View>

                {/* Cinta decorativa (tipo film) */}
                <View style={styles.decorFilm}>
                  <View style={styles.filmHolesRowBig}>
                    {Array.from({ length: 16 }).map((_, i) => <View key={i} style={styles.filmHoleBig} />)}
                  </View>
                </View>

                {/* Lista de tarjetas */}
                {filtered.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <MaterialCommunityIcons name="movie-open-outline" size={36} color="#fff" />
                    <Text style={styles.emptyText}>No hay elementos en esta vista</Text>
                  </View>
                ) : (
                  filtered.map(item => (
                    <HistoryCard
                      key={item.id}
                      item={item}
                      onResume={() => resumeItem(item.id)}
                      onRemove={() => removeItem(item.id)}
                      onToggleStatus={() => toggleStatus(item.id)}
                    />
                  ))
                )}

                <View style={{ height: 90 }} />
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ===== Estilos ===== */
const ORANGE = '#ff8a2b';
const CARD = '#ff7f3a';
const DARK = '#0e0e0e';

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  bg: { flex: 1 },
  bgImage: { opacity: 0.12 },

  /* Header */
  header: {
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingTop: Platform.select({ ios: 6, android: 8 }),
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { height: 90, maxWidth: '100%', resizeMode: 'contain', alignSelf: 'center' },
  headerRight: {
    position: 'absolute',
    right: 12,
    top: Platform.select({ ios: 6, android: 8 }),
    alignItems: 'flex-end',
  },
  addressTiny: { color: '#3b1f0e', fontSize: 12, marginBottom: 6, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#2a1a0a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  logoutLabel: { color: '#ffd36b', fontWeight: '800', fontSize: 12 },

  /* Contenido */
  container: { paddingHorizontal: 18, paddingTop: 14 },

  /* Tarjeta login cuando NO hay conexión */
  cardLogin: {
    marginTop: 24,
    width: '92%',
    alignSelf: 'center',
    backgroundColor: CARD,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
    elevation: 6,
  },
  loginTitle: {
    fontSize: 28,
    fontWeight: '900',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    textShadowColor: 'rgba(255,200,60,0.45)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  note: { color: '#3b1f0e', marginTop: 8, fontWeight: '600', textAlign: 'center' },

  /* Título sección */
  sectionTitle: {
    fontSize: 40,
    fontWeight: '900',
    color: '#1a1a1a',
    textShadowColor: 'rgba(255,200,60,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },

  /* Controles superiores */
  topControls: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  searchWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#2c2c2c',
    borderWidth: 2,
    borderColor: '#0f0f0f',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: Platform.select({ ios: 8, android: 4 }),
  },
  searchInput: { flex: 1, color: '#ffe7c2', fontWeight: '700' },
  clearAllBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffd36b',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  clearAllText: { color: '#000', fontWeight: '900' },

  /* Filtros */
  filtersRow: { flexDirection: 'row', gap: 8, marginTop: 10, marginBottom: 10 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 2 },
  chipActive: { backgroundColor: '#ffd36b', borderColor: '#000' },
  chipInactive: { backgroundColor: '#2c2c2c', borderColor: '#0f0f0f' },
  chipText: { fontWeight: '900' },
  chipTextActive: { color: '#2a1a0a' },
  chipTextInactive: { color: '#ffe7c2' },

  /* Decor película */
  decorFilm: {
    backgroundColor: DARK,
    borderRadius: 14,
    padding: 8,
    marginTop: 2,
    marginBottom: 12,
  },
  filmHolesRowBig: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  filmHoleBig: { width: 22, height: 12, borderRadius: 3, backgroundColor: '#2b2b2b' },

  /* Card item */
  cardItem: {
    backgroundColor: '#1c1c1c',
    borderRadius: 14,
    borderWidth: 2,
    borderColor: '#0f0f0f',
    padding: 10,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 6 },
    elevation: 5,
  },

  posterWrap: { borderRadius: 10, overflow: 'hidden', position: 'relative' },
  poster: { width: '100%', height: undefined, aspectRatio: 16 / 9 },
  posterFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#333' },
  posterGradient: {
    position: 'absolute', left: 0, right: 0, bottom: 0, height: 70,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  posterTitle: {
    position: 'absolute', left: 10, bottom: 36,
    color: '#fff', fontWeight: '900', fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.5)', textShadowOffset: { width: 0, height: 2 }, textShadowRadius: 4,
  },

  filmHolesRow: {
    position: 'absolute',
    top: 6,
    left: 8,
    right: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  filmHole: { width: 18, height: 10, borderRadius: 3, backgroundColor: '#2b2b2b' },

  badge: {
    position: 'absolute',
    top: 10,
    right: 10,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  badgeWatching: { backgroundColor: '#ffd36b' },
  badgeCompleted: { backgroundColor: '#7cffa0' },
  badgeText: { color: '#2a1a0a', fontWeight: '900' },

  posterProgress: { position: 'absolute', left: 10, right: 10, bottom: 10 },
  progressBar: {
    width: '100%', height: 8, borderRadius: 10,
    backgroundColor: '#222', borderWidth: 2, borderColor: '#000', overflow: 'hidden',
  },
  progressFill: { height: '100%', backgroundColor: ORANGE },
  progressTiny: { color: '#ffe7c2', fontWeight: '800', marginTop: 4, fontSize: 12 },

  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  actionBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 2 },
  actionPrimary: { backgroundColor: '#ffd36b', borderColor: '#000' },
  actionPrimaryText: { color: '#000', fontWeight: '900' },
  actionGhost: { backgroundColor: '#2c2c2c', borderColor: '#0f0f0f' },
  actionGhostText: { color: '#ffd36b', fontWeight: '900' },
  iconBtn: {
    marginLeft: 'auto',
    borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12,
    borderWidth: 2, borderColor: '#0f0f0f', backgroundColor: '#2c2c2c',
  },

  /* Vacío */
  emptyBox: { alignItems: 'center', paddingVertical: 36, opacity: 0.9 },
  emptyText: { color: '#fff', marginTop: 6, fontWeight: '700' },
});
