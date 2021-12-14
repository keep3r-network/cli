import * as jobUtils from '../../../src/utils/io';
import fs from 'fs-extra';
import { when } from 'jest-when';

jest.mock('fs-extra');
jest.mock('path');

jest.spyOn(jobUtils, 'getJobMetadata');

describe('io', () => {
	beforeEach(() => {
		jest.clearAllMocks();
	});

	describe('getJobMetadata', () => {
		const mockMetadata = {
			metadata: {
				name: 'job',
			},
		};

		it('should revert if the path does not exist', async () => {
			when(fs.pathExists).mockResolvedValue(false as never);
			await expect(async () => {
				await jobUtils.getJobMetadata('jobA');
			}).rejects.toThrowError('Missing metadata file at: undefined');
		});

		it('should revert if the metadata is not properly formatted', async () => {
			const badMetadata = {
				random: 0,
			};
			when(fs.pathExists).mockResolvedValue(true as never);
			when(fs.readJSON).mockResolvedValue(badMetadata as never);
			await expect(async () => {
				await jobUtils.getJobMetadata('jobA');
			}).rejects.toThrowError();
		});

		it('should return an array of promises', async () => {
			const jobPath = 'node_modules/jobA';

			when(fs.pathExists).mockResolvedValue(true as never);
			when(fs.readJSON).mockResolvedValue(mockMetadata.metadata as never);
			const result = await jobUtils.getJobMetadata(jobPath);
			expect(result).toStrictEqual(mockMetadata.metadata);
		});
	});
});
