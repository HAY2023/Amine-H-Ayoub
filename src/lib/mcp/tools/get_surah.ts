import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { surahs } from "../../../data/surahs";

export default defineTool({
  name: "get_surah",
  title: "Get surah info",
  description: "Get information about a specific surah by its number (1-114).",
  inputSchema: {
    number: z.number().int().min(1).max(114).describe("Surah number, 1 through 114."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ number }) => {
    const surah = surahs.find((s) => s.number === number);
    if (!surah) {
      return { content: [{ type: "text", text: `No surah with number ${number}` }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(surah) }],
      structuredContent: { surah },
    };
  },
});
