// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/// @notice Interfaz mínima del ENS NameWrapper
interface INameWrapper {
    function setSubnodeRecord(
        bytes32 parentNode,
        string calldata label,
        address owner,
        address resolver,
        uint64 ttl,
        uint32 fuses,
        uint64 expiry
    ) external;
}

/// @notice Interfaz mínima de un resolver ENS compatible (ej. Public Resolver)
interface IENSResolver {
    function setAddr(bytes32 node, address a) external;
    function setText(bytes32 node, string calldata key, string calldata value) external;
}

/**
 * @title AuthorEnsRegistrar
 * @notice Registra subdominios ENS para autores:
 *         <label>.<tu-dominio>.eth
 *
 * @dev Este contrato se despliega en Ethereum (mainnet o testnet),
 *      NO en Monad. Lo usas junto con StoriesAndLikesNativeSplitStaking
 *      para que cada autor tenga su subdominio ENS.
 */
contract AuthorEnsRegistrar {
    INameWrapper public immutable nameWrapper;
    IENSResolver public immutable defaultResolver;
    bytes32 public immutable parentNode; // namehash("monatoons.eth") o el dominio que uses

    address public admin;

    event AdminChanged(address indexed oldAdmin, address indexed newAdmin);

    event AuthorSubnameRegistered(
        address indexed author,
        string label,
        string fullEnsName,
        bytes32 node,
        string monadAddress,
        string channelUri
    );

    constructor(
        address _nameWrapper,
        address _defaultResolver,
        bytes32 _parentNode
    ) {
        require(_nameWrapper != address(0), "wrapper=0");
        require(_defaultResolver != address(0), "resolver=0");
        require(_parentNode != bytes32(0), "parent=0");

        nameWrapper = INameWrapper(_nameWrapper);
        defaultResolver = IENSResolver(_defaultResolver);
        parentNode = _parentNode;
        admin = msg.sender;
    }

    modifier onlyAdmin() {
        require(msg.sender == admin, "not admin");
        _;
    }

    function setAdmin(address _admin) external onlyAdmin {
        require(_admin != address(0), "zero admin");
        emit AdminChanged(admin, _admin);
        admin = _admin;
    }

    function labelhash(string memory label) internal pure returns (bytes32) {
        return keccak256(abi.encodePacked(label));
    }

    function nodeFor(string memory label) public view returns (bytes32) {
        return keccak256(abi.encodePacked(parentNode, labelhash(label)));
    }

    /**
     * @notice Registra un subdominio ENS para un autor.
     * @param label          El "handle" del autor, ej. "sakura"
     * @param authorEthAddress  Address del autor en Ethereum
     * @param monadAddress   Address del autor en Monad, guardado como text record
     * @param channelUri     URL/IPFS del canal del autor en tu dApp
     *
     * @dev Sólo el admin puede llamar esta función. Para el hackathon,
     *      puedes hacer que tu backend sea el admin y llame esto
     *      cuando un autor se registra en tu app.
     */
    function registerAuthorSubname(
        string calldata label,
        address authorEthAddress,
        string calldata monadAddress,
        string calldata channelUri
    ) external onlyAdmin {
        require(bytes(label).length > 0 && bytes(label).length <= 64, "bad label");
        require(authorEthAddress != address(0), "author=0");

        uint32 fuses = 0;
        uint64 expiry = type(uint64).max;

        // 1. Crear el subname en el NameWrapper
        nameWrapper.setSubnodeRecord(
            parentNode,
            label,
            authorEthAddress,          // dueño del subname
            address(defaultResolver),  // resolver por defecto
            0,                         // ttl
            fuses,
            expiry
        );

        // 2. Setear records en el resolver
        bytes32 node = nodeFor(label);

        // address principal (Ethereum)
        defaultResolver.setAddr(node, authorEthAddress);

        // text records extra: monad-address, channel-uri
        if (bytes(monadAddress).length > 0) {
            defaultResolver.setText(node, "monad-address", monadAddress);
        }
        if (bytes(channelUri).length > 0) {
            defaultResolver.setText(node, "channel-uri", channelUri);
        }

        // construir nombre completo: "<label>.tudominio.eth"
        // Nota: aquí asumo que tu dominio es "monatoons.eth".
        // Si usas otro, puedes ajustar esto o simplemente manejar
        // el nombre completo en el frontend.
        string memory fullEnsName = string(
            abi.encodePacked(label, ".monatoons.eth")
        );

        emit AuthorSubnameRegistered(
            authorEthAddress,
            label,
            fullEnsName,
            node,
            monadAddress,
            channelUri
        );
    }
}
