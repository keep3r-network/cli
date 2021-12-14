import { JobMetadata } from './io.d';
import validate from './io.d.validator';
import fs from 'fs-extra';
import path from 'path';

export async function getJobMetadata(jobPath: string): Promise<JobMetadata> {
	const metadataPath = path.join(process.cwd(), jobPath, 'metadata.json');
	if (!(await fs.pathExists(metadataPath))) {
		throw new Error(`Missing metadata file at: ${metadataPath}`);
	}

	return validate(await fs.readJSON(metadataPath));
}
