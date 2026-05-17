import type { SlackMessageContext, SlackMessageEvent } from '~/types';
import { primeSlackUserName } from '~/utils/users';

export type TriggerType = 'ping' | 'keyword' | 'dm' | null;

function isPlainMessage(
  event: SlackMessageEvent
): event is SlackMessageEvent & { text: string; user: string } {
  const subtype = 'subtype' in event ? event.subtype : undefined;
  return (
    (!subtype || subtype === 'thread_broadcast') &&
    'text' in event &&
    typeof (event as { text?: unknown }).text === 'string' &&
    'user' in event &&
    typeof (event as { user?: unknown }).user === 'string'
  );
}

type BlockEl = { type?: string; usergroup_id?: string; elements?: BlockEl[] };

export function getGroupMentions(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return (blocks as BlockEl[])
    .flatMap((b) => b.elements ?? [])
    .flatMap((s) => s.elements ?? [])
    .filter(
      (e): e is BlockEl & { usergroup_id: string } =>
        e.type === 'usergroup' && !!e.usergroup_id
    )
    .map((e) => e.usergroup_id);
}

export interface Trigger {
  info: string | string[] | null;
  type: TriggerType;
}

export async function getTrigger(
  message: SlackMessageContext,
  keywords: string[],
  botId?: string
): Promise<Trigger> {
  const { event, client } = message;

  if (!isPlainMessage(event)) {
    return { type: null, info: null };
  }

  const content = event.text.trim();

  if (botId && content.includes(`<@${botId}>`)) {
    try {
      const info = await client.users.info({ user: botId });
      const displayName =
        info.user?.profile?.display_name || info.user?.name || null;
      if (displayName) {
        primeSlackUserName(botId, displayName);
      }
      return { type: 'ping', info: displayName ?? botId };
    } catch {
      return { type: 'ping', info: botId };
    }
  }

  if (botId) {
    const groupIds = getGroupMentions((event as { blocks?: unknown }).blocks);
    const matchedGroups: string[] = [];
    for (const groupId of groupIds) {
      try {
        const res = await client.usergroups.users.list({ usergroup: groupId });
        if ((res.users ?? []).includes(botId)) {
          matchedGroups.push(groupId);
        }
      } catch {
        // skip groups we can't check
      }
    }
    if (matchedGroups.length > 0) {
      return { type: 'ping', info: matchedGroups };
    }
  }

  const lowercase = content.toLowerCase();
  const matchedKeywords = keywords.filter((k) =>
    lowercase.includes(k.toLowerCase())
  );
  if (matchedKeywords.length > 0) {
    return { type: 'keyword', info: matchedKeywords };
  }

  const channelType = (event as { channel_type?: string }).channel_type;
  if (channelType === 'im') {
    return { type: 'dm', info: event.user };
  }

  return { type: null, info: null };
}
