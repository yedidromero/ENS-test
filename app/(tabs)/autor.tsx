// app/(tabs)/authors.tsx
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
  TextInput,
  FlatList,
  Modal,
  Pressable,
  Alert,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Clipboard from 'expo-clipboard';

/* ===== Theme & constants ===== */
const ORANGE = '#ff8a2b';
const CARD = '#1d1d1d';
const KEY_FOLLOW = 'authors:follows:v1';
const ENS_SUFFIX = 'animetlik.eth'; // <- fixed suffix

type Author = {
  id: string;
  name: string;
  ensPrefix?: string; // we store only the prefix; full ENS = `${ensPrefix}.${ENS_SUFFIX}`
  bio: string;
  followers: number;
  joinedAt: string; // ISO
  tags: string[];
};

/* ===== Header ===== */
function AppHeader() {
  return (
    <View style={styles.header}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
    </View>
  );
}

/* ===== Sample data (only prefix) ===== */
const SAMPLE: Author[] = [
  {
    id: 'a1',
    name: 'Akira Tanaka',
    ensPrefix: 'akira',
    bio: 'Dark fantasy writer building parallel worlds.',
    followers: 12450,
    joinedAt: '2024-08-11',
    tags: ['fantasy', 'isekai', '+16'],
  },
  {
    id: 'a2',
    name: 'Mina Kobayashi',
    ensPrefix: 'mina',
    bio: 'Slice of life with a musical heart. Coffee lover.',
    followers: 8420,
    joinedAt: '2025-01-09',
    tags: ['slice of life', 'music'],
  },
  {
    id: 'a3',
    name: 'Haru Sakamoto',
    ensPrefix: 'haru',
    bio: 'Action & cyberpunk with relentless pacing.',
    followers: 15890,
    joinedAt: '2024-05-22',
    tags: ['action', 'cyberpunk'],
  },
  {
    id: 'a4',
    name: 'Lucía Morita',
    ensPrefix: 'lucia',
    bio: 'Teen romance with traditional illustration.',
    followers: 6790,
    joinedAt: '2025-03-01',
    tags: ['romance', 'school'],
  },
];

/* ===== Small UI bits ===== */
function Tag({ label }: { label: string }) {
  return (
    <View style={styles.tag}>
      <Text style={styles.tagText}>{label}</Text>
    </View>
  );
}

function fullEns(prefix?: string) {
  return prefix && prefix.trim()
    ? `${prefix.trim().toLowerCase()}.${ENS_SUFFIX}`
    : `—.${ENS_SUFFIX}`;
}

/* ENS badge with copy */
function EnsBadge({ prefix }: { prefix?: string }) {
  const val = fullEns(prefix);
  const copy = async () => {
    if (!prefix?.trim()) return;
    await Clipboard.setStringAsync(val);
    Alert.alert('Copied', `${val} copied to clipboard`);
  };
  const disabled = !prefix?.trim();

  return (
    <TouchableOpacity
      onPress={copy}
      disabled={disabled}
      style={[styles.ensWrap, disabled && { opacity: 0.6 }]}
      activeOpacity={0.9}
    >
      <MaterialCommunityIcons name="ethereum" size={13} color="#0e0e0e" />
      <Text numberOfLines={1} style={styles.ensText}>
        {val}
      </Text>
      {!disabled && <Ionicons name="copy" size={12} color="#0e0e0e" />}
    </TouchableOpacity>
  );
}

/* Author card */
function AuthorCard({
  item,
  followed,
  onToggleFollow,
  onOpen,
}: {
  item: Author;
  followed: boolean;
  onToggleFollow: () => void;
  onOpen: () => void;
}) {
  return (
    <Pressable onPress={onOpen} style={styles.card}>
      <View style={styles.cardLeft}>
        <View style={styles.avatarCircle}>
          <Ionicons name="person" size={28} color="#0e0e0e" />
        </View>
      </View>

      <View style={{ flex: 1 }}>
        <View style={styles.rowBetween}>
          <Text style={styles.name}>{item.name}</Text>
          <View style={styles.followers}>
            <Ionicons name="people" size={14} color="#ffdd9a" />
            <Text style={styles.followersText}>
              {Intl.NumberFormat().format(item.followers)}
            </Text>
          </View>
        </View>

        <EnsBadge prefix={item.ensPrefix} />

        <Text numberOfLines={2} style={styles.bio}>
          {item.bio}
        </Text>

        <View style={styles.tagsWrap}>
          {item.tags.map((t) => (
            <Tag key={t} label={t} />
          ))}
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.joinRow}>
            <MaterialCommunityIcons name="calendar" size={14} color="#bfbfbf" />
            <Text style={styles.joinText}>
              Since {new Date(item.joinedAt).toLocaleDateString()}
            </Text>
          </View>

          <TouchableOpacity
            onPress={onToggleFollow}
            activeOpacity={0.9}
            style={[styles.followBtn, followed && styles.followBtnOn]}
          >
            <Ionicons
              name={followed ? 'checkmark' : 'add'}
              size={16}
              color="#0e0e0e"
            />
            <Text style={styles.followLabel}>
              {followed ? 'Following' : 'Follow'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Pressable>
  );
}

