export class EmailSendException extends Error {
  constructor(
    public readonly provider: string,
    public readonly template: string,
    public readonly recipient: string,
    public readonly cause: Error,
  ) {
    super(
      `Failed to send email via ${provider} [template=${template}] [to=${recipient}]: ${cause.message}`,
    );
    this.name = 'EmailSendException';
  }
}

export class EmailTemplateRenderException extends Error {
  constructor(
    public readonly template: string,
    public readonly cause: Error,
  ) {
    super(`Failed to render email template [${template}]: ${cause.message}`);
    this.name = 'EmailTemplateRenderException';
  }
}

export class EmailProviderConnectionException extends Error {
  constructor(
    public readonly provider: string,
    public readonly cause: Error,
  ) {
    super(`Email provider [${provider}] failed health check: ${cause.message}`);
    this.name = 'EmailProviderConnectionException';
  }
}
