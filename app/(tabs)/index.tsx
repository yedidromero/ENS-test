// HomeScreen.tsx
import React, { useMemo } from 'react';
import {
  SafeAreaView,
  View,
  Text,
  StyleSheet,
  ImageBackground,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
} from 'react-native';
import { AppKitButton } from '@reown/appkit-wagmi-react-native';
import { useAccount, useDisconnect, useWalletClient } from 'wagmi';

/* ========= Texto con “stroke” reutilizable ========= */
function StrokeText({
  children,
  size = 18,
  color = '#7a3a00',
  stroke = '#4a2400',
  w = 1.6,
  extraStyle,
}: {
  children: React.ReactNode;
  size?: number;
  color?: string;
  stroke?: string;
  w?: number;
  extraStyle?: any;
}) {
  const offsets = [
    { x: -w, y: 0 }, { x: w, y: 0 },
    { x: 0, y: -w }, { x: 0, y: w },
    { x: -w, y: -w }, { x: w, y: -w },
    { x: -w, y: w }, { x: w, y: w },
  ];
  return (
    <View style={{ position: 'relative' }}>
      {offsets.map((p, i) => (
        <Text
          key={i}
          style={[
            {
              position: 'absolute',
              left: p.x,
              top: p.y,
              color: stroke,
              fontSize: size,
              fontWeight: '900',
            },
            extraStyle,
          ]}
        >
          {children}
        </Text>
      ))}
      <Text style={[{ color, fontSize: size, fontWeight: '900' }, extraStyle]}>{children}</Text>
    </View>
  );
}

/* ========= Ribbon pequeño (tags: Anime, Mangas) ========= */
function RibbonLabel({
  text,
  pos,
  padH = 14,
  padV = 6,
  bg = '#ffbf3a',
  border = '#e5a22d',
}: {
  text: string;
  pos: any;
  padH?: number;
  padV?: number;
  bg?: string;
  border?: string;
}) {
  return (
    <View
      style={[
        styles.ribbonBox,
        {
          backgroundColor: bg,
          borderColor: border,
          paddingHorizontal: padH,
          paddingVertical: padV,
        },
        pos,
      ]}
    >
      <View style={[styles.ribbonTail, { left: -8, backgroundColor: bg, borderColor: border }]} />
      <View style={[styles.ribbonTail, { right: -8, backgroundColor: bg, borderColor: border }]} />
      <StrokeText size={18} color="#7a3a00" stroke="#4a2a00">
        {text}
      </StrokeText>
    </View>
  );
}

/* ========= Ribbon grande tipo banner (Stories) ========= */
function RibbonBanner({ text, pos }: { text: string; pos: any }) {
  return (
    <View style={[styles.bannerWrap, pos]}>
      <View style={styles.bannerSideLeft} />
      <View style={styles.bannerBody}>
        <StrokeText size={20} color="#7a3a00" stroke="#4a2a00" w={1.8}>
          {text}
        </StrokeText>
      </View>
      <View style={styles.bannerSideRight} />
    </View>
  );
}

/* ========= Título cartoon (login / coming soon) ========= */
function FancyTitle({
  text,
  fill = '#ffd36b',
  size = 32,
}: { text: string; fill?: string; size?: number }) {
  const stroke = '#2a1a0a';
  const shade = '#f3a743';
  const O = 2;
  const outlines = [{x:-O,y:0},{x:O,y:0},{x:0,y:-O},{x:0,y:O},{x:-O,y:-O},{x:O,y:-O},{x:-O,y:O},{x:O,y:O}];
  return (
    <View style={[styles.titleWrap, { minHeight: size + 10 }]}>
      {outlines.map((p, i) => (
        <Text key={i} style={[styles.titleLayer, { left: p.x, top: p.y, color: stroke, fontSize: size }]}>{text}</Text>
      ))}
      <Text style={[styles.titleLayer, { color: shade, top: 1, fontSize: size }]}>{text}</Text>
      <Text style={[styles.titleLayer, { color: fill, fontSize: size }]}>{text}</Text>
      <Text style={[styles.titleMeasure, { fontSize: size }]}>{text}</Text>
    </View>
  );
}

/* ========= Header con tu logo ========= */
function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

/* ========= Perforaciones tipo film ========= */
function FilmHolesRow() {
  return (
    <View style={styles.holesRow}>
      {Array.from({ length: 12 }).map((_, i) => (
        <View key={i} style={styles.hole} />
      ))}
    </View>
  );
}

