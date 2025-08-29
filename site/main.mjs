import { cveMap, getLTSVersion, jQueryVersions } from './cve-data.mjs'

function log(txt){
  console.log(txt);
}

const errors = document.getElementById('errors');

function error(txt){

	const p = document.createElement("p");
  p.append(txt);
	p.classList.add('error');
  errors.append(p);

  console.error(txt);

}

window.onerror = function(message, source, lineno, colno, _error) {
	error(message, true);
	error(_error.stack);
};

const windowAlert = window.alert;

window.alert = function(...args) {
  log(`alert called with args ${args}`);
  // windowAlert(...args);
};

const cveTemplate = `
<div class="cve">
	<div class="cve__header">
	</div>
	<div class="cve__body">
		<button type="button"></button>
	</div>
	<div class="cve__footer">
		<span class="cve__footer-status"></span>
		<span class="cve__footer-note"></span>
	</div>
</div>
`

const selVersion = document.getElementById('version');
const chkLTS = document.getElementById('lts');
const cveContainer = document.getElementById('cve-container');
const cveButtons = [];

for (const cve of cveMap) {
	const cveID = `CVE-${cve[0]}`;
	const t = document.createElement('template');
  t.innerHTML = cveTemplate;
	t.content.querySelector('.cve').id = cveID;
	t.content.querySelector('.cve__header').textContent = cveID;
	const b = t.content.querySelector('button');
	b.textContent = cveID;
	b.addEventListener('click', function (){
		log(`called ${cveID}`)
		window.doNotPolluteTheGlobalNamespace[cveID.replaceAll('-', '_')](cve);
		setTimeout(() => updateCVE(cve), 100);
	});
	cveButtons.push(b);
	cveContainer.append(t.content);
}

for (const v of jQueryVersions) {
	const o = document.createElement('option');
	o.textContent = v;
	selVersion.append(o);
}

const VERSION = 'VERSION';
const LTS = 'LTS';

const qs = (new URL(document.location)).searchParams;
const qsVersion = qs.get(VERSION);
const qsLts = qs.get(LTS);

if(qsVersion) {

	selVersion.value = qsVersion;
	chkLTS.checked = qsLts === 'true';

	// clear out query string
	window.history.pushState({}, "",  document.location.href.split("?")[0]);

}
else {

	const sessionVersion = sessionStorage.getItem(VERSION);
	const sessionLts = sessionStorage.getItem(LTS) === 'true';

	if(sessionVersion) {
		selVersion.value = sessionVersion;
		chkLTS.checked = sessionLts;
	}

}

changeVersion();

function changeVersion() {

	const version = selVersion.value;
	const lts = chkLTS.checked;

	sessionStorage.setItem(VERSION, version);
	sessionStorage.setItem(LTS, lts);

	let loadVersion;
	let displayVersion;
	let sourcePath;
	let displayPrefix;

	if(lts) {
		loadVersion = getLTSVersion(version);
		displayVersion = `jQuery-LTS v${loadVersion}`;
		sourcePath = `vendor/jquery-lts-${loadVersion}.js`;
		displayPrefix = 'jQuery-LTS';
	}
	else {
		loadVersion = version;
		displayVersion = `jQuery v${loadVersion}`;
		sourcePath = `vendor/jquery-${loadVersion}.js`;
		displayPrefix = 'jQuery';
	}

	const s = document.createElement('script');

	s.onload = function() {

		$(document).ajaxError(function(...args) {
			error(`AJAX ERROR! CAN'T TEST FOR CVE! IS SERVER DOWN?`);
			for (let i = 0; i < args.length; i++) {
				error(JSON.stringify(args[i]));
			}
		});

		document.getElementById('loaded-jQuery').textContent = `${displayPrefix} v${jQuery.fn.jquery}`;

		// bring this line back after fixing errors
		cveButtons.forEach(b => b.click());
		document.querySelectorAll('.cve').forEach(e => e.classList.remove('hide'));
	};

	s.onerror = function() {
		if(typeof jQuery !== 'undefined') {
			error(`failed to load ${displayVersion}. jQuery ${jQuery.fn.jquery} is still currently loaded`);
		}
		else {
			error(`failed to load ${displayVersion}.`);
		}
		document.querySelectorAll('.cve').forEach(e => e.classList.add('hide'));
	};

  s.src = sourcePath;

	document.body.appendChild(s);

	for (const cve of cveMap) {
		cve[1].triggered = false;
		cve[1].triggerCount = 0;
	}

	document.querySelectorAll('.cve__footer').forEach(e => e.classList.remove('cve__footer--error'));
	document.querySelectorAll('.cve__footer-status').forEach(e => e.textContent= '');
	document.querySelectorAll('.cve__footer-note').forEach(e => e.textContent= '');
	errors.innerHTML = '';
}

