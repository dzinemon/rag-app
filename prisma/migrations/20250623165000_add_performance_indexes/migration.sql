-- CreateIndex
CREATE INDEX "idx_chunks_document_id" ON "chunks"("document_id");

-- CreateIndex
CREATE INDEX "idx_chunks_number" ON "chunks"("chunk_number");

-- CreateIndex
CREATE INDEX "idx_chunks_embedding_model" ON "chunks"("embedding_model_name");

-- CreateIndex
CREATE INDEX "idx_documents_created_at" ON "documents"("created_at" DESC);

-- CreateIndex
CREATE INDEX "idx_documents_type" ON "documents"("document_type");

-- CreateIndex
CREATE INDEX "idx_documents_title" ON "documents"("title");

-- CreateIndex
CREATE INDEX "idx_documents_tags" ON "documents"("tags");
