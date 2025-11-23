// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/* ============ Utilidades mínimas: Ownable, Pausable, ReentrancyGuard ============ */

abstract contract Ownable {
    address private _owner;
    event OwnershipTransferred(address indexed previousOwner, address indexed newOwner);
    constructor(address initialOwner) {
        require(initialOwner != address(0), "Ownable: zero owner");
        _owner = initialOwner;
        emit OwnershipTransferred(address(0), initialOwner);
    }
    modifier onlyOwner() { require(msg.sender == _owner, "Ownable: not owner"); _; }
    function owner() public view returns (address) { return _owner; }
    function transferOwnership(address newOwner) external onlyOwner {
        require(newOwner != address(0), "Ownable: zero owner");
        emit OwnershipTransferred(_owner, newOwner);
        _owner = newOwner;
    }
}

abstract contract Pausable {
    bool private _paused;
    event Paused(address account);
    event Unpaused(address account);
    constructor() { _paused = false; }
    modifier whenNotPaused() { require(!_paused, "Pausable: paused"); _; }
    modifier whenPaused() { require(_paused, "Pausable: not paused"); _; }
    function paused() public view returns (bool) { return _paused; }
    function _pause() internal whenNotPaused { _paused = true; emit Paused(msg.sender); }
    function _unpause() internal whenPaused { _paused = false; emit Unpaused(msg.sender); }
}

abstract contract ReentrancyGuard {
    uint256 private constant _ENTERED = 2;
    uint256 private constant _NOT_ENTERED = 1;
    uint256 private _status;
    constructor() { _status = _NOT_ENTERED; }
    modifier nonReentrant() {
        require(_status != _ENTERED, "ReentrancyGuard: reentrant");
        _status = _ENTERED;
        _;
        _status = _NOT_ENTERED;
    }
}

/* ============================ STAKING VAULT (MON) ============================ */
/**
 * @title StakingVaultNative
 * @notice Pool de staking en MON nativo que recibe recompensas vía fund().
 *         Reparte recompensas proporcionalmente a quienes stakearon MON.
 */
contract StakingVaultNative is Ownable, Pausable, ReentrancyGuard {
    uint256 public totalStaked;           // MON staked dentro del vault
    uint256 public totalRewardsFunded;    // MON totales que entraron como rewards
    uint256 private accRewardPerShare;    // acumulador (escala 1e18)
    uint256 private pendingRewards;       // rewards recibidas cuando no hay stakers

    address public authorizedFunder;      // contrato autorizado a llamar fund() (tu Stories)

    struct UserInfo {
        uint256 amount;       // MON staked por el usuario
        uint256 rewardDebt;   // accounting: amount*acc/1e18 ya contado
    }
    mapping(address => UserInfo) public users;

    event AuthorizedFunderUpdated(address funder);
    event RewardsFunded(address indexed from, uint256 amount);
    event Staked(address indexed user, uint256 amount);
    event Unstaked(address indexed user, uint256 amount);
    event Claimed(address indexed user, uint256 amount);

    constructor(address _initialOwner) Ownable(_initialOwner) {}

    function setAuthorizedFunder(address _funder) external onlyOwner {
        authorizedFunder = _funder;
        emit AuthorizedFunderUpdated(_funder);
    }

    /* --- Internals --- */
    function _updatePool() internal {
        if (pendingRewards > 0 && totalStaked > 0) {
            accRewardPerShare += (pendingRewards * 1e18) / totalStaked;
            pendingRewards = 0;
        }
    }

    /* --- Funding de recompensas (10% de likes) --- */
    function fund() external payable nonReentrant {
        // Opcional: si quieres limitar quién puede fondear:
        if (authorizedFunder != address(0)) {
            require(msg.sender == authorizedFunder, "not authorized");
        }
        require(msg.value > 0, "no value");
        totalRewardsFunded += msg.value;
        // si hay stakers, acumula, si no, se queda pendiente
        if (totalStaked == 0) {
            pendingRewards += msg.value;
        } else {
            accRewardPerShare += (msg.value * 1e18) / totalStaked;
        }
        emit RewardsFunded(msg.sender, msg.value);
    }

    /* --- Stake/Unstake/Claim --- */
    function stake() external payable nonReentrant whenNotPaused {
        require(msg.value > 0, "no value");
        _updatePool();
        UserInfo storage u = users[msg.sender];

        // paga pendientes si ya tenía stake
        if (u.amount > 0) {
            uint256 pending = ((u.amount * accRewardPerShare) / 1e18) - u.rewardDebt;
            if (pending > 0) {
                (bool ok, ) = payable(msg.sender).call{value: pending}("");
                require(ok, "claim fail");
                emit Claimed(msg.sender, pending);
            }
        }

        totalStaked += msg.value;
        u.amount += msg.value;
        u.rewardDebt = (u.amount * accRewardPerShare) / 1e18;

        emit Staked(msg.sender, msg.value);
    }

    function unstake(uint256 amount) external nonReentrant whenNotPaused {
        require(amount > 0, "zero amount");
        UserInfo storage u = users[msg.sender];
        require(u.amount >= amount, "not enough stake");

        _updatePool();

        // paga pendientes antes de retirar
        uint256 pending = ((u.amount * accRewardPerShare) / 1e18) - u.rewardDebt;
        if (pending > 0) {
            (bool ok1, ) = payable(msg.sender).call{value: pending}("");
            require(ok1, "claim fail");
            emit Claimed(msg.sender, pending);
        }

        u.amount -= amount;
        totalStaked -= amount;
        u.rewardDebt = (u.amount * accRewardPerShare) / 1e18;

        (bool ok2, ) = payable(msg.sender).call{value: amount}("");
        require(ok2, "withdraw fail");
        emit Unstaked(msg.sender, amount);
    }

    function claim() external nonReentrant whenNotPaused {
        _updatePool();
        UserInfo storage u = users[msg.sender];
        uint256 pending = ((u.amount * accRewardPerShare) / 1e18) - u.rewardDebt;
        require(pending > 0, "nothing to claim");
        u.rewardDebt = (u.amount * accRewardPerShare) / 1e18;
        (bool ok, ) = payable(msg.sender).call{value: pending}("");
        require(ok, "claim fail");
        emit Claimed(msg.sender, pending);
    }

    /* --- Views --- */
    function pendingReward(address user) external view returns (uint256) {
        UserInfo memory u = users[user];
        uint256 _acc = accRewardPerShare;
        if (pendingRewards > 0 && totalStaked > 0) {
            _acc += (pendingRewards * 1e18) / totalStaked;
        }
        return ((u.amount * _acc) / 1e18) - u.rewardDebt;
    }

    /* --- Admin pause --- */
    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }
}

