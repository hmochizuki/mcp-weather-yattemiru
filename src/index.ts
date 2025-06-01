import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  CallToolRequest,
} from "@modelcontextprotocol/sdk/types.js";
import tools from "./tools/index.js";

// サーバーインスタンスの初期化
const server = new Server(
  {
    name: "weather",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

// 利用可能なToolの一覧を返す
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return {
    tools: Object.values(tools).map((tool) => tool.requestSchema),
  };
});

server.setRequestHandler(CallToolRequestSchema, async (request: CallToolRequest) => {
  const toolEntry = Object.values(tools).find((tool) => tool.requestSchema.name === request.params.name);
  if (!toolEntry) {
    throw new Error("Unknown prompt");
  }
  return await toolEntry.handler(request);
});

const transport = new StdioServerTransport();
await server.connect(transport);