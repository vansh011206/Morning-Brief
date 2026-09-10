import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("ingestor", "0001_initial"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="Digest",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("digest_date", models.DateField(db_index=True)),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("building", "Building"),
                            ("ready", "Ready"),
                            ("delivered", "Delivered"),
                            ("failed", "Failed"),
                        ],
                        default="building",
                        max_length=32,
                    ),
                ),
                ("item_count", models.PositiveIntegerField(default=0)),
                ("important_count", models.PositiveIntegerField(default=0)),
                ("llm_cost_cents", models.FloatField(default=0.0)),
                ("delivered_at", models.DateTimeField(blank=True, null=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("updated_at", models.DateTimeField(auto_now=True)),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="digests",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-digest_date"],
                "unique_together": {("user", "digest_date")},
            },
        ),
        migrations.CreateModel(
            name="DigestItem",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "section",
                    models.CharField(
                        choices=[
                            ("news", "Technology & World News"),
                            ("actions", "Pending Actions & PRs"),
                            ("emails", "Priority Correspondence"),
                            ("money", "Financial & Market Updates"),
                            ("events", "Calendar & Scheduled Events"),
                        ],
                        default="news",
                        max_length=32,
                    ),
                ),
                ("rank", models.PositiveIntegerField(default=1)),
                ("summary", models.TextField()),
                (
                    "priority",
                    models.CharField(
                        choices=[
                            ("normal", "Normal"),
                            ("high", "High"),
                            ("urgent", "Urgent"),
                        ],
                        default="normal",
                        max_length=32,
                    ),
                ),
                ("ai_reason", models.TextField(blank=True, default="")),
                ("source_title", models.CharField(blank=True, default="", max_length=512)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "digest",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="items",
                        to="digest.digest",
                    ),
                ),
                (
                    "raw_item",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.SET_NULL,
                        related_name="digest_items",
                        to="ingestor.rawitem",
                    ),
                ),
            ],
            options={
                "ordering": ["rank", "id"],
            },
        ),
    ]
