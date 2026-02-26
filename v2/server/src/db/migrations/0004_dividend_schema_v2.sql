ALTER TABLE "dividends" DROP COLUMN "ex_date";--> statement-breakpoint
ALTER TABLE "dividends" DROP COLUMN "record_date";--> statement-breakpoint
ALTER TABLE "dividends" ADD COLUMN "projected_per_share" numeric(18, 6);--> statement-breakpoint
ALTER TABLE "dividends" ADD COLUMN "projected_payout" numeric(18, 6);
