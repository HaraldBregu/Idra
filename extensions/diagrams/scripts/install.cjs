const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const source = path.resolve(__dirname, '..');
const parent = path.join(os.homedir(), '.friday', 'extensions');
const destination = path.join(parent, 'diagrams');
const staging = path.join(parent, `.diagrams-installing-${process.pid}`);
const backup = path.join(parent, `.diagrams-previous-${process.pid}`);
const files = ['manifest.json', 'package.json', 'dist'];

if (!fs.existsSync(path.join(source, 'dist', 'index.html'))) {
	throw new Error('Build output is missing: dist/index.html');
}

fs.mkdirSync(parent, { recursive: true });
fs.rmSync(staging, { force: true, recursive: true });
fs.rmSync(backup, { force: true, recursive: true });
fs.mkdirSync(staging);
for (const file of files) {
	fs.cpSync(path.join(source, file), path.join(staging, file), { recursive: true });
}

try {
	if (fs.existsSync(destination)) fs.renameSync(destination, backup);
	fs.renameSync(staging, destination);
	fs.rmSync(backup, { force: true, recursive: true });
} catch (error) {
	fs.rmSync(staging, { force: true, recursive: true });
	if (!fs.existsSync(destination) && fs.existsSync(backup)) fs.renameSync(backup, destination);
	throw error;
}

process.stdout.write(`Installed Diagrams to ${destination}\n`);
