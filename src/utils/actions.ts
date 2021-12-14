import { setupGasPrice as importedSetupGasPrice, signAndSendTransaction as importedSignAndSendTransaction } from './actions';
import { getGasPrices } from './gas';
import { Contract, utils } from 'ethers';
import inquirer from 'inquirer';

export async function promptYesNo(message: string): Promise<boolean> {
	const answer = await inquirer.prompt([
		{
			type: 'list',
			message,
			name: 'action',
			choices: ['yes', 'no'],
		},
	]);

	return answer.action === 'yes';
}

export async function makeTransaction(contract: Contract, method: string, args: (string | number)[]): Promise<boolean> {
	// setup gas
	const { maxFeePerGas, maxPriorityFeePerGas } = await importedSetupGasPrice(global.config.recommendedGasPriceIndex);

	// sign and send tx
	return await importedSignAndSendTransaction(contract, method, args, maxFeePerGas, maxPriorityFeePerGas);
}

export async function signAndSendTransaction(
	contract: Contract,
	method: string,
	args: (string | number)[],
	maxFeePerGas: number,
	maxPriorityFeePerGas: number
): Promise<boolean> {
	console.info(`Sending ${method} transaction...`);

	try {
		const tx = await contract.functions[method](...args, {
			maxFeePerGas: utils.parseUnits(maxFeePerGas.toString(), 'gwei'),
			maxPriorityFeePerGas: utils.parseUnits(maxPriorityFeePerGas.toString(), 'gwei'),
			gasLimit: global.config.initializationGasLimit,
		});

		console.info(`Transaction submitted: ${tx.hash}`);
		try {
			await tx.wait();
			console.info(`Transaction successful`);
			return true;
		} catch (err) {
			console.error(`Transaction reverted`);
			/* TODO: improve revert reason to fetch revert error log */
			console.log(`Revert reason: ${err.reason}`); // Revert reason: transaction reverted
			return false;
		}
	} catch (err) {
		console.error(`Transaction failed`);
		console.log(`Fail reason: ${err.reason}`);
		return false;
	}
}

export async function setupGasPrice(index: number): Promise<{
	maxFeePerGas: number;
	maxPriorityFeePerGas: number;
}> {
	const gasOracle = (await getGasPrices())[index];

	const gasSettings = await inquirer.prompt([
		{
			type: 'number',
			name: 'maxFeePerGas',
			message: 'Transaction maxFeePerGas',
			default: gasOracle?.maxFeePerGas,
		},
		{
			type: 'number',
			name: 'maxPriorityFeePerGas',
			message: 'Transaction maxPriorityFeePerGas',
			default: gasOracle?.maxPriorityFeePerGas,
		},
	]);

	return {
		maxFeePerGas: gasSettings.maxFeePerGas,
		maxPriorityFeePerGas: gasSettings.maxPriorityFeePerGas,
	};
}
