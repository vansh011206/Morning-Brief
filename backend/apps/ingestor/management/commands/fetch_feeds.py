import sys
from django.core.management.base import BaseCommand
from apps.connections.models import Connection
from apps.ingestor.tasks import fetch_rss_feeds


class Command(BaseCommand):
    help = 'Fetches RSS feeds for active connections and populates RawItem model.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--connection-id',
            type=int,
            help='Specific Connection ID to fetch'
        )
        parser.add_argument(
            '--user-id',
            type=int,
            help='Fetch all active RSS feeds for a specific User ID'
        )
        parser.add_argument(
            '--all',
            action='store_true',
            help='Fetch all active RSS feeds across all users'
        )

    def handle(self, *args, **options):
        connection_id = options.get('connection_id')
        user_id = options.get('user_id')

        qs = Connection.objects.filter(provider=Connection.Provider.RSS)

        if connection_id:
            qs = qs.filter(pk=connection_id)
        elif user_id:
            qs = qs.filter(user_id=user_id, is_active=True)
        else:
            qs = qs.filter(is_active=True)

        connections = list(qs)
        if not connections:
            self.stdout.write(self.style.WARNING("No matching RSS connections found to fetch."))
            return

        self.stdout.write(self.style.SUCCESS(f"Starting RSS ingestion for {len(connections)} connection(s)..."))

        total_created = 0
        total_existing = 0
        errors = 0

        for conn in connections:
            self.stdout.write(f"-> Fetching '{conn.display_name}' ({conn.external_account})...", ending=' ')
            sys.stdout.flush()

            result = fetch_rss_feeds(conn.id)
            if result.get('status') == 'success':
                created = result.get('created_count', 0)
                existing = result.get('existing_count', 0)
                total_created += created
                total_existing += existing
                self.stdout.write(
                    self.style.SUCCESS(f"OK ({created} new items, {existing} existing)")
                )
            else:
                errors += 1
                self.stdout.write(
                    self.style.ERROR(f"FAILED: {result.get('error')}")
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"\nFinished! Total new items: {total_created}, Total existing: {total_existing}, Errors: {errors}"
            )
        )
