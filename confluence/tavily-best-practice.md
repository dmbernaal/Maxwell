# Best Practices for Search

> Learn how to optimize your queries, refine search filters, and leverage advanced parameters for better performance.

## Optimizing your query

#### 1. Keep your query under 400 characters

For efficient processing, keep your query concise—under **400 characters**. Think of it as a query for an agent performing web search, not long-form prompts. If your query exceeds the limit, you'll see this error:

```json  theme={null}
{
  "detail": {
    "error": "Query is too long. Max query length is 400 characters."
  }
}
```

#### 2. Break your query into smaller sub-queries

If your query is complex or covers multiple topics, consider breaking it into smaller, more focused sub-queries and sending them as separate requests.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Breaking the query into smaller, more focused sub-queries.
  {
     "query":"Competitors of company ABC."
  }
  {
     "query":"Financial performance of company ABC."
  }
  {
     "query":"Recent developments of company ABC."
  }
  {
     "query":"Latest industry trends related to ABC."
  }
  ```

  ```json ❌ Bad theme={null}
  {
    "query": "Information regarding the history, financial performance, market positioning, recent developments, executive leadership, product offerings, customer demographics, strategic partnerships, mergers and acquisitions, regulatory challenges, competitor analysis, emerging market trends, technological advancements, and overall industry outlook for the company ABC and its key competitors within the industry, including recent reports, expert analyses, and predictions for future growth."
  }
  ```
</CodeGroup>

## Optimizing your request parameters

#### `max_results`  (Limiting the number of results)

* Limits the number of search results (default is `5`).

<CodeGroup>
  ```json ✅ Good theme={null}
  // Customizing max_results based on your needs, limiting the results to 10 to improve relevance and focus on the most relevant sources.
  {
    "query": "Info about renewable energy technologies",
    "max_results": 10
  }
  ```

  ```json ❌ Bad theme={null}
  // Setting max_results too high may return irrelevant or low-quality results.
  {
    "query": "Info about renewable energy technologies",
    "max_results": 300
  }
  ```
</CodeGroup>

#### `content` (NLP-based snippet)

* Provides a summarized content snippet.
* Helps in quickly understanding the main context without extracting full content.
* When `search_depth` is set to `advanced` , it extracts content closely aligned with your query, surfacing the most valuable sections of a web page rather than a generic summary. Additionally, it uses `chunks_per_source` to determine the number of content chunks to return per source.

#### `search_depth=advanced`  (Ideal for higher relevance in search results)

* Retrieves the most relevant content snippets for your query.
* By setting  `include_raw_content` to `true`, you can increase the likelihood of enhancing retrieval precision and retrieving the desired number of `chunks_per_source`.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using search_depth=advanced and chunks_per_source for a query to get the most relevant content, and enabling include_raw_content.
  {
    "query": "How many countries use Monday.com?",
    "search_depth": "advanced",
    "chunks_per_source": 3,
    "include_raw_content": true
  }
  ```

  ```json 👍 Good theme={null}
  // Using search_depth=advanced and chunks_per_source for a query to get the most relevant content.
  {
    "query": "How many countries use Monday.com?",
    "search_depth": "advanced",
    "chunks_per_source": 3
  }
  ```

  ```json ❌ Bad theme={null}
  // Using basic search for queries that is seeking specific information that might not be available in the generic `content` snippet.
  {
    "query": "How many countries use Monday.com?",
    "search_depth": "basic"
  }
  ```
</CodeGroup>

#### `time_range` (Filtering by Date)

* Restricts search results to a specific time frame based on publish date or last updated date.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using time_range to filter sources from the past month.
  {
    "query": "latest trends in machine learning",
    "time_range": "month"
  }
  ```

  ```json 👍 Moderate theme={null}
  // Not using time_range to filter results by date for recent sources.
  {
    "query": "latest trends in machine learning"
  }
  ```
</CodeGroup>

#### `start_date` and  `end_date` (Filtering by Specific Date Range)

* Filters search results published or updated within a specified date range.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using start_date and end_date to filter results published or updated between specific dates.
  { 
      "query": "latest trends in machine learning",
      "start_date": "2025-01-01",
      "end_date": "2025-02-01" 
  } 
  ```

  ```json 👍 Moderate theme={null}
  // Using only start_date without specifying end_date, which may return very recent results without an upper limit. 
  { 
      "query": "latest trends in machine learning", 
      "start_date": "2025-01-01" 
  } 
  ```
