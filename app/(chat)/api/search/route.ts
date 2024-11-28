import {
    type Message,
    StreamData,
    convertToCoreMessages,
    streamText,
    type CoreMessage,
  } from 'ai';
  import { anthropic } from '@ai-sdk/anthropic';
  import { getMostRecentUserMessage } from '@/lib/utils';
  
  export const dynamic = 'force-dynamic';
  export const maxDuration = 60;
  
  type SearchResponse = {
    query: string;
    results: {
      title: string;
      url: string;
      snippet: string;
      content: string;
      metadata?: {
        title?: string;
        description?: string;
        author?: string;
        published_date?: string;
        main_image?: string;
        links?: string[];
      };
      img_src?: string;
    }[];
  };
  
  async function fetchSearchResults(query: string): Promise<SearchResponse | null> {
    // Try POST request first
    try {
      const postResponse = await fetch('http://144.126.230.47/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query }),
      });

      if (postResponse.ok) {
        return await postResponse.json();
      }

      console.log('POST request failed, trying GET request...');
      
      // If POST fails, try GET request
      const getResponse = await fetch(`http://144.126.230.47/search?query=${encodeURIComponent(query)}`);
      
      if (getResponse.ok) {
        return await getResponse.json();
      }
      
      console.error('Both POST and GET requests failed');
      return null;
      
    } catch (error) {
      console.error('Search API error:', error);
      return null;
    }
  }
  
  export async function POST(request: Request) {
    try {
      const json = await request.json();
      const messages = convertToCoreMessages(json.messages);
      const userMessage = getMostRecentUserMessage(messages);
  
      if (!userMessage) {
        return new Response('No user message found', { status: 400 });
      }
  
      const streamingData = new StreamData();
  
      try {
        const query = typeof userMessage.content === 'string' 
          ? userMessage.content 
          : JSON.stringify(userMessage.content);

        const searchResults = await fetchSearchResults(query);

        if (!searchResults) {
          return handleFallbackChat({
            userMessage,
            streamingData
          });
        }

        if (!Array.isArray(searchResults.results)) {
          console.error('Invalid search results format:', searchResults);
          return handleFallbackChat({
            userMessage,
            streamingData
          });
        }

        const processedResults = searchResults.results.map(result => ({
          title: result.title,
          url: result.url,
          snippet: result.snippet,
        }));
  
        const formattedSources = processedResults
          .map((result, index) => 
            `[${index + 1}] "${result.snippet}" (Source: ${result.title})`
          )
          .join('\n\n');
  
        const result = await streamText({
          model: anthropic('claude-3-haiku-20240307'),
          messages: [
            {
              role: 'user',
              content: `Based on these search results, please provide a comprehensive answer:

Search Query: "${typeof userMessage.content === 'string' 
                ? userMessage.content 
                : JSON.stringify(userMessage.content)}"

Sources:
${formattedSources}

Please structure your response in this format:

1. Start with a clear, direct answer to the query
2. Provide supporting details in 2-3 concise paragraphs
3. Use source citations [1], [2] etc. at the end of relevant sentences
4. Keep paragraphs short and focused

End your response with:

---

Sources:
${processedResults.map((result, index) => 
  `${index + 1}. [${result.title}](${result.url})`
).join('\n')}`,
            }
          ],
          onFinish: () => {
            streamingData.close();
          }
        });
  
        return result.toDataStreamResponse({
          data: streamingData,
        });
  
      } catch (error) {
        console.error('Error in chat:', error);
        return new Response('Error in chat', { status: 500 });
      }
  
    } catch (error) {
      console.error('Error processing request:', error);
      return new Response('Error processing request', { status: 500 });
    }
  }
  
  async function handleFallbackChat({
    userMessage,
    streamingData
  }: {
    userMessage: CoreMessage,
    streamingData: StreamData
  }) {
    const result = await streamText({
      model: anthropic('claude-3-haiku-20240307'),
      messages: [
        {
          role: 'user',
          content: typeof userMessage.content === 'string' 
            ? userMessage.content 
            : JSON.stringify(userMessage.content),
        }
      ],
      onFinish: () => {
        streamingData.close();
      }
    });

    return result.toDataStreamResponse({
      data: streamingData,
    });
  }
  