from django.core.management.base import BaseCommand
from apps.buildings.models import Badge


class Command(BaseCommand):
	help = 'Seed default achievement badges'

	def handle(self, *args, **options):
		badges = [
			{'name': 'First Steps', 'description': 'Unlocked your first campus building.', 'icon': '🥾', 'color_hex': '#96C0CE', 'trigger': 'first_unlock'},
			{'name': 'Explorer', 'description': 'Unlocked 5 campus buildings.', 'icon': '🗺️', 'color_hex': '#2ECC71', 'trigger': 'unlocks_5'},
			{'name': 'Campus Ranger', 'description': 'Unlocked 10 campus buildings.', 'icon': '🏕️', 'color_hex': '#3498DB', 'trigger': 'unlocks_10'},
			{'name': 'Campus Legend', 'description': 'Unlocked every single building on campus!', 'icon': '🏆', 'color_hex': '#FFD700', 'trigger': 'unlocks_all'},
			{'name': 'Quest Starter', 'description': 'Completed your first quest.', 'icon': '⚡', 'color_hex': '#F1C40F', 'trigger': 'first_quest'},
			{'name': 'Quest Hunter', 'description': 'Completed 5 quests.', 'icon': '🎯', 'color_hex': '#E67E22', 'trigger': 'quests_5'},
			{'name': 'Quest Master', 'description': 'Completed 10 quests.', 'icon': '👑', 'color_hex': '#9B59B6', 'trigger': 'quests_10'},
			{'name': 'Rising Star', 'description': 'Earned 100 exploration points.', 'icon': '⭐', 'color_hex': '#F39C12', 'trigger': 'points_100'},
			{'name': 'Veteran Scout', 'description': 'Earned 500 exploration points.', 'icon': '🌟', 'color_hex': '#E74C3C', 'trigger': 'points_500'},
			{'name': 'ARQuest Elite', 'description': 'Earned 1000 exploration points. You are a legend.', 'icon': '💎', 'color_hex': '#8A1538', 'trigger': 'points_1000'},
		]
		created = 0
		updated = 0
		for b in badges:
			obj, was_created = Badge.objects.get_or_create(trigger=b['trigger'], defaults=b)
			if was_created:
				created += 1
			else:
				# Update fields if already exist
				for key, val in b.items():
					setattr(obj, key, val)
				obj.save()
				updated += 1
		self.stdout.write(self.style.SUCCESS(f'Done. {created} created, {updated} updated.'))