/* ========= Contenido conectado ========= */
function ConnectedContent() {
  return (
    <ScrollView contentContainerStyle={styles.connectedScroll}>
      {/* Home + Best of */}
      <View style={styles.topRow}>
        <Text style={styles.homeTitle}>Home</Text>
        <View style={styles.bestOfPill}>
          <View style={styles.pillNotch} />
          <Text style={styles.bestOfText}>Best of</Text>
        </View>
      </View>

      {/* Filmstrip */}
      <View style={styles.filmstrip}>
        <FilmHolesRow />

        {/* Hero 16:9 (solo ANIME arriba izq.) */}
        <View style={styles.heroWrap}>
          <Image
            source={require('@/assets/images/DanDaDan.jpg')}
            style={styles.heroImage}
            resizeMode="cover"
          />
          <RibbonLabel text="Anime" pos={{ position: 'absolute', top: 12, left: 12 }} />
        </View>

        {/* Dos tarjetas 16:9 debajo del hero */}
        <View style={styles.twoCardsRow}>
          {/* IZQUIERDA: history.png + Stories encima */}
          <View style={[styles.card16x9, { marginRight: 10 }]}>
            <Image
              source={require('@/assets/images/history.png')}
              style={styles.fill}
              resizeMode="cover"
            />
            <RibbonBanner text="Stories" pos={{ position: 'absolute', left: 10, bottom: 8 }} />
          </View>

          {/* DERECHA: manga.png + Mangas encima */}
          <View style={styles.card16x9}>
            <Image
              source={require('@/assets/images/manga.png')}
              style={styles.fill}
              resizeMode="cover"
            />
            <RibbonLabel text="Mangas" pos={{ position: 'absolute', right: 10, bottom: 8 }} />
          </View>
        </View>

        <FilmHolesRow />
      </View>

      {/* COMING SOON! */}
      <View style={styles.comingCard}>
        <View style={styles.comingHeader}>
          <FancyTitle text="COMING SOON!" size={34} />
         <Image source={require('@/assets/images/ladybug.png')} style={styles.ladybug} /> 
        </View>

        {/* barra superior decorativa */}
        <View style={styles.comingTopAccent} />

        {/* 3 portadas cuadradas (ajusta rutas si usas otros nombres) */}
        <View style={styles.soonRow}>
          <Image
            source={require('@/assets/images/coming1.png')}
            style={[styles.soonItem, { marginRight: 12 }]}
            resizeMode="cover"
          />
          <Image
            source={require('@/assets/images/coming2.png')}
            style={[styles.soonItem, { marginRight: 12 }]}
            resizeMode="cover"
          />
          <Image
            source={require('@/assets/images/coming3.png')}
            style={styles.soonItem}
            resizeMode="cover"
          />
        </View>

        {/* barra inferior decorativa */}
        <View style={styles.comingAccent} />
      </View>
    </ScrollView>
  );
}

