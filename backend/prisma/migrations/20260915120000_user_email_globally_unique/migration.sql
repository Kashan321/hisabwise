-- Enforce one account per email across all businesses.
-- Duplicate registrations keep the earliest account and remove later businesses.

WITH ranked_users AS (
  SELECT
    id,
    business_id,
    email,
    ROW_NUMBER() OVER (PARTITION BY email ORDER BY created_at ASC, id ASC) AS rn
  FROM users
),
duplicate_businesses AS (
  SELECT DISTINCT business_id
  FROM ranked_users
  WHERE rn > 1
)
DELETE FROM businesses
WHERE id IN (SELECT business_id FROM duplicate_businesses);

DROP INDEX IF EXISTS "users_business_id_email_key";

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");
