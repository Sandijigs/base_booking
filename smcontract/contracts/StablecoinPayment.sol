// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import { IERC20 } from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import { SafeERC20 } from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import { Ownable } from "@openzeppelin/contracts/access/Ownable.sol";
import { ReentrancyGuard } from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./library/EventTicketingLib.sol";
import { ITicketNft } from "./interfaces/Interface.sol";
import "./library/Error.sol";

/**
 * @title StablecoinPayment
 * @notice Extension to EventTicketing that supports stablecoin payments (USDC, USDT, etc.)
 * @dev Allows users to pay for tickets using ERC20 stablecoins instead of native tokens
 */
contract StablecoinPayment is Ownable, ReentrancyGuard {
    using SafeERC20 for IERC20;
    using EventTicketingLib for *;

    // -------- Types --------

    enum PaymentToken { NATIVE, USDC, USDT }

    // -------- Storage --------

    ITicketNft public ticketNft;

    /// @notice Supported stablecoin addresses
    mapping(PaymentToken => address) public supportedTokens;

    /// @notice ticketId => Ticket data
    mapping(uint256 => EventTicketingLib.Ticket) public tickets;

    /// @notice ticketId => list of registrants
    mapping(uint256 => address[]) private registrants;

    /// @notice ticketId => (registrant => registered?)
    mapping(uint256 => mapping(address => bool)) public isRegistered;

    /// @notice ticketId => (registrant => amount paid)
    mapping(uint256 => mapping(address => uint256)) public paidAmount;

    /// @notice ticketId => payment token used for that ticket
    mapping(uint256 => PaymentToken) public ticketPaymentToken;

    /// @notice Incremental ticket id counter
    uint256 private _ticketIds;

    /// @notice Platform fee in basis points (1e4 = 100%)
    uint16 public platformFeeBps;

    /// @notice Platform fee recipient
    address payable public feeRecipient;

    /// @dev Refund batching cursor
    mapping(uint256 => uint256) private _refundCursor;

    /// @dev Max refunds per call
    uint256 private constant _REFUND_BATCH_SIZE = 150;

    // -------- Events --------

    event TicketCreated(
        uint256 indexed ticketId,
        address indexed creator,
        uint256 price,
        string eventName,
        PaymentToken paymentToken
    );

    event RegisteredWithStablecoin(
        uint256 indexed ticketId,
        address indexed registrant,
        uint256 nftTokenId,
        PaymentToken paymentToken,
        uint256 amount
    );

    event SupportedTokenUpdated(PaymentToken indexed tokenType, address tokenAddress);

    // -------- Constructor --------

    constructor(
        address ticketNftAddress,
        address payable feeRecipient_,
        uint16 feeBps,
        address usdcAddress,
        address usdtAddress
    ) Ownable(msg.sender) {
        if (ticketNftAddress == address(0) || feeRecipient_ == address(0)) {
            revert EventTicketingErrors.ZeroAddress();
        }
        if (feeBps > 10_000) {
            revert EventTicketingErrors.InvalidFee(feeBps);
        }
        
        ticketNft = ITicketNft(ticketNftAddress);
        feeRecipient = feeRecipient_;
        platformFeeBps = feeBps;

        // Set supported stablecoins
        supportedTokens[PaymentToken.USDC] = usdcAddress;
        supportedTokens[PaymentToken.USDT] = usdtAddress;
    }

    // -------- Admin Functions --------

    /**
     * @notice Update supported token address
     * @param tokenType Type of payment token (USDC, USDT)
     * @param tokenAddress New token address
     */
    function setSupportedToken(PaymentToken tokenType, address tokenAddress) external onlyOwner {
        require(tokenType != PaymentToken.NATIVE, "Cannot set native token");
        require(tokenAddress != address(0), "Zero address");
        supportedTokens[tokenType] = tokenAddress;
        emit SupportedTokenUpdated(tokenType, tokenAddress);
    }

    /**
     * @notice Update platform fee
     * @param feeBps New fee in basis points (<= 10_000)
     */
    function setServiceFee(uint16 feeBps) external onlyOwner {
        if (feeBps > 10_000) {
            revert EventTicketingErrors.InvalidFee(feeBps);
        }
        platformFeeBps = feeBps;
    }

    /**
     * @notice Update platform fee recipient
     * @param newRecipient Address of new recipient
     */
    function setFeeRecipient(address payable newRecipient) external onlyOwner {
        if (newRecipient == address(0)) {
            revert EventTicketingErrors.ZeroAddress();
        }
        feeRecipient = newRecipient;
    }

    // -------- Ticket Lifecycle --------

    /**
     * @notice Create a new event with specified payment token
     * @param price Price in token units (6 decimals for USDC/USDT, 18 for native)
     * @param eventName Name of the event
     * @param description Event description
     * @param eventTimestamp Unix timestamp in the future
     * @param maxSupply Maximum number of seats
     * @param metadata Arbitrary metadata string
     * @param location Event location
     * @param paymentToken Payment token to accept (NATIVE, USDC, or USDT)
     * @return newId The newly created ticket/event id
     */
    function createTicket(
        uint256 price,
        string calldata eventName,
        string calldata description,
        uint256 eventTimestamp,
        uint256 maxSupply,
        string calldata metadata,
        string calldata location,
        PaymentToken paymentToken
    ) external returns (uint256 newId) {
        if (eventTimestamp <= block.timestamp) {
            revert EventTicketingErrors.InvalidTimestamp();
        }
        if (maxSupply == 0) {
            revert EventTicketingErrors.InvalidMaxSupply();
        }
        if (bytes(eventName).length == 0) {
            revert EventTicketingErrors.InvalidName();
        }
        if (price == 0) {
            revert EventTicketingErrors.InvalidPrice();
        }

        unchecked { _ticketIds++; }
        newId = _ticketIds;

        tickets[newId] = EventTicketingLib.Ticket({
            id: newId,
            creator: payable(msg.sender),
            price: price,
            eventName: eventName,
            description: description,
            eventTimestamp: eventTimestamp,
            location: location,
            closed: false,
            canceled: false,
            metadata: metadata,
            maxSupply: maxSupply,
            sold: 0,
            totalCollected: 0,
            totalRefunded: 0,
            proceedsWithdrawn: false
        });

        ticketPaymentToken[newId] = paymentToken;

        emit TicketCreated(newId, msg.sender, price, eventName, paymentToken);
    }

    /**
     * @notice Register for an event using stablecoins
     * @param ticketId The event id
     * @return nftTokenId The minted NFT token id
     */
    function registerWithStablecoin(uint256 ticketId) external nonReentrant returns (uint256 nftTokenId) {
        EventTicketingLib.Ticket storage t = tickets[ticketId];
        if (t.id == 0) {
            revert EventTicketingErrors.EventNotFound();
        }
        if (t.closed) {
            revert EventTicketingErrors.EventClosed();
        }
        if (t.canceled) {
            revert EventTicketingErrors.EventCanceled();
        }
        if (block.timestamp >= t.eventTimestamp) {
            revert EventTicketingErrors.EventNotPassed();
        }
        if (isRegistered[ticketId][msg.sender]) {
            revert EventTicketingErrors.AlreadyRegistered();
        }
        if (t.sold >= t.maxSupply) {
            revert EventTicketingErrors.SoldOut();
        }

        PaymentToken paymentToken = ticketPaymentToken[ticketId];
        require(paymentToken != PaymentToken.NATIVE, "Use native registration");
        
        address tokenAddress = supportedTokens[paymentToken];
        require(tokenAddress != address(0), "Token not supported");

        // Transfer stablecoins from user to this contract
        IERC20(tokenAddress).safeTransferFrom(msg.sender, address(this), t.price);

        // Effects
        paidAmount[ticketId][msg.sender] = t.price;
        t.sold++;
        t.totalCollected += t.price;
        registrants[ticketId].push(msg.sender);
        isRegistered[ticketId][msg.sender] = true;

        // Mint NFT
        nftTokenId = ticketNft.mintForRegistrant(
            msg.sender, 
            ticketId, 
            t.eventName, 
            t.description, 
            t.eventTimestamp, 
            t.location
        );

        emit RegisteredWithStablecoin(ticketId, msg.sender, nftTokenId, paymentToken, t.price);
    }

    /**
     * @notice Register for an event using native tokens (ETH/BASE)
     * @param ticketId The event id
     * @return nftTokenId The minted NFT token id
     */
    function register(uint256 ticketId) external payable nonReentrant returns (uint256 nftTokenId) {
        EventTicketingLib.Ticket storage t = tickets[ticketId];
        if (t.id == 0) {
            revert EventTicketingErrors.EventNotFound();
        }
        if (t.closed) {
            revert EventTicketingErrors.EventClosed();
        }
        if (t.canceled) {
            revert EventTicketingErrors.EventCanceled();
        }
        if (block.timestamp >= t.eventTimestamp) {
            revert EventTicketingErrors.EventNotPassed();
        }
        if (isRegistered[ticketId][msg.sender]) {
            revert EventTicketingErrors.AlreadyRegistered();
        }
        if (t.sold >= t.maxSupply) {
            revert EventTicketingErrors.SoldOut();
        }

        PaymentToken paymentToken = ticketPaymentToken[ticketId];
        require(paymentToken == PaymentToken.NATIVE, "Use stablecoin registration");
        
        if (msg.value != t.price) {
            revert EventTicketingErrors.InvalidPaymentAmount(t.price, msg.value);
        }

        // Effects
        paidAmount[ticketId][msg.sender] = t.price;
        t.sold++;
        t.totalCollected += t.price;
        registrants[ticketId].push(msg.sender);
        isRegistered[ticketId][msg.sender] = true;

        // Mint NFT
        nftTokenId = ticketNft.mintForRegistrant(
            msg.sender,
            ticketId,
            t.eventName,
            t.description,
            t.eventTimestamp,
            t.location
        );

        emit RegisteredWithStablecoin(ticketId, msg.sender, nftTokenId, paymentToken, t.price);
    }

    /**
     * @notice Organizer withdraws proceeds after event
     * @param ticketId The event id
     */
    function withdrawProceeds(uint256 ticketId) external nonReentrant {
        EventTicketingLib.Ticket storage t = tickets[ticketId];
        if (t.id == 0) {
            revert EventTicketingErrors.EventNotFound();
        }
        if (msg.sender != t.creator) {
            revert EventTicketingErrors.OnlyCreator();
        }
        if (t.canceled) {
            revert EventTicketingErrors.EventCanceled();
        }
        if (block.timestamp < t.eventTimestamp) {
            revert EventTicketingErrors.EventNotPassed();
        }
        if (t.proceedsWithdrawn) {
            revert EventTicketingErrors.ProceedsAlreadyWithdrawn();
        }

        uint256 net = t.totalCollected - t.totalRefunded;
        uint256 fee = (net * platformFeeBps) / 10_000;
        uint256 toCreator = net - fee;

        t.proceedsWithdrawn = true;

        PaymentToken paymentToken = ticketPaymentToken[ticketId];
        
        if (paymentToken == PaymentToken.NATIVE) {
            // Transfer native tokens
            if (fee > 0) {
                (bool feeOk, ) = feeRecipient.call{value: fee}("");
                require(feeOk, "Fee transfer failed");
            }
            if (toCreator > 0) {
                (bool creatorOk, ) = t.creator.call{value: toCreator}("");
                require(creatorOk, "Creator transfer failed");
            }
        } else {
            // Transfer stablecoins
            address tokenAddress = supportedTokens[paymentToken];
            if (fee > 0) {
                IERC20(tokenAddress).safeTransfer(feeRecipient, fee);
            }
            if (toCreator > 0) {
                IERC20(tokenAddress).safeTransfer(t.creator, toCreator);
            }
        }
    }

    /**
     * @notice Claim refund for canceled event
     * @param ticketId The event id
     */
    function claimRefund(uint256 ticketId) external nonReentrant {
        EventTicketingLib.Ticket storage t = tickets[ticketId];
        if (t.id == 0) {
            revert EventTicketingErrors.EventNotFound();
        }
        if (!t.canceled) {
            revert EventTicketingErrors.EventNotCanceled();
        }

        uint256 amt = paidAmount[ticketId][msg.sender];
        if (amt == 0) {
            revert EventTicketingErrors.NothingToRefund();
        }

        paidAmount[ticketId][msg.sender] = 0;
        t.totalRefunded += amt;

        PaymentToken paymentToken = ticketPaymentToken[ticketId];
        
        if (paymentToken == PaymentToken.NATIVE) {
            (bool ok, ) = payable(msg.sender).call{value: amt}("");
            require(ok, "Refund transfer failed");
        } else {
            address tokenAddress = supportedTokens[paymentToken];
            IERC20(tokenAddress).safeTransfer(msg.sender, amt);
        }
    }

    // -------- Views --------

    /**
     * @notice Get ticket details
     * @param ticketId The event id
     */
    function getTicket(uint256 ticketId) external view returns (EventTicketingLib.Ticket memory) {
        return tickets[ticketId];
    }

    /**
     * @notice Get payment token for a ticket
     * @param ticketId The event id
     */
    function getPaymentToken(uint256 ticketId) external view returns (PaymentToken) {
        return ticketPaymentToken[ticketId];
    }

    /**
     * @notice Check if user is registered
     * @param ticketId The event id
     * @param user User address
     */
    function checkRegistration(uint256 ticketId, address user) external view returns (bool) {
        return isRegistered[ticketId][user];
    }

    // -------- Safety --------

    receive() external payable {}
    fallback() external payable {}
}
