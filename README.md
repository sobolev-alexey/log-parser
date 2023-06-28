# Log parser

The goal is to retrieve the number of distinct queries that have been done during a specific time range from a given log dataset.

## How to run 

### Installation

```bash
$ yarn
```

### Running the app

```bash
$ yarn dev
```

### Configuration

Values for `PORT` and `LOG_FILE` can be configured in the provided `.env` file.  

#### PORT
The server will bind to `localhost:8080` by default. The value is configurable.

#### LOG_FILE
Default log file name is `hn_logs.tsv.gz` and location is the `root` folder of the app. The value is configurable.

### Usage

To run search queries containing time value, make sure to properly encode the URL (e.g. replace spaces with `%20`).

```bash
$ curl http://localhost:8080/queries/count/2015-08-01%2000:04

{"count":617}
```

```bash
$ curl http://localhost:8080/queries/count/2015-08

{"count":573697}
```

```bash
$ curl http://localhost:8080/queries/count/abc

{"error":"Invalid date format"}
```
  
#### Important note
The initial index creation process is executed when the application starts, and it typically takes around 2-3 seconds to complete. Any requests made during the index creation phase will be rejected, and a specific message will be returned to indicate this.

```bash
$ curl http://localhost:8080/queries/count/2015

{"message":"Indexing in progress, please repeat your request later"}
```
  
----  
  

# Design choices & thought process

I have implemented three distinct solutions and conducted extensive experimentation to evaluate the advantages and disadvantages of each approach.

## First solution
The application sequentially loads log files and constructs a **tree-like structure** to organize the logs based on their dates. Each log is placed in a specific node of the tree, representing the `year`, `month`, `day`, `hour`, `minute`, and `second`. For example, a log entry like  
```
2015-08-01 00:04:12 query
```  
would be stored in a six-level deep tree structure  
```
2015                                <- aggregate for 2015
|
-> 08                               <- aggregate for 08 month of 2015
    |
    -> 01                           <- aggregate for 01 day of 08 month of 2015
        |
        -> 00                       <- aggregate for 00 hour for 2015-08-01
            |
            ->04                    <- aggregate for 04 minute of 2015-08-01 00:
                |
                -> 12               <- aggregate for 12 second of 2015-08-01 00:04

```

To process a query within a specified time range, the solution narrows down the search to the deepest node in the tree corresponding to the requested date range. 
```
index.get("2015").get("08").get("01") // for the range like "2015-08-01"
```
Finally, it recursively traverses the narrowed sub-tree to collect all the queries, which are added to a `Set` to eliminate duplicates. The size of the `Set` represents the number of distinct queries within the specified time range.

## Second solution
This solution utilizes a `Map` data structure, where each log entry is stored as a key-value pair, with the `timestamp` as the **key** and the `query` as the **value**.  
After constructing the `Map`, the entries are sorted by their keys using the **Quicksort** algorithm.  

To process a query within a given time range, the solution employs a **binary search** algorithm to locate the keys that are closest to the specified "begin" and "end" timestamps.  
It then iterates over the values in the `Map` between the positions of these keys, adds the queries to a `Set` to remove duplicates, and outputs the size of the `Set` as the number of distinct queries within the desired time range.

## Third solution
This solution is similar to the second one, but it introduces the use of **service workers** to improve performance. **Service workers** are utilized to move the index creation process out of the main thread, reducing the impact on the user interface and improving responsiveness.  
  
Additionally, **service workers** can be employed to process search requests within the index, further optimizing the search operation.  
  
By leveraging **service workers**, the solution aims to enhance parallel processing and improve the overall efficiency of both index creation and query processing steps.

----

# Evaluation

To evaluate the efficiency of the provided solutions in terms of resource consumption (CPU/memory/disk space) and response times for processing millions of log file entries, let's consider the pros and cons of each solution.

## First solution

### Pros:

- Efficient storage: The tree-like structure allows efficient organization and retrieval of logs based on date and time. This can lead to optimized storage and retrieval operations, especially for large log files.
- Fast query processing: By narrowing down the search to the relevant sub-tree based on the requested time range, the solution can quickly traverse the tree structure and collect distinct queries.
- Elimination of duplicates: By using a Set to store queries, duplicates can be automatically eliminated, ensuring that only distinct queries are counted.

