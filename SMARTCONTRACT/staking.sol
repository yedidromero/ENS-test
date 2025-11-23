// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title StakingTodoList
 * @dev A todo list contract where users must stake native tokens to create tasks
 * and get their stake back when they complete the task
 */
contract StakingTodoList {
    // Struct to represent a todo item
    struct TodoItem {
        uint256 id;
        string description;
        bool completed;
        uint256 stakedAmount;
        address owner;
        uint256 createdAt;
    }
    
    // State variables
    mapping(uint256 => TodoItem) public todoItems;
    mapping(address => uint256[]) public userTodoIds;
    uint256 public nextTodoId;
    uint256 public minimumStake;
    address public owner;
    
    // Events
    event TodoCreated(
        uint256 indexed todoId,
        address indexed user,
        string description,
        uint256 stakedAmount
    );
    
    event TodoCompleted(
        uint256 indexed todoId,
        address indexed user,
        uint256 unstakedAmount
    );
    
    event MinimumStakeUpdated(uint256 newMinimumStake);
    
    // Modifiers
    modifier onlyOwner() {
        require(msg.sender == owner, "Only contract owner can call this function");
        _;
    }
    
    modifier validTodoId(uint256 _todoId) {
        require(_todoId < nextTodoId, "Todo item does not exist");
        _;
    }
    
    modifier onlyTodoOwner(uint256 _todoId) {
        require(todoItems[_todoId].owner == msg.sender, "Not the owner of this todo item");
        _;
    }
    
    modifier todoNotCompleted(uint256 _todoId) {
        require(!todoItems[_todoId].completed, "Todo item already completed");
        _;
    }
    
    // Constructor
    constructor(uint256 _minimumStake) {
        owner = msg.sender;
        minimumStake = _minimumStake;
        nextTodoId = 0;
    }
    
    /**
     * @dev Create a new todo item by staking native tokens
     * @param _description Description of the todo item
     */
    function createTodo(string memory _description) external payable {
        require(msg.value >= minimumStake, "Insufficient stake amount");
        require(bytes(_description).length > 0, "Description cannot be empty");
        
        uint256 todoId = nextTodoId;
        
        todoItems[todoId] = TodoItem({
            id: todoId,
            description: _description,
            completed: false,
            stakedAmount: msg.value,
            owner: msg.sender,
            createdAt: block.timestamp
        });
        
        userTodoIds[msg.sender].push(todoId);
        nextTodoId++;
        
        emit TodoCreated(todoId, msg.sender, _description, msg.value);
    }
    
    /**
     * @dev Complete a todo item and unstake the tokens
     * @param _todoId ID of the todo item to complete
     */
    function completeTodo(uint256 _todoId) 
        external 
        validTodoId(_todoId)
        onlyTodoOwner(_todoId)
        todoNotCompleted(_todoId)
    {
        TodoItem storage todo = todoItems[_todoId];
        todo.completed = true;
        
        uint256 stakedAmount = todo.stakedAmount;
        
        // Transfer the staked amount back to the user
        (bool success, ) = payable(msg.sender).call{value: stakedAmount}("");
        require(success, "Failed to unstake tokens");
        
        emit TodoCompleted(_todoId, msg.sender, stakedAmount);
    }
    
    /**
     * @dev Get all todo IDs for a specific user
     * @param _user Address of the user
     * @return Array of todo IDs
     */
    function getUserTodos(address _user) external view returns (uint256[] memory) {
        return userTodoIds[_user];
    }
    
    /**
     * @dev Get details of a specific todo item
     * @param _todoId ID of the todo item
     * @return TodoItem struct
     */
    function getTodoItem(uint256 _todoId) 
        external 
        view 
        validTodoId(_todoId)
        returns (TodoItem memory) 
    {
        return todoItems[_todoId];
    }
    
    /**
     * @dev Get all todo items for a user with their details
     * @param _user Address of the user
     * @return Array of TodoItem structs
     */
    function getUserTodoDetails(address _user) external view returns (TodoItem[] memory) {
        uint256[] memory userIds = userTodoIds[_user];
        TodoItem[] memory userTodos = new TodoItem[](userIds.length);
        
        for (uint256 i = 0; i < userIds.length; i++) {
            userTodos[i] = todoItems[userIds[i]];
        }
        
        return userTodos;
    }
    
    /**
     * @dev Update the minimum stake amount (only owner)
     * @param _newMinimumStake New minimum stake amount
     */
    function updateMinimumStake(uint256 _newMinimumStake) external onlyOwner {
        minimumStake = _newMinimumStake;
        emit MinimumStakeUpdated(_newMinimumStake);
    }
    
    /**
     * @dev Get the total number of todo items created
     * @return Total count of todo items
     */
    function getTotalTodoCount() external view returns (uint256) {
        return nextTodoId;
    }
    
    /**
     * @dev Get contract balance (for monitoring purposes)
     * @return Contract balance in wei
     */
    function getContractBalance() external view returns (uint256) {
        return address(this).balance;
    }
    
    /**
     * @dev Emergency function to withdraw contract balance (only owner)
     * This should only be used in emergency situations
     */
    function emergencyWithdraw() external onlyOwner {
        (bool success, ) = payable(owner).call{value: address(this).balance}("");
        require(success, "Emergency withdrawal failed");
    }
}
