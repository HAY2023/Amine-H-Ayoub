import { defineTool } from "@lovable.dev/mcp-js";
import { surahs } from "../../../data/surahs";

export default defineTool({
  name: "list_surahs",
  title: "List Quran surahs",
  description: "List all 114 surahs of the Quran with their number, Arabic name, and ayah count.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: () => ({
    content: [{ type: "text", text: JSON.stringify(surahs) }],
    structuredContent: { surahs },
  }),
});
