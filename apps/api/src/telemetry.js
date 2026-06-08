// OpenTelemetry — optional instrumentation. Wrapped in try/catch so a version
// mismatch or missing package never prevents the API from starting.
try {
  const { NodeSDK } = await import('@opentelemetry/sdk-node');
  const { getNodeAutoInstrumentations } = await import('@opentelemetry/auto-instrumentations-node');
  const { PrometheusExporter } = await import('@opentelemetry/exporter-prometheus');
  const otelResources = await import('@opentelemetry/resources');
  const otelConventions = await import('@opentelemetry/semantic-conventions');
  const ATTR_SERVICE_NAME = otelConventions.ATTR_SERVICE_NAME ?? 'service.name';
  const ATTR_SERVICE_VERSION = otelConventions.ATTR_SERVICE_VERSION ?? 'service.version';

  const attrs = {
    [ATTR_SERVICE_NAME]: 'majorlogic-api',
    [ATTR_SERVICE_VERSION]: '0.1.0',
  };

  let resource;
  if (typeof otelResources.resourceFromAttributes === 'function') {
    resource = otelResources.resourceFromAttributes(attrs);
  } else {
    // ESM interop fix: the class is usually named Resource directly.
    const Resource = otelResources.Resource || otelResources.default?.Resource;
    if (typeof Resource === 'function') {
      resource = new Resource(attrs);
    }
  }

  const prometheusExporter = new PrometheusExporter({ port: 9464 });

  const sdk = new NodeSDK({
    ...(resource && { resource }),
    metricReader: prometheusExporter,
    instrumentations: [
      getNodeAutoInstrumentations({
        '@opentelemetry/instrumentation-http': { enabled: true },
        '@opentelemetry/instrumentation-fastify': { enabled: true },
        '@opentelemetry/instrumentation-pg': { enabled: true },
        '@opentelemetry/instrumentation-fs': { enabled: false },
      }),
    ],
  });

  sdk.start();
  process.on('SIGTERM', () => sdk.shutdown());
} catch (err) {
  console.warn('[telemetry] OpenTelemetry failed to initialize (non-fatal):', err.message);
}
