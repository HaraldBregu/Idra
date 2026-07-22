import { z } from 'zod';

export const noteIdSchema = z.string().uuid().describe('The note ID.');
export const noteMetadataSchema = z
	.record(z.string(), z.json())
	.describe('Optional JSON metadata associated with the note.');
