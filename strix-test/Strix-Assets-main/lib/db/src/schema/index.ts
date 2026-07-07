import {
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  timestamp,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const severityEnum = pgEnum("severity", [
  "critical",
  "severe",
  "moderate",
  "minor",
]);

export const impactZoneEnum = pgEnum("impact_zone", [
  "front",
  "front-left",
  "front-right",
  "rear",
  "rear-left",
  "rear-right",
  "side-left",
  "side-right",
  "unknown",
]);

export const impactDirectionEnum = pgEnum("impact_direction", [
  "front",
  "rear",
  "side-left",
  "side-right",
  "unknown",
]);

export const accidentsTable = pgTable(
  "accidents",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    deviceId: varchar("device_id", { length: 160 }).notNull(),
    timestamp: timestamp("timestamp", { withTimezone: true }).notNull(),
    latitude: doublePrecision("latitude"),
    longitude: doublePrecision("longitude"),
    peakGForce: doublePrecision("peak_g_force").notNull(),
    impactZone: impactZoneEnum("impact_zone").notNull(),
    impactDirection: impactDirectionEnum("impact_direction").notNull(),
    speedKmh: integer("speed_kmh").notNull(),
    jerkPeak: doublePrecision("jerk_peak").notNull(),
    approachAngle: doublePrecision("approach_angle").notNull().default(0),
    severity: severityEnum("severity").notNull(),
    reportJson: jsonb("report_json").notNull(),
    matchedAccidentId: uuid("matched_accident_id"),
    matchConfidence: integer("match_confidence"),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    deviceIdx: index("accidents_device_id_idx").on(table.deviceId),
    timestampIdx: index("accidents_timestamp_idx").on(table.timestamp),
    locationTimeIdx: index("accidents_location_time_idx").on(
      table.latitude,
      table.longitude,
      table.timestamp,
    ),
    matchIdx: index("accidents_match_idx").on(table.matchedAccidentId),
  }),
);

export const insertAccidentSchema = createInsertSchema(accidentsTable, {
  reportJson: z.record(z.string(), z.unknown()),
});
export const selectAccidentSchema = createSelectSchema(accidentsTable);

export type InsertAccident = typeof accidentsTable.$inferInsert;
export type Accident = typeof accidentsTable.$inferSelect;

export const faultAssessmentsTable = pgTable("fault_assessments", {
  id: uuid("id").defaultRandom().primaryKey(),
  accidentId: uuid("accident_id")
    .notNull()
    .references(() => accidentsTable.id, { onDelete: "cascade" }),
  appLiabilityUser: integer("app_liability_user").notNull(),
  appLiabilityOther: integer("app_liability_other").notNull(),
  najmLiabilityUser: integer("najm_liability_user"),
  najmLiabilityOther: integer("najm_liability_other"),
  liabilityDifference: integer("liability_difference"),
  userDescription: varchar("user_description", { length: 1000 }),
  // الجهة المُصدِرة للتقرير الرسمي: najm | saudi_traffic | other
  authoritySource: varchar("authority_source", { length: 20 }),
  // اسم الجهة عند اختيار "أخرى"
  authorityOther: varchar("authority_other", { length: 100 }),
  assessedAt: timestamp("assessed_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const falseAlarmsTable = pgTable("false_alarms", {
  id: uuid("id").defaultRandom().primaryKey(),
  accidentId: uuid("accident_id")
    .unique()
    .references(() => accidentsTable.id, { onDelete: "set null" }),
  reason: varchar("reason", { length: 255 }).notNull(),
  details: varchar("details", { length: 1000 }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

// عملاء التسجيل المبكر (Leads) من صفحة الهبوط.
// الأعمدة مطابقة لجدول Supabase الذي يكتب فيه الموقع مباشرةً (full_name/mobile/email).
export const leadsTable = pgTable(
  "leads",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    fullName: varchar("full_name", { length: 200 }).notNull(),
    mobile: varchar("mobile", { length: 40 }).notNull(),
    email: varchar("email", { length: 200 }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (table) => ({
    createdAtIdx: index("leads_created_at_idx").on(table.createdAt),
  }),
);

export type InsertLead = typeof leadsTable.$inferInsert;
export type Lead = typeof leadsTable.$inferSelect;

export const crossVerifiedAnalysesTable = pgTable("cross_verified_analyses", {
  id: uuid("id").defaultRandom().primaryKey(),
  accidentAId: uuid("accident_a_id")
    .notNull()
    .references(() => accidentsTable.id),
  accidentBId: uuid("accident_b_id")
    .notNull()
    .references(() => accidentsTable.id),
  verifiedImpactZoneA: varchar("verified_impact_zone_a", { length: 50 }).notNull().default("unknown"),
  verifiedImpactZoneB: varchar("verified_impact_zone_b", { length: 50 }).notNull().default("unknown"),
  verifiedSpeedAKmh: doublePrecision("verified_speed_a_kmh").notNull().default(0),
  verifiedSpeedBKmh: doublePrecision("verified_speed_b_kmh").notNull().default(0),
  firstContactParty: varchar("first_contact_party", { length: 20 }).notNull().default("UNKNOWN"),
  consistencyStatus: varchar("consistency_status", { length: 20 }).notNull().default("PARTIAL"),
  consistencyFlags: jsonb("consistency_flags").default([]),
  liabilityAPercent: doublePrecision("liability_a_percent").notNull().default(50),
  liabilityBPercent: doublePrecision("liability_b_percent").notNull().default(50),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
