const pkg = require('./package.json');

const banner = `/*
 * @license
 * ` + pkg.name + `
 * http://www.abelheinsbroek.nl/
 * Version: ` + pkg.version + `
 *
 * Copyright ` + (new Date().getFullYear()) + ` Abel Heinsbroek
 * Released under the MIT license
 * https://github.com/abelheinsbroek/` + pkg.name + `/blob/master/LICENSE.md
 */`;

export default {
	input: 'src/plugin.js',
	banner: banner,
	format: 'umd',
	external: [
		'chart.js'
	],
	globals: {
		'chart.js': 'Chart',
		'hammerjs': 'Hammer'
	},
};
