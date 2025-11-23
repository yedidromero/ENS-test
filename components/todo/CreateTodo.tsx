import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import {BrowserProvider, Contract} from 'ethers';
import {useAccount, useWalletClient} from 'wagmi';
import {ethers} from 'ethers';
import {RequestModal} from './RequestModal';
import {
  stakingTodoListABI,
  STAKING_TODO_CONTRACT_ADDRESS,
} from '../../utils/stakingTodoListABI';

interface Props {
  onTodoCreated: () => void;
}

export function CreateTodo({onTodoCreated}: Props) {
  const [description, setDescription] = useState('');
  const [stakeAmount, setStakeAmount] = useState('0.001');
  const [minimumStake, setMinimumStake] = useState('0');
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const {address, isConnected} = useAccount();
  const {data: walletClient} = useWalletClient();

  useEffect(() => {
    if (isConnected && walletClient) {
      getMinimumStake();
    } else {
      const defaultStake = '0.001';
      setMinimumStake(defaultStake);
      setStakeAmount(defaultStake);
    }
  }, [isConnected, walletClient]);

  const getMinimumStake = async () => {
    if (minimumStake !== '0') {
      console.log('CreateTodo: Minimum stake already set, skipping');
      return;
    }

    if (!address || !walletClient) {
      console.log('CreateTodo: No address or wallet client available');
      return;
    }

    try {
      console.log('CreateTodo: Getting minimum stake...');
      const ethersProvider = new BrowserProvider(walletClient!);
      const signer = await ethersProvider.getSigner();
      const contract = new Contract(
        STAKING_TODO_CONTRACT_ADDRESS,
        stakingTodoListABI,
        signer,
      );

      console.log('CreateTodo: Contract created, calling minimumStake()...');
      
      const minStake = await contract.minimumStake();
      const formattedMinStake = ethers.formatEther(minStake);
      console.log('CreateTodo: Minimum stake raw:', minStake.toString(), 'wei');
      console.log('CreateTodo: Minimum stake formatted:', formattedMinStake, 'MON');
      
      if (minStake.toString() === '1000000000000000') {
        console.log('CreateTodo: Minimum stake matches expected value from Remix');
      }
      
      setMinimumStake(formattedMinStake);
      setStakeAmount(formattedMinStake);
    } catch (e) {
      console.error('CreateTodo: Error getting minimum stake:', e);
      const defaultStake = '0.001';
      console.log('CreateTodo: Using default minimum stake:', defaultStake);
      setMinimumStake(defaultStake);
      setStakeAmount(defaultStake);
    }
  };

  const createTodo = async () => {
    if (!walletClient || !description.trim() || !address) {
      return;
    }

    setData(undefined);
    setError(false);
    setIsLoading(true);
    setRequestModalVisible(true);

    try {
      console.log('CreateTodo: Starting transaction process...');
      const ethersProvider = new BrowserProvider(walletClient!);
      const signer = await ethersProvider.getSigner();
      const contract = new Contract(
        STAKING_TODO_CONTRACT_ADDRESS,
        stakingTodoListABI,
        signer,
      );

      const stakeAmountWei = ethers.parseEther(stakeAmount);
      console.log('CreateTodo: Sending transaction with stake:', stakeAmount, 'MON');
      
      const tx = await contract.createTodo(description.trim(), {
        value: stakeAmountWei,
      });
      
      console.log('CreateTodo: Transaction sent:', tx.hash);
      setData(
        `Todo created successfully! Transaction hash: ${tx.hash}\nStaked: ${stakeAmount} MON`,
      );
      setDescription('');
      onTodoCreated();
    } catch (e: any) {
      console.error('CreateTodo: Transaction error:', e);
      setError(true);
      
      if (e.message.includes('insufficient funds')) {
        setData('Insufficient funds. Please make sure you have enough MON tokens for the stake and gas fees.');
      } else if (e.message.includes('user rejected')) {
        setData('Transaction was rejected by user.');
      } else {
        setData(`Transaction failed: ${e.message || 'Unknown error'}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const isValidStake = () => {
    try {
      const stake = parseFloat(stakeAmount);
      const minStake = parseFloat(minimumStake);
      return stake >= minStake && stake > 0;
    } catch {
      return false;
    }
  };

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.connectMessage}>
          Connect your wallet to create todos
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Create New Todo</Text>
      
      <Text style={styles.label}>Description</Text>
      <TextInput
        style={styles.input}
        value={description}
        onChangeText={setDescription}
        placeholder="Enter your todo description..."
        multiline
        numberOfLines={3}
        maxLength={200}
      />
      
      <Text style={styles.label}>
        Stake Amount (MON) - Min: {minimumStake === '0' ? 'Loading...' : minimumStake}
      </Text>
      <TextInput
        style={[styles.input, !isValidStake() && styles.invalidInput]}
        value={stakeAmount}
        onChangeText={setStakeAmount}
        placeholder="0.001"
        keyboardType="decimal-pad"
      />
      
      <TouchableOpacity
        style={[
          styles.button,
          (!description.trim() || !isValidStake() || isLoading) &&
            styles.disabledButton,
        ]}
        onPress={createTodo}
        disabled={!description.trim() || !isValidStake() || isLoading}>
        <Text style={styles.buttonText}>
          {isLoading ? 'Creating...' : 'Create Todo'}
        </Text>
      </TouchableOpacity>

      <RequestModal
        isVisible={requestModalVisible}
        isLoading={isLoading}
        rpcResponse={data}
        rpcError={error ? 'Error creating todo' : undefined}
        onClose={() => setRequestModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 20,
    margin: 16,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#fafafa',
  },
  invalidInput: {
    borderColor: '#ff6b6b',
    backgroundColor: '#ffebeb',
  },
  button: {
    backgroundColor: '#2196F3',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 20,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  connectMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 20,
  },
});