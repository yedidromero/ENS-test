// app/(tabs)/add.tsx
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  TouchableOpacity,
  Image,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  ScrollView,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppKitButton } from '@reown/appkit-wagmi-react-native';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';

/* ================== Tipos y datos base ================== */
type Section = 'Anime' | 'Mangas' | 'Stories';
type CatalogItem = {
  id: string;
  title: string;
  section: Section;
  poster?: any;         // require('...') para assets locales
  desc?: string;
  popularity?: number;  // para ordenado
  updatedAt?: number;
  tags?: string[];
};

const RECENTS_KEY = 'search:recent';

const CATALOG: CatalogItem[] = [
  {
    id: '1',
    title: 'DanDaDan',
    section: 'Anime',
    poster: require('@/assets/images/DanDaDan.jpg'),
    desc: 'Acción y misterio con toques paranormales.',
    popularity: 98,
    updatedAt: Date.now() - 3600_000,
    tags: ['shonen', 'acción', 'paranormal'],
  },
  {
    id: '2',
    title: 'History of Mangas',
    section: 'Stories',
    poster: require('@/assets/images/history.png'),
    desc: 'Un repaso creativo de la evolución del manga.',
    popularity: 85,
    updatedAt: Date.now() - 86400_000,
    tags: ['historia', 'ensayo'],
  },
  {
    id: '3',
    title: 'Top Manga Picks',
    section: 'Mangas',
    poster: require('@/assets/images/manga.png'),
    desc: 'Selección con reseñas breves y puntuaciones.',
    popularity: 91,
    updatedAt: Date.now() - 2 * 86400_000,
    tags: ['ranking', 'reseñas'],
  },
  {
    id: '4',
    title: 'Coming Hero 1',
    section: 'Anime',
    poster: require('@/assets/images/coming1.png'),
    desc: 'Nuevo héroe en camino.',
    popularity: 73,
    updatedAt: Date.now() - 3 * 86400_000,
    tags: ['nuevo', 'coming soon'],
  },
  {
    id: '5',
    title: 'Coming Hero 2',
    section: 'Mangas',
    poster: require('@/assets/images/coming2.png'),
    desc: 'Avance exclusivo del tomo.',
    popularity: 67,
    updatedAt: Date.now() - 4 * 86400_000,
    tags: ['avance', 'tomo'],
  },
  {
    id: '6',
    title: 'Coming Hero 3',
    section: 'Stories',
    poster: require('@/assets/images/coming3.png'),
    desc: 'Relato corto inspirado en la saga.',
    popularity: 64,
    updatedAt: Date.now() - 5 * 86400_000,
    tags: ['relato', 'short'],
  },
];