### Cons:

- Memory consumption: Storing logs in a tree-like structure can consume a significant amount of memory, especially for large log files. This could be a concern if the available memory is limited.
- Complex implementation: Implementing and maintaining a tree structure can be more complex compared to other data structures. It requires careful handling of various levels and nodes, which may increase the chances of introducing bugs.
- Limited scalability: While this solution can work well for processing log files within a given time range, it may face challenges in terms of scalability for handling extremely large log files or frequent queries on different time ranges. 

## Second solution

### Pros:

- Simple data structure: Using a `Map` to store the logs with timestamps as keys simplifies the implementation. Maps provide efficient key-value lookup and insertion, making it easier to process and retrieve logs within the specified time range.
- Sorting for efficient search: Sorting the map by timestamp using the **Quicksort** algorithm enables efficient binary search for finding the closest keys to the requested time range. This can reduce the search space and improve overall query processing time.
- Elimination of duplicates: Similar to the first solution, the use of a `Set` to store queries ensures that only distinct queries are counted.

### Cons:

- Sorting overhead: The sorting process adds an overhead, especially for large log files. Quicksort has an average time complexity of `O(n log n)`, which may impact the performance, particularly during the initial setup when logs are being sorted.
- Memory usage: Storing logs in a `Map` can consume significant memory, especially for large log files. The memory usage is directly proportional to the number of logs, which could be a limitation in memory-constrained environments.
- Limited scalability: As the number of logs grows, the search and retrieval process may become slower due to the need to iterate over a larger portion of the sorted map. 


## Third solution

### Pros:

- Offloading processing to **service workers**: Using service workers to create the search index and process search requests can offload the computational load from the main thread. This can result in a more responsive user interface and better overall performance.
- Parallel processing: By utilizing service workers, the index creation and search operations can be performed in parallel, potentially improving the processing speed, especially for large log files or complex queries.
- Reduced impact on main thread: Moving the index creation and search operations to service workers can prevent blocking the main thread, ensuring that the user interface remains smooth and responsive.

### Cons:

- Complexity: Introducing service workers adds complexity to the implementation. Coordinating communication between the main thread and service workers, handling data synchronization, and managing the overall workflow can be challenging and may require additional effort.
- Communication overhead: As service workers operate in a separate context, there is an overhead associated with passing data between the main thread and service workers. This overhead can impact performance, especially if the data exchanged is large or if there are frequent interactions between the threads.
- Compatibility and platform support: Service workers' availability and support may vary across different platforms. This can limit the applicability and portability of the solution.

----

# Conclusion

Considering the efficiency requirements and the cons of each solution, the second solution seems to be the most efficient option. It provides a simple data structure, efficient search using binary search, and eliminates duplicates using a Set. Although it incurs some sorting overhead, it is generally a more scalable solution compared to the first solution.

For an optimal solution considering millions of log file entries, an alternative approach could be to utilize a combination of techniques:

1. Use a data structure that balances efficiency and memory consumption, such as a balanced binary search tree (e.g., [AVL tree](https://monmohan.github.io/dsjslib/AVLTree.html) or Red-Black tree). This would provide efficient storage and retrieval of logs while minimizing memory usage.
2. Instead of sorting the entire map, maintain the logs in a sorted order as they are inserted into the data structure. This would eliminate the need for a separate sorting step, reducing the sorting overhead.
3. Employ multi-threading or parallel processing techniques to handle the processing of log files in parallel, optimizing resource utilization and improving response times.
4. Implement an incremental indexing approach, where the search index is built incrementally as new log files are added, allowing for efficient updates and minimizing the impact of processing large log files.
5. Utilize efficient algorithms for time range queries, such as interval tree-based approaches, to further optimize the search and retrieval of queries within a given time range.  


By combining these techniques, it is possible to achieve an optimal solution that balances resource consumption, response times, and scalability for processing millions of log file entries.

  
© [Alexey Sobolev](https://lexer.dev/)