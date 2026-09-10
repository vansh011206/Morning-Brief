from django.db import models
from django.conf import settings


class TokenUsage(models.Model):
    """
    Tracks LLM token consumption and cost attribution per API call.
    """
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name='token_usages'
    )
    call_type = models.CharField(
        max_length=64,
        default='summarize',
        help_text='Operation type: summarize, filter, rank, etc.'
    )
    prompt_tokens = models.PositiveIntegerField(default=0)
    completion_tokens = models.PositiveIntegerField(default=0)
    model = models.CharField(max_length=64, default='gpt-4o-mini')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', 'created_at']),
            models.Index(fields=['call_type']),
        ]

    def __str__(self):
        return f"[{self.call_type}] {self.model}: {self.total_tokens} tokens ({self.created_at:%Y-%m-%d %H:%M})"

    @property
    def total_tokens(self) -> int:
        return self.prompt_tokens + self.completion_tokens

    @property
    def cost_cents(self) -> float:
        """
        Calculates estimated cost in cents based on standard gpt-4o-mini rates:
        Input: $0.15 per 1M tokens ($0.00000015/token = 0.000015 cents/token)
        Output: $0.60 per 1M tokens ($0.00000060/token = 0.000060 cents/token)
        """
        input_cost_cents = self.prompt_tokens * 0.000015
        output_cost_cents = self.completion_tokens * 0.000060
        return round(input_cost_cents + output_cost_cents, 4)
