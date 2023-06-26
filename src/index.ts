/* eslint-disable no-console */
import 'dotenv/config';
import { Worker } from 'worker_threads';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { processSearchQuery } from './routes/countQueries';

/*
  File processing & indexing
*/
let index = new Map<string, Set<string>>();

const invokeWorker = "Invoke worker";
console.time(invokeWorker);

// Start the worker thread to process the log file
const worker = new Worker('./src/helpers/processFile.ts');

worker.on('message', (dataIndex) => {
  // The worker has finished processing the log file and returned the index
  // Now we can handle incoming HTTP requests to count distinct queries
  index = dataIndex; // Update index
});

worker.on('error', (err) => {
  console.error(err);
});

worker.on('exit', (code) => {
  if (code !== 0) {
    console.error(`Worker stopped with exit code ${code}`);
  }
  console.timeEnd(invokeWorker);
});


/*
  Fastify Server
*/
const server = Fastify();

server.get('/queries/count/:date', countQueriesHandler);

server.listen({ port: Number(process.env.PORT) || 8080 }, (err, address) => {
  if (err) {
    console.error(err);
    process.exit(1);
  }
  console.log(`Server is now listening on ${address}`);
});


/*
  Fastify route handler
*/
async function countQueriesHandler(
  request: FastifyRequest<{ Params: { date: string }}>,
  reply: FastifyReply
): Promise<void> {
  try {
    if (index.size === 0) {
      reply.code(425).send({ message: 'Indexing in progress' });
    }

    const { date } = request.params;
    const count = await processSearchQuery(date, index);
    reply.code(200).send({ count });
  } catch (error) {
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}
