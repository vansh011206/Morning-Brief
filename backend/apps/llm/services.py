import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)


class LLMService:
    """
    Interface for summarizing raw notifications and assigning intelligent ranking scores.
    """

    @classmethod
    def rank_and_summarize(cls, items: List[Dict[str, Any]], job_hunt_mode: bool = False) -> List[Dict[str, Any]]:
        """
        Takes raw items and produces structured summaries, priorities, and action items.
        """
        results = []
        for idx, item in enumerate(items, start=1):
            category = item.get('category', 'general')
            priority = 'medium'
            
            # If user has job hunt mode on, elevate recruiters
            if job_hunt_mode and category == 'recruiter':
                priority = 'critical'

            results.append({
                'rank': idx,
                'priority': priority,
                'category': category,
                'title': item.get('title', 'Notification item'),
                'summary': f"AI synthesis for {item.get('title')}: Key points extracted from {item.get('source_type', 'source')}.",
                'action_items': ["Review details", "Respond if necessary"],
            })
        return results
