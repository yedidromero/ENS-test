// app/(tabs)/read.tsx
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
  ScrollView,
  Pressable,
  Alert,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppKitButton } from '@reown/appkit-wagmi-react-native';
import { useAccount, useDisconnect, useWalletClient, usePublicClient } from 'wagmi';

/** ======= CONST ON-CHAIN (TU DESPLIEGUE) ======= */
const MONAD_CHAIN_ID = 10143;
const MONAD_EXPLORER_TX = 'https://testnet.monadexplorer.com/tx/';
const MONAD_EXPLORER_ADDR = 'https://testnet.monadexplorer.com/address/';
const STORIES_ADDR = '0x6c1ae56758aa8031f0e3db6107be79bea07e9f3f' as `0x${string}`;

const PUB_ID = 0n; // <- tu publicación ya creada
const AUTHOR = '0x369DB4c69319E1ca009FdfeA6d172A88210dbf05' as `0x${string}`;

const STORIES_ABI = [
  { type: 'function', stateMutability: 'view', name: 'likePriceWei', inputs: [], outputs: [{ type: 'uint256' }] },
  { type: 'function', stateMutability: 'payable', name: 'like', inputs: [{ name: 'pubId', type: 'uint256' }], outputs: [] },
] as const;

/** ======= CONTENIDO DEMO DE LECTURA ======= */
const COVER = 'https://malpasolibreria.com/portada.jpeg';
const TITLE = 'warrior';
const BODY = `Descubre la apasionante historia de Kasui, un adolescente de 14 años con una rara condición llamada "Lienzo de Maná". Incapaz de desarrollar habilidades o avanzar en niveles como los demás, Kasui se enfrenta a una brecha que lo separa de su generación y de su prodigioso hermano adoptivo, Dann. A pesar de esto, Kasui se niega a rendirse y se sumerge en un intenso entrenamiento para fortalecer su cuerpo.
En secreto, estudia magia, culturas y razas en busca de una solución para superar su mala fortuna. Acompaña a Kasui en su emocionante viaje mientras desafía las expectativas y descubre su destino en un mundo lleno de maravillas y desafíos. ¿Podrá superar su condición y encontrar su lugar en un mundo donde todos tienen ventajas únicas? Prepárate para una historia llena de acción, aventuras y autodescubrimiento.`;

/* ===== Header simple con logo ===== */
function AppHeader({ right }: { right?: React.ReactNode }) {
  return (
    <View style={styles.header}>
      <Image source={require('@/assets/images/logo.png')} style={styles.logo} />
      <View style={styles.headerRight}>{right}</View>
    </View>
  );
}

