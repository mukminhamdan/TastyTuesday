export function logActivity(db, user, { entity_type, entity_id, ref_no, customer_id, action, description }) {
  db.prepare(
    `INSERT INTO activity_log (entity_type, entity_id, ref_no, customer_id, action, description, user_id, user_name)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(entity_type, entity_id ?? null, ref_no ?? null, customer_id ?? null, action, description ?? null, user?.id ?? null, user?.name ?? null);
}
