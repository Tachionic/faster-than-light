// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0 <0.9.0;

import "./abdk-libraries-solidity/ABDKMathQuad.sol";

contract RewardCalculator{
    using ABDKMathQuad for bytes16;

    bytes16 private immutable oneDay;

    constructor (){
        oneDay = ABDKMathQuad.fromUInt(1 days);
    }

    function calculateQuantity(uint inputValue, bytes16 multiplier, bytes16 interestRate, uint tokenomicsTimestamp) public view returns(uint){
        return multiplier.mul(ABDKMathQuad.fromUInt(inputValue))
        .div(
            ABDKMathQuad.fromUInt(1)
            .add(interestRate)
            .pow(
                // solhint-disable-next-line not-rely-on-time
                ABDKMathQuad.fromUInt(block.timestamp - tokenomicsTimestamp)
                .div(oneDay)
            )
        )
        .toUInt();
    }
}