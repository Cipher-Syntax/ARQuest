#!/usr/bin/env bash
# exit on error
set -o errexit

# Install dependencies
pip install -r requirements.txt

# Collect static files (for Django Admin)
python manage.py collectstatic --no-input

# Run database migrations
python manage.py migrate

# Create default superuser if it doesn't exist
if [[ -n "$DJANGO_SUPERUSER_USERNAME" ]] && [[ -n "$DJANGO_SUPERUSER_PASSWORD" ]] && [[ -n "$DJANGO_SUPERUSER_EMAIL" ]]; then
    echo "Creating superuser..."
    python manage.py createsuperuser --noinput || echo "Superuser already exists."
fi
