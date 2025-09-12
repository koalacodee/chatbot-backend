-- DropIndex
DROP INDEX "idx_promotions_active_dates";

-- DropIndex
DROP INDEX "refresh_tokens_token_key";

-- CreateIndex
CREATE INDEX "refresh_tokens_token_idx" ON "refresh_tokens"("token");
