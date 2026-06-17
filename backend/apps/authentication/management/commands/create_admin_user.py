from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = 'Create or update an admin user with the correct authentication flags.'

    def add_arguments(self, parser):
        parser.add_argument('username', type=str, help='Username for the admin account')
        parser.add_argument('email', type=str, help='Email address for the admin account')
        parser.add_argument('--password', type=str, required=False, help='Password for the admin account')
        parser.add_argument('--first-name', dest='first_name', type=str, default='', help='First name')
        parser.add_argument('--last-name', dest='last_name', type=str, default='', help='Last name')

    def handle(self, *args, **options):
        User = get_user_model()
        username = options['username']
        email = options['email']
        password = options.get('password')
        first_name = options['first_name']
        last_name = options['last_name']

        user, created = User.objects.get_or_create(
            username=username,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'role': User.Role.ADMIN,
                'is_active': True,
                'email_verified': True,
                'is_staff': True,
                'is_superuser': True,
            },
        )

        user.email = email
        user.first_name = first_name
        user.last_name = last_name
        user.role = User.Role.ADMIN
        user.is_active = True
        user.email_verified = True
        user.is_staff = True
        user.is_superuser = True

        if password:
            user.set_password(password)
        elif created:
            raise CommandError('Password is required when creating a new admin user.')

        user.save()

        action = 'created' if created else 'updated'
        self.stdout.write(
            self.style.SUCCESS(
                f'Admin user {action} successfully: {user.username} <{user.email}>'
            )
        )
