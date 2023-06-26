/* eslint-disable no-console */
import { StringOrMap } from "../types";

// Recursively count all search queries of the nested map
function countNestedElements(obj: Map<string, any> | Set<string>): Set<string> {
  try {
    if (obj instanceof Map) {
      const distinctQueries = new Set<string>();

      for (const value of obj.values()) {

        // countNestedElements(value) - after returning from a recursive function 
        // this will contain a Set of distinct queries made within a second  

        // Process the set values and add them 
        // into a set of queries to filter out duplicates
        for (const item of countNestedElements(value).values()) {
          distinctQueries.add(item);
        }
      }
      return distinctQueries;
    }
    return obj;
  } catch (error) {
    throw error;
  }
}

function countDistinctResults(index: Map<string, StringOrMap>, startDate: string) {
  // Apply Regex to split timestamp by multiple separators
  const splitDate = startDate.split(/-| |:/); // e.g. ["2015", "08", "01", "00", "04"]

  let searchResult: any = index;
  splitDate?.forEach((dateParam: string) => {
    if (searchResult?.get(dateParam)) {
      // Narrow down the deep most node within the index, 
      // from where the counting should begin
      // e.g. index[2015][08][03][00][04] - this will reduce lookup only to a very deep node within the tree
      searchResult = searchResult.get(dateParam); 
    }
  });
  const distinctQueries = countNestedElements(searchResult);
  return distinctQueries?.size || 0;
}

// API route handler
export function countQueriesHelper(datePrefix: string, index: Map<string, StringOrMap>): number {
  try {
    const indexLookup = "Index lookup";
    console.time(indexLookup);

    const count = countDistinctResults(index, decodeURIComponent(datePrefix))
    console.log('Distinct queries:', count);

    console.timeEnd(indexLookup);
    const used = process.memoryUsage().heapUsed / 1024 / 1024;
    console.log(`Memory used: ${Math.round(used * 100) / 100} MB`);

    return count;
  } catch (error) {
    throw error;
  }
}