</CodeGroup>

#### `include_raw_content` (Extracted web content)

Set to true to return the full extracted content of the web page, useful for deeper content analysis. However, the most recommended approach for extracting web page content is using a two-step process:

1. Search: Retrieve relevant URLs.
2. Extract: Extract content from those URLs.

For more information on this two-step process, please refer to the [Best Practices for the Extract API](/documentation/best-practices/best-practices-extract#2-two-step-process-search-then-extract).

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using include_raw_content to retrieve full content for comprehensive analysis.
  {
      "query": "The impact of AI in healthcare",
      "include_raw_content": true
  }
  ```

  ```json 👍 Moderate theme={null}
   // Not using include_raw_content when detailed content is needed.
   {
      "query": "The impact of AI in healthcare"
   }
  ```
</CodeGroup>

#### `topic=news` (Filtering news sources)

* Limits results to news-related sources.
* Includes `published_date` metadata.
* Useful for getting real-time updates, particularly about politics, sports, and major current events covered by mainstream media sources.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using "topic=news" to get the latest updates from news sources.
  {
    "query": "What happened today in NY?",
    "topic": "news"
  }
  ```

  ```json ❌ Bad theme={null}
  // Not specifying the "topic" parameter, which is essential for retrieving results specifically from news sources.
  {
    "query": "What happened today in NY?"
  }
  ```
</CodeGroup>

#### `auto_parameters` (Automatically Optimizing Search Parameters)

* When enabled, Tavily intelligently adjusts search parameters based on the query's intent.
* Explicitly set values always override the automatic ones.
* Note: `search_depth` may default to `advanced`, using 2 API credits per request. To control cost, set it manually to `basic`.

<CodeGroup>
  ```json ✅ Good theme={null}
  // auto_parameters enabled with manual override to control cost and output. 
  { 
      "query": "impact of AI in education policy", 
      "auto_parameters": true, 
      "search_depth": "basic", // Overrides 'advanced' 
      "include_answer": true, 
      "max_results": 10 
  } 
  ```

  ```json 👍 Moderate  theme={null}
  // auto_parameters enabled without controlling cost-impacting parameters.
  { 
      "query": "impact of AI in education policy",
      "auto_parameters": true
  } 
  ```
</CodeGroup>

#### `include_domains` (Restricting searches to specific domains)

* Limits searches to predefined trusted domains.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using include_domains to restrict search for more domain-specific information.
  {
    "query": "What is the professional background of the CEO at Google?",
    "include_domains": ["linkedin.com/in"]
  }
  ```

  ```json ❌ Bad theme={null}
  // Not specifying the domain, leading to broader, less focused results.
  {
    "query": "What is the professional background of the CEO at Google?"
  }
  ```
</CodeGroup>

* Minimize the number of domains in the `include_domains` list and make sure they are relevant to your search query.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using a concise list of 3 relevant domains to refine search results effectively.
  {
      "query": "What are the latest funding rounds for AI startups?",
      "include_domains": [ "crunchbase.com", "techcrunch.com", "pitchbook.com" ]
   }
  ```

  ```json ❌ Bad theme={null}
  // Including an excessively long list of domains can reduce search efficiency and lead to sub-optimal search results.
  {
     "query": "What are the latest funding rounds for AI startups?",
     "include_domains": [ "example1.com", "example2.com", "example3.com", ..., "example200.com" ]
  }
  ```
</CodeGroup>

#### `exclude_domains` (Excluding specific domains)

* Filters out results from specific domains.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Excluding unrelated domains to US economy trends, ensuring that irrelevant sources are filtered out.
  {
     "query": "US economy trends in 2025",
     "exclude_domains": ["espn.com","vogue.com"]
  }
  ```

  ```json ❌ Bad theme={null}
  // Excluding results from Forbes, which is a key source for U.S. economics. This may filter out valuable information.
  {
      "query": "US economy trends in 2025",
      "exclude_domains": ["forbes.com"]
  }
  ```
</CodeGroup>

* Minimize the number of domains in the `exclude_domains` list to ensure you only exclude domains that are truly irrelevant to your query.

<CodeGroup>
  ```json ✅ Good theme={null}
  // Using a concise list of 3 domains to exclude from the search results.
  {
      "query": "US fashion trends in 2025",
      "exclude_domains": ["nytimes.com","forbes.com","bloomberg.com"]
  }
  ```

  ```json ❌ Bad theme={null}
  // Excluding an excessively long list of domains may prevent relevant sources from being included, potentially resulting in little to no results.
  {
     "query": "US fashion trends in 2025",
     "exclude_domains": [ "example1.com", "example2.com", "example3.com", ..., "example200.com" ]
  }
  ```
</CodeGroup>

#### Controlling search results by website region

Example: Limit to U.S.-based websites (`.com` domain):

```json  theme={null}
{
    "query": "latest AI research",
    "include_domains": ["*.com"]
}
```

Example: Exclude Icelandic websites (`.is` domain):

```json  theme={null}
{
    "query": "global economic trends",
    "exclude_domains": ["*.is"]
}
```

Example: Boost results from a specific country using the `country` parameter:

```json  theme={null}
{
    "query": "tech startup funding",
    "topic": "general",
    "country": "united states"
}
```

#### Combining include and exclude domains

Restrict search to `.com` but exclude `example.com`:

```json  theme={null}
{
    "query": "AI industry news",
    "include_domains": ["*.com"],
    "exclude_domains": ["example.com"]
}
```

## Asynchronous API calls with Tavily

* Use `async/await` to ensure non-blocking API requests.
* Initialize `AsyncTavilyClient` once and reuse it for multiple requests.
* Use `asyncio.gather` for handling multiple queries concurrently.
* Implement error handling to manage API failures gracefully.
* Limit concurrent requests to avoid hitting rate limits.

Example:

```python  theme={null}
import asyncio
from tavily import AsyncTavilyClient

# Initialize Tavily client
tavily_client = AsyncTavilyClient("tvly-YOUR_API_KEY")

async def fetch_and_gather():
    queries = ["latest AI trends", "future of quantum computing"]

    # Perform search and continue even if one query fails (using return_exceptions=True)
    try:
        responses = await asyncio.gather(*(tavily_client.search(q) for q in queries), return_exceptions=True)

        # Handle responses and print
        for response in responses:
            if isinstance(response, Exception):
                print(f"Search query failed: {response}")
            else:
                print(response)

    except Exception as e:
        print(f"Error during search queries: {e}")

# Run the function
asyncio.run(fetch_and_gather())
```

## Optimizing search results with post-processing techniques

When working with Tavily’s Search API, refining search results through post-processing techniques can significantly enhance the relevance of the retrieved information.

### Combining LLMs with Keyword Filtering

One of the most effective ways to refine search results is by using a combination of LLMs and deterministic keyword filtering.

* **LLMs** can analyze search results in a more contextual and semantic manner, understanding the deeper meaning of the text.
* **Keyword filtering** offers a rule-based approach to eliminate irrelevant results based on predefined terms, ensuring a balance between flexibility and precision.

#### How it works

By applying keyword filters before or after processing results with an LLM, you can:

* Remove results that contain specific unwanted terms.
* Prioritize articles that contain high-value keywords relevant to your use case.
* Improve efficiency by reducing the number of search results requiring further LLM processing.

### Utilizing metadata for improved post-processing

Tavily’s Search API provides rich metadata that can be leveraged to refine and prioritize search results. By incorporating metadata into post-processing logic, you can improve precision in selecting the most relevant content.

#### Key metadata fields and their Functions

* **`title`**: Helps in identifying articles that are more likely to be relevant based on their headlines. Filtering results by keyword occurrences in the title can improve result relevancy.
* **`raw_content`**: Provides the extracted content from the web page, allowing deeper analysis. If the `content` does not provide enough information, raw content can be useful for further filtering and ranking. You can also use the Extract API with a two-step extraction process. For more information, see [Best Practices for Extract API](/documentation/best-practices/best-practices-extract#2-two-step-process-search-then-extract).
* **`score`**: Represents the relevancy between the query and the retrieved content snippet. Higher scores typically indicate better matches.
* **`content`**: Offers a general summary of the webpage, providing a quick way to gauge relevance without processing the full content. When `search_depth` is set to `advanced`, the content is more closely aligned with the query, offering valuable insights.

#### Enhancing post-processing with metadata

By leveraging these metadata elements, you can:

* Sort results based on scores, prioritizing high-confidence matches.
* Perform additional filtering based on title or content to refine search results.

#### Understanding the `score` Parameter

Tavily assigns a `score` to each search result, indicating how well the content aligns with the query. This score helps in ranking and selecting the most relevant results.

#### What does the `score` mean?

* The `score` is a numerical measure of relevance between the content and the query.
* A higher score generally indicates that the result is more relevant to the query.
* There is no fixed threshold that determines whether a result is useful. The ideal score cutoff depends on the specific use case.

#### Best practices for using scores

* Set a minimum score threshold to exclude low-relevance results automatically.
* Analyze the distribution of scores within a search response to adjust thresholds dynamically.
* Combine similarity scores with other metadata fields (e.g., url, content) to improve ranking strategies.

### Using regex-based data extraction

In addition to leveraging LLMs and metadata for refining search results, Python's `re.search` and `re.findall` methods can play a crucial role in post-processing by allowing you to parse and extract specific data from the `raw_content`. These methods enable pattern-based filtering and extraction, enhancing the precision and relevance of the processed results.

#### Benefits of using `re.search` and `re.findall`

* **Pattern Matching**: Both methods are designed to search for specific patterns in text, which is ideal for structured data extraction.
* **Efficiency**: These methods help automate the extraction of specific elements from large datasets, improving post-processing efficiency.
* **Flexibility**: You can define custom patterns to match a variety of data types, from dates and addresses to keywords and job titles.

#### How they work

* **`re.search`**: Scans the content for the first occurrence of a specified pattern and returns a match object, which can be used to extract specific parts of the text.

Example:

```python  theme={null}
import re
text = "Company: Tavily, Location: New York"
match = re.search(r"Location: (\w+)", text)
if match:
    print(match.group(1))  # Output: New York
```

* **`re.findall`**: Returns a list of all non-overlapping matches of a pattern in the content, making it suitable for extracting multiple instances of a pattern.

Example:

```python  theme={null}
text = "Contact: john@example.com, support@tavily.com"
emails = re.findall(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}", text)
print(emails)  # Output: ['john@example.com', 'support@tavily.com']
```

#### Common use cases for post-processing

* **Content Filtering**: Use `re.search` to identify sections or specific patterns in content (e.g., dates, locations, company names).

* **Data Extraction**: Use `re.findall` to extract multiple instances of specific data points (e.g., phone numbers, emails).

* **Improving Relevance**: Apply regex patterns to remove irrelevant content, ensuring that only the most pertinent information remains.

> By leveraging post-processing techniques such as LLM-assisted filtering, metadata analysis, and score-based ranking, along with regex-based data extraction, you can optimize Tavily’s Search API results for better relevance. Incorporating these methods into your workflow will help you extract high-quality insights tailored to your needs.


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.tavily.com/llms.txt

# Best Practices for Extract

> Learn the best practices for web content extraction process

## Extracting web content using Tavily

Efficiently extracting content from web pages is crucial for AI-powered applications. Tavily provides two main approaches to content extraction, each suited for different use cases.

### 1. One-step extraction: directly retrieve `raw_content`

You can extract web content by enabling `include_raw_content = true` when making a Tavily Search API call. This allows you to retrieve both search results and extracted content in a single step.

**However**, this can increase latency because you may extract raw content from sources that are not relevant in the first place.  It's recommended to split the process into two steps: running multiple sub-queries to expand the pool of sources, then curating the most relevant documents based on content snippets or source scores. By extracting raw content from the most relevant sources, you get high-quality RAG documents.

### 2. Two-step process: search, then extract

For better accuracy and customization, we recommend a two-step process:

> #### Step 1: Search

Use the Tavily Search API to retrieve relevant web pages, which output URLs.

> #### Step 2: Extract

Use the Tavily Extract API to fetch the full content from the most relevant URLs.

**Example:**

```python  theme={null}
import asyncio
from tavily import AsyncTavilyClient

tavily_client = AsyncTavilyClient(api_key="tvly-YOUR_API_KEY")

async def fetch_and_extract():
   # Define the queries with search_depth and max_results inside the query dictionary
   queries = [
       {"query": "AI applications in healthcare", "search_depth": "advanced", "max_results": 10},
       {"query": "ethical implications of AI in healthcare", "search_depth": "advanced", "max_results": 10},
       {"query": "latest trends in machine learning healthcare applications", "search_depth": "advanced",
        "max_results": 10},
       {"query": "AI and healthcare regulatory challenges", "search_depth": "advanced", "max_results": 10}
   ]

   # Perform the search queries concurrently, passing the entire query dictionary
   responses = await asyncio.gather(*[tavily_client.search(**q) for q in queries])

   # Filter URLs with a score greater than 0.5. Alternatively, you can use a re-ranking model or an LLM to identify the most relevant sources, or cluster your documents and extract content only from the most relevant cluster
   relevant_urls = []
   for response in responses:
       for result in response.get('results', []):
           if result.get('score', 0) > 0.5:
               relevant_urls.append(result.get('url'))

   # Extract content from the relevant URLs
   extracted_data = await asyncio.gather(*(tavily_client.extract(url) for url in relevant_urls))

   # Print the extracted content
   for data in extracted_data:
       print(data)

# Run the function
asyncio.run(fetch_and_extract())
```

#### **Pros of two-Step extraction**

✅ **More control** – Extract only from selected URLs.

✅ **Higher accuracy** – Filter out irrelevant results before extraction.

✅ **Advanced extraction capabilities** – Using `search_depth = "advanced"`.

#### **Cons of two-step extraction**

❌ slightly more expensive.

### Using advanced extraction

Using `extract_depth = "advanced"` in the Extract API allows for more comprehensive content retrieval. This mode is particularly useful when dealing with:

* **Complex web pages** with dynamic content, embedded media, or structured data.
* **Tables and structured information** that require accurate parsing.
* **Higher success rates**.

> If precision and depth are priorities for your application, `extract_depth = "advanced"` is the recommended choice.


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.tavily.com/llms.txt

# Best Practices for Crawl

> Learn how to effectively use Tavily's Crawl API to extract and process web content.

## When to Use `crawl` vs `map`

### Use Crawl when you need:

* Full content extraction from pages
* Deep content analysis
* Processing of paginated or nested content
* Extraction of specific content patterns
* Integration with RAG systems

### Use Map when you need:

* Quick site structure discovery
* URL collection without content extraction
* Sitemap generation
* Path pattern matching
* Domain structure analysis

## Use Cases

### 1. Deep or Unlinked Content

Many sites have content that's difficult to access through standard means:

* Deeply nested pages not in main navigation
* Paginated archives (old blog posts, changelogs)
* Internal search-only content

**Best Practice:**

```json  theme={null}
{
  "url": "example.com",
  "max_depth": 3,
  "max_breadth": 50,
  "limit": 200,
  "select_paths": ["/blog/.*", "/changelog/.*"],
  "exclude_paths": ["/private/.*", "/admin/.*"]
}
```

### 2. Structured but Nonstandard Layouts

For content that's structured but not marked up in schema.org:

* Documentation
* Changelogs
* FAQs

**Best Practice:**

```json  theme={null}
{
  "url": "docs.example.com",
  "max_depth": 2,
  "extract_depth": "advanced",
  "select_paths": ["/docs/.*"]
}
```

### 3. Multi-modal Information Needs

When you need to combine information from multiple sections:

* Cross-referencing content
* Finding related information
* Building comprehensive knowledge bases

**Best Practice:**

```json  theme={null}
{
  "url": "example.com",
  "max_depth": 2,
  "instructions": "Find all documentation pages that link to API reference docs",
  "extract_depth": "advanced"
}
```

### 4. Rapidly Changing Content

For content that updates frequently:

* API documentation
* Product announcements
* News sections

**Best Practice:**

```json  theme={null}
{
  "url": "api.example.com",
  "max_depth": 1,
  "max_breadth": 100,
  "extract_depth": "basic"
}
```

### 5. Behind Auth / Paywalls

For content requiring authentication:

* Internal knowledge bases
* Customer help centers
* Gated documentation

**Best Practice:**

```json  theme={null}
{
  "url": "help.example.com",
  "max_depth": 2,
  "select_domains": ["^help\.example\.com$"],
  "exclude_domains": ["^public\.example\.com$"]
}
```

### 6. Complete Coverage / Auditing

For comprehensive content analysis:

* Legal compliance checks
* Security audits
* Policy verification

**Best Practice:**

```json  theme={null}
{
  "url": "example.com",
  "max_depth": 3,
  "max_breadth": 100,
  "limit": 1000,
  "extract_depth": "advanced",
  "instructions": "Find all mentions of GDPR and data protection policies"
}
```

### 7. Semantic Search or RAG Integration

For feeding content into LLMs or search systems:

* RAG systems
* Enterprise search
* Knowledge bases

**Best Practice:**

```json  theme={null}
{
  "url": "docs.example.com",
  "max_depth": 2,
  "extract_depth": "advanced",
  "include_images": true
}
```

### 8. Known URL Patterns

When you have specific paths to crawl:

* Sitemap-based crawling
* Section-specific extraction
* Pattern-based content collection

**Best Practice:**

```json  theme={null}
{
  "url": "example.com",
  "max_depth": 1,
  "select_paths": ["/docs/.*", "/api/.*", "/guides/.*"],
  "exclude_paths": ["/private/.*", "/admin/.*"]
}
```

## Performance Considerations

### Depth vs. Performance

* Each level of depth increases crawl time exponentially
* Start with `max_depth: 1` and increase as needed
* Use `max_breadth` to control horizontal expansion
* Set appropriate `limit` to prevent excessive crawling

### Resource Optimization

* Use `basic` extract\_depth for simple content
* Use `advanced` extract\_depth only when needed
* Set appropriate `max_breadth` based on site structure
* Use `select_paths` and `exclude_paths` to focus crawling

### Rate Limiting

* Respect site's robots.txt
* Implement appropriate delays between requests
* Monitor API usage and limits
* Use appropriate error handling for rate limits

## Best Practices Summary

1. **Start Small**
   * Begin with limited depth and breadth
   * Gradually increase based on needs
   * Monitor performance and adjust

2. **Be Specific**
   * Use path patterns to focus crawling
   * Exclude irrelevant sections

3. **Optimize Resources**
   * Choose appropriate extract\_depth
   * Set reasonable limits
   * Use include\_images only when needed

4. **Handle Errors**
   * Implement retry logic
   * Monitor failed results
   * Handle rate limits appropriately

5. **Security**
   * Respect robots.txt
   * Use appropriate authentication
   * Exclude sensitive paths

6. **Integration**
   * Plan for data processing
   * Consider storage requirements
   * Design for scalability

## Common Pitfalls

1. **Excessive Depth**
   * Avoid setting max\_depth too high
   * Start with 1-2 levels
   * Increase only if necessary

2. **Unfocused Crawling**
   * Use instructions for guidance

3. **Resource Overuse**
   * Monitor API usage
   * Set appropriate limits
   * Use basic extract\_depth when possible

4. **Missing Content**
   * Verify path patterns
   * Monitor crawl coverage

## Integration with Map

Consider using Map before Crawl to:

1. Discover site structure
2. Identify relevant paths
3. Plan crawl strategy
4. Validate URL patterns

Example workflow:

1. Use Map to get site structure
2. Analyze paths and patterns
3. Configure Crawl with discovered paths
4. Execute focused crawl

## Conclusion

Tavily's Crawl API is powerful for extracting structured content from websites. By following these best practices, you can:

* Optimize crawl performance
* Ensure complete coverage
* Maintain resource efficiency
* Build robust content extraction pipelines

Remember to:

* Start with limited scope
* Use appropriate parameters
* Monitor performance
* Handle errors gracefully
* Respect site policies


---

> To find navigation and other pages in this documentation, fetch the llms.txt file at: https://docs.tavily.com/llms.txt