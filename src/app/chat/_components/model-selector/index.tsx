"use client";

import { CheckIcon } from "lucide-react";
import { useState } from "react";
import {
  ModelSelectorContent,
  ModelSelectorEmpty,
  ModelSelectorGroup,
  ModelSelectorInput,
  ModelSelectorItem,
  ModelSelectorList,
  ModelSelectorLogo,
  ModelSelectorLogoGroup,
  ModelSelectorName,
  ModelSelector as ModelSelectorRoot,
  ModelSelectorTrigger,
} from "@/components/ai-elements/model-selector";
import { Button } from "@/components/ui/button";

const models = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    chef: "Deepseek",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },
];

export const ModelSelector = () => {
  const [open, setOpen] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>("deepseek-chat");

  const selectedModelData = models.find((model) => model.id === selectedModel);

  // Get unique chefs in order of appearance
  const chefs = Array.from(new Set(models.map((model) => model.chef)));

  return (
    <div className="flex size-full items-center justify-center p-8">
      <ModelSelectorRoot onOpenChange={setOpen} open={open}>
        <ModelSelectorTrigger asChild>
          <Button className="w-[200px] justify-between" variant="outline">
            {selectedModelData?.chefSlug && (
              <ModelSelectorLogo
                className="size-5"
                provider={selectedModelData.chefSlug}
              />
            )}
            {selectedModelData?.name && (
              <ModelSelectorName>{selectedModelData.name}</ModelSelectorName>
            )}
          </Button>
        </ModelSelectorTrigger>
        <ModelSelectorContent>
          <ModelSelectorInput placeholder="Search models..." />
          <ModelSelectorList>
            <ModelSelectorEmpty>No models found.</ModelSelectorEmpty>
            {chefs.map((chef) => (
              <ModelSelectorGroup heading={chef} key={chef}>
                {models
                  .filter((model) => model.chef === chef)
                  .map((model) => (
                    <ModelSelectorItem
                      key={model.id}
                      onSelect={() => {
                        setSelectedModel(model.id);
                        setOpen(false);
                      }}
                      value={model.id}
                    >
                      <ModelSelectorLogo provider={model.chefSlug} />
                      <ModelSelectorName>{model.name}</ModelSelectorName>
                      <ModelSelectorLogoGroup>
                        {model.providers.map((provider) => (
                          <ModelSelectorLogo
                            key={provider}
                            provider={provider}
                          />
                        ))}
                      </ModelSelectorLogoGroup>
                      {selectedModel === model.id ? (
                        <CheckIcon className="ml-auto size-4" />
                      ) : (
                        <div className="ml-auto size-4" />
                      )}
                    </ModelSelectorItem>
                  ))}
              </ModelSelectorGroup>
            ))}
          </ModelSelectorList>
        </ModelSelectorContent>
      </ModelSelectorRoot>
    </div>
  );
};
