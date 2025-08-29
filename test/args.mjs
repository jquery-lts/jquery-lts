import { parseArgs } from 'node:util';
import { red, yellow } from 'colorette';

const { values } = parseArgs({
	options: {
		browser: {
			type: 'string',
			short: 'b',
			default: 'firefox'
		},
		help: {
			type: 'boolean',
			short: 'h'
		}
	},
});

if (values.help) {
	showHelp();
	process.exit(0);
}

const browser = values.browser || 'firefox';

if (!['chrome', 'firefox'].includes(browser)) {
	console.error(red(`error: unsupported browser '${browser}'. supported browsers: firefox, chrome`));
	console.error(yellow('use --help for usage information'));
	process.exit(1);
}

function showHelp() {
	console.log(`
Usage: node test.mjs [--browser=<browser>]

Options:
  --browser, -b <browser>  Browser to use for testing (firefox|chrome, default: firefox)
  --help, -h               Show this help message

Examples:
  node test.mjs                    # Run tests with Firefox (default)
  node test.mjs --browser=firefox  # Run tests with Firefox
  node test.mjs --browser=chrome   # Run tests with Chrome
  node test.mjs -b chrome          # Run tests with Chrome (short form)
`);
}

export { browser };