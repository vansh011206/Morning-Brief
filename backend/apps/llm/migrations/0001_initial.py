import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.CreateModel(
            name="TokenUsage",
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
                    "call_type",
                    models.CharField(
                        default="summarize",
                        help_text="Operation type: summarize, filter, rank, etc.",
                        max_length=64,
                    ),
                ),
                ("prompt_tokens", models.PositiveIntegerField(default=0)),
                ("completion_tokens", models.PositiveIntegerField(default=0)),
                ("model", models.CharField(default="gpt-4o-mini", max_length=64)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                (
                    "user",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="token_usages",
                        to=settings.AUTH_USER_MODEL,
                    ),
                ),
            ],
            options={
                "ordering": ["-created_at"],
                "indexes": [
                    models.Index(
                        fields=["user", "created_at"],
                        name="llm_tokenus_user_id_48a436_idx",
                    ),
                    models.Index(
                        fields=["call_type"],
                        name="llm_tokenus_call_ty_191ae9_idx",
                    ),
                ],
            },
        ),
    ]
