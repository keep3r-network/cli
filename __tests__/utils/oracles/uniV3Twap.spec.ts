import { ITokenAsset } from '../../../src/types';
import { uniV3TwapQuote } from '../../../src/utils/oracles';
import { generateRandomAddress } from '../wallet';
import { Contract, ethers } from 'ethers';
import { when } from 'jest-when';
import winston from 'winston';

winston.configure({
	level: 'debug',
	transports: [new winston.transports.Console()],
});

global.config = {
	recommendedGasPriceIndex: 0,
	localRpc: '',
	txRpc: '',
	chainId: 5,
	gasLimit: '300000',
	forkStartPort: 9000,
	forkMaxPorts: 20000,
	keep3r: generateRandomAddress(),
	keep3rV1: generateRandomAddress(),
	keep3rHelper: generateRandomAddress(),
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
};

const etherAddress = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';

const mockAsset: ITokenAsset = {
	name: 'mockAsset',
	address: etherAddress,
	oracleType: 'UniswapV3PoolTwap',
	oracleFn: '',
	metadata: {
		poolAddress: ethers.constants.AddressZero,
		twapTime: 1,
	},
};

const mockProvider: ethers.providers.Provider = new ethers.providers.WebSocketProvider('');

jest.mock('ethers');

describe('uniV3TwapQuote', () => {
	const observeSpy = jest.fn();
	const token0Spy = jest.fn();
	const token1Spy = jest.fn();

	beforeAll(() => {
		Object.defineProperty(Contract.prototype, 'callStatic', {
			get: function () {
				return {
					observe: observeSpy,
					token0: token0Spy,
					token1: token1Spy,
				};
			},
		} as any);
	});

	it('should call the contract', async () => {
		when(observeSpy).mockResolvedValue([[0, 0], []]);
		when(token0Spy).mockResolvedValue(etherAddress);
		await uniV3TwapQuote(mockAsset, mockProvider);

		expect(observeSpy).toHaveBeenCalled();
	});

	it('should quote the observation response', async () => {
		when(observeSpy).mockResolvedValue([[23027, 0], []]);
		when(token0Spy).mockResolvedValue(etherAddress);
		when(token1Spy).mockResolvedValue(ethers.constants.AddressZero);

		const quote = await uniV3TwapQuote(mockAsset, mockProvider);

		expect(quote).toBeCloseTo(10, 0.0001);
	});

	it('should inverse the observation corresponding to token order', async () => {
		when(observeSpy).mockResolvedValue([[23027, 0], []]);
		when(token0Spy).mockResolvedValue(ethers.constants.AddressZero);
		when(token1Spy).mockResolvedValue(etherAddress);

		const quote = await uniV3TwapQuote(mockAsset, mockProvider);

		expect(quote).toBeCloseTo(1 / 10, 0.0001);
	});

	it('should return 0 if pool tokens are not correct', async () => {
		when(observeSpy).mockResolvedValue([[23027, 0], []]);
		when(token0Spy).mockResolvedValue(ethers.constants.AddressZero);
		when(token1Spy).mockResolvedValue(ethers.constants.AddressZero);

		const quote = await uniV3TwapQuote(mockAsset, mockProvider);

		expect(quote).toEqual(0);
	});
});
