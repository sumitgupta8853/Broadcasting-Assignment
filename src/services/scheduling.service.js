const { query } = require('../config/database');


const getLiveContent = async (teacherId, subject = null) => {
  // Build conditions
  const conditions = [
    `c.uploaded_by = $1`,
    `c.status = 'approved'`,
    `c.start_time IS NOT NULL`,
    `c.end_time IS NOT NULL`,
    `NOW() >= c.start_time`,
    `NOW() <= c.end_time`,
  ];
  const params = [teacherId];
  let paramIdx = 2;

  if (subject) {
    conditions.push(`c.subject = $${paramIdx++}`);
    params.push(subject.toLowerCase());
  }

  const where = conditions.join(' AND ');

  // Fetch all eligible approved+active content with their schedule info
  const result = await query(
    `SELECT
       c.id,
       c.title,
       c.description,
       c.subject,
       c.file_url,
       c.file_type,
       c.file_size,
       c.start_time,
       c.end_time,
       c.rotation_duration,
       c.approved_at,
       cs.rotation_order,
       cs.duration,
       cs.slot_id
     FROM content c
     JOIN content_schedule cs ON cs.content_id = c.id
     JOIN content_slots sl ON sl.id = cs.slot_id AND sl.teacher_id = $1
     WHERE ${where}
     ORDER BY c.subject, cs.rotation_order ASC`,
    params
  );

  if (result.rows.length === 0) {
    return null; // No active content
  }

  // Group content by subject -> each subject has its own independent rotation
  const subjectMap = {};
  for (const row of result.rows) {
    if (!subjectMap[row.subject]) subjectMap[row.subject] = [];
    subjectMap[row.subject].push(row);
  }

  const activeContentPerSubject = {};

  for (const [subj, items] of Object.entries(subjectMap)) {
    const active = getActiveContentForSubject(items);
    if (active) {
      activeContentPerSubject[subj] = active;
    }
  }

  if (Object.keys(activeContentPerSubject).length === 0) {
    return null;
  }

  // If subject filter applied, return single result
  if (subject) {
    return activeContentPerSubject[subject.toLowerCase()] || null;
  }

  // Return all active subjects as array
  return Object.values(activeContentPerSubject);
};

/**
 * Determine which item in the rotation is currently active for a subject.
 *
 * Uses epoch-based rotation:
 * - Anchor = earliest start_time among items in the slot
 * - Total cycle = sum of all durations (in ms)
 * - elapsed = (now - anchor) % total_cycle
 * - Walk rotation order to find which item "owns" the current elapsed time
 */
const getActiveContentForSubject = (items) => {
  if (items.length === 0) return null;
  if (items.length === 1) return items[0]; // Only one item, it's always active

  const now = Date.now();

  // Anchor: the earliest start_time across items in this group
  const anchor = Math.min(...items.map(item => new Date(item.start_time).getTime()));

  // Total cycle in milliseconds
  const totalCycleMs = items.reduce((sum, item) => sum + (item.duration * 60 * 1000), 0);

  if (totalCycleMs === 0) return items[0];

  // How far into the overall cycle are we?
  const elapsed = (now - anchor) % totalCycleMs;

  // Walk the rotation to find the active slot
  let cursor = 0;
  for (const item of items) {
    const durationMs = item.duration * 60 * 1000;
    if (elapsed >= cursor && elapsed < cursor + durationMs) {
      return item;
    }
    cursor += durationMs;
  }

  // Fallback (should never reach here)
  return items[0];
};

/**
 * Get full schedule for a teacher (all subjects, all slots with rotation info)
 */
const getTeacherSchedule = async (teacherId) => {
  const result = await query(
    `SELECT
       c.id,
       c.title,
       c.subject,
       c.status,
       c.start_time,
       c.end_time,
       cs.rotation_order,
       cs.duration,
       sl.id AS slot_id
     FROM content_schedule cs
     JOIN content c ON cs.content_id = c.id
     JOIN content_slots sl ON cs.slot_id = sl.id
     WHERE sl.teacher_id = $1
     ORDER BY c.subject, cs.rotation_order ASC`,
    [teacherId]
  );

  // Group by subject
  const schedule = {};
  for (const row of result.rows) {
    if (!schedule[row.subject]) {
      schedule[row.subject] = { slot_id: row.slot_id, items: [] };
    }
    schedule[row.subject].items.push(row);
  }

  return schedule;
};

module.exports = { getLiveContent, getTeacherSchedule };
