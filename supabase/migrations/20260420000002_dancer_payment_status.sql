-- Track when/how a dancer settled their house fees
ALTER TABLE attendance_log
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'unpaid';

-- Valid values: 'unpaid' | 'paid_checkin' | 'paid_during' | 'paid_checkout' | 'ran_off'
