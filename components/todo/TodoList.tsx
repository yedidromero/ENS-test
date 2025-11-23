import React, {useState, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  RefreshControl,
  TouchableOpacity,
} from 'react-native';
import {BrowserProvider, Contract} from 'ethers';
import {useAccount, useWalletClient} from 'wagmi';
import {ethers} from 'ethers';
import {TodoItem, TodoItemData} from './TodoItem';
import {CreateTodo} from './CreateTodo';
import {
  stakingTodoListABI,
  STAKING_TODO_CONTRACT_ADDRESS,
} from '../../utils/stakingTodoListABI';

export function TodoList() {
  const [todos, setTodos] = useState<TodoItemData[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [contractStats, setContractStats] = useState({
    totalTodos: 0,
    contractBalance: '0',
  });
  const {address, isConnected} = useAccount();
  const {data: walletClient} = useWalletClient();

  useEffect(() => {
    console.log('TodoList useEffect:', {isConnected, hasProvider: !!walletClient, address});
    setError(null);
    
    if (isConnected && walletClient && address) {
      loadTodos();
      loadContractStats();
    } else {
      setTodos([]);
      setContractStats({totalTodos: 0, contractBalance: '0'});
      setLoading(false);
    }
  }, [isConnected, walletClient, address]);

  const loadTodos = async () => {
    if (!walletClient || !address) {
      console.log('loadTodos: Missing provider or address');
      return;
    }

    console.log('loadTodos: Starting to load todos for', address);
    setLoading(true);
    setError(null);
    
    const timeoutId = setTimeout(() => {
      console.log('loadTodos: Timeout reached, stopping loading');
      setLoading(false);
      setError('Request timed out. Please check your connection and try again.');
    }, 15000);
    
    try {
      console.log('Creating provider and contract...');
      const ethersProvider = new BrowserProvider(walletClient!);
      const signer = await ethersProvider.getSigner();
      
      const network = await ethersProvider.getNetwork();
      const networkName = network.name === 'unknown' ? 'Monad Testnet' : network.name;
      console.log('Current network:', network.chainId.toString(), networkName);
      
      if (network.chainId !== 10143n) {
        throw new Error(`Wrong network. Please switch to Monad Testnet (Chain ID: 10143). Currently on: ${network.chainId.toString()}`);
      }
      
      const contract = new Contract(
        STAKING_TODO_CONTRACT_ADDRESS,
        stakingTodoListABI,
        signer,
      );

      const code = await ethersProvider.getCode(STAKING_TODO_CONTRACT_ADDRESS);
      if (code === '0x') {
        throw new Error(`Contract not found at address ${STAKING_TODO_CONTRACT_ADDRESS}. Please verify the contract address.`);
      }
      
      console.log('Contract verified, calling getUserTodoDetails...');
      
      const userTodos = await contract.getUserTodoDetails(address);
      
      clearTimeout(timeoutId);
      console.log('Got user todos:', userTodos.length);
      
      const formattedTodos: TodoItemData[] = userTodos.map((todo: any) => ({
        id: Number(todo.id),
        description: todo.description,
        completed: todo.completed,
        stakedAmount: todo.stakedAmount.toString(),
        owner: todo.owner,
        createdAt: Number(todo.createdAt),
      }));

      formattedTodos.sort((a, b) => b.createdAt - a.createdAt);
      
      console.log('Formatted todos:', formattedTodos);
      setTodos(formattedTodos);
      setError(null);
    } catch (error: any) {
      clearTimeout(timeoutId);
      console.error('Error loading todos:', error);
      
      let errorMessage = 'Failed to load todos';
      if (error.message.includes('timeout') || error.message.includes('network')) {
        errorMessage = 'Network timeout. Please check your connection to Monad testnet and try again.';
      } else if (error.message.includes('insufficient funds')) {
        errorMessage = 'You may need testnet MON tokens for gas fees. Please get some from the faucet.';
      } else if (error.message.includes('Wrong network')) {
        errorMessage = error.message;
      } else if (error.message.includes('Contract not found')) {
        errorMessage = error.message;
      } else if (error.message.includes('missing revert data') || error.message.includes('CALL_EXCEPTION')) {
        console.log('Contract call failed, showing empty state');
        setTodos([]);
        setError(null);
        setLoading(false);
        return;
      } else {
        errorMessage = `Failed to load todos: ${error.message || 'Unknown error'}`;
      }
      
      setError(errorMessage);
      setTodos([]);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  };

  const loadContractStats = async () => {
    if (!walletClient || !address) {
      console.log('loadContractStats: Missing provider or address');
      return;
    }

    try {
      console.log('loadContractStats: Loading contract stats...');
      const ethersProvider = new BrowserProvider(walletClient!);
      const signer = await ethersProvider.getSigner();
      const contract = new Contract(
        STAKING_TODO_CONTRACT_ADDRESS,
        stakingTodoListABI,
        signer,
      );

      const [totalCount, balance] = await Promise.all([
        contract.getTotalTodoCount(),
        contract.getContractBalance(),
      ]);

      console.log('Contract stats:', {totalCount: Number(totalCount), balance: ethers.formatEther(balance)});
      
      setContractStats({
        totalTodos: Number(totalCount),
        contractBalance: ethers.formatEther(balance),
      });
    } catch (error) {
      console.error('Error loading contract stats:', error);
      console.log('Using default stats due to error');
    }
  };

  const handleTodoCreated = () => {
    loadTodos();
    loadContractStats();
    setShowCreateForm(false);
  };

  const handleTodoCompleted = () => {
    loadTodos();
    loadContractStats();
  };

  const renderStats = () => (
    <View style={styles.statsContainer}>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{todos.length}</Text>
        <Text style={styles.statLabel}>Your Todos</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>{contractStats.totalTodos}</Text>
        <Text style={styles.statLabel}>Total Todos</Text>
      </View>
      <View style={styles.statBox}>
        <Text style={styles.statNumber}>
          {parseFloat(contractStats.contractBalance).toFixed(4)}
        </Text>
        <Text style={styles.statLabel}>Total Staked (MON)</Text>
      </View>
    </View>
  );

  const completedTodos = todos.filter(todo => todo.completed);
  const pendingTodos = todos.filter(todo => !todo.completed);

  if (!isConnected) {
    return (
      <View style={styles.container}>
        <Text style={styles.connectMessage}>
          Connect your wallet to view and create todos
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Staking Todo List</Text>
      
      {renderStats()}
      
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.createButton}
          onPress={() => setShowCreateForm(!showCreateForm)}>
          <Text style={styles.createButtonText}>
            {showCreateForm ? '✕ Cancel' : '+ Create Todo'}
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.refreshButton} onPress={loadTodos}>
          <Text style={styles.refreshButtonText}>⟳ Refresh</Text>
        </TouchableOpacity>
      </View>

      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={loadTodos}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {showCreateForm && (
        <CreateTodo onTodoCreated={handleTodoCreated} />
      )}

      {loading && !showCreateForm && (
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading todos...</Text>
        </View>
      )}

      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={loading} onRefresh={loadTodos} />
        }>
        
        {pendingTodos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Pending Todos ({pendingTodos.length})
            </Text>
            {pendingTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onComplete={handleTodoCompleted}
              />
            ))}
          </>
        )}
        
        {completedTodos.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>
              Completed Todos ({completedTodos.length})
            </Text>
            {completedTodos.map(todo => (
              <TodoItem
                key={todo.id}
                todo={todo}
                onComplete={handleTodoCompleted}
              />
            ))}
          </>
        )}
        
        {todos.length === 0 && !loading && (
          <View style={styles.emptyState}>
            <Text style={styles.emptyText}>No todos yet!</Text>
            <Text style={styles.emptySubtext}>
              Create your first todo by staking some MON tokens
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingVertical: 20,
  },
  connectMessage: {
    textAlign: 'center',
    fontSize: 16,
    color: '#666',
    padding: 40,
    margin: 20,
    backgroundColor: 'white',
    borderRadius: 12,
  },
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  statBox: {
    backgroundColor: 'white',
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  statNumber: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2196F3',
  },
  statLabel: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    marginBottom: 16,
    gap: 8,
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flex: 1,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  refreshButton: {
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: '#e8e8e8',
  },
  emptyState: {
    alignItems: 'center',
    padding: 40,
    marginTop: 40,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#999',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#bbb',
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#ffebeb',
    margin: 16,
    padding: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ff6b6b',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    marginBottom: 8,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#ff6b6b',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    padding: 20,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});