import { publicProcedure, router } from "~/server/trpc";
const models = [
  {
    id: "deepseek-chat",
    name: "DeepSeek Chat",
    chef: "Deepseek",
    chefSlug: "deepseek",
    providers: ["deepseek"],
  },
];
export const modelRouter = router({
  list: publicProcedure.query(async () => {
    return models;
  }),
});
