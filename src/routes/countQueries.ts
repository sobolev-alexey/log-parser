import { Worker } from 'worker_threads';

export function processSearchQuery(date: string, index: Map<string, Set<string>>) {
  return new Promise((resolve, reject) => {
    const invokeQueryWorker = "Invoke query worker";
    console.time(invokeQueryWorker);

    // Start the worker thread to traverse the log file
    const queryWorker = new Worker('./src/helpers/searchIndex.ts', {
      workerData: { datePrefix: date, index }
    });

    queryWorker.on('message', (count) => {
      // The worker has finished index processing
      // Now we can handle incoming HTTP requests and reply with the count
      resolve(count);
    });

    queryWorker.on('error', (err) => {
      console.error(err);
      reject(err);
    });

    queryWorker.on('exit', (code) => {
      if (code !== 0) {
        console.error(`Query worker stopped with exit code ${code}`);
        reject(code);
      }
      console.timeEnd(invokeQueryWorker);
    });
  });
}
