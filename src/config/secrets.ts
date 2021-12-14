import { Secrets } from './secrets.d';
import validate from './secrets.d.validator';
import fs from 'fs-extra';

export async function loadSecrets(filePath: string): Promise<Secrets> {
	const userSecrets: Partial<Secrets> = await fs.readJSON(filePath);

	return validateSecrets(userSecrets);
}

export function validateSecrets(partialSecrets: Partial<Secrets>): Secrets {
	return validate(partialSecrets);
}
