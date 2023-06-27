import fs from 'fs';
import zlib from "zlib";
import readline from 'readline';

function getOrCreateMap(map: Map<string, any>, key: string) {
  try {
    // Get or create map for [key]
    if (!map.has(key)) {
      map.set(key, new Map<string, any>());
    }
    return map.get(key);
  } catch (error) {
    console.error(error);
  }
}

// Function to process the log file and build the index
export function processLogFile(filePath: string): Promise<Map<string, any>> {
  let lines = 0;
  const index = new Map<string, any>();

  return new Promise((resolve, reject) => {
    const fileProcessing = "Processing time";
    console.time(fileProcessing);

    // The readline module is a native Node.js module
    // used to receive data from a readable stream.
    // It creates an interface that enables us to read
    // the standard input from a large file line by line.
    const rl = readline.createInterface({
      // Node.js provides a built-in Streams API for efficient processing of large files.
      // Streams enable us to read data in chunks, instead of loading the entire file into memory.
      // This means that we can start processing data as soon as the first chunk becomes available,
      // rather than waiting for the entire file to be loaded.
      input: fs.createReadStream(filePath)
        .pipe(zlib.createGunzip()),
      crlfDelay: Infinity
    });

    // The line event is emitted each time the input stream
    // receives an input with a callback function.
    rl.on('line', (line) => {
      lines++;
      const [dateString, query] = line.split('\t');
      const [date, time] = dateString.split(" ");
      const [year = dateString, month = "01", day = "01"] = (date || dateString)?.split("-");
      const [hour = "00", minute = "00", second = "00"] = (time || "00").split(":");

      const monthsMap = getOrCreateMap(index, year); // months map for index[2015]
      const daysMap = getOrCreateMap(monthsMap, month); // days map for index[2015][08]
      const hoursMap = getOrCreateMap(daysMap, day); // hours map for index[2015][08][03]
      const minutesMap = getOrCreateMap(hoursMap, hour); // minutes map for index[2015][08][03][00]
      const secondsMap = getOrCreateMap(minutesMap, minute); // seconds map for index[2015][08][03][00][04]
      const entriesSet = secondsMap.get(second)?.size > 0 ? secondsMap.get(second) : new Set(); 
      
      // distinct queries within a second, e.g. index[2015][08][03][00][04][17]
      secondsMap.set(second, entriesSet.add(query));
    });

    // The close event displays the result of the line event callback in the terminal.
    rl.on('close', async () => {
      console.log('Data parsing completed');
      console.log('Lines parsed', lines);
      console.timeEnd(fileProcessing);
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Memory used: ${Math.round(used * 100) / 100} MB`);

      resolve(index);
    });

    // The error event outputs the error message in case there is one
    rl.on('error', (err) => {
      reject(err);
    });
  });
}
