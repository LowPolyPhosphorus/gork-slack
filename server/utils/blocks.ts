import type {
  KnownBlock,
  RichTextBlock,
  RichTextSection,
  RichTextUsergroupMention,
} from '@slack/types';

export function getGroupMentions(blocks: unknown): string[] {
  if (!Array.isArray(blocks)) {
    return [];
  }
  return (blocks as KnownBlock[])
    .filter((b): b is RichTextBlock => b.type === 'rich_text')
    .flatMap((b) => b.elements)
    .filter((s): s is RichTextSection => s.type === 'rich_text_section')
    .flatMap((s) => s.elements)
    .filter((e): e is RichTextUsergroupMention => e.type === 'usergroup')
    .map((e) => e.usergroup_id);
}
