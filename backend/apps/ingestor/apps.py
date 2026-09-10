from django.apps import AppConfig

class IngestorConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'apps.ingestor'
    verbose_name = 'Raw Notification Ingestor'