export default function ReadScreen() {
  // Estado de wallet
  const { isConnected, address, chainId } = useAccount();
  const { data: walletClient } = useWalletClient();  // firma (Reown/AppKit)
  const publicClient = usePublicClient();            // lecturas / esperar receipts
  const { disconnect } = useDisconnect();

  const isReadyConnected = useMemo(
    () => Boolean(isConnected && address && walletClient),
    [isConnected, address, walletClient]
  );

  // Precio del like on-chain
  const [likeWei, setLikeWei] = useState<bigint | null>(null);
  const [loadingLike, setLoadingLike] = useState(false);
  const [lastTx, setLastTx] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      if (!publicClient) return;
      try {
        const wei = (await publicClient.readContract({
          address: STORIES_ADDR,
          abi: STORIES_ABI,
          functionName: 'likePriceWei',
        })) as bigint;
        setLikeWei(wei);
      } catch (e) {
        console.warn('No pude leer likePriceWei:', e);
      }
    })();
  }, [publicClient]);

  function fmtMON(wei: bigint, decimals = 4) {
    const base = 10n ** 18n;
    const int = wei / base;
    const frac = wei % base;
    const fracStr = (frac + base).toString().slice(1).slice(0, decimals).padEnd(decimals, '0');
    return `${int.toString()}.${fracStr} MON`;
  }

  async function handleLike() {
    if (!walletClient || !publicClient || !address) {
      Alert.alert('Conecta tu wallet');
      return;
    }
    if (chainId !== MONAD_CHAIN_ID) {
      Alert.alert('Red incorrecta', 'Cambia a Monad Testnet');
      return;
    }
    if (!likeWei) {
      Alert.alert('Sin precio', 'No pude leer el precio del like on-chain');
      return;
    }

    try {
      setLoadingLike(true);

      // 1) simulate para crear la request
      const { request } = await publicClient.simulateContract({
        account: address as `0x${string}`,
        address: STORIES_ADDR,
        abi: STORIES_ABI,
        functionName: 'like',
        args: [PUB_ID],
        value: likeWei,
      });

      // 2) firmar/enviar
      const hash = await walletClient.writeContract(request);

      // 3) esperar confirmación
      await publicClient.waitForTransactionReceipt({ hash });
      setLastTx(hash);

      Alert.alert('¡Like enviado!', `Pagaste ${fmtMON(likeWei)}\nTx: ${hash.slice(0, 10)}…`);
    } catch (e: any) {
      console.error(e);
      Alert.alert('Error', e?.shortMessage ?? e?.message ?? 'Falló la transacción');
    } finally {
      setLoadingLike(false);
    }
  }

  const shortAddr = (addr?: string) => (addr ? `${addr.slice(0, 6)}…${addr.slice(-4)}` : '');

  return (
    <SafeAreaView style={styles.safe}>
      <ImageBackground
        source={require('@/assets/images/fondo.png')}
        resizeMode="cover"
        style={styles.bg}
        imageStyle={styles.bgImage}
      >
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

        {/* Si no hay conexión, botón de conectar */}
        {!isReadyConnected ? (
          <View style={[styles.cardLogin]}>
            <Text style={styles.loginTitle}>Log in / Sign up</Text>
            <AppKitButton label="Connect Wallet" />
            <Text style={styles.note}>Connect your wallet to like this story.</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
            {/* Cover */}
            <View style={styles.coverWrap}>
              <Image source={{ uri: COVER }} style={styles.coverImage} resizeMode="cover" />
            </View>

            {/* Título */}
            <Text style={styles.title}>{TITLE}</Text>

            {/* Autor */}
            <Pressable
              onPress={() => Linking.openURL(MONAD_EXPLORER_ADDR + AUTHOR)}
              style={styles.authorPill}
            >
              <Ionicons name="person" size={14} color="#fff" />
              <Text style={styles.authorText}>{shortAddr(AUTHOR)}</Text>
              <Ionicons name="open-outline" size={14} color="#fff" />
            </Pressable>

            {/* Texto de la historia */}
            <Text style={styles.body}>{BODY}</Text>

            {/* Botón Like */}
            <TouchableOpacity
              onPress={handleLike}
              disabled={loadingLike || !likeWei}
              activeOpacity={0.9}
              style={[styles.likeBtn, (loadingLike || !likeWei) && { opacity: 0.7 }]}
            >
              {loadingLike ? (
                <ActivityIndicator color="#000" />
              ) : (
                <Text style={styles.likeLabel}>
                  {likeWei ? `Like — ${fmtMON(likeWei)}` : 'Leyendo precio…'}
                </Text>
              )}
            </TouchableOpacity>

            {/* Link al explorer si ya hay tx */}
            {lastTx && (
              <TouchableOpacity
                onPress={() => Linking.openURL(MONAD_EXPLORER_TX + lastTx)}
                style={{ alignSelf: 'center', marginTop: 12 }}
              >
                <Text style={{ color: '#2e82ff', textDecorationLine: 'underline', fontWeight: '800' }}>
                  Ver like en el explorer
                </Text>
              </TouchableOpacity>
            )}

            <View style={{ height: 40 }} />
          </ScrollView>
        )}
      </ImageBackground>
    </SafeAreaView>
  );
}

/* ===== Estilos (coherentes con tu app) ===== */
const ORANGE = '#ff8a2b';
const CARD = '#ff7f3a';

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
  headerRight: {
    position: 'absolute', right: 12, top: Platform.select({ ios: 6, android: 8 }), alignItems: 'flex-end'
  },
  addressTiny: { color: '#3b1f0e', fontSize: 12, marginBottom: 6, fontWeight: '700' },
  logoutBtn: { backgroundColor: '#2a1a0a', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 12 },
  logoutLabel: { color: '#ffd36b', fontWeight: '800', fontSize: 12 },

  container: { paddingHorizontal: 18, paddingTop: 14 },

  cardLogin: {
    marginTop: 24,
    alignSelf: 'center',
    width: '92%',
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

  coverWrap: {
    borderWidth: 2, borderColor: '#1a1a1a', borderRadius: 10, overflow: 'hidden',
    backgroundColor: '#ffffff10', height: 200, marginBottom: 12,
  },
  coverImage: { width: '100%', height: '100%' },

  title: {
    fontSize: 36, fontWeight: '900', color: '#fdfdfd',
    textShadowColor: 'rgba(255,200,60,0.55)', textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 8, textTransform: 'capitalize',
  },

  authorPill: {
    alignSelf: 'flex-start', marginTop: 8,
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#111', paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10
  },
  authorText: { color: '#fff', fontWeight: '800', letterSpacing: 0.3 },

  body: {
    marginTop: 12, color: '#f5f5f5', fontSize: 16, lineHeight: 22,
    backgroundColor: '#00000055', borderRadius: 8, padding: 12, borderWidth: 2, borderColor: '#1a1a1a'
  },

  likeBtn: {
    marginTop: 16,
    alignSelf: 'center',
    backgroundColor: ORANGE,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#000',
  },
  likeLabel: { fontWeight: '900', color: '#000', fontSize: 16 },
});
