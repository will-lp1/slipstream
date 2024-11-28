'use client';

import type { Message } from 'ai';
import cx from 'classnames';
import { motion } from 'framer-motion';
import type { Dispatch, SetStateAction } from 'react';

import type { UIBlock } from './block';
import { DocumentToolCall, DocumentToolResult } from './document';
import { SparklesIcon } from './icons';
import { Markdown } from './markdown';
import { PreviewAttachment } from './preview-attachment';
import { Weather } from './weather';
import { MessageActions } from './message-actions';
import { Button } from './ui/button';
import { Card } from './ui/card';
import { ExternalLink } from 'lucide-react';

export interface PreviewMessageProps {
  chatId: string;
  message: Message;
  block: UIBlock;
  setBlock: Dispatch<SetStateAction<UIBlock>>;
  isLoading: boolean;
}

interface SourceCardProps {
  title: string;
  url: string;
  snippet: string;
  index: number;
}

// Add a new type for linked citations
interface LinkedCitation {
  index: number;
  url: string;
}

// Add scroll helper function
const scrollToSource = (index: number) => {
  const sourceElement = document.getElementById(`source-${index}`);
  if (sourceElement) {
    sourceElement.scrollIntoView({ behavior: 'smooth' });
    // Add a brief highlight effect
    sourceElement.classList.add('highlight-source');
    setTimeout(() => sourceElement.classList.remove('highlight-source'), 2000);
  }
};

const KeyPoint = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-2 mb-2">
    <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2" />
    <div className="flex-1">{children}</div>
  </div>
);

// Update the type to be more specific
interface Source {
  title: string;
  url: string;
}

// Update the function signature to be more specific
const processContentWithCitations = (content: string, sources: Source[]) => {
  return content.replace(
    /\[(\d+)\]/g, 
    (match, num) => {
      const index = parseInt(num) - 1;
      const url = sources[index]?.url;
      return `<button 
        class="inline-flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors font-medium" 
        onclick="window.open('${url}', '_blank')"
      >[${num}]</button>`;
    }
  );
};

// Even cleaner SourceCard with no shadows
const SourceCard = ({ title, url, snippet, index }: SourceCardProps) => (
  <Card 
    id={`source-${index}`}
    className="p-2.5 transition-colors bg-background border-border/40 hover:border-border group"
  >
    <div className="flex items-start gap-2.5">
      <span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-secondary text-muted-foreground text-xs font-medium shrink-0 mt-0.5">
        {index + 1}
      </span>
      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <a 
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 group"
          >
            <h3 className="font-medium text-sm line-clamp-1 group-hover:text-foreground/80 transition-colors">
              {title}
            </h3>
            <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
              {snippet}
            </p>
          </a>
          <Button 
            variant="ghost" 
            size="icon"
            className="h-5 w-5 text-muted-foreground hover:text-foreground -mt-0.5"
            onClick={() => window.open(url, '_blank')}
          >
            <ExternalLink size={12} />
          </Button>
        </div>
      </div>
    </div>
  </Card>
);

