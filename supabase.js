/**
 * FLAGGED — Supabase Database Operations
 *
 * All database interactions go through this module.
 * Requires supabase-config.js to be loaded first.
 *
 * @module supabase
 */

let _sb = null;

function getSupabase() {
  if (_sb) return _sb;
  if (typeof window.supabase !== 'undefined' && SUPABASE_CONFIG) {
    _sb = window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
    return _sb;
  }
  console.error('Supabase client not available. Check config and script loading order.');
  return null;
}

/* ========================================================================
   Seeding — First-run data initialization
   ======================================================================== */

async function seedEntriesIfNeeded() {
  const sb = getSupabase();
  if (!sb) return;

  const { count, error } = await sb.from('entries').select('*', { count: 'exact', head: true });
  if (error) { console.error('Seed check failed:', error); return; }
  if (count === 0 && typeof ENTRIES !== 'undefined') {
    const toInsert = ENTRIES.map(e => ({
      id: e.id,
      name: e.name,
      type: e.type,
      genres: JSON.stringify(e.genres),
      date: e.date,
      summary: e.summary,
      status: e.status,
      outcome: e.outcome,
      sources: JSON.stringify(e.sources),
      image_url: e.imageUrl || null,
      image_urls: JSON.stringify(e.imageUrls || []),
      is_hardcoded: true
    }));
    const { error: insertError } = await sb.from('entries').insert(toInsert);
    if (insertError) console.error('Seed failed:', insertError);
    else console.log('Seeded hardcoded entries.');
  }
}

/* ========================================================================
   Entries
   ======================================================================== */

async function fetchEntries(filters = {}) {
  const sb = getSupabase();
  if (!sb) return { data: [], count: 0 };

  let query = sb.from('entries').select('*', { count: 'exact' });

  if (filters.search) {
    const q = filters.search.toLowerCase();
    query = query.or(`name.ilike.%${q}%,summary.ilike.%${q}%`);
  }
  if (filters.genres && filters.genres.length > 0) {
    query = query.contains('genres', filters.genres);
  }
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters.yearEnd) {
    query = query.lte('date', `${filters.yearEnd}-12-31`);
  }

  const sortCol = 'date';
  const sortDir = filters.sortDir === 'asc' ? { ascending: true } : { ascending: false };
  query = query.order(sortCol, sortDir);

  if (filters.limit) {
    const from = ((filters.page || 1) - 1) * filters.limit;
    const to = from + filters.limit - 1;
    query = query.range(from, to);
  }

  const { data, error, count } = await query;
  if (error) { console.error('fetchEntries error:', error); return { data: [], count: 0 }; }

  return { data: (data || []).map(normalizeEntry), count: count || 0 };
}

async function getAllEntries(filters = {}) {
  const sb = getSupabase();
  if (!sb) return [];

  let query = sb.from('entries').select('*');

  if (filters.search) {
    const q = filters.search.toLowerCase();
    query = query.or(`name.ilike.%${q}%,summary.ilike.%${q}%`);
  }
  if (filters.genres && filters.genres.length > 0) {
    query = query.contains('genres', filters.genres);
  }
  if (filters.status && filters.status.length > 0) {
    query = query.in('status', filters.status);
  }
  if (filters.yearStart) {
    query = query.gte('date', `${filters.yearStart}-01-01`);
  }
  if (filters.yearEnd) {
    query = query.lte('date', `${filters.yearEnd}-12-31`);
  }

  const sortDir = filters.sortDir === 'asc' ? { ascending: true } : { ascending: false };
  query = query.order('date', sortDir);

  const { data, error } = await query;
  if (error) { console.error('getAllEntries error:', error); return []; }

  return (data || []).map(normalizeEntry);
}

async function getEntryById(id) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('entries').select('*').eq('id', id).single();
  if (error) return null;
  return normalizeEntry(data);
}

async function createEntry(entry) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('entries').insert({
    ...entry,
    genres: JSON.stringify(entry.genres),
    sources: JSON.stringify(entry.sources),
    image_urls: JSON.stringify(entry.imageUrls || []),
    is_hardcoded: false
  }).select().single();
  if (error) { console.error('createEntry error:', error); return null; }
  return normalizeEntry(data);
}

async function updateEntry(id, updates) {
  const sb = getSupabase();
  if (!sb) return null;
  const payload = { ...updates, updated_at: new Date().toISOString() };
  if (updates.genres) payload.genres = JSON.stringify(updates.genres);
  if (updates.sources) payload.sources = JSON.stringify(updates.sources);
  if (updates.imageUrls) payload.image_urls = JSON.stringify(updates.imageUrls);
  const { data, error } = await sb.from('entries').update(payload).eq('id', id).select().single();
  if (error) { console.error('updateEntry error:', error); return null; }
  return normalizeEntry(data);
}

