import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger } from "@nestjs/common";
import { Job } from "bullmq";
import { TenantContextStorage } from "../common/tenant-context/tenant-context.storage";
import { EtimsService } from "./etims.service";

type EtimsJob = {
  invoiceId: string;
  tenantSchema: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
};

@Processor("etims")
export class EtimsProcessor extends WorkerHost {
  private readonly logger = new Logger(EtimsProcessor.name);

  constructor(private readonly etims: EtimsService) {
    super();
  }

  async process(job: Job<EtimsJob>) {
    const etimsSlug = process.env.DIGITAX_TENANT_SLUG ?? "g4s-kenya";
    if (job.data.tenantSlug !== etimsSlug) {
      this.logger.warn(`Skipping eTIMS job for tenant ${job.data.tenantSlug} — not configured for Digitax`);
      return { invoiceId: job.data.invoiceId, status: "failed", message: "eTIMS not enabled for this tenant" };
    }
    this.logger.log(`Processing eTIMS job ${job.id} for invoice ${job.data.invoiceId}`);
    return TenantContextStorage.run(
      {
        id: job.data.tenantId,
        slug: job.data.tenantSlug,
        schema: job.data.tenantSchema,
        name: job.data.tenantName,
      },
      () => this.etims.submitInvoice(job.data.invoiceId),
    );
  }
}
