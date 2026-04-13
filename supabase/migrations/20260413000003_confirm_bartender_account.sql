-- Confirm email for the bartender@2nyt.com test account so it can log in without email verification
UPDATE auth.users
SET
  email_confirmed_at = COALESCE(email_confirmed_at, now()),
  updated_at         = now()
WHERE email = 'bartender@2nyt.com';
