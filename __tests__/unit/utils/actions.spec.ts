import { IGasPrice } from '../../../src/types';
import { signAndSendTransaction, promptYesNo, setupGasPrice } from '../../../src/utils/actions';
import * as actions from '../../../src/utils/actions';
import * as gasPrice from '../../../src/utils/gas';
import { generateRandomAddress } from '../../utils/wallet';
import { Contract, utils } from 'ethers';
import inquirer, { Question } from 'inquirer';
import { when } from 'jest-when';
import winston from 'winston';

winston.configure({
	level: 'debug',
	transports: [new winston.transports.Console()],
});

const mockGasSettings = {
	maxFeePerGas: 123,
	maxPriorityFeePerGas: 456,
};

global.config = {
	recommendedGasPriceIndex: 0,
	localRpc: '',
	txRpc: '',
	chainId: 5,
	gasLimit: '300000',
	forkStartPort: 10000,
	forkMaxPorts: 100,
	inquireKeeperAddress: true,
	initializationGasLimit: 200000,
	flashbotRelays: [],
	jobs: [],
	jobDefaults: {
		futureBlocks: 3,
		bundleBurst: 5,
		timeToAdvance: 30,
		priorityFee: 10,
	},
	simulateBundle: true,
	keep3r: generateRandomAddress(),
	keep3rV1: generateRandomAddress(),
	keep3rHelper: generateRandomAddress(),
};

jest.mock('inquirer');

jest.spyOn(actions, 'setupGasPrice');
jest.spyOn(actions, 'signAndSendTransaction');
jest.spyOn(gasPrice, 'getGasPrices');

describe('actions', () => {
	const getGasPricesMock = gasPrice.getGasPrices as jest.MockedFunction<typeof gasPrice.getGasPrices>;
	const promptMock = inquirer.prompt as jest.MockedFunction<typeof inquirer.prompt>;

	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('promptYesNo', () => {
		it('should return true if answer is yes', async () => {
			when(promptMock).mockResolvedValue({ action: 'yes' });
			expect(await promptYesNo('')).toBe(true);
		});

		it('should return false if answer is any other', async () => {
			when(promptMock).mockResolvedValue({ action: '' });
			expect(await promptYesNo('')).toBe(false);
		});
	});

	describe('makeTransaction', () => {
		it('should return the result of calls to setupGasPrice and signAndSendTransaction', async () => {
			const mockContract = new Contract(generateRandomAddress(), []);
			const mockMethod = 'myMethod';
			const mockArgs = [1, 2, 3];

			when(actions.setupGasPrice).calledWith(global.config.recommendedGasPriceIndex).mockResolvedValue(mockGasSettings);

			when(actions.signAndSendTransaction)
				.calledWith(mockContract, mockMethod, mockArgs, mockGasSettings.maxFeePerGas, mockGasSettings.maxPriorityFeePerGas)
				.mockResolvedValue(true);

			const result = await actions.makeTransaction(mockContract, mockMethod, mockArgs);

			expect(result).toEqual(true);
		});
	});

	describe('signAndSendTransaction', () => {
		const mockMethod = 'myMethod';
		const mockArgs = [1, 2, 3];
		const waitableFn = jest.fn(() => true);
		const mockObj = {
			functions: {
				myMethod: jest.fn(() => ({
					hash: 'mockHash',
					wait: waitableFn,
				})),
			},
		} as any as Contract;

		it('should call contract method with gas settings', async () => {
			await signAndSendTransaction(
				mockObj,
				mockMethod,
				mockArgs,
				mockGasSettings.maxFeePerGas,
				mockGasSettings.maxPriorityFeePerGas
			);

			const bnMaxFeePerGas = utils.parseUnits(mockGasSettings.maxFeePerGas.toString(), 'gwei');
			const bnMaxPriorityFeePerGas = utils.parseUnits(mockGasSettings.maxPriorityFeePerGas.toString(), 'gwei');

			expect(mockObj.functions[mockMethod]).toHaveBeenNthCalledWith(1, ...mockArgs, {
				gasLimit: global.config.initializationGasLimit,
				maxFeePerGas: bnMaxFeePerGas,
				maxPriorityFeePerGas: bnMaxPriorityFeePerGas,
			});
		});

		it('should wait the transaction if successful', async () => {
			await signAndSendTransaction(
				mockObj,
				mockMethod,
				mockArgs,
				mockGasSettings.maxFeePerGas,
				mockGasSettings.maxPriorityFeePerGas
			);

			expect(waitableFn).toHaveBeenCalled();
		});

		it('should return false if failed', async () => {
			when(waitableFn).mockRejectedValue('Error' as never);

			const result = await signAndSendTransaction(
				mockObj,
				mockMethod,
				mockArgs,
				mockGasSettings.maxFeePerGas,
				mockGasSettings.maxPriorityFeePerGas
			);

			expect(result).toBeFalsy();
		});
	});

	describe('setupGasPrice', () => {
		const mockGasPrice: IGasPrice = {
			confidence: 1,
			price: 1,
			maxPriorityFeePerGas: 1,
			maxFeePerGas: 1,
		};

		it('should return prompt response', async () => {
			when(getGasPricesMock).mockResolvedValue([]);
			when(promptMock).mockResolvedValue(mockGasSettings);

			expect(await setupGasPrice(0)).toEqual(mockGasSettings);
		});

		it('should add gas prices default values to prompt', async () => {
			when(gasPrice.getGasPrices).mockResolvedValue([
				mockGasPrice,
				{ ...mockGasPrice, maxFeePerGas: 123, maxPriorityFeePerGas: 456 },
				mockGasPrice,
			]);
			when(promptMock).mockResolvedValue(mockGasSettings);

			await setupGasPrice(1);

			const choices = (promptMock.mock.calls[0][0] as Question[]).map((choice) => ({
				name: choice.name,
				default: choice.default,
			}));

			expect(choices).toStrictEqual([
				{ name: 'maxFeePerGas', default: 123 },
				{ name: 'maxPriorityFeePerGas', default: 456 },
			]);
		});
	});
});
