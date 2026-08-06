// Common IANA timezones grouped by region — covers ~95% of users
export const TIMEZONES: { label: string; value: string }[] = [
  { label: 'UTC',                    value: 'UTC' },
  // Americas
  { label: 'New York (ET)',          value: 'America/New_York' },
  { label: 'Chicago (CT)',           value: 'America/Chicago' },
  { label: 'Denver (MT)',            value: 'America/Denver' },
  { label: 'Los Angeles (PT)',       value: 'America/Los_Angeles' },
  { label: 'Toronto',                value: 'America/Toronto' },
  { label: 'Vancouver',              value: 'America/Vancouver' },
  { label: 'São Paulo',              value: 'America/Sao_Paulo' },
  { label: 'Mexico City',            value: 'America/Mexico_City' },
  // Europe
  { label: 'London (GMT/BST)',       value: 'Europe/London' },
  { label: 'Paris / Berlin (CET)',   value: 'Europe/Paris' },
  { label: 'Helsinki (EET)',         value: 'Europe/Helsinki' },
  { label: 'Moscow',                 value: 'Europe/Moscow' },
  { label: 'Istanbul',               value: 'Europe/Istanbul' },
  // Africa
  { label: 'Cairo (EET)',            value: 'Africa/Cairo' },
  { label: 'Nairobi (EAT)',          value: 'Africa/Nairobi' },
  { label: 'Lagos (WAT)',            value: 'Africa/Lagos' },
  { label: 'Johannesburg (SAST)',    value: 'Africa/Johannesburg' },
  { label: 'Addis Ababa (EAT)',      value: 'Africa/Addis_Ababa' },
  // Asia
  { label: 'Dubai (GST)',            value: 'Asia/Dubai' },
  { label: 'Riyadh (AST)',           value: 'Asia/Riyadh' },
  { label: 'Karachi (PKT)',          value: 'Asia/Karachi' },
  { label: 'Kolkata (IST)',          value: 'Asia/Kolkata' },
  { label: 'Dhaka (BST)',            value: 'Asia/Dhaka' },
  { label: 'Bangkok (ICT)',          value: 'Asia/Bangkok' },
  { label: 'Singapore (SGT)',        value: 'Asia/Singapore' },
  { label: 'Shanghai (CST)',         value: 'Asia/Shanghai' },
  { label: 'Tokyo (JST)',            value: 'Asia/Tokyo' },
  { label: 'Seoul (KST)',            value: 'Asia/Seoul' },
  // Oceania
  { label: 'Sydney (AEDT)',          value: 'Australia/Sydney' },
  { label: 'Melbourne',              value: 'Australia/Melbourne' },
  { label: 'Auckland (NZST)',        value: 'Pacific/Auckland' },
]
