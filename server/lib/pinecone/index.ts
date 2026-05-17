import { Pinecone } from '@pinecone-database/pinecone';
import { env } from '~/env';
import logger from '../logger';

export const pinecone = new Pinecone({ apiKey: env.PINECONE_API_KEY });

const indexes = new Map<string, ReturnType<typeof pinecone.index>>();

export const getIndex = async (options?: { name?: string }) => {
  const name = options?.name ?? env.PINECONE_INDEX;
  const cached = indexes.get(name);
  if (cached) {
    return cached;
  }

  const indexesList = (await pinecone.listIndexes())?.indexes;
  if (!indexesList || indexesList.filter((i) => i.name === name).length !== 1) {
    throw logger.error(`Index ${name} does not exist`);
  }

  const index = pinecone.index({ name });
  indexes.set(name, index);
  return index;
};
