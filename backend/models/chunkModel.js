
import mongoose from "mongoose";

const chunkSchema = new mongoose.Schema(
  {
    articleId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "helpArticle",
      required: true,
      index: true,
    },

    chunkText: {
      type: String,
      required: true,
      trim: true,
    },

    chunkIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    embedding: {
      type: [Number],
      required: true,
      validate: {
        validator: (values) =>
          values.length === 2560 &&
          values.every((value) => Number.isFinite(value)),
        message: "Embedding must contain exactly 2560 finite numbers.",
      },
    },
  },
  {
    timestamps: true,
    versionKey: false,
  }
);

chunkSchema.index(
  { articleId: 1, chunkIndex: 1 },
  { unique: true }
);

export const chunkModel = mongoose.model("ArticleChunk", chunkSchema);
