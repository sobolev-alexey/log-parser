import 'dotenv/config';
import { processLogFile } from '../helpers/processFile';
import { countDistinctResults } from '../helpers/searchIndex';

let index = new Map<string, any>();
const logFilePath = process.env.LOG_FILE || 'hn_logs.tsv.gz';

beforeAll(() => {
  return new Promise(async (resolve) => {
    index = await processLogFile(logFilePath);
    resolve(index);
  });
});

describe('Indexing and query processing', () => {
  test('Count distinct queries within a second', async () => {
    const count = await countDistinctResults(index, '2015-08-01 00:04:23');
    expect(count).toEqual(7);
  });

  test('Count distinct queries within a minute', async () => {
    const count = await countDistinctResults(index, '2015-08-01 00:04');
    expect(count).toEqual(617);
  });

  test('Count distinct queries within an hour', async () => {
    const count = await countDistinctResults(index, '2015-08-01 15');
    expect(count).toEqual(14617);
  });

  test('Count distinct queries within a day', async () => {
    const count = await countDistinctResults(index, '2015-08-03');
    expect(count).toEqual(198117);
  });

  test('Count distinct queries within a month', async () => {
    const count = await countDistinctResults(index, '2015-08');
    expect(count).toEqual(573697);
  });

  test('Count distinct queries within a year', async () => {
    const count = await countDistinctResults(index, '2015');
    expect(count).toEqual(573697);
  });

  test('Count distinct queries before logged interval', async () => {
    const count = await countDistinctResults(index, '2014-08');
    expect(count).toEqual(0);
  });

  test('Count distinct queries after logged interval', async () => {
    const count = await countDistinctResults(index, '2015-09-01 00:04');
    expect(count).toEqual(0);
  });
});
