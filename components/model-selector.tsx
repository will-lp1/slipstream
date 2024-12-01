'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { models } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { CheckCirclFillIcon, ChevronDownIcon } from './icons';

export function ModelSelector({
  selectedModelId,
  className,
  onModelChange
}: {
  selectedModelId: string;
  className?: string;
  onModelChange: (modelId: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const selectedModel = models.find(model => model.id === selectedModelId);

  const handleModelChange = (modelId: string) => {
    if (modelId === selectedModelId) {
      setIsOpen(false);
      return;
    }
    
    setIsOpen(false);
    onModelChange(modelId);
  };

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger
        asChild
        className={cn(
          'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
          className,
        )}
      >
        <Button variant="outline" className="md:px-2 md:h-[34px]">
          {selectedModel?.label}
          <ChevronDownIcon />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-[300px]">
        {models.map((model) => (
          <DropdownMenuItem
            key={model.id}
            onSelect={() => handleModelChange(model.id)}
            className="gap-4 group/item flex flex-row justify-between items-center"
            data-active={model.id === selectedModelId}
          >
            <div className="flex flex-col gap-1 items-start">
              {model.label}
              {model.description && (
                <div className="text-xs text-muted-foreground">
                  {model.description}
                </div>
              )}
            </div>
            <div className="text-primary dark:text-primary-foreground opacity-0 group-data-[active=true]/item:opacity-100">
              <CheckCirclFillIcon />
            </div>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
