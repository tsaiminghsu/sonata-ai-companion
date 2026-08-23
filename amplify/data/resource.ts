import { type ClientSchema, a, defineData } from '@aws-amplify/backend';
import { chatHandler } from '../functions/chat-handler/resource';
import { checkinHandler } from '../functions/checkin-handler/resource';
import { generationCreate } from '../functions/generation-create/resource';
import { s3Presign } from '../functions/s3-presign/resource';

const schema = a.schema({
  UserProfile: a
    .model({
      userId: a.id().required(),
      email: a.string(),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])]),

  Companion: a
    .model({
      userId: a.id().required(),
      name: a.string().required(),
      gender: a.enum(['MALE', 'FEMALE', 'NONBINARY']),
      age: a.integer(),
      personality: a.string().array(),
      background: a.string(),
      speechStyle: a.string(),
      avatarUrl: a.string(),
      currentOutfitId: a.id(),
      relationshipLevel: a.integer().default(1).authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])]),
      relationshipXp: a.integer().default(0).authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])]),
      mood: a.string().authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])]),
      createdAt: a.datetime(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId')])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']).name('byUser').queryField('companionsByUser'),
    ]),

  // `id` is deterministically set to the owning Companion's id by chat-handler
  // (1:1 Companion<->Conversation in P0) - this makes "find or create" a plain
  // conditional-put race instead of needing a uniqueness constraint on a GSI.
  Conversation: a
    .model({
      userId: a.id().required(),
      companionId: a.id().required(),
      lastMessageAt: a.datetime(),
      lastMessagePreview: a.string(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['lastMessageAt']).name('byUser').queryField('conversationsByUser'),
    ]),

  Message: a
    .model({
      conversationId: a.id().required(),
      userId: a.id().required(),
      role: a.enum(['user', 'assistant', 'system', 'narration']),
      content: a.string().required(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])])
    .secondaryIndexes((index) => [
      index('conversationId').sortKeys(['createdAt']).name('byConversation').queryField('messagesByConversation'),
    ]),

  CompanionMemory: a
    .model({
      companionId: a.id().required(),
      userId: a.id().required(),
      key: a.string().required(),
      value: a.string().required(),
      source: a.enum(['MANUAL', 'AUTO']),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId')])
    .secondaryIndexes((index) => [
      index('companionId').name('byCompanion').queryField('memoriesByCompanion'),
    ]),

  Wallet: a
    .model({
      userId: a.id().required(),
      diamondBalance: a.integer().required().default(0),
      // Self-set spending cap (消費上限自設). Written only via the
      // setSpendLimit mutation below (checkin-handler) - kept Lambda-only
      // like every other Wallet write, not a client-writable field, since
      // field-level auth composing "more permissive than the model-level
      // rule" isn't a behavior this codebase has verified.
      dailySpendLimit: a.integer(),
      dailySpentAmount: a.integer(),
      dailySpentDate: a.date(),
      updatedAt: a.datetime(),
    })
    .identifier(['userId'])
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])]),

  DiamondTransaction: a
    .model({
      userId: a.id().required(),
      amount: a.integer().required(),
      type: a.enum(['SIGNUP_GRANT', 'DAILY_CHECKIN', 'GENERATION_SPEND', 'GENERATION_REFUND', 'GIFT_SEND']),
      relatedEntityId: a.string(),
      balanceAfter: a.integer().required(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']).name('byUser').queryField('transactionsByUser'),
    ]),

  CheckIn: a
    .model({
      userId: a.id().required(),
      checkInDate: a.date().required(),
      diamondAwarded: a.integer().required(),
      streakCount: a.integer(),
      createdAt: a.datetime(),
    })
    .identifier(['userId', 'checkInDate'])
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])]),

  WardrobeItem: a
    .model({
      name: a.string().required(),
      description: a.string(),
      thumbnailUrl: a.string(),
      isDefault: a.boolean().default(false),
    })
    .authorization((allow) => [allow.authenticated().to(['read'])]),

  Asset: a
    .model({
      userId: a.id().required(),
      companionId: a.id(),
      type: a.enum(['CHARACTER', 'IMAGE', 'VIDEO', 'WARDROBE']),
      s3Key: a.string().required(),
      thumbnailS3Key: a.string(),
      generationJobId: a.id(),
      prompt: a.string(),
      createdAt: a.datetime().required(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']).name('byUser').queryField('assetsByUser'),
    ]),

  GenerationJob: a
    .model({
      userId: a.id().required(),
      companionId: a.id(),
      type: a.enum(['IMAGE', 'VIDEO']),
      status: a.enum(['QUEUED', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED']),
      provider: a.string().required(),
      providerJobId: a.string(),
      prompt: a.string().required(),
      parameters: a.json(),
      resultAssetId: a.id(),
      diamondCost: a.integer().required(),
      transactionId: a.id(),
      refundTransactionId: a.id(),
      errorMessage: a.string(),
      createdAt: a.datetime().required(),
      updatedAt: a.datetime(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])])
    .secondaryIndexes((index) => [
      index('userId').sortKeys(['createdAt']).name('byUser').queryField('generationJobsByUser'),
      index('providerJobId').name('byProviderJobId').queryField('generationJobsByProviderJobId'),
    ]),

  GenerationResult: a
    .model({
      generationJobId: a.id().required(),
      userId: a.id().required(),
      providerOutputUrl: a.string(),
      s3Key: a.string(),
      width: a.integer(),
      height: a.integer(),
      durationSeconds: a.float(),
      createdAt: a.datetime(),
    })
    .authorization((allow) => [allow.ownerDefinedIn('userId').to(['read'])])
    .secondaryIndexes((index) => [index('generationJobId').name('byJob').queryField('resultsByJob')]),

  GenerationPricing: a
    .model({
      type: a.enum(['IMAGE', 'VIDEO']),
      model: a.string().required(),
      diamondCost: a.integer().required(),
      enabled: a.boolean().default(true),
    })
    .identifier(['type', 'model'])
    .authorization((allow) => [allow.authenticated().to(['read'])]),

  PresignedUrlResult: a.customType({
    url: a.string().required(),
    key: a.string().required(),
  }),

  // --- Chat: ensureConversation finds-or-creates the 1:1 Companion<->Conversation,
  // sendMessage persists + calls the AIProvider. Both handled by chat-handler,
  // dispatched on event.info.fieldName.
  ensureConversation: a
    .mutation()
    .arguments({ companionId: a.id().required() })
    .returns(a.ref('Conversation'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(chatHandler)),

  SendMessageResult: a.customType({
    message: a.ref('Message').required(),
    suggestedReplies: a.string().array(),
  }),

  sendMessage: a
    .mutation()
    .arguments({ conversationId: a.id().required(), content: a.string().required() })
    .returns(a.ref('SendMessageResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(chatHandler)),

  SendGiftResult: a.customType({
    narrationMessage: a.ref('Message').required(),
    reactionMessage: a.ref('Message').required(),
    suggestedReplies: a.string().array(),
  }),

  sendGift: a
    .mutation()
    .arguments({ conversationId: a.id().required(), giftId: a.string().required() })
    .returns(a.ref('SendGiftResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(chatHandler)),

  checkIn: a
    .mutation()
    .returns(a.ref('CheckIn'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(checkinHandler)),

  setSpendLimit: a
    .mutation()
    .arguments({ dailySpendLimit: a.integer() })
    .returns(a.ref('Wallet'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(checkinHandler)),

  createImageGenerationJob: a
    .mutation()
    .arguments({ companionId: a.id(), prompt: a.string().required(), parameters: a.json() })
    .returns(a.ref('GenerationJob'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(generationCreate)),

  createUploadUrl: a
    .query()
    .arguments({ companionId: a.id().required(), contentType: a.string().required() })
    .returns(a.ref('PresignedUrlResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(s3Presign)),

  createDownloadUrl: a
    .query()
    .arguments({ key: a.string().required() })
    .returns(a.ref('PresignedUrlResult'))
    .authorization((allow) => [allow.authenticated()])
    .handler(a.handler.function(s3Presign)),
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool',
  },
});
