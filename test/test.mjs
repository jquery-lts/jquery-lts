import os from 'node:os';
import { JSDOM } from 'jsdom';
import { cveMap, getLTSVersion, jQueryVersions } from '../site/cve-data.mjs'
import t from 'tap'
import { magenta, cyan, white, red, green } from 'colorette';
import { browser } from './args.mjs';
import { dumpDOM, closeBrowser } from './dump-dom.mjs';

function banner(txt, {borderColor = 'magenta', textColor = 'cyan'} = {borderColor: 'magenta',  textColor: 'cyan'}) {
	const border = borderColor === 'magenta' ? magenta : borderColor === 'cyan' ? cyan : white;
	const text = textColor === 'magenta' ? magenta : textColor === 'cyan' ? cyan : white;
	console.log(border(`
--------------------------------------------------------------------------------
  ${text(txt)}
--------------------------------------------------------------------------------
`))
}

const platform = os.platform();
banner(`browser: ${browser} --- platform: ${platform}`, { borderColor:'white', textColor: 'white' });
banner('running jQuery security tests...');

const baseURL = 'http://127.0.0.1:3333/index.html';

for (const v of jQueryVersions) {
	await t.test(`validate jQuery v${v}`, async t => testJQuery(v, false, t));
	await t.test(`validate jQuery-LTS v${getLTSVersion(v)}`, async t => testJQuery(v, true, t));
	break;  // remove this after all LTS versions are available
}

async function testJQuery(version, lts, t) {

	const effectiveVersion = lts ? getLTSVersion(version) : version;
	const displayVersion = lts ? `jQuery-LTS v${effectiveVersion}` : `jQuery v${effectiveVersion}`;

	banner(`validating ${displayVersion}`);

	let p;
	
	if (browser === 'firefox') {
		console.log(`running Firefox DOM dump for: ${baseURL}?VERSION=${version}&LTS=${lts}`);
		p = await dumpDOM(`${baseURL}?VERSION=${version}&LTS=${lts}`, 'firefox');
	} else {
		console.log(`running Chrome DOM dump for: ${baseURL}?VERSION=${version}&LTS=${lts}`);
		p = await dumpDOM(`${baseURL}?VERSION=${version}&LTS=${lts}`, 'chrome');
	}

	const dom = new JSDOM(p.toString());

	const d = dom.window.document;

	t.equal(d.getElementById('errors').childNodes.length, 0, 'there are no errors');
	t.equal(d.querySelector('#loaded-jQuery').textContent, displayVersion, `loaded ${displayVersion}`);

	for (const cve of cveMap) {
		if(cve[1].versions.includes(version)) {
			const cveName = `CVE-${cve[0]}`
			const status = d.querySelector(`#${cveName} .cve__footer-status`).textContent;
			const reproducible = !status.startsWith(`Can't`);

			if(reproducible) {
				console.log(red(status
					.replace('CVE', `${cveName.padEnd(14)}  - `)
				));
			}
			else {
				console.log(green(`${cveName.padEnd(14)}  -  ${status}`));
			}

			if(lts) {
				t.notOk(reproducible, `${cveName} should be patched in ${displayVersion}`);
			}
			else {
				if(isException(cve[1], version, browser)) {
					t.notOk(reproducible, `${cveName} is supposed be reproducible in ${displayVersion} according to the CVE but it can't be reproduced`);
				}
				else {
					t.ok(reproducible, `${cveName} should be reproducible in ${displayVersion}`);
				}
			}
		}
	}
}

banner(`...done`);

if(t.counts.fail) {
	banner('FAIL 💔', { borderColor: 'red', textColor: 'red'});
}
else {
	banner('PASS 💚', { borderColor: 'green', textColor: 'green'});
}

await closeBrowser();

function isException(cveVersions, version, currentBrowser) {
	const { browserExceptions, exceptions } = cveVersions;

	if (browserExceptions[currentBrowser] === 'all' || browserExceptions[currentBrowser]?.includes(version)) {
		return true;
	}
	
	return exceptions.includes(version);
}