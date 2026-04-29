import { PrismaIngestionStore } from "@/lib/server/prisma-ingestion-store";
import { PersistedIngestionService } from "@/lib/server/persisted-ingestion-service";

export async function runPersistedIngestion() {
  const service = new PersistedIngestionService(new PrismaIngestionStore());
  return service.run();
}
