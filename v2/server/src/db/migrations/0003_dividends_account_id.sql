TRUNCATE TABLE "dividends";--> statement-breakpoint
ALTER TABLE "dividends" DROP CONSTRAINT "dividends_holding_id_holdings_id_fk";--> statement-breakpoint
DROP INDEX "dividends_holding_id_idx";--> statement-breakpoint
ALTER TABLE "dividends" DROP COLUMN "holding_id";--> statement-breakpoint
ALTER TABLE "dividends" ADD COLUMN "account_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "dividends" ADD CONSTRAINT "dividends_account_id_accounts_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."accounts"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "dividends_account_id_idx" ON "dividends" USING btree ("account_id");
