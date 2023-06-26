import { parentPort, workerData } from 'worker_threads';

// Function to count distinct queries within a specific time range
function countDistinctQueries(indexMap: Map<string, Set<string>>, dateString: string) {
  const distinctQueries = new Set<string>();

  // construct full timestamp of the start date to use as lower bound for the lookup
  const [
    yearStart = dateString, monthStart = "01", dayStart = "01", hourStart = "00", minuteStart = "00", secondStart = "00"
  ] = dateString.split(/-| |:/);
  const dateStart = `${[yearStart, monthStart, dayStart].join("-")} ${[hourStart, minuteStart, secondStart].join(":")}`;

  // construct full timestamp of the end date to use as upper bound for the lookup
  const [
    yearEnd = dateString, monthEnd = "12", dayEnd = "31", hourEnd = "23", minuteEnd = "59", secondEnd= "59"
  ] = dateString.split(/-| |:/);
  const dateEnd = `${[yearEnd, monthEnd, dayEnd].join("-")} ${[hourEnd, minuteEnd, secondEnd].join(":")}`;

  // Convert map keys into array
  const keys = Array.from(indexMap.keys());

  // Check edge cases for early return to reduce computation load
  if (dateEnd < keys[0] || dateStart > keys[keys.length - 1]) {
    return 0;
  }

  // Determine index of the first array item, relevant for the query, 
  // It's going to be either index of the dateStart 
  // or the index of a next available entry which should have follow the dateStart.
  const startIndex = binarySearchByKey(indexMap, dateStart);

  // Determine index of the last array item, relevant for the query, 
  // It's going to be either index of the dateEnd 
  // or the index of a next available entry which should have follow the dateEnd.
  const endIndex = binarySearchByKey(indexMap, dateEnd) || keys.length;

  // To not process the entire array, we only process sorted items between dateStart and dateEnd values
  for (let i: any = startIndex; i <= endIndex; i++) {
    const key = keys[i];
    if (key >= dateStart && key <= dateEnd) {
      const queries = indexMap.get(key);
      if (queries) {
          for (const query of queries) {
          distinctQueries.add(query);
        }
      }
    }
  }

  return distinctQueries.size;
}


function binarySearchByKey<K, V>(map: Map<K, V>, searchKey: K): number | undefined {
  const keys = Array.from(map.keys());
  let left = 0;
  let right = keys.length - 1;
  let result: number | undefined = undefined;

  while (left <= right) {
    const middle = Math.floor((left + right) / 2);
    const currentKey = keys[middle];

    if (currentKey === searchKey) {
      return middle;
    }
    
    if (currentKey < searchKey) {
      left = middle + 1;
    } else {
      result = keys.indexOf(currentKey);
      right = middle - 1;
    }
  }

  return result ?? 0;
}

// API route handler
export async function countQueriesHelper(): Promise<number> {
  try {
    const indexLookup = "Index lookup";
    console.time(indexLookup);

    const count = countDistinctQueries(workerData.index, decodeURIComponent(workerData.datePrefix))
    console.log('Distinct queries:', count);

    console.timeEnd(indexLookup);
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory used: ${Math.round(used * 100) / 100} MB`);

    return count;
  } catch (error) {
    throw error;
  }
}

// Process the log file and build the index
countQueriesHelper()
  .then((count) => {
    // Notify the parent process that the index traversing is completed
    parentPort?.postMessage(count);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });