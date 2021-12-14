import { IGasPrice, IGasReport } from '../../../src/types';
import { getGasPrices } from '../../../src/utils/gas';
import axios, { AxiosResponse } from 'axios';

jest.mock('axios');

describe('getGasPrices', () => {
	const axiosGetMock = axios.get as jest.MockedFunction<typeof axios.get>;

	it('should return an empty array when response fails', async () => {
		axiosGetMock.mockImplementationOnce(() => Promise.reject('Something bad'));
		await expect(getGasPrices()).resolves.toEqual([]);
	});

	describe('when endpoint response is okay', () => {
		const estimatedPrices: IGasPrice[] = [
			{
				confidence: 1,
				price: 2,
				maxPriorityFeePerGas: 3,
				maxFeePerGas: 4,
			},
			{
				confidence: 5,
				price: 6,
				maxPriorityFeePerGas: 7,
				maxFeePerGas: 8,
			},
		];
		const response: Partial<AxiosResponse<IGasReport>> = {
			data: { estimatedPrices },
		};

		beforeEach(() => {
			axiosGetMock.mockImplementationOnce(() => Promise.resolve(response));
		});

		it('should fetch the gas prices from blocknative', async () => {
			await getGasPrices();
			expect(axiosGetMock).toHaveBeenCalledWith(`https://blocknative-api.herokuapp.com/data`);
		});

		it('should return estimated prices', async () => {
			await expect(getGasPrices()).resolves.toEqual(estimatedPrices);
		});
	});
});
