import { IGasPrice, IGasReport } from '../types';
import axios from 'axios';

export async function getGasPrices(): Promise<IGasPrice[]> {
	try {
		const res = await axios.get<IGasReport>(`https://blocknative-api.herokuapp.com/data`);
		return res.data.estimatedPrices;
	} catch (error) {
		console.error('Failed to fetch gas prices', { error });
		return [];
	}
}
