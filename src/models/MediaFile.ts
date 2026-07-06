import mongoose, { Schema, Document } from "mongoose";

export interface IMediaFile extends Document {
  name: string;
  url: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  folder?: mongoose.Types.ObjectId;
  source?: string; // e.g., 'banner', 'show', 'media-library', 'category', 'genre', etc.
  sourceId?: mongoose.Types.ObjectId; // Reference to the entity that owns this file
  contentHash?: string; // SHA-256 hash of file content for deduplication
  contentName?: string; // Name of the movie, TV series, or short drama this media belongs to
  contentType?: string; // 'movie' | 'tvshow' | 'drama' | etc.
  storageType: 'local' | 's3'; // Track storage type
  s3Key?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaFileSchema = new Schema<IMediaFile>(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    filePath: { type: String, required: true },
    fileSize: { type: Number, required: true },
    fileType: { type: String, required: true },
    folder: { type: Schema.Types.ObjectId, ref: "MediaFolder", required: false },
    source: { type: String, required: false }, // e.g., 'banner', 'show', 'media-library', etc.
    sourceId: { type: Schema.Types.ObjectId, required: false }, // Reference to the entity
    contentHash: { type: String, required: false, index: true },
    contentName: { type: String, required: false, index: true },
    contentType: { type: String, required: false, index: true },
    storageType: { type: String, enum: ['local', 's3'], default: 'local', required: true },
    s3Key: { type: String, required: false },
  },
  { timestamps: true }
);

export const MediaFileModel = mongoose.model<IMediaFile>("MediaFile", MediaFileSchema);
