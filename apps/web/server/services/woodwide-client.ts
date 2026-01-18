import { appConfig } from "@/server/config";
import { WoodwideClient } from "@/server/services/woodwide";

export const woodwideClient = new WoodwideClient(
  appConfig.woodwide.apiKey,
  appConfig.woodwide.baseUrl
);
