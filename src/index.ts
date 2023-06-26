/* eslint-disable no-console */
import 'dotenv/config';
import Fastify, { FastifyRequest, FastifyReply } from 'fastify';
import { countQueriesHelper } from './helpers/searchIndex';
import { processLogFile } from './helpers/processFile';
import { StringOrMap } from "./types";

/*
  File processing & indexing
*/
const logFilePath = process.env.LOG_FILE || 'hn_logs.tsv.gz';

let index = new Map<string, StringOrMap>();

// Process the log file and build the index
processLogFile(logFilePath)
  .then((dataIndex: any) => {
    // Update index
    index = dataIndex;
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
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
    const count = await countQueriesHelper(date, index);
    reply.code(200).send({ count });
  } catch (error) {
    reply.code(500).send({ error: 'Internal Server Error' });
  }
}