async function deleteEntry(id) {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('entries').delete().eq('id', id);
  if (error) { console.error('deleteEntry error:', error); return false; }
  return true;
}

/* ========================================================================
   Pending Submissions
   ======================================================================== */

async function fetchPendingSubmissions() {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('pending_submissions')
    .select('*')
    .eq('submission_status', 'pending')
    .order('submitted_at', { ascending: false });
  if (error) { console.error('fetchPending error:', error); return []; }
  return (data || []).map(normalizePending);
}

async function submitPendingSubmission(submission) {
  const sb = getSupabase();
  if (!sb) return null;
  const { data, error } = await sb.from('pending_submissions').insert({
    id: submission.id,
    name: submission.name,
    type: submission.type,
    genres: JSON.stringify(submission.genres),
    date: submission.date,
    summary: submission.summary,
    status: submission.status || 'allegation',
    outcome: submission.outcome || 'ongoing',
    sources: JSON.stringify(submission.sources),
    image_urls: JSON.stringify(submission.imageUrls || []),
    image_url: submission.imageUrl || null,
    submitted_at: submission.submittedAt || new Date().toISOString(),
    submitter_note: submission.submitterNote || '',
    submission_status: 'pending'
  }).select().single();
  if (error) { console.error('submitPending error:', error); return null; }
  return normalizePending(data);
}

async function approveSubmission(id) {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: pending, error: fetchError } = await sb.from('pending_submissions')
    .select('*').eq('id', id).single();
  if (fetchError || !pending) return null;

  const newEntry = {
    id: pending.id.replace('pending-', 'entry-'),
    name: pending.name,
    type: pending.type,
    genres: pending.genres,
    date: pending.date,
    summary: pending.summary,
    status: pending.status || 'allegation',
    outcome: pending.outcome || 'ongoing',
    sources: pending.sources,
    image_urls: pending.image_urls || '[]',
    image_url: pending.image_url || null
  };

  const entry = await createEntry(newEntry);
  if (!entry) return null;

  await sb.from('pending_submissions').update({ submission_status: 'approved' }).eq('id', id);
  return entry;
}

async function rejectSubmission(id) {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('pending_submissions').delete().eq('id', id);
  return !error;
}

/* ========================================================================
   Comments
   ======================================================================== */

async function fetchComments(entryId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('comments')
    .select('*')
    .eq('entry_id', entryId)
    .is('parent_id', null)
    .order('timestamp', { ascending: false });
  if (error) { console.error('fetchComments error:', error); return []; }
  return data || [];
}

async function fetchReplies(commentId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('comments')
    .select('*')
    .eq('parent_id', commentId)
    .order('timestamp', { ascending: true });
  if (error) { console.error('fetchReplies error:', error); return []; }
  return data || [];
}

async function fetchAllReplies(entryId) {
  const sb = getSupabase();
  if (!sb) return [];
  const { data, error } = await sb.from('comments')
    .select('*')
    .eq('entry_id', entryId)
    .not('parent_id', 'is', null)
    .order('timestamp', { ascending: true });
  if (error) { console.error('fetchAllReplies error:', error); return []; }
  return data || [];
}

