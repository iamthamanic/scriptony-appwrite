/**
 * AI chat route for the Nhost compatibility layer.
 */

import { generateAiResponse } from "../../../_shared/ai";
import { requireUserBootstrap } from "../../../_shared/auth";
import { requestGraphql } from "../../../_shared/hasura";
import {
  readJsonBody,
  sendBadRequest,
  sendJson,
  sendMethodNotAllowed,
  sendUnauthorized,
  sendServerError,
  type RequestLike,
  type ResponseLike,
} from "../../../_shared/http";

async function getSettings(userId: string): Promise<Record<string, any> | null> {
  const data = await requestGraphql<{
    ai_chat_settings: Array<Record<string, any>>;
  }>(
    `
      query GetChatSettings($userId: uuid!) {
        ai_chat_settings(where: { user_id: { _eq: $userId } }, limit: 1) {
          id
          active_provider
          active_model
          system_prompt
          use_rag
          openai_api_key
          anthropic_api_key
          google_api_key
          openrouter_api_key
          deepseek_api_key
        }
      }
    `,
    { userId }
  );

  return data.ai_chat_settings[0] || null;
}

async function getConversationMessages(conversationId: string): Promise<
  Array<{ role: "user" | "assistant" | "system"; content: string }>
> {
  const data = await requestGraphql<{
    ai_chat_messages: Array<Record<string, any>>;
  }>(
    `
      query GetConversationMessages($conversationId: uuid!) {
        ai_chat_messages(
          where: { conversation_id: { _eq: $conversationId } }
          order_by: { created_at: asc }
        ) {
          role
          content
        }
      }
    `,
    { conversationId }
  );

  return data.ai_chat_messages
    .map((entry) => ({
      role: entry.role,
      content: entry.content,
    }))
    .filter((entry) => entry.content);
}

export default async function handler(req: RequestLike, res: ResponseLike): Promise<void> {
  try {
    const bootstrap = await requireUserBootstrap(req.headers.authorization);
    if (!bootstrap) {
      sendUnauthorized(res);
      return;
    }

    if (req.method !== "POST") {
      sendMethodNotAllowed(res, ["POST"]);
      return;
    }

    const body = await readJsonBody<Record<string, any>>(req);
    const rawMessage = typeof body.message === "string" ? body.message.trim() : "";
    if (!rawMessage) {
      sendBadRequest(res, "message is required");
      return;
    }

    const settings = await getSettings(bootstrap.user.id);
    const provider = settings?.active_provider || "openai";
    const model = settings?.active_model || "gpt-4o-mini";
    const providerKey = settings?.[`${provider}_api_key`];
    const systemPrompt =
      settings?.system_prompt ||
      "Du bist ein hilfreicher Assistent fuer Drehbuchautoren.";
    const temperature =
      typeof settings?.temperature === "number" ? settings.temperature : 0.7;
    const maxTokens =
      typeof settings?.max_tokens === "number" ? settings.max_tokens : 2000;

    if (!providerKey) {
      sendBadRequest(res, "No API key configured for the active provider");
      return;
    }

    let conversationId = body.conversation_id ?? body.conversationId ?? null;

    if (!conversationId) {
      const createdConversation = await requestGraphql<{
        insert_ai_conversations_one: Record<string, any>;
      }>(
        `
          mutation CreateConversation($object: ai_conversations_insert_input!) {
            insert_ai_conversations_one(object: $object) {
              id
            }
          }
        `,
        {
          object: {
            user_id: bootstrap.user.id,
            title: rawMessage.slice(0, 60),
            system_prompt: settings?.system_prompt ?? null,
            message_count: 0,
          },
        }
      );
      conversationId = createdConversation.insert_ai_conversations_one.id;
    }

    const priorMessages = await getConversationMessages(conversationId);
    const generated = await generateAiResponse({
      settings: {
        provider,
        model,
        apiKey: providerKey,
        systemPrompt,
        temperature,
        maxTokens,
      },
      conversationMessages: priorMessages,
      latestMessage: rawMessage,
    });

    const createdMessages = await requestGraphql<{
      insert_ai_chat_messages: { returning: Array<Record<string, any>> };
    }>(
      `
        mutation CreateChatMessages($objects: [ai_chat_messages_insert_input!]!) {
          insert_ai_chat_messages(objects: $objects) {
            returning {
              id
              conversation_id
              role
              content
              model
              provider
              tokens_used
              created_at
            }
          }
        }
      `,
      {
        objects: [
          {
            conversation_id: conversationId,
            role: "user",
            content: rawMessage,
            model,
            provider,
            tokens_used: rawMessage.split(/\s+/).filter(Boolean).length,
          },
          {
            conversation_id: conversationId,
            role: "assistant",
            content: generated.content,
            model,
            provider,
            tokens_used: generated.outputTokens,
          },
        ],
      }
    );

    const assistantMessage =
      createdMessages.insert_ai_chat_messages.returning.find(
        (entry) => entry.role === "assistant"
      ) || createdMessages.insert_ai_chat_messages.returning[1];

    await requestGraphql(
      `
        mutation TouchConversation($id: uuid!, $messageCount: Int!, $lastMessageAt: timestamptz!) {
          update_ai_conversations_by_pk(
            pk_columns: { id: $id }
            _set: {
              message_count: $messageCount
              last_message_at: $lastMessageAt
            }
          ) {
            id
          }
        }
      `,
      {
        id: conversationId,
        messageCount: priorMessages.length + createdMessages.insert_ai_chat_messages.returning.length,
        lastMessageAt: assistantMessage.created_at,
      }
    );

    sendJson(res, 200, {
      conversation_id: conversationId,
      message: assistantMessage,
      token_details: {
        input_tokens: generated.inputTokens,
        output_tokens: generated.outputTokens,
        total_tokens: generated.inputTokens + generated.outputTokens,
      },
    });
  } catch (error) {
    sendServerError(res, error);
  }
}
