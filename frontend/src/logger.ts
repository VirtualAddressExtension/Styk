import { Logger, ConsoleTransport, FileTransport } from '@origranot/ts-logger';

// Create an instance of the console logger
const consoleTransport = new ConsoleTransport();

/*
  Note: The file transport will create the file if it doesn't exist, and append to it if it does.
  We can also provide log rotation options to the file transport, which will automatically
  rotate the log file according to the date.
*/
const today = new Date();
const fileTransport = new FileTransport({ path: `./logs/${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}.log` });

const logger = new Logger({
  transports: [consoleTransport, fileTransport]
});

/*
  Log messages will be handled by both transports provided:
  - The console transport will output the log message to the console.
  - The file transport will write the log message to the file.
*/

export default logger