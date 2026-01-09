import { publicProcedure, router } from "~/server/trpc";
import type { TModel } from "~/server/types/model";
const models: TModel[] = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    chef: "Deepseek",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },
  {
    id: "deepseek-reasoner",
    name: "DeepSeek Reasoner",
    chef: "Deepseek",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },
];
export const modelRouter = router({
  list: publicProcedure.query(async () => {
    return models;
  }),
  defaultModel: publicProcedure.query(async () => {
    return models[0];
  }),
});
