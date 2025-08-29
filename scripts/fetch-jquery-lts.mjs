import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { jQueryLTSVersions } from '../site/cve-data.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const baseUrl = 'https://raw.githubusercontent.com/jquery-lts/jquery-security-patches';

const targetDir = path.join(__dirname, '../site/vendor');

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function downloadFile(url, targetPath) {
  const fileName = path.basename(targetPath);

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`failed to download: ${response.status} ${response.statusText}`);
    }

    const data = await response.text();
    fs.writeFileSync(targetPath, data);
    console.log(`✓ downloaded: ${fileName}`);
}

async function downloadJQueryLTS(version) {
  const branchName = `${version}-sec`;
  const fileName = `jquery-lts-${version}.js`;
  const url = `${baseUrl}/${branchName}/dist/${fileName}`;
  const targetPath = path.join(targetDir, fileName);

  try {
    await downloadFile(url, targetPath);
  } catch (error) {
    console.error(`✗ failed to download ${fileName}:`, error.message);
  }
}

async function main() {
  console.log('starting jQuery-LTS downloads...\n');

  for (const version of jQueryLTSVersions) {
    await downloadJQueryLTS(version);
  }

  console.log('\n...done!\n\n');
}

main().catch(console.error);
