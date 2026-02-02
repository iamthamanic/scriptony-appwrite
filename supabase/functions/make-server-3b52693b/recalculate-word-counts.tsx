/**
 * 📊 RECALCULATE WORD COUNTS
 * 
 * Utility to recalculate word counts for all scenes in a project
 * Should be called once to fix existing data, then auto-saved via updateScene
 */

import { createClient } from 'jsr:@supabase/supabase-js@2';

// Helper to extract text from TipTap JSON
const extractTextFromTiptap = (node: any): string => {
  let text = '';
  
  if (node.text) {
    text += node.text;
  }
  
  if (node.content && Array.isArray(node.content)) {
    for (const child of node.content) {
      text += extractTextFromTiptap(child);
      // Add paragraph breaks
      if (child.type === 'paragraph') {
        text += '\n\n';
      }
    }
  }
  
  return text;
};

export async function recalculateWordCounts(projectId: string) {
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );

  console.log(`[Recalculate] 🚀 Starting word count recalculation for project: ${projectId}`);

  // Get all scenes (level=3) for this project
  const { data: scenes, error } = await supabase
    .from('project_nodes')
    .select('*')
    .eq('project_id', projectId)
    .eq('level', 3)
    .order('order_index');

  if (error) {
    console.error('[Recalculate] ❌ Error fetching scenes:', error);
    throw error;
  }

  console.log(`[Recalculate] 📚 Found ${scenes?.length || 0} scenes to process`);

  let updated = 0;
  let skipped = 0;
  let errors = 0;

  for (const scene of scenes || []) {
    try {
      // Get content from metadata
      const content = scene.metadata?.content;
      
      if (!content) {
        console.log(`[Recalculate] ⏭️ Scene "${scene.title}" has no content, skipping`);
        skipped++;
        continue;
      }

      // Parse content and calculate word count
      let wordCount = 0;
      try {
        const parsed = typeof content === 'string' ? JSON.parse(content) : content;
        const textContent = extractTextFromTiptap(parsed);
        wordCount = textContent.trim() 
          ? textContent.trim().split(/\s+/).filter((w: string) => w.length > 0).length 
          : 0;
      } catch (e) {
        // If not JSON, treat as plain text
        const textContent = typeof content === 'string' ? content : '';
        wordCount = textContent.trim() 
          ? textContent.trim().split(/\s+/).filter((w: string) => w.length > 0).length 
          : 0;
      }

      // Update scene with word count
      const { error: updateError } = await supabase
        .from('project_nodes')
        .update({ word_count: wordCount })
        .eq('id', scene.id);

      if (updateError) {
        console.error(`[Recalculate] ❌ Error updating scene "${scene.title}":`, updateError);
        errors++;
      } else {
        console.log(`[Recalculate] ✅ Updated scene "${scene.title}": ${wordCount} words`);
        updated++;
      }
    } catch (e) {
      console.error(`[Recalculate] ❌ Error processing scene "${scene.title}":`, e);
      errors++;
    }
  }

  console.log(`[Recalculate] 🎉 Done! Updated: ${updated}, Skipped: ${skipped}, Errors: ${errors}`);

  return { updated, skipped, errors, total: scenes?.length || 0 };
}