export default function AuthorsScreen() {
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<'popular' | 'az' | 'recent'>('popular');
  const [follows, setFollows] = useState<Record<string, boolean>>({});
  const [authors, setAuthors] = useState<Author[]>(SAMPLE);
  const [modal, setModal] = useState<Author | null>(null);

  // ENS edit state (prefix only)
  const [ensDraft, setEnsDraft] = useState('');
  const [ensError, setEnsError] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(KEY_FOLLOW).then((v) => {
      if (v) setFollows(JSON.parse(v));
    });
    // Load ENS prefixes per author from storage
    (async () => {
      const loaded = await Promise.all(
        SAMPLE.map(async (a) => {
          const key = `authors:ensPrefix:${a.id}`;
          const v = await AsyncStorage.getItem(key);
          return v ? { ...a, ensPrefix: v } : a;
        })
      );
      setAuthors(loaded);
    })();
  }, []);

  const toggleFollow = async (id: string) => {
    const next = { ...follows, [id]: !follows[id] };
    setFollows(next);
    await AsyncStorage.setItem(KEY_FOLLOW, JSON.stringify(next));
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let arr = authors.filter(
      (a) =>
        !q ||
        a.name.toLowerCase().includes(q) ||
        a.bio.toLowerCase().includes(q) ||
        fullEns(a.ensPrefix).toLowerCase().includes(q) ||
        a.tags.some((t) => t.toLowerCase().includes(q))
    );

    if (sort === 'popular') {
      arr = arr.sort((a, b) => b.followers - a.followers);
    } else if (sort === 'az') {
      arr = arr.sort((a, b) => a.name.localeCompare(b.name));
    } else {
      arr = arr.sort(
        (a, b) => +new Date(b.joinedAt) - +new Date(a.joinedAt)
      );
    }
    return arr;
  }, [query, sort, authors]);

  /* Open modal & prepare ENS editing */
  const openModal = (a: Author) => {
    setModal(a);
    setEnsDraft(a.ensPrefix ?? '');
    setEnsError(null);
  };

  const validateEnsPrefix = (val: string) => {
    const v = val.trim().toLowerCase();
    // allow a-z, 0-9, hyphen; 1..30 chars
    const ok = /^[a-z0-9-]{1,30}$/.test(v);
    setEnsError(ok ? null : 'Use 1–30 chars: a–z, 0–9, hyphen.');
    return ok ? v : null;
  };

  const saveEns = async () => {
    if (!modal) return;
    const v = validateEnsPrefix(ensDraft);
    if (!v) return;

    const key = `authors:ensPrefix:${modal.id}`;
    await AsyncStorage.setItem(key, v);

    setAuthors((prev) =>
      prev.map((x) => (x.id === modal.id ? { ...x, ensPrefix: v } : x))
    );
    Alert.alert('Saved', `${fullEns(v)} saved for ${modal.name}`);
  };

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground
        source={require('@/assets/images/fondo.png')}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        <AppHeader />

        {/* Title & search (English UI) */}
        <View style={styles.topBar}>
          <Text style={styles.screenTitle}>Authors</Text>

          <View style={styles.searchWrap}>
            <Ionicons name="search" size={18} color="#111" />
            <TextInput
              value={query}
              onChangeText={setQuery}
              placeholder="Search author, ENS or tag…"
              placeholderTextColor="#4b4b4b"
              style={styles.searchInput}
              autoCorrect={false}
              autoCapitalize="none"
            />
            {!!query && (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={18} color="#111" />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.sortRow}>
            <SortChip label="Popular" on={() => setSort('popular')} onState={sort === 'popular'} />
            <SortChip label="A–Z" on={() => setSort('az')} onState={sort === 'az'} />
            <SortChip label="Recent" on={() => setSort('recent')} onState={sort === 'recent'} />
          </View>
        </View>

        {/* List */}
        <FlatList
          data={filtered}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}
          keyExtractor={(it) => it.id}
          renderItem={({ item }) => (
            <AuthorCard
              item={item}
              followed={!!follows[item.id]}
              onToggleFollow={() => toggleFollow(item.id)}
              onOpen={() => openModal(item)}
            />
          )}
          ListEmptyComponent={
            <View style={{ alignItems: 'center', paddingTop: 40 }}>
              <Text style={{ color: '#cfcfcf' }}>
                No results for “{query}”.
              </Text>
            </View>
          }
        />

        {/* Modal: quick profile + ENS editor (prefix only) */}
        <Modal visible={!!modal} transparent animationType="fade" onRequestClose={() => setModal(null)}>
          <Pressable style={styles.overlay} onPress={() => setModal(null)}>
            <Pressable style={styles.modalCard} onPress={() => {}}>
              {modal && (
                <>
                  <View style={styles.modalHeader}>
                    <View style={styles.avatarBig}>
                      <Ionicons name="person" size={40} color="#0e0e0e" />
                    </View>
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={styles.modalName}>{modal.name}</Text>
                      <EnsBadge prefix={modal.ensPrefix} />
                      <View style={[styles.followers, { alignSelf: 'flex-start', marginTop: 6 }]}>
                        <Ionicons name="people" size={14} color="#ffdd9a" />
                        <Text style={styles.followersText}>
                          {Intl.NumberFormat().format(modal.followers)} followers
                        </Text>
                      </View>
                    </View>
                    <TouchableOpacity onPress={() => setModal(null)} style={styles.closeBtn}>
                      <Ionicons name="close" size={18} color="#000" />
                    </TouchableOpacity>
                  </View>

                  <Text style={styles.modalBio}>{modal.bio}</Text>

                  {/* ENS editor */}
                  <View style={styles.ensEditWrap}>
                    <Text style={styles.ensEditLabel}>ENS</Text>
                    <View style={styles.ensEditRow}>
                      <TextInput
                        value={ensDraft}
                        onChangeText={(t) => {
                          setEnsDraft(t.toLowerCase());
                          if (ensError) setEnsError(null);
                        }}
                        placeholder="yourname"
                        placeholderTextColor="#9b9b9b"
                        style={styles.ensInput}
                        autoCapitalize="none"
                        autoCorrect={false}
                        maxLength={30}
                      />
                      <Text style={styles.ensSuffix}>.{ENS_SUFFIX}</Text>
                    </View>
                    {!!ensError && <Text style={styles.ensError}>{ensError}</Text>}

                    <View style={styles.ensPreviewRow}>
                      <MaterialCommunityIcons name="ethereum" size={16} color="#0e0e0e" />
                      <Text style={styles.ensPreviewText}>{fullEns(ensDraft)}</Text>
                    </View>

                    <View style={styles.modalActions}>
                      <TouchableOpacity onPress={saveEns} style={[styles.actionBtn, styles.actionPrimary]}>
                        <Ionicons name="save" size={16} color="#0e0e0e" />
                        <Text style={styles.actionLabel}>Save</Text>
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => {
                        setEnsDraft(modal.ensPrefix ?? '');
                        setEnsError(null);
                      }} style={styles.actionBtn}>
                        <Ionicons name="reload" size={16} color="#0e0e0e" />
                        <Text style={styles.actionLabel}>Reset</Text>
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={styles.tagsWrap}>
                    {modal.tags.map((t) => (
                      <Tag key={t} label={t} />
                    ))}
                  </View>

                  <View style={{ alignItems: 'flex-end', marginTop: 10 }}>
                    <TouchableOpacity
                      onPress={async () => {
                        await toggleFollow(modal.id);
                      }}
                      style={[
                        styles.followBtn,
                        styles.followBtnLarge,
                        follows[modal.id] && styles.followBtnOn,
                      ]}
                    >
                      <Ionicons
                        name={follows[modal.id] ? 'checkmark' : 'add'}
                        size={18}
                        color="#0e0e0e"
                      />
                      <Text style={styles.followLabel}>
                        {follows[modal.id] ? 'Following' : 'Follow'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </Pressable>
          </Pressable>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

/* Sort chip */
function SortChip({
  label,
  on,
  onState,
}: {
  label: string;
  on: () => void;
  onState: boolean;
}) {
  return (
    <TouchableOpacity
      onPress={on}
      activeOpacity={0.9}
      style={[styles.sortChip, onState && styles.sortChipOn]}
    >
      <Text style={[styles.sortChipText, onState && { color: '#0e0e0e', fontWeight: '900' }]}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

/* ===== Styles ===== */
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#121212' },
  bg: { flex: 1 },
  bgImage: { opacity: 0.12 },

  header: {
    backgroundColor: ORANGE,
    paddingHorizontal: 14,
    paddingTop: Platform.select({ ios: 6, android: 8 }),
    paddingBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logo: { height: 90, maxWidth: '100%', resizeMode: 'contain', alignSelf: 'center' },

  topBar: { paddingHorizontal: 16, paddingTop: 12 },
  screenTitle: {
    fontSize: 36,
    fontWeight: '900',
    color: '#1a1a1a',
    textShadowColor: 'rgba(255,200,60,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
    marginBottom: 10,
  },

  searchWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffdda8',
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
    gap: 8,
    borderWidth: 2,
    borderColor: '#000',
  },
  searchInput: { flex: 1, color: '#111', fontWeight: '700' },

  sortRow: { flexDirection: 'row', gap: 10, marginTop: 10, marginBottom: 8 },
  sortChip: {
    backgroundColor: '#ffd36b',
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#000',
  },
  sortChipOn: { backgroundColor: '#ffbf38' },
  sortChipText: { color: '#1a1a1a', fontWeight: '800' },

  card: {
    flexDirection: 'row',
    backgroundColor: CARD,
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: '#0a0a0a',
    marginTop: 14,
    gap: 12,
  },
  cardLeft: { paddingTop: 4 },
  avatarCircle: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: '#ffbf38',
    borderWidth: 2, borderColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },

  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },

  name: { color: '#fff', fontSize: 16, fontWeight: '900' },
  bio: { color: '#d7d7d7', fontSize: 13, marginTop: 6 },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  tag: {
    backgroundColor: '#292929',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#3a3a3a',
  },
  tagText: { color: '#eaeaea', fontSize: 11 },

  followers: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#2a1a0a',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
  },
  followersText: { color: '#ffdd9a', fontWeight: '900', fontSize: 11 },

  ensWrap: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 6,
    backgroundColor: '#ffc94d',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#000',
  },
  ensText: { color: '#0e0e0e', fontWeight: '900', maxWidth: 220 },

  cardFooter: { marginTop: 10, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  joinRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  joinText: { color: '#bfbfbf', fontSize: 12 },

  followBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#ffc94d',
    paddingHorizontal: 12, paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 2, borderColor: '#000',
  },
  followBtnOn: { backgroundColor: '#9DFF8A' },
  followBtnLarge: { paddingHorizontal: 16, paddingVertical: 8 },
  followLabel: { color: '#0e0e0e', fontWeight: '900' },

  /* Modal */
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'center', padding: 16 },
  modalCard: { backgroundColor: '#202020', borderRadius: 16, padding: 14, borderWidth: 2, borderColor: '#0a0a0a' },
  modalHeader: { flexDirection: 'row', alignItems: 'center' },
  avatarBig: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: '#ffbf38', borderWidth: 2, borderColor: '#000',
    alignItems: 'center', justifyContent: 'center',
  },
  modalName: { color: '#fff', fontWeight: '900', fontSize: 18 },
  modalBio: { color: '#e9e9e9', marginTop: 10, lineHeight: 20 },

  closeBtn: {
    marginLeft: 8,
    backgroundColor: ORANGE, borderRadius: 12,
    paddingHorizontal: 8, paddingVertical: 6,
    borderWidth: 2, borderColor: '#000',
  },

  /* ENS editor */
  ensEditWrap: { marginTop: 12, backgroundColor: '#151515', borderRadius: 12, padding: 12, borderWidth: 1.5, borderColor: '#2a2a2a' },
  ensEditLabel: { color: '#fff', fontWeight: '900', marginBottom: 8, fontSize: 12, opacity: 0.9 },
  ensEditRow: { flexDirection: 'row', alignItems: 'center' },
  ensInput: {
    flex: 0,
    minWidth: 120,
    color: '#f2f2f2',
    backgroundColor: '#00000055',
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#3a3a3a',
    paddingHorizontal: 10,
    paddingVertical: Platform.OS === 'ios' ? 8 : 6,
    fontWeight: '800',
  },
  ensSuffix: { color: '#dcdcdc', marginLeft: 8, fontWeight: '800' },
  ensError: { color: '#ff9f9f', marginTop: 6, fontSize: 12 },

  ensPreviewRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 10,
    backgroundColor: '#ffc94d',
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 2,
    borderColor: '#000',
    alignSelf: 'flex-start',
  },
  ensPreviewText: { color: '#0e0e0e', fontWeight: '900' },

  modalActions: { flexDirection: 'row', gap: 10, marginTop: 12 },
  actionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#ffd36b',
    borderRadius: 999,
    paddingHorizontal: 14, paddingVertical: 8,
    borderWidth: 2, borderColor: '#000',
  },
  actionPrimary: { backgroundColor: '#ffbf38' },
  actionLabel: { color: '#0e0e0e', fontWeight: '900' },
});
