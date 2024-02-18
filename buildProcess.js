const { spawn } = require('child_process');

console.log('Getting Logs');
const [folderPath, command] = process.argv.slice(2);

// Convert build command to array
const buildCommand = command.split(' ');
buildCommand.shift();

const buildProcess = spawn('npm.cmd', buildCommand, { cwd: folderPath, stdio: 'pipe' });

// send message to parent
buildProcess.stdout.on('data', (data) => {
 console.log(data.toString());
});

// send message to parent
buildProcess.stderr.on('data', (data) => {
 console.error(data.toString());
});

// send message to parent
buildProcess.on('close', (code) => {
 console.log(`child process exited with code ${code}`);
});