export default function HomeScreen() {
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();
  const { disconnect } = useDisconnect();

  const isReadyConnected = useMemo(
    () => Boolean(isConnected && address && walletClient),
    [isConnected, address, walletClient]
  );

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground
        source={require('@/assets/images/fondo.png')}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
        {/* Header siempre visible */}
        <AppHeader
          right={
            isReadyConnected ? (
              <>
                <Text style={styles.addressText}>
                  {`${address!.slice(0, 6)}…${address!.slice(-4)}`}
                </Text>
                <TouchableOpacity onPress={() => disconnect()} style={styles.logoutBtn}>
                  <Text style={styles.logoutLabel}>Disconnect</Text>
                </TouchableOpacity>
              </>
            ) : null
          }
        />

        {/* Contenido según estado */}
        {isReadyConnected ? (
          <ConnectedContent />
        ) : (
          <View style={styles.loginWrap}>
            <FancyTitle text="Log in / Sign up" />
            <View style={styles.card}>
              <AppKitButton label="Connect Wallet" />
              <Text style={styles.note}>Remember not to share your seed phrase :)</Text>
            </View>
          </View>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ========= Estilos ========= */
const ORANGE = '#ff8a2b';
const CARD = '#ff7f3a';
const YELLOW = '#ffde6b';
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
  addressText: { color: '#3b1f0e', fontSize: 12, marginBottom: 6, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#2a1a0a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  logoutLabel: { color: '#ffd36b', fontWeight: '800', fontSize: 12 },

  /* Login */
  loginWrap: { flex: 1, alignItems: 'center', paddingHorizontal: 16, paddingTop: 18 },
  card: {
    width: '92%',
    backgroundColor: CARD,
    borderRadius: 22,
    padding: 16,
    paddingTop: 14,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
    elevation: 8,
  },
  note: { color: '#3b1f0e', fontSize: 13, marginTop: 10, marginBottom: 14 },

  /* Conectado */
  connectedScroll: { paddingHorizontal: 14, paddingTop: 12, paddingBottom: 110 },

  /* Home + Best of */
  homeTitle: {
    fontSize: 46,
    fontWeight: '900',
    color: '#191919',
    textShadowColor: 'rgba(255,200,60,0.55)',
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bestOfPill: {
    backgroundColor: YELLOW,
    paddingHorizontal: 22,
    paddingVertical: 10,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 26,
    borderBottomRightRadius: 12,
    borderBottomLeftRadius: 26,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  pillNotch: {
    position: 'absolute',
    left: -8,
    top: '50%',
    width: 16,
    height: 16,
    backgroundColor: YELLOW,
    transform: [{ rotate: '45deg' }, { translateY: -8 }],
    borderRadius: 3,
  },
  bestOfText: { color: '#7a3a00', fontWeight: '900', fontSize: 18 },

  /* Filmstrip */
  filmstrip: {
    width: '100%',
    backgroundColor: DARK,
    borderRadius: 14,
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    position: 'relative',
  },
  holesRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 6,
    marginVertical: 6,
  },
  hole: { width: 20, height: 12, borderRadius: 3, backgroundColor: '#2b2b2b' },

  /* Hero 16:9 */
  heroWrap: {
    width: '100%',
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#2d2d2d',
    position: 'relative',
  },
  heroImage: { width: '100%', height: undefined, aspectRatio: 16 / 9 },

  /* Dos tarjetas 16:9 */
  twoCardsRow: { flexDirection: 'row', marginTop: 12 },
  card16x9: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#333',
    position: 'relative', // necesario para superponer etiquetas
  },
  fill: { width: '100%', height: undefined, aspectRatio: 16 / 9 },

  /* Coming soon */
  comingCard: {
    width: '100%',
    backgroundColor: '#ff564a',
    borderRadius: 22,
    padding: 16,
    marginTop: 2,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
  },
  comingHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  ladybug: { width: 60, height: 60, marginLeft: 8, resizeMode: 'contain' },

  comingTopAccent: {
    height: 8,
    backgroundColor: '#fff',
    opacity: 0.9,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 12,
    width: '92%',
    alignSelf: 'center',
  },

  soonRow: { flexDirection: 'row' },
  soonItem: {
    flex: 1,
    height: undefined,
    aspectRatio: 1,          // cuadrado
    borderRadius: 12,
    backgroundColor: '#222',
  },

  comingAccent: {
    height: 8,
    backgroundColor: '#fff',
    opacity: 0.85,
    borderRadius: 8,
    marginTop: 14,
    width: '92%',
    alignSelf: 'center',
  },

  /* Capas base para FancyTitle */
  titleWrap: { position: 'relative', marginBottom: 12, alignSelf: 'center' },
  titleLayer: {
    position: 'absolute',
    fontWeight: '900',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0,0,0,0.35)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleMeasure: { opacity: 0, fontWeight: '900', letterSpacing: 0.5 },

  /* Ribbon pequeño base */
  ribbonBox: {
    position: 'absolute',
    borderWidth: 2,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  ribbonTail: {
    position: 'absolute',
    top: '50%',
    marginTop: -6,
    width: 12,
    height: 12,
    transform: [{ rotate: '45deg' }],
    borderWidth: 2,
    borderRadius: 2,
  },

  /* Banner grande (Stories) */
  bannerWrap: {
    position: 'absolute',
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 3,
  },
  bannerSideLeft: {
    width: 18,
    height: 18,
    backgroundColor: '#ffbf3a',
    borderColor: '#e5a22d',
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginRight: -6,
  },
  bannerSideRight: {
    width: 18,
    height: 18,
    backgroundColor: '#ffbf3a',
    borderColor: '#e5a22d',
    borderWidth: 2,
    transform: [{ rotate: '45deg' }],
    marginLeft: -6,
  },
  bannerBody: {
    backgroundColor: '#ffbf3a',
    borderColor: '#e5a22d',
    borderWidth: 2,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 6,
    shadowColor: '#000',
    shadowOpacity: 0.3,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
});