/* ================== Header con logo ================== */
function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/* ================== Chips reutilizables ================== */
function Chip({
  icon,
  label,
  active,
  onPress,
}: {
  icon?: React.ReactNode;
  label: string;
  active?: boolean;
  onPress?: () => void;
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      style={[styles.chip, active ? styles.chipActive : styles.chipInactive]}
    >
      {icon}
      <Text style={[styles.chipText, active ? styles.chipTextActive : styles.chipTextInactive]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ================== Tarjeta de resultado ================== */
function ResultCard({
  item,
  onOpen,
}: {
  item: CatalogItem;
  onOpen: (it: CatalogItem) => void;
}) {
  const badgeColor =
    item.section === 'Anime'
      ? { bg: '#ffbf3a', fg: '#4a2a00' }
      : item.section === 'Mangas'
      ? { bg: '#ff564a', fg: '#fff' }
      : { bg: '#ffd36b', fg: '#4a2a00' };

  return (
    <Pressable onPress={() => onOpen(item)} style={styles.cardItem}>
      <View style={styles.posterWrap}>
        {!!item.poster ? (
          <Image source={item.poster} style={styles.poster} resizeMode="cover" />
        ) : (
          <View style={[styles.poster, styles.posterFallback]}>
            <MaterialCommunityIcons name="clapperboard" size={36} color="#eee" />
          </View>
        )}

        {/* Cinta film arriba */}
        <View style={styles.filmHolesRow}>
          {Array.from({ length: 12 }).map((_, i) => (
            <View key={i} style={styles.filmHole} />
          ))}
        </View>

        {/* Degradado para legibilidad */}
        <View style={styles.posterGradient} />

        {/* Sección (badge) */}
        <View style={[styles.badge, { backgroundColor: badgeColor.bg }]}>
          <Text style={[styles.badgeText, { color: badgeColor.fg }]}>{item.section}</Text>
        </View>

        {/* Título y desc corta */}
        <Text numberOfLines={1} style={styles.posterTitle}>
          {item.title}
        </Text>
        {!!item.desc && (
          <Text numberOfLines={2} style={styles.posterDesc}>
            {item.desc}
          </Text>
        )}
      </View>

      {/* Pie con tags y CTA */}
      <View style={styles.resultFooter}>
        <View style={styles.tagsRow}>
          {(item.tags || []).slice(0, 3).map((t, i) => (
            <View key={i} style={styles.tag}>
              <Text style={styles.tagText}>{t}</Text>
            </View>
          ))}
        </View>
        <TouchableOpacity style={styles.goBtn} onPress={() => onOpen(item)}>
          <Ionicons name="arrow-forward" size={16} color="#000" />
          <Text style={styles.goBtnText}>See</Text>
        </TouchableOpacity>
      </View>
    </Pressable>
  );
}

/* ================== Pantalla principal ================== */
export default function SearchScreen() {
  // Estado de wallet (como en profile.tsx)
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const isReadyConnected = useMemo(
    () => Boolean(isConnected && address && walletClient),
    [isConnected, address, walletClient]
  );
  const shortAddr = (addr?: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

  // Estado del buscador
  const [query, setQuery] = useState('');
  const [section, setSection] = useState<Section | 'Todas'>('Todas');
  const [sort, setSort] = useState<'relevance' | 'recent' | 'popular'>('relevance');
  const [recents, setRecents] = useState<string[]>([]);

  // Cargar recientes
  useEffect(() => {
    AsyncStorage.getItem(RECENTS_KEY).then((raw) => {
      if (raw) {
        try {
          setRecents(JSON.parse(raw));
        } catch {}
      }
    });
  }, []);

  const addRecent = async (q: string) => {
    const clean = q.trim();
    if (!clean) return;
    const next = [clean, ...recents.filter((x) => x !== clean)].slice(0, 8);
    setRecents(next);
    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    } catch {}
  };
  const clearRecents = async () => {
    setRecents([]);
    try {
      await AsyncStorage.setItem(RECENTS_KEY, JSON.stringify([]));
    } catch {}
  };

  // Debounce de búsqueda “activa”
  const [activeQuery, setActiveQuery] = useState('');
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setActiveQuery(query.trim()), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Lógica de búsqueda
  const results = useMemo(() => {
    const q = activeQuery.toLowerCase();
    let base = CATALOG.filter((it) =>
      section === 'Todas' ? true : it.section === section
    ).filter((it) => {
      if (!q) return true;
      const haystack = [
        it.title,
        it.desc,
        ...(it.tags || []),
        it.section,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });

    if (sort === 'recent') {
      base = base.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
    } else if (sort === 'popular') {
      base = base.sort((a, b) => (b.popularity || 0) - (a.popularity || 0));
    } else {
      // relevance rudimentario: los que empiezan por query primero
      base = base.sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(q) ? 1 : 0;
        const bStarts = b.title.toLowerCase().startsWith(q) ? 1 : 0;
        if (bStarts !== aStarts) return bStarts - aStarts;
        return (b.popularity || 0) - (a.popularity || 0);
      });
    }
    return base;
  }, [activeQuery, section, sort]);

  // Abrir “detalle”
  const openItem = (it: CatalogItem) => {
    addRecent(query);
    Alert.alert(it.title, `Abrir detalle de ${it.section}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground
        source={require('@/assets/images/fondo.png')}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        {/* Header */}
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
                <Text style={styles.loginTitle}>Search</Text>
                <AppKitButton label="Connect Wallet" />
                <Text style={styles.note}>Conecta tu wallet para usar el buscador.</Text>
              </View>
            ) : (
              <>
                {/* Tarjeta de buscador visible sobre el fondo */}
                <View style={styles.searchCard}>
                  {/* Input + botón buscar */}
                  <View style={styles.searchBar}>
                    <Ionicons name="search" size={18} color="#ffd36b" />
                    <TextInput
                      value={query}
                      onChangeText={setQuery}
                      placeholder="Search for Anime, Manga or Stories…"
                      placeholderTextColor="#f7d9a6"
                      style={styles.searchInput}
                      autoCorrect={false}
                      returnKeyType="search"
                      onSubmitEditing={() => addRecent(query)}
                    />
                    {!!query && (
                      <TouchableOpacity onPress={() => setQuery('')} style={styles.clearIcon}>
                        <Ionicons name="close-circle" size={18} color="#ffd36b" />
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Filtros por sección */}
                  <View style={styles.filtersRow}>
                    <Chip
                      label="All"
                      active={section === 'Todas'}
                      onPress={() => setSection('Todas')}
                      icon={<MaterialCommunityIcons name="shape" size={14} color={section === 'Todas' ? '#2a1a0a' : '#ffe7c2'} style={{ marginRight: 6 }} />}
                    />
                    <Chip
                      label="Anime"
                      active={section === 'Anime'}
                      onPress={() => setSection('Anime')}
                      icon={<MaterialCommunityIcons name="television-classic" size={14} color={section === 'Anime' ? '#2a1a0a' : '#ffe7c2'} style={{ marginRight: 6 }} />}
                    />
                    <Chip
                      label="Mangas"
                      active={section === 'Mangas'}
                      onPress={() => setSection('Mangas')}
                      icon={<MaterialCommunityIcons name="book-open-variant" size={14} color={section === 'Mangas' ? '#2a1a0a' : '#ffe7c2'} style={{ marginRight: 6 }} />}
                    />
                    <Chip
                      label="Stories"
                      active={section === 'Stories'}
                      onPress={() => setSection('Stories')}
                      icon={<MaterialCommunityIcons name="script-text-outline" size={14} color={section === 'Stories' ? '#2a1a0a' : '#ffe7c2'} style={{ marginRight: 6 }} />}
                    />
                  </View>

                  {/* Orden */}
                  <View style={styles.sortRow}>
                    <Text style={styles.sortLabel}>Order:</Text>
                    <Chip label="Relevance" active={sort === 'relevance'} onPress={() => setSort('relevance')} />
                    <Chip label="Recent" active={sort === 'recent'} onPress={() => setSort('recent')} />
                    <Chip label="Popular" active={sort === 'popular'} onPress={() => setSort('popular')} />
                  </View>

                  {/* Recientes */}
                  {recents.length > 0 && (
                    <View style={styles.recentsBox}>
                      <View style={styles.recentsHeader}>
                        <Text style={styles.recentsTitle}>Búsquedas recientes</Text>
                        <TouchableOpacity onPress={clearRecents} style={styles.recentsClear}>
                          <Ionicons name="trash" size={14} color="#000" />
                          <Text style={styles.recentsClearText}>Limpiar</Text>
                        </TouchableOpacity>
                      </View>
                      <View style={styles.recentsRow}>
                        {recents.map((r, i) => (
                          <TouchableOpacity key={i} onPress={() => setQuery(r)} style={styles.recentPill}>
                            <Ionicons name="time" size={12} color="#2a1a0a" />
                            <Text style={styles.recentPillText}>{r}</Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Separador decorativo tipo película */}
                <View style={styles.decorFilm}>
                  <View style={styles.filmHolesRowBig}>
                    {Array.from({ length: 16 }).map((_, i) => (
                      <View key={i} style={styles.filmHoleBig} />
                    ))}
                  </View>
                </View>

                {/* Resultados */}
                <View style={styles.resultsHeader}>
                  <Text style={styles.resultsCount}>
                    {results.length} resultado{results.length === 1 ? '' : 's'}
                  </Text>
                </View>

                {results.length === 0 ? (
                  <View style={styles.emptyBox}>
                    <MaterialCommunityIcons name="movie-open-outline" size={36} color="#fff" />
                    <Text style={styles.emptyText}>Sin coincidencias. Prueba con “DanDaDan”, “manga”, “historia”…</Text>
                  </View>
                ) : (
                  results.map((it) => (
                    <ResultCard key={it.id} item={it} onOpen={openItem} />
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

/* ================== Estilos ================== */
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

  /* Contenedor */
  container: { paddingHorizontal: 18, paddingTop: 14 },

  /* Card de login */
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

  /* Tarjeta del buscador */
  searchCard: {
    backgroundColor: 'rgba(0,0,0,0.45)',
    borderWidth: 2,
    borderColor: '#0f0f0f',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  searchBar: {
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
  clearIcon: { padding: 4 },

  filtersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  sortRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  sortLabel: { color: '#ffe7c2', fontWeight: '800' },

  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 2,
  },
  chipActive: { backgroundColor: '#ffd36b', borderColor: '#000' },
  chipInactive: { backgroundColor: '#2c2c2c', borderColor: '#0f0f0f' },
  chipText: { fontWeight: '900' },
  chipTextActive: { color: '#2a1a0a' },
  chipTextInactive: { color: '#ffe7c2' },

  /* Recientes */
  recentsBox: {
    marginTop: 12,
    backgroundColor: '#1c1c1c',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#0f0f0f',
    padding: 10,
  },
  recentsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  recentsTitle: { color: '#ffe7c2', fontWeight: '900' },
  recentsClear: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffd36b',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  recentsClearText: { color: '#000', fontWeight: '900' },
  recentsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 10 },
  recentPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffd36b',
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  recentPillText: { color: '#2a1a0a', fontWeight: '800' },

  /* Decor película */
  decorFilm: {
    backgroundColor: DARK,
    borderRadius: 14,
    padding: 8,
    marginTop: 12,
    marginBottom: 12,
  },
  filmHolesRowBig: { flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 6 },
  filmHoleBig: { width: 22, height: 12, borderRadius: 3, backgroundColor: '#2b2b2b' },

  /* Resultados */
  resultsHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  resultsCount: {
    color: '#ffe7c2',
    fontWeight: '900',
  },

  /* Card de resultado */
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
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 82,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  posterTitle: {
    position: 'absolute',
    left: 10,
    bottom: 48,
    color: '#fff',
    fontWeight: '900',
    fontSize: 18,
    textShadowColor: 'rgba(0,0,0,0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  posterDesc: {
    position: 'absolute',
    left: 10,
    right: 10,
    bottom: 22,
    color: '#f1f1f1',
    fontSize: 12,
    opacity: 0.95,
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
  badgeText: { fontWeight: '900' },

  resultFooter: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  tagsRow: { flexDirection: 'row', gap: 6, flex: 1, flexWrap: 'wrap' },
  tag: {
    backgroundColor: '#2c2c2c',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#0f0f0f',
  },
  tagText: { color: '#ffd36b', fontWeight: '800', fontSize: 11 },

  goBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#ffd36b',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  goBtnText: { color: '#000', fontWeight: '900' },

  /* Vacío */
  emptyBox: { alignItems: 'center', paddingVertical: 36, opacity: 0.9 },
  emptyText: { color: '#fff', marginTop: 6, fontWeight: '700', textAlign: 'center' },
});