selVersion.addEventListener("change", changeVersion);
chkLTS.addEventListener("change", changeVersion);

function triggerCVE(cveID){
  const cve = cveMap.get(cveID);
  cve.triggered = true;
}

function updateCVE(cve) {

	const cveID = `CVE-${cve[0]}`;
	const version = sessionStorage.getItem(VERSION); // use version from session/select because our CVE map doesn't have the lts versions
	const lts = sessionStorage.getItem(LTS) === 'true';
  const isAffectedVersion = cve[1].versions.includes(version);

	const $relevantCVEFooter = $(`div.cve__header:contains(${cveID})`).siblings('.cve__footer');
	const $footerStatus = $('.cve__footer-status', $relevantCVEFooter);
	const $footerNote = $('.cve__footer-note', $relevantCVEFooter);

	const { triggered } = cve[1];
	let { triggerCount } = cve[1];

	if(triggered){
		$relevantCVEFooter.addClass('cve__footer--error');
		triggerCount = Number.isInteger(triggerCount) ? triggerCount += 1 : 1;
		$footerStatus.text(`CVE triggered ${triggerCount} time${triggerCount > 1 ? 's' : ''}`);
		cve[1].triggerCount = triggerCount;

		if(!isAffectedVersion) {
			$footerNote.text(`but v${version} shouldn't be vulnerable 🤔`);
		}

	}
	else {
		$footerStatus.text(`Can't reproduce! 🎉`);

		if(!lts) {
			if(isAffectedVersion) {
				$footerNote.text(`but v${version} should be vulnerable 🤔`);
			}
			else {
				$footerNote.text(`but v${version} is not vulnerable 😺`);
			}
		}

	}

	$relevantCVEFooter.addClass('flash');
	setTimeout(() => $relevantCVEFooter.removeClass('flash'), 500);

}

function CVE_2011_4969(cve){

	location.hash = `<img src="x" onerror="triggerCVE('${cve[0]}');">`;

	try {
		// presumably, when this vulnerability was discovered, browsers did not return `location.hash` encoded.
		// so we can't reproduce the issue without decoding
		$(decodeURIComponent(location.hash));
	} catch (e) {
		handleJQuerySyntaxError(e);
	}

	history.replaceState(null, null, ' ');  // clear out location.hash completely

}

function handleJQuerySyntaxError(e){

	const JQUERY_SYNTAX_ERROR = 'Syntax error, unrecognized expression';

	const errorMessage = typeof e === 'string' ? e : e.message;

	// we expect newer (unaffected) jQuery to throw a syntax error, so ignore it
	if(!errorMessage.startsWith(JQUERY_SYNTAX_ERROR)) {
		error(e);
	}

}

function CVE_2012_6708(cve) {
	try {
		$(`element[attribute='<img src="x" onerror="triggerCVE('${cve[0]}');" />']`).html();
	} catch (e) {
		handleJQuerySyntaxError(e);
	}
}

function CVE_2015_9251(cve) {
  $.get("http://localhost:3334/jqueryxss", function( content ) {
    // since we are relying on an external resource for this test, guard against regression
		const expected = `triggerCVE('${cve[0]}');`;
    const expectedContentFound = content === expected;
    if(!expectedContentFound) {
      error(`unexpected content found: '${content}' -- expected: '${expected}'`);
      error('CVE-2015-9251 CANNOT BE VERIFIED!');
    }
  });
}

function CVE_2019_11358(cve) {

  $.extend(true, {}, JSON.parse('{"__proto__": {"yee": true}}'))

  if({}.yee) {
		triggerCVE(cve[0]);
    log(`{} prototype has been polluted: ${JSON.stringify({}.__proto__)}`);
  }

	// undo the prototype pollution to prevent side effects
	delete Object.getPrototypeOf({}).yee;

}

function CVE_2020_7656() {
  $("#yee").load("xss.html #yee");
}

function CVE_2020_11022(cve) {
  const x1 = `<style><style /><img src=x onerror=triggerCVE('${cve[0]}');>`;
  const x2 = `<img alt="<x" title="/><img src=x onerror=triggerCVE('${cve[0]}');>">`;
  const $yee = $("#yee");
  $yee.html(x1);
  $yee.html(x2);
}

function CVE_2020_11023(cve) {
  const x = `<option><style></option></select><img src=x onerror=triggerCVE('${cve[0]}');></style>`;
  $("#yee").html(x);
}

function CVE_2020_23064(cve) {
	// this is a duplicate of CVE-2020-11023
	CVE_2020_11023(cve);
}

window.triggerCVE = triggerCVE;
window.doNotPolluteTheGlobalNamespace = {
	CVE_2011_4969,
	CVE_2012_6708,
	CVE_2015_9251,
	CVE_2019_11358,
	CVE_2020_7656,
	CVE_2020_11022,
	CVE_2020_11023,
	CVE_2020_23064,
};