export const PreviewMessage = ({
  chatId,
  message,
  block,
  setBlock,
  isLoading,
}: PreviewMessageProps) => {
  const splitContent = (content: string) => {
    const parts = content.split('---\n\nSources:');
    return {
      mainContent: parts[0].trim(),
      hasSources: parts.length > 1,
      sources: parts[1]?.trim() || ''
    };
  };

  // Add scrollToSource to window object
  if (typeof window !== 'undefined') {
    (window as any).scrollToSource = scrollToSource;
  }

  const { mainContent, hasSources, sources } = splitContent(
    typeof message.content === 'string' ? message.content : ''
  );

  // Filter out null values and ensure all items have url property
  const sourcesList = sources
    .split('\n')
    .map(line => {
      const match = line.match(/\d+\.\s+\[(.*?)\]\((.*?)\)/);
      return match ? { title: match[1], url: match[2] } : null;
    })
    .filter((source): source is Source => source !== null);

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message"
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      data-role={message.role}
    >
      <div className={cx(
        'flex gap-4 w-full rounded-xl',
        'group-data-[role=user]/message:bg-white group-data-[role=user]/message:text-foreground',
        'group-data-[role=user]/message:px-3 group-data-[role=user]/message:py-2',
        'group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto',
        'group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:border',
      )}>
        {message.role === 'assistant' && (
          <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
            <SparklesIcon size={14} />
          </div>
        )}

        <div className="flex flex-col gap-2 w-full">
          {message.content && (
            <div className="flex flex-col gap-4">
              <div className="flex justify-between items-start">
                {typeof message.content === 'string' && (
                  <div className="w-full">
                    {(() => {
                      return (
                        <>
                          <div 
                            className="prose dark:prose-invert max-w-none"
                            dangerouslySetInnerHTML={{ 
                              __html: processContentWithCitations(mainContent, sourcesList) 
                            }}
                          />
                          {hasSources && (
                            <div className="mt-4 scroll-mt-6">
                              <div className="flex items-center gap-2 mb-2">
                                <div className="h-px flex-1 bg-border/50" />
                                <h3 className="text-xs font-medium text-muted-foreground/60 px-2">Sources</h3>
                                <div className="h-px flex-1 bg-border/50" />
                              </div>
                              <div className="grid sm:grid-cols-2 gap-1.5">
                                {sources.split('\n').map((source, index) => {
                                  const match = source.match(/\d+\. \[(.*?)\]\((.*?)\)/);
                                  if (match) {
                                    const [_, title, url] = match;
                                    const snippetMatch = mainContent.match(
                                      new RegExp(`\\[${index + 1}\\] "(.*?)" \\(Source:`)
                                    );
                                    const snippet = snippetMatch ? snippetMatch[1] : '';
                                    return (
                                      <SourceCard
                                        key={index}
                                        index={index}
                                        title={title}
                                        url={url}
                                        snippet={snippet}
                                      />
                                    );
                                  }
                                  return null;
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      );
                    })()}
                  </div>
                )}
                <MessageActions message={message} />
              </div>
            </div>
          )}

          {message.toolInvocations && message.toolInvocations.length > 0 && (
            <div className="flex flex-col gap-4">
              {message.toolInvocations.map((toolInvocation) => {
                const { toolName, toolCallId, state, args } = toolInvocation;

                if (state === 'result') {
                  const { result } = toolInvocation;

                  return (
                    <div key={toolCallId}>
                      {toolName === 'getWeather' ? (
                        <Weather weatherAtLocation={result} />
                      ) : toolName === 'createDocument' ? (
                        <DocumentToolResult
                          type="create"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                        />
                      ) : toolName === 'updateDocument' ? (
                        <DocumentToolResult
                          type="update"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                        />
                      ) : toolName === 'requestSuggestions' ? (
                        <DocumentToolResult
                          type="request-suggestions"
                          result={result}
                          block={block}
                          setBlock={setBlock}
                        />
                      ) : (
                        <pre>{JSON.stringify(result, null, 2)}</pre>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={toolCallId}
                    className={cx({
                      skeleton: ['getWeather'].includes(toolName),
                    })}
                  >
                    {toolName === 'getWeather' ? (
                      <Weather />
                    ) : toolName === 'createDocument' ? (
                      <DocumentToolCall
                        type="create"
                        args={args}
                        setBlock={setBlock}
                      />
                    ) : toolName === 'updateDocument' ? (
                      <DocumentToolCall
                        type="update"
                        args={args}
                        setBlock={setBlock}
                      />
                    ) : toolName === 'requestSuggestions' ? (
                      <DocumentToolCall
                        type="request-suggestions"
                        args={args}
                        setBlock={setBlock}
                      />
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {message.experimental_attachments && (
            <div className="flex flex-row gap-2">
              {message.experimental_attachments.map((attachment) => (
                <PreviewAttachment
                  key={attachment.url}
                  attachment={attachment}
                />
              ))}
            </div>
          )}


        </div>
      </div>
    </motion.div>
  );
};

export const ThinkingMessage = () => {
  const role = 'assistant';

  return (
    <motion.div
      className="w-full mx-auto max-w-3xl px-4 group/message "
      initial={{ y: 5, opacity: 0 }}
      animate={{ y: 0, opacity: 1, transition: { delay: 1 } }}
      data-role={role}
    >
      <div
        className={cx(
          'flex gap-4 group-data-[role=user]/message:px-3 w-full group-data-[role=user]/message:w-fit group-data-[role=user]/message:ml-auto group-data-[role=user]/message:max-w-2xl group-data-[role=user]/message:py-2 rounded-xl',
          {
            'group-data-[role=user]/message:bg-muted': true,
          },
        )}
      >
        <div className="size-8 flex items-center rounded-full justify-center ring-1 shrink-0 ring-border">
          <SparklesIcon size={14} />
        </div>

        <div className="flex flex-col gap-2 w-full">
          <div className="flex flex-col gap-4 text-muted-foreground">
            Thinking...
          </div>
        </div>
      </div>
    </motion.div>
  );
};
