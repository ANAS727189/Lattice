import { Schema } from "prosemirror-model";
import { schema as basicSchema } from "prosemirror-schema-basic";
import { addListNodes } from "prosemirror-schema-list";

const nodes = addListNodes(basicSchema.spec.nodes, "paragraph block*", "block");
const marks = basicSchema.spec.marks
  .addToEnd("underline", {
  parseDOM: [
    { tag: "u" },
    {
      style: "text-decoration",
      getAttrs: (value) =>
        typeof value === "string" && value.includes("underline") ? null : false,
    },
  ],
  toDOM() {
    return ["u", 0];
  },
  })
  .addToEnd("strike", {
    parseDOM: [
      { tag: "s" },
      { tag: "del" },
      {
        style: "text-decoration",
        getAttrs: (value) =>
          typeof value === "string" && value.includes("line-through") ? null : false,
      },
    ],
    toDOM() {
      return ["s", 0];
    },
  });

export const editorSchema = new Schema({ nodes, marks });
