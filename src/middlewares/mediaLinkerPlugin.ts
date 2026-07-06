import { Schema } from 'mongoose';
import { MediaFileModel } from '../models/MediaFile';

const extractUploadPath = (value: any): string | null => {
  if (typeof value !== 'string') return null;
  // Match path containing /uploads/
  const match = value.match(/(\/uploads\/[^\s\?#]+)/);
  return match ? match[1] : null;
};

const findUploadPaths = (obj: any, paths: Set<string> = new Set()): Set<string> => {
  if (!obj) return paths;
  if (typeof obj === 'string') {
    const p = extractUploadPath(obj);
    if (p) paths.add(p);
  } else if (Array.isArray(obj)) {
    for (const item of obj) {
      findUploadPaths(item, paths);
    }
  } else if (typeof obj === 'object') {
    // Avoid circular refs or model constructors
    if (obj.constructor && obj.constructor.name !== 'Object' && obj.constructor.name !== 'Array') {
      if (typeof obj.toJSON === 'function') {
        findUploadPaths(docToObject(obj), paths);
      }
      return paths;
    }
    for (const [key, val] of Object.entries(obj)) {
      if (key !== '_id' && key !== '__v') {
        findUploadPaths(val, paths);
      }
    }
  }
  return paths;
};

const docToObject = (doc: any) => {
  if (!doc) return doc;
  return doc.toObject ? doc.toObject({ virtuals: false, getters: false }) : doc;
};

const linkMediaFiles = async (doc: any) => {
  if (!doc) return;
  try {
    const obj = docToObject(doc);
    const paths = Array.from(findUploadPaths(obj));
    if (paths.length === 0) return;

    const modelName = (doc.constructor as any).modelName || 'Document';
    const contentName = doc.title || doc.name || doc.email || doc.phone || doc._id?.toString();

    // Map model names to clean content types
    let contentType = modelName.toLowerCase();
    if (modelName === 'Movie') contentType = 'movie';
    else if (modelName === 'Content') {
      contentType = doc.contentType === 'drama' ? 'drama' : 'tvshow';
    } else if (modelName === 'Episode') {
      contentType = 'episode';
    }

    for (const filePath of paths) {
      const cleanPath = filePath.replace(/^\/+/, ''); // Remove leading slash
      await MediaFileModel.updateMany(
        {
          $or: [
            { filePath: filePath },
            { filePath: '/' + cleanPath },
            { filePath: cleanPath },
            { url: { $regex: new RegExp(cleanPath.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&') + '$') } }
          ]
        },
        {
          $set: {
            sourceId: doc._id,
            source: contentType,
            contentType: contentType,
            contentName: contentName
          }
        }
      );
    }
  } catch (err) {
    console.error('mediaLinkerPlugin error in linkMediaFiles:', err);
  }
};

export const mediaLinkerPlugin = (schema: Schema) => {
  schema.post('save', async function (doc: any) {
    await linkMediaFiles(doc);
  });

  schema.post('findOneAndUpdate', async function (doc: any) {
    if (doc) {
      await linkMediaFiles(doc);
    }
  });
};
