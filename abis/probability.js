const abi = [
    {
      "inputs": [
        {
          "internalType": "int64",
          "name": "ratio",
          "type": "int64"
        }
      ],
      "name": "orderbook_calculate_implied_probability",
      "outputs": [
        {
          "internalType": "uint256",
          "name": "implied_probability",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "implied_probability_opposite_side",
          "type": "uint256"
        },
        {
          "internalType": "uint256",
          "name": "implied_probability_opposite_side_with_vig",
          "type": "uint256"
        },
        {
          "internalType": "int256",
          "name": "opposite_odds256",
          "type": "int256"
        }
      ],
      "stateMutability": "pure",
      "type": "function",
      "constant": true
    }
  ];
exports.probability_abi = abi;