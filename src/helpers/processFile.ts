import 'dotenv/config';
import fs from 'fs';
import zlib from "zlib";
import readline from 'readline';
import { parentPort } from 'worker_threads';

/* This is the worker thread */

const logFilePath = process.env.LOG_FILE || 'hn_logs.tsv.gz';

function quickSortMapEntriesByKey<K, V>(map: Map<K, V>): Map<K, V> {
  const entries = Array.from(map.entries());

  function partition(left: number, right: number): number {
    const pivot = entries[Math.floor((left + right) / 2)][0];

    while (left <= right) {
      while (entries[left][0] < pivot) {
        left++;
      }
      while (entries[right][0] > pivot) {
        right--;
      }

      if (left <= right) {
        [entries[left], entries[right]] = [entries[right], entries[left]];
        left++;
        right--;
      }
    }

    return left;
  }

  function quickSort(left: number, right: number): void {
    if (left >= right) {
      return;
    }
    const index = partition(left, right);
    quickSort(left, index - 1);
    quickSort(index, right);
  }

  quickSort(0, entries.length - 1);

  return new Map(entries);
}


// Function to process the log file and build the index
export function processLogFile(filePath: string) {
  let lines = 0;
  const index = new Map();

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

      if (!index.has(dateString)) {
        index.set(dateString, new Set<string>());
      }
      index.get(dateString).add(query);

    });

    // The close event displays the result of the line event callback in the terminal.
    rl.on('close', async () => {
      const sortedIndex = quickSortMapEntriesByKey(index);

      console.log('Data parsing completed');
      console.log('Lines parsed', lines);
      console.timeEnd(fileProcessing);
      const used = process.memoryUsage().heapUsed / 1024 / 1024;
      console.log(`Memory used: ${Math.round(used * 100) / 100} MB`);

      resolve(sortedIndex);
    });

    // The error event outputs the error message in case there is one
    rl.on('error', (err) => {
      reject(err);
    });
  });
}


// Process the log file and build the index
processLogFile(logFilePath)
  .then((index) => {
    // Notify the parent process that the indexing is completed
    parentPort?.postMessage(index);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });

