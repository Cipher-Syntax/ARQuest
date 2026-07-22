import factory
from django.utils import timezone
from .models import Quest, UserQuestProgress, Badge, UserBadge
from apps.buildings.factories import BuildingFactory
from apps.authentication.factories import UserFactory

class QuestFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Quest

    title = factory.Sequence(lambda n: f"Quest {n}")
    hint = factory.Faker("sentence")
    target_building = factory.SubFactory(BuildingFactory)
    reward_points = 50
    is_active = True

class UserQuestProgressFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserQuestProgress

    user = factory.SubFactory(UserFactory)
    quest = factory.SubFactory(QuestFactory)
    is_completed = False

class BadgeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = Badge
        django_get_or_create = ('trigger',)

    name = factory.Sequence(lambda n: f"Badge {n}")
    description = factory.Faker("sentence")
    icon = '🏅'
    color_hex = '#FFD700'
    trigger = factory.Iterator([choice[0] for choice in Badge.TRIGGER_CHOICES])
    is_active = True

class UserBadgeFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = UserBadge

    user = factory.SubFactory(UserFactory)
    badge = factory.SubFactory(BadgeFactory)
