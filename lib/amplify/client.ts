'use client';

import { generateClient } from 'aws-amplify/data';
import type { Schema } from '@/amplify/data/resource';
import { DEMO_MODE } from '@/lib/demo/config';
import { mockDataClient } from '@/lib/demo/mockDataClient';

// Every dataClient.{models,mutations,queries}.* call this app makes:
// models: Companion(get/create/update/delete/companionsByUser),
//   CompanionMemory(create/delete/memoriesByCompanion),
//   Conversation(conversationsByUser), Message(messagesByConversation),
//   Wallet(get/onUpdate), CheckIn(get), Asset(get/delete/assetsByUser),
//   GenerationJob(onUpdate), DiamondTransaction(transactionsByUser)
// mutations: ensureConversation, sendMessage, checkIn, createImageGenerationJob
// queries: createUploadUrl, createDownloadUrl
// mockDataClient.ts implements exactly this surface against localStorage.

type DataClient = ReturnType<typeof generateClient<Schema>>;

export const dataClient = (DEMO_MODE ? mockDataClient : generateClient<Schema>()) as DataClient;
