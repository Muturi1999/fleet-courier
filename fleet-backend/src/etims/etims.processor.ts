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
