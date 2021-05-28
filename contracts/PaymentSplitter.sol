// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/Address.sol";
import "@openzeppelin/contracts/utils/Context.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/SafeMath.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./Timestamp.sol";

/**
 * @title PaymentSplitter
 * @dev This contract allows to split Token payments among a group of accounts. The sender does not need to be aware
 * that the Tokens will be split in this way, since it is handled transparently by the contract.
 *
 * The split can be in equal parts or in any other arbitrary proportion. The way this is specified is by assigning each
 * account to a number of shares. Of all the Tokens that this contract receives, each account will then be able to claim
 * an amount proportional to the percentage of total shares they were assigned.
 *
 * `PaymentSplitter` follows a _pull payment_ model. This means that payments are not automatically forwarded to the
 * accounts but kept in this contract, and the actual transfer is triggered as a separate step by calling the {release}
 * function.
 */
struct Record {
    uint256 shares;
    uint256 released;
}
struct RecordArchive {
    mapping(address => Record) records;
    address[] addresses;
    Record total;
}
contract PaymentSplitter is Context, Ownable {
    using SafeERC20 for IERC20;
    event PayeeAdded(address account, uint256 shares);
    event PayeeUpdated(address account, uint256 shares);
    event PayeeRemoved(address account);
    event PaymentReleased(address to, uint256 amount);
    event AcceptedTokenDeposit(address depositor, uint amount);

    IERC20 immutable private acceptedToken;
    RecordArchive private payeeArchive;

    /**
     * @dev Creates an instance of `PaymentSplitter` where each account in `payees` is assigned the number of shares at
     * the matching position in the `shares` array.
     *
     * All addresses in `payees` must be non-zero. Both arrays must have the same non-zero length, and there must be no
     * duplicates in `payees`.
     */
    constructor (IERC20 _acceptedToken, address[] memory _payees, uint256[] memory _shares) {
        // solhint-disable-next-line max-line-length, reason-string
        require(_payees.length == _shares.length, "PaymentSplitter: payees and shares length mismatch");
        require(_payees.length > 0, "PaymentSplitter: no payees");

        for (uint256 i = 0; i < _payees.length; i++) {
            addPayee(_payees[i], _shares[i]);
        }
        acceptedToken = _acceptedToken;
    }

    /**
     * @dev The Tokens received will be logged with {PaymentReceived} events. Note that these events are not fully
     * reliable: it's possible for a contract to receive Tokens without triggering this function. This only affects the
     * reliability of the events, and not the actual splitting of Tokens.
     *
     * To learn more about this see the Solidity documentation for
     * https://solidity.readthedocs.io/en/latest/contracts.html#fallback-function[fallback
     * functions].
     */
    function deposit(address depositor, uint amount) internal {
        acceptedToken.safeTransferFrom(depositor, address(this), amount);
        emit AcceptedTokenDeposit(depositor, amount);
    }

    /**
     * @dev Getter for the total shares held by payees.
     */
    function totalShares() public view returns (uint256) {
        return payeeArchive.total.shares;
    }

    /**
     * @dev Getter for the total amount of Tokens already released.
     */
    function totalReleased() public view returns (uint256) {
        return payeeArchive.total.released;
    }

    /**
     * @dev Getter for the amount of shares held by an account.
     */
    function record(address account) public view returns (Record memory) {
        return payeeArchive.records[account];
    }

    /**
     * @dev Getter for the amount of shares held by an account.
     */
    function shares(address account) public view returns (uint256) {
        return record(account).shares;
    }

    /**
     * @dev Getter for the amount of Tokens already released to a payee.
     */
    function released(address account) public view returns (uint256) {
        return record(account).released;
    }

    /**
     * @dev Getter for the address of the payee number `index`.
     */
    function payee(uint256 index) public view returns (address) {
        return payeeArchive.addresses[index];
    }

    /**
     * @dev Triggers a transfer to `account` of the amount of tokens they are owed, according to their percentage of the
     * total shares and their previous withdrawals.
     */
    function release(address account) public virtual {
        // solhint-disable-next-line reason-string
        require(isPayee(account), "PaymentSplitter: account is not a payee");

        uint256 theTotalReleased = totalReleased();
        uint256 totalReceived = acceptedToken.balanceOf(address(this))  + theTotalReleased;
        uint256 payment = totalReceived * shares(account) / totalShares() - released(account);

        // solhint-disable-next-line reason-string
        require(payment != 0, "PaymentSplitter: account is not due payment");

        payeeArchive.records[account].released = released(account) + payment;
        payeeArchive.total.released = theTotalReleased + payment;

        acceptedToken.safeTransfer(account, payment);
        emit PaymentReleased(account, payment);
    }

    function isPayee(address account) public view returns (bool){
        return (shares(account) > 0);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param _shares The number of shares owned by the payee.
     */
    function updatePayee(address account, uint256 _shares) public onlyOwner {
        require(isPayee(account), "PaymentSplitter: not a payee");
        if (_shares == 0) {
            removePayee(account);
            return;
        }
        // solhint-disable-next-line reason-string
        require(shares(account) != _shares, "PaymentSplitter: account already has that many shares");
        uint delta = _shares - shares(account);
        payeeArchive.records[account].shares = _shares;
        payeeArchive.total.shares = payeeArchive.total.shares + delta;
        emit PayeeUpdated(account, delta);
    }

    /**
     * @dev Add a new payee to the contract.
     * @param account The address of the payee to add.
     * @param _shares The number of shares owned by the payee.
     */
    function addPayee(address account, uint256 _shares) public onlyOwner {
        // solhint-disable-next-line reason-string
        require(account != address(0), "PaymentSplitter: account is the zero address");
        require(_shares > 0, "PaymentSplitter: shares are 0");
        // solhint-disable-next-line reason-string
        require(!isPayee(account), "PaymentSplitter: account is already payee");

        payeeArchive.addresses.push(account);
        payeeArchive.records[account].shares = _shares;
        payeeArchive.total.shares = payeeArchive.total.shares + _shares;
        emit PayeeAdded(account, _shares);
    }

    /**
     * @dev Remove a payee from the contract.
     * @param account The address of the payee to add.
     */
    function removePayee(address account) public onlyOwner {
        // solhint-disable-next-line reason-string
        require(account != address(0), "PaymentSplitter: account is the zero address");
        uint256 index = getListIndex(payeeArchive.addresses, account);
        Record memory recordToBeRemoved = record(account);
        uint256 payeesLength = payeeArchive.addresses.length;
        require(payeesLength > 0, "Empty payee list!");
        uint lastRecordIndex = payeesLength-1;
        address lastRecordPayee = payee(lastRecordIndex);
        // copy the last element to the deleted spot
        payeeArchive.records[account] = record(lastRecordPayee);
        payeeArchive.addresses[index] = lastRecordPayee;
        // call delete on the last index
        delete payeeArchive.records[payeeArchive.addresses[lastRecordIndex]];
        delete payeeArchive.addresses[lastRecordIndex];
        // decrement the array length
        payeeArchive.addresses = this.discardLastElement(payeeArchive.addresses, lastRecordIndex);
        payeeArchive.total.shares = payeeArchive.total.shares - recordToBeRemoved.shares;
        emit PayeeRemoved(account);
    }

    function discardLastElement(address[] calldata list, uint lastRecordIndex) external pure returns(address[] memory){
        return list[0:lastRecordIndex-1];
    }
    function getListIndex(address[] memory list, address account) private pure returns(uint256){
        for (uint256 i = 0; i < list.length; i++) {
            if(list[i] == account){
                return i;
            }
        }
        revert("account not found!");
    }
}
