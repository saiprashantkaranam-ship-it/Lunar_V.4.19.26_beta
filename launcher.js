/**
 * 🚀 Lunar AI — Smart Launcher
 * Wraps server.js to provide automatic error recovery and repair options.
 */

const { spawn } = require('child_process');
const path = require('path');
const readline = require('readline');

function startServer() {
  console.log('\n🚀 Starting Lunar AI...');
  
  const server = spawn('node', ['server.js'], {
    stdio: ['inherit', 'inherit', 'pipe'], // Pipe stderr so we can analyze it
    cwd: __dirname
  });

  let errorBuffer = '';

  server.stderr.on('data', (data) => {
    const msg = data.toString();
    errorBuffer += msg;
    process.stderr.write(msg); // Still show it in terminal
  });

  server.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`\n🔴 Lunar stopped with exit code ${code}`);
      analyzeError(errorBuffer);
    }
  });
}

function analyzeError(error) {
  console.log('\n🔍 Analyzing error for potential fixes...');
  
  if (error.includes('EADDRINUSE')) {
    promptRepair('Port 3000 is already in use. Would you like me to try and kill the blocking process?', 'taskkill /F /IM node.exe');
  } else if (error.includes('MODULE_NOT_FOUND')) {
    promptRepair('A required module is missing. Would you like me to run npm install?', 'npm install');
  } else if (error.includes('SyntaxError')) {
    console.log('❌ Syntax Error detected in your code.');
    console.log('💡 Tip: Check for missing commas, braces, or duplicate declarations.');
    console.log('Lunar cannot auto-fix syntax errors yet, but check the line number in the log above.');
    retryMenu();
  } else if (error.includes('ollama')) {
    console.log('⚠️ Ollama error detected.');
    console.log('💡 Make sure Ollama is installed and running.');
    retryMenu();
  } else {
    console.log('❓ Unknown error occurred.');
    retryMenu();
  }
}

function promptRepair(question, command) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question(`\n🛠️  ${question} (y/n): `, (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'y') {
      console.log(`⚙️ Running: ${command}...`);
      const { exec } = require('child_process');
      exec(command, (err) => {
        if (err) console.error('❌ Repair failed:', err.message);
        else console.log('✅ Repair attempted.');
        startServer();
      });
    } else {
      retryMenu();
    }
  });
}

function retryMenu() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  rl.question('\n🔄 Try starting again? (y) or Exit (n): ', (answer) => {
    rl.close();
    if (answer.toLowerCase() === 'y') startServer();
    else process.exit(1);
  });
}

// Kick off the launcher
startServer();
