from datetime import date
import random
from django.core.management.base import BaseCommand
from django.utils import timezone
from apps.buildings.models import Building
from apps.gamification.models import Quest, UserQuestProgress
from apps.authentication.models import User


class Command(BaseCommand):
	help = 'Seed realistic campus quests and helper tools for daily/quick missions'

	def add_arguments(self, parser):
		parser.add_argument(
			'--complete-daily',
			nargs='?',
			const='ALL',
			type=str,
			help='Complete all 3 daily missions for the specified student username (or all students if omitted)'
		)
		parser.add_argument(
			'--reset-daily',
			nargs='?',
			const='ALL',
			type=str,
			help='Reset completed quests for the specified student username (or all students if omitted)'
		)
		parser.add_argument(
			'--clear',
			action='store_true',
			help='Delete existing quests before seeding'
		)

	def handle(self, *args, **options):
		if options.get('clear'):
			count = Quest.objects.count()
			Quest.objects.all().delete()
			self.stdout.write(self.style.WARNING(f"Cleared {count} existing quests."))

		# Handle --complete-daily
		if options.get('complete_daily'):
			target = options['complete_daily']
			self._complete_daily_for_users(target)
			return

		# Handle --reset-daily
		if options.get('reset_daily'):
			target = options['reset_daily']
			self._reset_daily_for_users(target)
			return

		# 1. Seed Quests
		buildings_by_name = {b.name.lower(): b for b in Building.objects.all()}

		def find_building(keywords):
			for kw in keywords:
				for name, b in buildings_by_name.items():
					if kw.lower() in name:
						return b
			# Fallback to first available building
			return Building.objects.first()

		quest_data = [
			# EASY QUESTS (Quick Missions & Easy Daily Quests)
			{
				'title': 'Tech Explorer',
				'hint': 'Head over to the College of Computing Studies lobby to discover campus IT facilities.',
				'building_keywords': ['computing', 'ccs'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},
			{
				'title': 'Knowledge Haven',
				'hint': 'Visit the University Library main entrance and check out the academic resource center.',
				'building_keywords': ['library'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},
			{
				'title': 'Inspire the Future',
				'hint': 'Walk past the College of Teacher Education and greet future university educators.',
				'building_keywords': ['teacher education', 'cte'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},
			{
				'title': 'Campus Pulse',
				'hint': 'Deploy to the university Administration Building executive steps.',
				'building_keywords': ['administration'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},
			{
				'title': 'Legal Eagles',
				'hint': 'Visit the College of Law hall to inspect the mock courtroom wing.',
				'building_keywords': ['law'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},
			{
				'title': 'Healing Hands',
				'hint': 'Locate the College of Nursing health and medical science pavilion.',
				'building_keywords': ['nursing'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},
			{
				'title': 'Athletic Grounds',
				'hint': 'Head to the College of Sports Science and Physical Education complex.',
				'building_keywords': ['sports', 'csspe'],
				'difficulty': 'EASY',
				'reward_points': 50,
			},

			# MEDIUM QUESTS (Daily Missions)
			{
				'title': 'Engineering Innovator',
				'hint': 'Walk through the College of Engineering research and prototyping labs.',
				'building_keywords': ['engineering'],
				'difficulty': 'MEDIUM',
				'reward_points': 100,
			},
			{
				'title': 'Science & Discovery',
				'hint': 'Explore the College of Science and Mathematics experimental wing.',
				'building_keywords': ['csm', 'science'],
				'difficulty': 'MEDIUM',
				'reward_points': 100,
			},
			{
				'title': 'Culinary & Crafts',
				'hint': 'Visit the College of Home Economics culinary workshops and textile studio.',
				'building_keywords': ['home economics', 'che'],
				'difficulty': 'MEDIUM',
				'reward_points': 100,
			},
			{
				'title': 'Justice & Order',
				'hint': 'Report to the College of Criminal Justice Education tactical grounds.',
				'building_keywords': ['ccje', 'criminal'],
				'difficulty': 'MEDIUM',
				'reward_points': 100,
			},

			# HARD QUESTS (Daily Missions)
			{
				'title': 'Master of Medicine',
				'hint': 'Journey to the College of Medicine advanced clinical research wing.',
				'building_keywords': ['medicine'],
				'difficulty': 'HARD',
				'reward_points': 150,
			},
			{
				'title': 'Arts & Humanities Odyssey',
				'hint': 'Complete the full cultural corridor through the College of Liberal Arts.',
				'building_keywords': ['liberal arts'],
				'difficulty': 'HARD',
				'reward_points': 150,
			},
			{
				'title': 'Public Administration Pioneer',
				'hint': 'Reach the College of Public Administration and Development Studies.',
				'building_keywords': ['cpads', 'public admin'],
				'difficulty': 'HARD',
				'reward_points': 150,
			},
		]

		created_count = 0
		updated_count = 0

		for item in quest_data:
			b = find_building(item['building_keywords'])
			if not b:
				continue
			quest, was_created = Quest.objects.update_or_create(
				title=item['title'],
				defaults={
					'hint': item['hint'],
					'target_building': b,
					'difficulty': item['difficulty'],
					'reward_points': item['reward_points'],
					'is_active': True,
					'expires_at': None,
				}
			)
			if was_created:
				created_count += 1
			else:
				updated_count += 1

		self.stdout.write(self.style.SUCCESS(
			f"Successfully seeded {created_count} new quests ({updated_count} updated). Total active quests: {Quest.objects.count()}"
		))

	def _get_daily_quests_for_user(self, user):
		all_daily_quests = list(Quest.objects.filter(
			is_active=True,
			expires_at__isnull=True
		).select_related('target_building'))

		if not all_daily_quests:
			return []

		today_str = date.today().isoformat()
		random.seed(f"{user.id}-{today_str}")

		easy_quests = [q for q in all_daily_quests if q.difficulty == 'EASY']
		medium_quests = [q for q in all_daily_quests if q.difficulty == 'MEDIUM']
		hard_quests = [q for q in all_daily_quests if q.difficulty == 'HARD']

		daily_quests = []
		if easy_quests: daily_quests.append(random.choice(easy_quests))
		if medium_quests: daily_quests.append(random.choice(medium_quests))
		if hard_quests: daily_quests.append(random.choice(hard_quests))

		while len(daily_quests) < 3 and len(daily_quests) < len(all_daily_quests):
			candidate = random.choice(all_daily_quests)
			if candidate not in daily_quests:
				daily_quests.append(candidate)

		random.seed()
		return daily_quests

	def _complete_daily_for_users(self, target_spec):
		if target_spec == 'ALL':
			students = User.objects.filter(role='student')
		else:
			students = User.objects.filter(username__iexact=target_spec)

		if not students.exists():
			self.stdout.write(self.style.ERROR(f"No student matching '{target_spec}' found."))
			return

		for student in students:
			daily_quests = self._get_daily_quests_for_user(student)
			if not daily_quests:
				self.stdout.write(self.style.WARNING(f"No daily quests found to complete for {student.username}. Please seed quests first."))
				continue

			for q in daily_quests:
				progress, _ = UserQuestProgress.objects.get_or_create(user=student, quest=q)
				progress.is_completed = True
				progress.completed_at = timezone.now()
				progress.save()

			self.stdout.write(self.style.SUCCESS(
				f"Marked {len(daily_quests)} daily missions as COMPLETED for student '{student.username}'! Quick Missions are now UNLOCKED [OK]"
			))

	def _reset_daily_for_users(self, target_spec):
		if target_spec == 'ALL':
			students = User.objects.filter(role='student')
		else:
			students = User.objects.filter(username__iexact=target_spec)

		if not students.exists():
			self.stdout.write(self.style.ERROR(f"No student matching '{target_spec}' found."))
			return

		for student in students:
			count = UserQuestProgress.objects.filter(user=student).update(is_completed=False, completed_at=None)
			self.stdout.write(self.style.SUCCESS(
				f"Reset {count} quests for student '{student.username}'. Quick Missions are now LOCKED [LOCKED]"
			))
