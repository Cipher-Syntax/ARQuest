import factory
from django.contrib.auth import get_user_model
from django.utils import timezone

User = get_user_model()

class UserFactory(factory.django.DjangoModelFactory):
    class Meta:
        model = User

    username = factory.Sequence(lambda n: f"user_{n}")
    email = factory.Sequence(lambda n: f"user_{n}@example.com")
    first_name = factory.Faker("first_name")
    last_name = factory.Faker("last_name")
    
    # We use a post_generation hook to set the password properly
    @factory.post_generation
    def password(self, create, extracted, **kwargs):
        password = extracted if extracted else 'testpass123'
        self.set_password(password)
        
    role = 'visitor'
    email_verified = True
    exploration_points = 0

class AdminFactory(UserFactory):
    role = 'admin'
    is_staff = True
    is_superuser = True

class StudentFactory(UserFactory):
    role = 'student'

class ProfessionalFactory(UserFactory):
    role = 'professional'
