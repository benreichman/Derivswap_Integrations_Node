require('dotenv').config()
const { EvmPriceServiceConnection } = require('@pythnetwork/pyth-evm-js')
const { ethers } = require('ethers');
const pyth = require('../assets/pyth')
const provider = new ethers.providers.JsonRpcProvider("https://polygon-mumbai.infura.io/v3/e3c2bd4db1a44d10a15b0b2dcbefa772")
const signer = new ethers.Wallet(process.env.PK, provider);
const { vault_abi } = require('../abis/vault')
const { orderbook_abi } = require('../abis/orderbook')
const { abi: erc20Abi } = require("@openzeppelin/contracts/build/contracts/ERC20.json");
const collateral_erc20 = new ethers.Contract('0xAE91C872d378cFF75Ca099634487Bf94BF71CA94', erc20Abi, signer)
const orderbook_address = '0xEE0c4EaC7F4821e6e527BaF5985CCfc771983bbD'
const vault_address = '0x0Bf9099A1D71cc7aDECC6755883899b5f447d35B'
const vault = new ethers.Contract(vault_address, vault_abi, signer);
const orderbook = new ethers.Contract(orderbook_address, orderbook_abi, signer);
const connection = new EvmPriceServiceConnection(
	"https://xc-testnet.pyth.network"
);



async function main() {

	//AAVE 20<=TAKE_PRICE=<100 $85 Strike
	await create_maker_order(20, 100, 85);
	
	// await create_taker_order(1)

}

async function create_maker_order(lb, ub, strike_price) {
	var position_legs_isolated = [];
	var ratio = -150;
	const collateral_amount = '3';
	const collateral = '0xAE91C872d378cFF75Ca099634487Bf94BF71CA94';
	const price_feed = await connection.getLatestPriceFeeds([pyth.assets[0].FeedID.substring(2, 66)]);
	console.log(price_feed)
	var formattedlb = parseFloat(lb) * (10 ** (price_feed[0].price.expo * -1))
	var formattedub = parseFloat(ub) * (10 ** (price_feed[0].price.expo * -1))
	var formattedstrike = parseFloat(strike_price) * (10 ** (price_feed[0].price.expo * -1))
	position_legs_isolated.push(
		{

			feedID: pyth.assets[0].FeedID.substring(0, 66),
			outlook: true,
			priceTarget: formattedstrike,
			threshold:
			{
				lowerBound: formattedlb,
				upperBound: formattedub
			}
		}
	)
	try {
		var collateral_decimals;
		if(collateral!='0x0000000000000000000000000000000000000000'){
			collateral_decimals = await collateral_erc20.decimals().then(res=>{
				return(parseInt(res))
			})
			const allowance = await collateral_erc20.allowance(signer.address,vault_address);
			if(allowance.lt(ethers.utils.parseUnits(collateral_amount, collateral_decimals))){
				const approval_tx = await collateral_erc20.approve(vault_address, ethers.utils.parseUnits(collateral_amount, collateral_decimals))
				await approval_tx.wait()
				console.log('Approval TX Succesful!')
			}
			else{
				console.log('Allowance sufficient to create maker order.')
			}
		}
		const tx = await vault.makeOrder(1, 101, ratio, position_legs_isolated, collateral, collateral!='0x0000000000000000000000000000000000000000'?ethers.utils.parseUnits(collateral_amount, collateral_decimals):ethers.utils.parseUnits('0', "ether"),
			{ value: collateral!='0x0000000000000000000000000000000000000000'?ethers.utils.parseUnits('0', "ether"):ethers.utils.parseUnits(collateral_amount, "ether") }
		)
		await tx.wait()
		console.log('TX Hash: ', tx.hash)
	} catch (error) {
		console.log('TX Error: ')
		console.log(error.error.reason)
	}
}

async function create_taker_order(maker_order_id){
	var pyth_update_fee;
	const maker_order = await orderbook.makerOrdersByID(maker_order_id);
	const amt_required_to_take = await orderbook.amt_required_to_take(1);
	const leg = await orderbook.makersLegs(parseInt(maker_order.order_ID), 0);
	const priceUpdateData = await connection.getPriceFeedsUpdateData([leg.feedID])
	var collateral_decimals;
	// console.log(maker_order)
	try {
		if(maker_order.collateral!='0x0000000000000000000000000000000000000000'){
			console.log('collateral not native')
			collateral_decimals = await collateral_erc20.decimals().then(res=>{
				return(parseInt(res))
			})
			const allowance = await collateral_erc20.allowance(signer.address,vault_address)
			console.log(allowance)
			if(allowance.lt(amt_required_to_take)){
				const approve = await collateral_erc20.approve(vault_address,amt_required_to_take.sub(allowance))
				await approve.wait();
				console.log('Approval TX Hash: ', approve.hash)
			}
			else{
				console.log('Allowance Suffificent')
			}
			pyth_update_fee = await orderbook.pyth_update_fee(priceUpdateData);
		}
		const take_tx = await vault.takeOrder(maker_order_id,maker_order.collateral=='0x0000000000000000000000000000000000000000'?0:amt_required_to_take,priceUpdateData,{ value: maker_order.collateral!='0x0000000000000000000000000000000000000000'?pyth_update_fee: amt_required_to_take });
		await take_tx.wait();
		console.log('TX Hash: ', take_tx.hash);
	} catch (error) {
		console.log(error.error.reason)
	}

}


main();