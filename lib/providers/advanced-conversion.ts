export interface AdvancedConversionProvider {
  pdfToWord(input: Buffer): Promise<Buffer>;
  wordToPdf(input: Buffer): Promise<Buffer>;
  pdfToExcel(input: Buffer): Promise<Buffer>;
  excelToPdf(input: Buffer): Promise<Buffer>;
  pdfToText(input: Buffer): Promise<string>;
}

class StubProvider implements AdvancedConversionProvider {
  private missing: string;

  constructor(feature: string) {
    this.missing = feature;
  }

  async pdfToWord(): Promise<Buffer> {
    throw new Error(
      `${this.missing} requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature.`
    );
  }

  async wordToPdf(): Promise<Buffer> {
    throw new Error(
      `${this.missing} requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature.`
    );
  }

  async pdfToExcel(): Promise<Buffer> {
    throw new Error(
      `${this.missing} requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature.`
    );
  }

  async excelToPdf(): Promise<Buffer> {
    throw new Error(
      `${this.missing} requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature.`
    );
  }

  async pdfToText(): Promise<string> {
    throw new Error(
      `${this.missing} requires an external provider. Set PDF_PROVIDER_API_KEY to enable this feature.`
    );
  }
}

let providerInstance: AdvancedConversionProvider | null = null;

export function getAdvancedConversionProvider(): AdvancedConversionProvider {
  if (!providerInstance) {
    if (process.env.PDF_PROVIDER_API_KEY) {
      // When a real provider is configured, instantiate it here
      providerInstance = new StubProvider("Advanced conversion");
    } else {
      providerInstance = new StubProvider("Advanced conversion");
    }
  }
  return providerInstance;
}