async function addComment(entryId, parentId, text, name, sessionId, imageUrl) {
  const sb = getSupabase();
  if (!sb) return null;
  const comment = {
    id: `comment-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entry_id: entryId,
    parent_id: parentId || null,
    name: name,
    text: text,
    session_id: sessionId,
    image_url: imageUrl || null
  };
  const { data, error } = await sb.from('comments').insert(comment).select().single();
  if (error) { console.error('addComment error:', error); return null; }
  return data;
}

async function deleteComment(commentId, sessionId) {
  const sb = getSupabase();
  if (!sb) return false;

  const { data: existing } = await sb.from('comments').select('session_id').eq('id', commentId).single();
  if (!existing || existing.session_id !== sessionId) return false;

  const { error } = await sb.from('comments').delete().eq('id', commentId);
  return !error;
}

/* ========================================================================
   Comment Reactions
   ======================================================================== */

async function toggleCommentReaction(commentId, sessionId, type) {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: existing } = await sb.from('comment_reactions')
    .select('*')
    .eq('comment_id', commentId)
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    if (existing.type === type) {
      await sb.from('comment_reactions').delete().eq('comment_id', commentId).eq('session_id', sessionId);
    } else {
      await sb.from('comment_reactions').update({ type }).eq('comment_id', commentId).eq('session_id', sessionId);
    }
  } else {
    await sb.from('comment_reactions').insert({ comment_id: commentId, session_id: sessionId, type });
  }

  const { data: likes } = await sb.from('comment_reactions')
    .select('session_id', { count: 'exact' })
    .eq('comment_id', commentId)
    .eq('type', 'like');
  const { data: dislikes } = await sb.from('comment_reactions')
    .select('session_id', { count: 'exact' })
    .eq('comment_id', commentId)
    .eq('type', 'dislike');

  const { data: userReactions } = await sb.from('comment_reactions')
    .select('type').eq('comment_id', commentId).eq('session_id', sessionId);

  const userLiked = userReactions?.some(r => r.type === 'like') || false;
  const userDisliked = userReactions?.some(r => r.type === 'dislike') || false;

  return {
    liked: userLiked,
    disliked: userDisliked,
    likes: likes?.length || 0,
    dislikes: dislikes?.length || 0
  };
}

/* ========================================================================
   Entry Engagement (Likes/Dislikes)
   ======================================================================== */

async function getEntryEngagement(entryId) {
  const sb = getSupabase();
  if (!sb) return { likes: 0, dislikes: 0 };

  const { data: likes } = await sb.from('entry_engagement')
    .select('session_id', { count: 'exact' })
    .eq('entry_id', entryId)
    .eq('type', 'like');
  const { data: dislikes } = await sb.from('entry_engagement')
    .select('session_id', { count: 'exact' })
    .eq('entry_id', entryId)
    .eq('type', 'dislike');

  return {
    likes: likes?.length || 0,
    dislikes: dislikes?.length || 0
  };
}

async function getUserEngagement(entryId, sessionId) {
  const sb = getSupabase();
  if (!sb) return { liked: false, disliked: false };
  const { data } = await sb.from('entry_engagement')
    .select('type')
    .eq('entry_id', entryId)
    .eq('session_id', sessionId);
  return {
    liked: data?.some(r => r.type === 'like') || false,
    disliked: data?.some(r => r.type === 'dislike') || false
  };
}

async function toggleEntryEngagement(entryId, sessionId, type) {
  const sb = getSupabase();
  if (!sb) return null;

  const { data: existing } = await sb.from('entry_engagement')
    .select('*')
    .eq('entry_id', entryId)
    .eq('session_id', sessionId)
    .single();

  if (existing) {
    if (existing.type === type) {
      await sb.from('entry_engagement').delete().eq('entry_id', entryId).eq('session_id', sessionId);
    } else {
      await sb.from('entry_engagement').update({ type }).eq('entry_id', entryId).eq('session_id', sessionId);
    }
  } else {
    await sb.from('entry_engagement').insert({ entry_id: entryId, session_id: sessionId, type });
  }

  const engagement = await getEntryEngagement(entryId);
  const user = await getUserEngagement(entryId, sessionId);
  return { ...engagement, ...user };
}

/* ========================================================================
   Reports
   ======================================================================== */

async function submitReport(entryId, type, description, sessionId) {
  const sb = getSupabase();
  if (!sb) return false;
  const { error } = await sb.from('reports').insert({
    id: `report-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    entry_id: entryId,
    type: type,
    description: description || '',
    session_id: sessionId
  });
  return !error;
}

/* ========================================================================
   Image Upload to Supabase Storage
   ======================================================================== */

async function uploadImage(file) {
  const sb = getSupabase();
  if (!sb) return null;

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { data, error } = await sb.storage
    .from('entry-images')
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type
    });

  if (error) { console.error('uploadImage error:', error); return null; }

  const { data: { publicUrl } } = sb.storage.from('entry-images').getPublicUrl(fileName);
  return publicUrl;
}

/* ========================================================================
   Normalization
   ======================================================================== */

function normalizeEntry(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    genres: typeof row.genres === 'string' ? JSON.parse(row.genres) : (row.genres || []),
    date: row.date,
    summary: row.summary,
    status: row.status,
    outcome: row.outcome,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : (row.sources || []),
    imageUrls: typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : (row.image_urls || []),
    imageUrl: row.image_url
  };
}

function normalizePending(row) {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    genres: typeof row.genres === 'string' ? JSON.parse(row.genres) : (row.genres || []),
    date: row.date,
    summary: row.summary,
    status: row.status,
    outcome: row.outcome,
    sources: typeof row.sources === 'string' ? JSON.parse(row.sources) : (row.sources || []),
    imageUrls: typeof row.image_urls === 'string' ? JSON.parse(row.image_urls) : (row.image_urls || []),
    imageUrl: row.image_url,
    submittedAt: row.submitted_at,
    submitterNote: row.submitter_note || '',
    submissionStatus: row.submission_status
  };
}
