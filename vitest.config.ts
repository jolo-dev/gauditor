import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
	resolve: {
		alias: {
			'@gauditor/functions': path.resolve(
				__dirname,
				'./packages/functions/src',
			),
		},
	},
});
