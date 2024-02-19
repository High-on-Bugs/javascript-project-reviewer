const express = require('express');
const { fork, spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const simpleGit = require('simple-git');
require('dotenv').config();

const app = express();
app.use(express.json());


const git = simpleGit();
let controller;
const base_url = process.env.JAVASCRIPT_APP_BASE_PROJECT_URL;
const scriptPath = path.join(__dirname, 'buildProcess.js');
let folderPath;
const log = {};
log.build = [];

app.get('/', (req, res) => {
 const indexPath = path.join(__dirname, 'views', 'index.html');
 res.sendFile(indexPath);
});

app.post('/build', async (req, res) => {

 let { url, command, env } = req.body;
 const folderName = url.split('/').pop().split('.git')[0];
 folderPath = `${base_url}/${folderName}`;

 // check if folder exists
 if (fs.existsSync
  (folderPath)) {
  // cloning not needed
  log.clone = "Repo already cloned.";
 } else {

  console.log("Cloning repo...");
  await git.clone(url, folderPath).then((result) => {
   log.clone = "Repository Cloned!";
  }).catch((err) => {
   return res.status(500).json({ message: 'Error cloning repo', error: err });
  });
 }


 const envFilePath = `${folderPath}/.env`;
 let envFileContent = '';
 for (const key in env) {
  envFileContent += `${key}=${env[key]}\n`;
 }
 //write to file (windows)
 console.log("Creating env file...");
 fs.writeFileSync(envFilePath, envFileContent, (err) => {
  if (err) {
   return res.status(500).json({ message: 'Error creating env file', error: err });
  }
 });

 // "env file created at " + envFilePath added to log
 log.env = `Env file created!`;

 console.log("Building Project...");
 // we also need to pass env to separate child env from parent env
 controller = new AbortController();
 const { signal } = controller;
 const buildProcess = fork(scriptPath, [folderPath, command], { stdio: "pipe", signal });

 // send message to parent
 buildProcess.stdout.on('data', (data) => {
  log.build.push(data.toString());
 });

 // send message to parent
 buildProcess.stderr.on('data', (data) => {
  log.build.push(data.toString());
 });

 // send message to parent
 buildProcess.on('close', (code) => {
  log.close = `child process exited!`;
 });

 // return log
 return res.json({ message: 'Build process started', log });

});

// log route
app.get('/logs', (req, res) => {
 // return build and close logs
 return res.json({
  build: log.build,
  close: log.close
 })
});

// kill route
app.get('/code', (req, res) => {
 /// run "code ." command in the folderPath
 const vscodeProcess = spawn('code', [folderPath], { shell: true });
 // Handle errors during the spawn process
 vscodeProcess.on('error', (err) => {
  return res.status(500).json({ message: 'Error opening project in VSCode', error: err });
 });
 // return success message
 return res.json({ message: 'Project opened in VSCode' });
});

app.listen(process.env.JAVASCRIPT_APP_TEST_PORT, () => {
 console.log(`Server is running on port ${process.env.JAVASCRIPT_APP_TEST_PORT}`);
});