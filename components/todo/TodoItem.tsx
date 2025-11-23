import React, {useState} from 'react';
import {View, Text, StyleSheet, TouchableOpacity} from 'react-native';
import {BrowserProvider, Contract} from 'ethers';
import {useAccount, useWalletClient} from 'wagmi';
import {ethers} from 'ethers';
import {RequestModal} from './RequestModal';
import {
  stakingTodoListABI,
  STAKING_TODO_CONTRACT_ADDRESS,
} from '../../utils/stakingTodoListABI';

export interface TodoItemData {
  id: number;
  description: string;
  completed: boolean;
  stakedAmount: string;
  owner: string;
  createdAt: number;
}

interface Props {
  todo: TodoItemData;
  onComplete: () => void;
}

export function TodoItem({todo, onComplete}: Props) {
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [data, setData] = useState<string | undefined>();
  const [error, setError] = useState(false);
  const {address} = useAccount();
  const {data: walletClient} = useWalletClient();

  const completeTodo = async () => {
    if (!walletClient || todo.completed || !address) {
      return;
    }

    setData(undefined);
    setError(false);
    setIsLoading(true);
    setRequestModalVisible(true);

    try {
      const ethersProvider = new BrowserProvider(walletClient!);
      const signer = await ethersProvider.getSigner();
      const contract = new Contract(
        STAKING_TODO_CONTRACT_ADDRESS,
        stakingTodoListABI,
        signer,
      );

      const tx = await contract.completeTodo(todo.id);
      
      setData(
        `Todo completed! Transaction hash: ${tx.hash}\nUnstaked: ${ethers.formatEther(
          todo.stakedAmount,
        )} MON`,
      );
      onComplete();
    } catch (e: any) {
      console.error(e);
      setError(true);
      setData(`Error: ${e.message || 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString();
  };

  const formatStakeAmount = (amount: string) => {
    return `${ethers.formatEther(amount)} MON`;
  };

  return (
    <View style={[styles.container, todo.completed && styles.completedContainer]}>
      <View style={styles.header}>
        <Text style={styles.id}>#{todo.id}</Text>
        <Text style={styles.date}>{formatDate(todo.createdAt)}</Text>
      </View>
      
      <Text style={[styles.description, todo.completed && styles.completedText]}>
        {todo.description}
      </Text>
      
      <View style={styles.footer}>
        <Text style={styles.stake}>
          Stake: {formatStakeAmount(todo.stakedAmount)}
        </Text>
        
        {!todo.completed ? (
          <TouchableOpacity
            style={[styles.button, styles.completeButton]}
            onPress={completeTodo}
            disabled={isLoading}>
            <Text style={styles.buttonText}>
              {isLoading ? 'Completing...' : 'Complete'}
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.button, styles.completedButton]}>
            <Text style={styles.completedButtonText}>✓ Completed</Text>
          </View>
        )}
      </View>

      <RequestModal
        isVisible={requestModalVisible}
        isLoading={isLoading}
        rpcResponse={data}
        rpcError={error ? 'Error completing todo' : undefined}
        onClose={() => setRequestModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    padding: 16,
    marginVertical: 8,
    marginHorizontal: 16,
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
  completedContainer: {
    backgroundColor: '#f0f8ff',
    opacity: 0.8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  id: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  date: {
    fontSize: 12,
    color: '#999',
  },
  description: {
    fontSize: 16,
    color: '#333',
    marginBottom: 12,
    lineHeight: 22,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: '#999',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stake: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  button: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  completeButton: {
    backgroundColor: '#2196F3',
  },
  completedButton: {
    backgroundColor: '#4CAF50',
  },
  buttonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  completedButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
});