/* ============================ STORIES (split 20/10/70) ============================ */

interface IStakingVaultNative {
    function fund() external payable;
}

/**
 * @title StoriesAndLikesNativeSplitStaking
 * @notice Perfiles, planes, publicaciones y likes (MON nativo).
 *         Split del like: 20% plataforma (treasury), 10% stakingVault, 70% autor.
 * @dev Extendido con soporte para ENS: cada perfil puede almacenar su subdominio ENS.
 */
contract StoriesAndLikesNativeSplitStaking is Ownable, Pausable, ReentrancyGuard {
    /* Config */
    address public treasury;          // 20%
    address public stakingVault;      // 10%
    uint16  public platformBps;       // ej. 2000 = 20%
    uint16  public stakingBps;        // ej. 1000 = 10%
    uint256 public likePriceWei;      // e.g., 0.01 MON = 1e16

    /* Perfiles */
    struct Profile {
        string displayName;
        string avatarURI;     // ipfs://... o https://...
        uint256 planId;       // 0 si ninguno
        uint64  planExpiresAt;
        bool    exists;

        // === ENS ===
        bytes32 ensNode;      // namehash del subdominio ENS (ej. namehash("sakura.monatoons.eth"))
        string  ensName;      // "sakura.monatoons.eth"
    }
    mapping(address => Profile) public profiles;

    /* Planes (precio en WEI) */
    struct Plan {
        string name;
        uint256 price;        // precio por período en wei
        uint32  periodSecs;   // duración (e.g., 30 días)
        bool    active;
    }
    uint256 public nextPlanId;
    mapping(uint256 => Plan) public plans;

    /* Publicaciones */
    struct Publication {
        uint256 id;
        address author;
        string  title;
        string  imageURI;
        string  storyURI;
        uint64  createdAt;
        uint32  likeCount;
        bool    exists;
    }
    uint256 public nextPubId;
    mapping(uint256 => Publication) public publications;
    mapping(address => uint256[]) public userPubIds;
    mapping(uint256 => mapping(address => bool)) public likedBy; // 1 like por usuario

    /* Eventos */
    event FeeTargetsUpdated(address treasury, uint16 platformBps, address stakingVault, uint16 stakingBps);
    event LikePriceUpdated(uint256 likePriceWei);
    event ProfileUpserted(address indexed user, string displayName, string avatarURI);
    event PlanCreated(uint256 indexed planId, string name, uint256 priceWei, uint32 periodSecs, bool active);
    event PlanUpdated(uint256 indexed planId, string name, uint256 priceWei, uint32 periodSecs, bool active);
    event Subscribed(address indexed user, uint256 indexed planId, uint64 newExpiresAt, uint256 periods, uint256 paidWei);
    event PublicationCreated(uint256 indexed pubId, address indexed author, string title, string imageURI, string storyURI);
    event PublicationLiked(
        uint256 indexed pubId,
        address indexed liker,
        address indexed author,
        uint256 totalWei,
        uint256 authorWei,
        uint256 platformWei,
        uint256 stakingWei
    );

    // === ENS: nuevo evento ===
    event ProfileEnsLinked(
        address indexed user,
        string ensName,
        bytes32 ensNode
    );

    constructor(
        address _treasury,
        address _stakingVault,
        uint256 _likePriceWei,
        uint16  _platformBps,   // 2000 = 20%
        uint16  _stakingBps     // 1000 = 10%
    ) Ownable(msg.sender) {
        _setFeeTargets(_treasury, _platformBps, _stakingVault, _stakingBps);
        likePriceWei = _likePriceWei;
    }

    /* ===== Admin ===== */
    function setFeeTargets(address _treasury, uint16 _platformBps, address _stakingVault, uint16 _stakingBps) external onlyOwner {
        _setFeeTargets(_treasury, _platformBps, _stakingVault, _stakingBps);
    }
    function _setFeeTargets(address _treasury, uint16 _platformBps, address _stakingVault, uint16 _stakingBps) internal {
        require(_platformBps + _stakingBps <= 10_000, "bps sum > 100%");
        if (_platformBps > 0) require(_treasury != address(0), "treasury=0");
        if (_stakingBps > 0) require(_stakingVault != address(0), "staking=0");
        treasury = _treasury;
        stakingVault = _stakingVault;
        platformBps = _platformBps;
        stakingBps  = _stakingBps;
        emit FeeTargetsUpdated(treasury, platformBps, stakingVault, stakingBps);
    }

    function setLikePriceWei(uint256 _likePriceWei) external onlyOwner {
        likePriceWei = _likePriceWei;
        emit LikePriceUpdated(_likePriceWei);
    }

    function pause() external onlyOwner { _pause(); }
    function unpause() external onlyOwner { _unpause(); }

    /* ===== Perfiles ===== */
    function upsertMyProfile(string calldata _displayName, string calldata _avatarURI) external whenNotPaused {
        require(bytes(_displayName).length > 0 && bytes(_displayName).length <= 64, "bad name");
        require(bytes(_avatarURI).length > 0 && bytes(_avatarURI).length <= 200, "bad avatar");
        Profile storage p = profiles[msg.sender];
        p.displayName = _displayName;
        p.avatarURI = _avatarURI;
        if (!p.exists) { p.exists = true; }
        emit ProfileUpserted(msg.sender, _displayName, _avatarURI);
    }

    function adminSetPlan(address user, uint256 planId, uint64 expiresAt) external onlyOwner {
        require(user != address(0), "user=0");
        if (planId != 0) { require(plans[planId].active, "plan inactive"); }
        Profile storage p = profiles[user];
        if (!p.exists) { p.exists = true; }
        p.planId = planId;
        p.planExpiresAt = expiresAt;
        emit Subscribed(user, planId, expiresAt, 0, 0);
    }

    /**
     * @notice El usuario liga su ENS (subdominio) a su perfil de autor.
     * @dev Asumimos que el subdominio ya fue creado en Ethereum por otro contrato.
     *      Aquí sólo guardamos el namehash (ensNode) y el texto completo (ensName).
     */
    function linkMyEns(bytes32 _ensNode, string calldata _ensName) external whenNotPaused {
        Profile storage p = profiles[msg.sender];
        require(p.exists, "profile missing");
        require(p.ensNode == bytes32(0), "ENS already linked");
        require(bytes(_ensName).length > 0 && bytes(_ensName).length <= 200, "bad ensName");

        p.ensNode = _ensNode;
        p.ensName = _ensName;

        emit ProfileEnsLinked(msg.sender, _ensName, _ensNode);
    }

    /* ===== Planes (precio en wei) ===== */
    function createPlan(string calldata name, uint256 priceWei, uint32 periodSecs, bool active) external onlyOwner {
        require(bytes(name).length > 0 && bytes(name).length <= 32, "bad name");
        require(periodSecs > 0, "bad period");
        uint256 id = nextPlanId++;
        plans[id] = Plan({name: name, price: priceWei, periodSecs: periodSecs, active: active});
        emit PlanCreated(id, name, priceWei, periodSecs, active);
    }

    function updatePlan(uint256 planId, string calldata name, uint256 priceWei, uint32 periodSecs, bool active) external onlyOwner {
        require(planId < nextPlanId, "no plan");
        require(bytes(name).length > 0 && bytes(name).length <= 32, "bad name");
        require(periodSecs > 0, "bad period");
        plans[planId] = Plan({name: name, price: priceWei, periodSecs: periodSecs, active: active});
        emit PlanUpdated(planId, name, priceWei, periodSecs, active);
    }

    /* ===== Suscripciones (100% a treasury) ===== */
    function subscribe(uint256 planId, uint256 periods) external payable nonReentrant whenNotPaused {
        require(planId < nextPlanId, "no plan");
        require(periods > 0 && periods <= 36, "bad periods");
        Plan memory pl = plans[planId];
        require(pl.active, "inactive");

        uint256 cost = pl.price * periods;
        require(msg.value == cost, "bad value");

        (bool ok, ) = payable(treasury).call{value: cost}("");
        require(ok, "pay fail");

        Profile storage p = profiles[msg.sender];
        if (!p.exists) { p.exists = true; }
        p.planId = planId;
        uint64 base = p.planExpiresAt > block.timestamp ? p.planExpiresAt : uint64(block.timestamp);
        p.planExpiresAt = base + uint64(pl.periodSecs) * uint64(periods);

        emit Subscribed(msg.sender, planId, p.planExpiresAt, periods, cost);
    }

    function hasActivePlan(address user) public view returns (bool) {
        Profile storage p = profiles[user];
        return p.exists && p.planId < nextPlanId && plans[p.planId].active && p.planExpiresAt >= block.timestamp;
    }

    /* ===== Publicaciones ===== */
    function createPublication(string calldata title, string calldata imageURI, string calldata storyURI) external whenNotPaused {
        require(hasActivePlan(msg.sender), "plan required");
        require(bytes(imageURI).length > 0 && bytes(imageURI).length <= 200, "bad image");
        require(bytes(storyURI).length > 0 && bytes(storyURI).length <= 200, "bad story");
        require(bytes(title).length <= 80, "title too long");

        uint256 id = nextPubId++;
        publications[id] = Publication({
            id: id,
            author: msg.sender,
            title: title,
            imageURI: imageURI,
            storyURI: storyURI,
            createdAt: uint64(block.timestamp),
            likeCount: 0,
            exists: true
        });
        userPubIds[msg.sender].push(id);
        emit PublicationCreated(id, msg.sender, title, imageURI, storyURI);
    }

    /* ===== Like: 20% plataforma, 10% staking, 70% autor ===== */
    function like(uint256 pubId) external payable nonReentrant whenNotPaused {
        require(pubId < nextPubId && publications[pubId].exists, "no pub");
        require(!likedBy[pubId][msg.sender], "already liked");
        require(msg.value == likePriceWei, "bad value");

        likedBy[pubId][msg.sender] = true;
        Publication storage pub = publications[pubId];

        uint256 platformWei = (likePriceWei * platformBps) / 10_000;
        uint256 stakingWei  = (likePriceWei * stakingBps)  / 10_000;
        uint256 authorWei   = likePriceWei - platformWei - stakingWei;

        if (platformWei > 0) {
            (bool ok1, ) = payable(treasury).call{value: platformWei}("");
            require(ok1, "platform pay fail");
        }
        if (stakingWei > 0) {
            IStakingVaultNative(stakingVault).fund{value: stakingWei}();
            // si el vault revierte, todo el like revierte (consistente)
        }
        (bool ok3, ) = payable(pub.author).call{value: authorWei}("");
        require(ok3, "author pay fail");

        pub.likeCount += 1;
        emit PublicationLiked(pubId, msg.sender, pub.author, likePriceWei, authorWei, platformWei, stakingWei);
    }

    /* Lectura */
    function getUserPublicationIds(address user) external view returns (uint256[] memory) {
        return userPubIds[user];
    }
}
